import { and, eq } from 'drizzle-orm'
import type { Database } from '@/db'
import type { DocumentType } from '@/lib/constants'
import { invoiceItems, invoices } from '@/db/schema'
import { errorForLog } from '@/lib/log'

/**
 * Semantic search over the owner's documents.
 * Vectorize index: spanish-invo-documents (1024 dims, cosine) with a metadata
 * index on userId so every query is scoped to one business.
 * Embeddings: Workers AI @cf/baai/bge-m3 (multilingual, so Spanish and English
 * descriptions land in the same space).
 */

const EMBEDDING_MODEL = '@cf/baai/bge-m3'
const MAX_TEXT = 2000

type VectorEnv = Pick<Env, 'AI' | 'VECTORIZE'>

export interface DocumentVectorMetadata {
  userId: string
  type: DocumentType
  number: string
  [key: string]: string
}

export async function embed(env: VectorEnv, texts: Array<string>) {
  const res = (await env.AI.run(EMBEDDING_MODEL, {
    text: texts.map((t) => t.slice(0, MAX_TEXT)),
  })) as unknown as { data?: Array<Array<number>> }
  if (!res.data || res.data.length !== texts.length) {
    throw new Error('EMBEDDING_FAILED')
  }
  return res.data
}

/** What the model "reads" for a document: number, client, items, notes. */
export function documentText(doc: {
  invoiceNumber: string
  type: DocumentType
  notes: string | null
  client: { name: string; company: string | null }
  items: Array<{ description: string }>
}) {
  return [
    `${doc.type === 'estimate' ? 'Presupuesto' : 'Factura'} ${doc.invoiceNumber}`,
    `Cliente: ${doc.client.name}${doc.client.company ? ` (${doc.client.company})` : ''}`,
    ...doc.items.map((it) => `- ${it.description}`),
    doc.notes ? `Notas: ${doc.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Loads a document and upserts its vector. Safe to call after every save. */
export async function indexDocumentById(
  env: VectorEnv,
  db: Database,
  docId: string,
) {
  const doc = await db.query.invoices.findFirst({
    where: eq(invoices.id, docId),
    with: {
      client: { columns: { name: true, company: true } },
      items: {
        orderBy: invoiceItems.sortOrder,
        columns: { description: true },
      },
    },
  })
  if (!doc) return
  const [values] = await embed(env, [documentText(doc)])
  const metadata: DocumentVectorMetadata = {
    userId: doc.userId,
    type: doc.type,
    number: doc.invoiceNumber,
  }
  await env.VECTORIZE.upsert([{ id: doc.id, values, metadata }])
}

/** Fire-and-forget wrapper: indexing must never break a save. */
export async function tryIndexDocument(
  env: VectorEnv,
  db: Database,
  docId: string,
) {
  try {
    await indexDocumentById(env, db, docId)
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'warn',
        msg: 'vector index',
        docId,
        ...errorForLog(err),
      }),
    )
  }
}

export async function tryRemoveDocumentVector(env: VectorEnv, docId: string) {
  try {
    await env.VECTORIZE.deleteByIds([docId])
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'warn',
        msg: 'vector delete',
        docId,
        error: err instanceof Error ? err.message : String(err),
      }),
    )
  }
}

export interface SemanticMatch {
  id: string
  score: number
  number: string
  type: DocumentType
}

export async function semanticSearch(
  env: VectorEnv,
  opts: { userId: string; query: string; topK?: number },
): Promise<Array<SemanticMatch>> {
  const [vector] = await embed(env, [opts.query])
  const res = await env.VECTORIZE.query(vector, {
    topK: opts.topK ?? 8,
    filter: { userId: opts.userId },
    returnMetadata: 'indexed',
  })
  return res.matches.map((m) => {
    const meta = (m.metadata ?? {}) as Partial<DocumentVectorMetadata>
    return {
      id: m.id,
      score: m.score,
      number: meta.number ?? '',
      type: meta.type === 'estimate' ? 'estimate' : 'invoice',
    }
  })
}

/** Re-embeds every document of one owner (backfill after enabling the index). */
export async function reindexUserDocuments(
  env: VectorEnv,
  db: Database,
  userId: string,
) {
  const docs = await db.query.invoices.findMany({
    where: and(eq(invoices.userId, userId)),
    with: {
      client: { columns: { name: true, company: true } },
      items: {
        orderBy: invoiceItems.sortOrder,
        columns: { description: true },
      },
    },
    limit: 500,
  })
  if (docs.length === 0) return 0
  // bge-m3 accepts batches; keep them small to stay under request limits.
  const BATCH = 20
  for (let i = 0; i < docs.length; i += BATCH) {
    const slice = docs.slice(i, i + BATCH)
    const vectors = await embed(
      env,
      slice.map((d) => documentText(d)),
    )
    await env.VECTORIZE.upsert(
      slice.map((d, j) => ({
        id: d.id,
        values: vectors[j],
        metadata: {
          userId: d.userId,
          type: d.type,
          number: d.invoiceNumber,
        } satisfies DocumentVectorMetadata,
      })),
    )
  }
  return docs.length
}

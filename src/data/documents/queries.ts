import { queryOptions } from '@tanstack/react-query'
import { getDocumentFn, listDocumentsFn } from './documents'
import type { ListDocumentsInput } from '@/lib/validators/documents'

export const documentKeys = {
  all: ['documents'] as const,
  lists: () => ['documents', 'list'] as const,
  list: (input: ListDocumentsInput) => ['documents', 'list', input] as const,
  detail: (id: string) => ['documents', 'detail', id] as const,
}

export const documentsListQuery = (input: ListDocumentsInput) =>
  queryOptions({
    queryKey: documentKeys.list(input),
    queryFn: () => listDocumentsFn({ data: input }),
  })

export const documentDetailQuery = (id: string) =>
  queryOptions({
    queryKey: documentKeys.detail(id),
    queryFn: () => getDocumentFn({ data: { id } }),
  })

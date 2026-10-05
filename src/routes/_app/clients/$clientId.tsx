import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import {
  Archive,
  ArchiveRestore,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ClientFormInput } from '@/lib/validators/clients'
import { ClientForm } from '@/components/clients/client-form'
import { DocLink } from '@/components/documents/doc-link'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  deleteClientFn,
  setClientArchivedFn,
  updateClientFn,
} from '@/data/clients/clients'
import { clientDetailQuery, clientKeys } from '@/data/clients/queries'
import { documentKeys } from '@/data/documents/queries'
import { useAppContext } from '@/hooks/use-app-context'
import { errorMessage, useT } from '@/lib/i18n'
import { formatCurrency, formatDate, toWhatsAppNumber } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'

export const Route = createFileRoute('/_app/clients/$clientId')({
  loader: ({ context, params }) =>
    context.queryClient.query({
      ...clientDetailQuery(params.clientId),
      staleTime: 'static',
    }),
  component: ClientDetailPage,
})

function ClientDetailPage() {
  const t = useT()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { clientId } = Route.useParams()
  const { settings } = useAppContext()
  const locale = useUiStore((s) => s.locale)
  const { data: client } = useSuspenseQuery(clientDetailQuery(clientId))
  const [editing, setEditing] = useState(false)

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: clientKeys.all }),
      queryClient.invalidateQueries({ queryKey: documentKeys.all }),
    ])

  const update = useMutation({
    mutationFn: (data: ClientFormInput) =>
      updateClientFn({ data: { id: clientId, data } }),
    onSuccess: async () => {
      await invalidate()
      setEditing(false)
      toast.success(t.clients.updated)
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  })
  const archive = useMutation({
    mutationFn: (archived: boolean) =>
      setClientArchivedFn({ data: { id: clientId, archived } }),
    onSuccess: invalidate,
    onError: (err) => toast.error(errorMessage(t, err)),
  })
  const remove = useMutation({
    mutationFn: () => deleteClientFn({ data: { id: clientId } }),
    onSuccess: async () => {
      await invalidate()
      toast.success(t.clients.deleted)
      await router.navigate({ to: '/clients' })
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  })

  const docs = client.invoices

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {client.name}
            {client.archived && (
              <Badge variant="secondary">{t.clients.archived}</Badge>
            )}
          </span>
        }
        subtitle={
          [client.company, client.address].filter(Boolean).join(' · ') ||
          undefined
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              {t.common.edit}
            </Button>
            <Button asChild>
              <Link to="/invoices/new" search={{ clientId }}>
                <Plus className="size-4" />
                {t.docs.newInvoice}
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {client.phone && (
          <>
            <Button asChild variant="secondary" size="sm">
              <a
                href={`https://wa.me/${toWhatsAppNumber(client.phone)}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-4" />
                {t.clients.whatsapp}
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href={`tel:${client.phone}`}>
                <Phone className="size-4" />
                {client.phone}
              </a>
            </Button>
          </>
        )}
        {client.email && (
          <Button asChild variant="secondary" size="sm">
            <a href={`mailto:${client.email}`}>
              <Mail className="size-4" />
              {client.email}
            </a>
          </Button>
        )}
        <Badge variant="outline" className="h-8 px-3">
          {client.preferredLanguage === 'es'
            ? t.common.spanish
            : t.common.english}
        </Badge>
      </div>

      {client.notes && (
        <p className="text-muted-foreground max-w-prose text-sm whitespace-pre-line">
          {client.notes}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.clients.documents}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {docs.length === 0 ? (
            <p className="text-muted-foreground px-6 pb-6 text-sm">
              {t.clients.noDocuments}
            </p>
          ) : (
            <ul className="divide-y">
              {docs.map((d) => (
                <li key={d.id}>
                  <DocLink
                    id={d.id}
                    type={d.type}
                    className="hover:bg-accent/40 flex items-center gap-3 px-6 py-3 text-sm transition-colors"
                  >
                    <span className="w-24 font-medium tabular-nums">
                      {d.invoiceNumber}
                    </span>
                    <span className="text-muted-foreground hidden sm:inline">
                      {formatDate(d.issueDate, {
                        language: locale,
                        timezone: settings.timezone,
                      })}
                    </span>
                    <StatusBadge status={d.status} type={d.type} />
                    <span className="ml-auto font-semibold tabular-nums">
                      {formatCurrency(d.total, d.currency, locale)}
                    </span>
                  </DocLink>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 border-t pt-6">
        <Button
          variant="outline"
          size="sm"
          disabled={archive.isPending}
          onClick={() => archive.mutate(!client.archived)}
        >
          {client.archived ? (
            <ArchiveRestore className="size-4" />
          ) : (
            <Archive className="size-4" />
          )}
          {client.archived ? t.clients.unarchive : t.clients.archive}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
              {t.common.delete}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.clients.deleteTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.clients.deleteBody}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => remove.mutate()}
              >
                {t.common.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t.clients.edit}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            <ClientForm
              client={client}
              onSubmit={(values) => update.mutate(values)}
              onCancel={() => setEditing(false)}
              pending={update.isPending}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import type { ClientFormInput } from '@/lib/validators/clients'
import { ClientForm } from '@/components/clients/client-form'
import { PageHeader } from '@/components/page-header'
import { createClientFn } from '@/data/clients/clients'
import { clientKeys } from '@/data/clients/queries'
import { errorMessage, useT } from '@/lib/i18n'

export const Route = createFileRoute('/_app/clients/new')({
  validateSearch: z.object({ returnTo: z.string().optional() }),
  component: NewClientPage,
})

function NewClientPage() {
  const t = useT()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { returnTo } = Route.useSearch()

  const mutation = useMutation({
    mutationFn: (data: ClientFormInput) => createClientFn({ data }),
    onSuccess: async (client) => {
      await queryClient.invalidateQueries({ queryKey: clientKeys.all })
      toast.success(t.clients.created)
      // Builder flow: come back with the new client pre-selected. Only
      // same-origin paths; "//host" would be a protocol-relative URL.
      if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) {
        await router.navigate({ href: `${returnTo}?clientId=${client.id}` })
      } else {
        await router.navigate({
          to: '/clients/$clientId',
          params: { clientId: client.id },
        })
      }
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t.clients.new} />
      <div className="bg-card rounded-2xl border p-5 md:p-6">
        <ClientForm
          onSubmit={(values) => mutation.mutate(values)}
          onCancel={() => router.history.back()}
          pending={mutation.isPending}
          submitLabel={t.common.create}
        />
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, MessageCircle, MessageSquareText } from 'lucide-react'
import { toast } from 'sonner'
import type { ShareChannel } from '@/lib/validators/documents'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { prepareShareFn, recordShareFn } from '@/data/documents/documents'
import { documentKeys } from '@/data/documents/queries'
import { errorMessage, useT } from '@/lib/i18n'

export function ShareDialog({
  docId,
  clientId,
  open,
  onOpenChange,
}: {
  docId: string
  clientId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const prep = useQuery({
    queryKey: ['share-prep', docId],
    queryFn: () => prepareShareFn({ data: { id: docId } }),
    enabled: open,
    staleTime: 0,
  })

  useEffect(() => {
    if (prep.data) setMessage(prep.data.message)
  }, [prep.data])

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: documentKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ])

  const share = useMutation({
    mutationFn: (channel: ShareChannel) =>
      recordShareFn({ data: { id: docId, channel, message } }),
    onError: (err) => toast.error(errorMessage(t, err)),
  })

  const sendWhatsApp = () => {
    // Open synchronously so mobile browsers don't block the popup, then point it at wa.me.
    const win = window.open('', '_blank')
    share.mutate('whatsapp', {
      onSuccess: async (res) => {
        if (win && res.whatsappUrl) win.location.href = res.whatsappUrl
        await invalidate()
        onOpenChange(false)
      },
      onError: () => win?.close(),
    })
  }

  const sendSms = () =>
    share.mutate('sms', {
      onSuccess: async () => {
        toast.success(t.docs.share.smsSent)
        await invalidate()
        onOpenChange(false)
      },
    })

  const copyLink = async () => {
    if (!prep.data) return
    try {
      await navigator.clipboard.writeText(prep.data.publicUrl)
    } catch {
      /* clipboard unavailable: the URL is visible below */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    share.mutate('link', { onSuccess: () => void invalidate() })
    toast.success(t.docs.share.linkCopied)
  }

  const hasPhone = Boolean(prep.data?.clientPhone)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.docs.share.title}</DialogTitle>
          <DialogDescription>{t.docs.share.subtitle}</DialogDescription>
        </DialogHeader>

        {prep.isPending ? (
          <div className="flex justify-center py-8">
            <Spinner className="size-6" />
          </div>
        ) : prep.isError ? (
          <p className="text-destructive text-sm">
            {errorMessage(t, prep.error)}
          </p>
        ) : (
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="share-message">
                {t.docs.share.preview}
              </FieldLabel>
              <Textarea
                id="share-message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <FieldDescription>{t.docs.share.editMessage}</FieldDescription>
            </Field>

            {!hasPhone && (
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p>{t.docs.share.noPhone}</p>
                <Button asChild variant="link" className="h-auto p-0">
                  <Link to="/clients/$clientId" params={{ clientId }}>
                    {t.docs.share.addPhone}
                  </Link>
                </Button>
              </div>
            )}

            <div className="grid gap-2">
              <Button
                size="lg"
                className="h-12 justify-start gap-3 bg-[#25D366] text-white hover:bg-[#1ebe5b]"
                disabled={!hasPhone || share.isPending}
                onClick={sendWhatsApp}
              >
                <MessageCircle className="size-5" />
                <span className="flex-1 text-left">
                  <span className="block font-semibold">
                    {t.docs.share.whatsapp}
                  </span>
                  <span className="block text-xs font-normal opacity-90">
                    {t.docs.share.whatsappHelp}
                  </span>
                </span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 justify-start gap-3"
                disabled={
                  !hasPhone || !prep.data.smsConfigured || share.isPending
                }
                onClick={sendSms}
              >
                {share.isPending && share.variables === 'sms' ? (
                  <Spinner />
                ) : (
                  <MessageSquareText className="size-5" />
                )}
                <span className="flex-1 text-left">
                  <span className="block font-semibold">
                    {t.docs.share.sms}
                  </span>
                  <span className="text-muted-foreground block text-xs font-normal">
                    {t.docs.share.smsHelp}
                  </span>
                </span>
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="h-12 justify-start gap-3"
                onClick={copyLink}
              >
                {copied ? (
                  <Check className="size-5" />
                ) : (
                  <Copy className="size-5" />
                )}
                <span className="flex-1 text-left">
                  <span className="block font-semibold">
                    {t.docs.share.copyLink}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs font-normal">
                    {prep.data.publicUrl}
                  </span>
                </span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

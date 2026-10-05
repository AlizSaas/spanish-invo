import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, MessageCircle, MessageSquareText } from 'lucide-react'
import { toast } from 'sonner'
import type { Language } from '@/lib/constants'
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
import { LANGUAGES } from '@/lib/constants'
import { errorMessage, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

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
  // null = the document's own language (what the customer expects). The owner
  // can flip it for one send, e.g. an English-speaking customer on a Spanish invoice.
  const [language, setLanguage] = useState<Language | null>(null)

  const prep = useQuery({
    queryKey: ['share-prep', docId, language],
    queryFn: () =>
      prepareShareFn({ data: { id: docId, language: language ?? undefined } }),
    enabled: open,
    staleTime: 0,
  })

  useEffect(() => {
    if (prep.data) setMessage(prep.data.message)
  }, [prep.data])

  // Each time the dialog opens, start from the document language again.
  useEffect(() => {
    if (open) setLanguage(null)
  }, [open])

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
  const activeLanguage = language ?? prep.data?.language

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
          <div className="min-w-0 space-y-4">
            <Field>
              <div className="flex items-center justify-between gap-3">
                <FieldLabel htmlFor="share-message">
                  {t.docs.share.preview}
                </FieldLabel>
                <div
                  role="group"
                  aria-label={t.docs.share.messageLanguage}
                  className="bg-muted inline-flex rounded-md p-0.5 text-xs"
                >
                  {LANGUAGES.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLanguage(l)}
                      className={cn(
                        'rounded px-2 py-1 font-medium uppercase transition-colors',
                        activeLanguage === l
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                id="share-message"
                rows={6}
                className="break-words"
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

            <div className="grid min-w-0 gap-2">
              <Button
                size="lg"
                className="h-12 justify-start gap-3 overflow-hidden bg-[#25D366] text-white hover:bg-[#1ebe5b]"
                disabled={!hasPhone || share.isPending}
                onClick={sendWhatsApp}
              >
                <MessageCircle className="size-5 shrink-0" />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-semibold">
                    {t.docs.share.whatsapp}
                  </span>
                  <span className="block truncate text-xs font-normal opacity-90">
                    {t.docs.share.whatsappHelp}
                  </span>
                </span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 justify-start gap-3 overflow-hidden"
                disabled={
                  !hasPhone || !prep.data.smsConfigured || share.isPending
                }
                onClick={sendSms}
              >
                {share.isPending && share.variables === 'sms' ? (
                  <Spinner />
                ) : (
                  <MessageSquareText className="size-5 shrink-0" />
                )}
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-semibold">
                    {t.docs.share.sms}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs font-normal">
                    {t.docs.share.smsHelp}
                  </span>
                </span>
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="h-12 justify-start gap-3 overflow-hidden"
                onClick={copyLink}
              >
                {copied ? (
                  <Check className="size-5 shrink-0" />
                ) : (
                  <Copy className="size-5 shrink-0" />
                )}
                <span className="min-w-0 flex-1 text-left">
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

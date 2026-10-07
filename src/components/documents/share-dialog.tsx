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
import { LANGUAGES, SMS_ENABLED } from '@/lib/constants'
import { errorMessage, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// Messenger has no "prefilled text" link like wa.me; on a computer the message
// goes through the clipboard and the owner pastes it into the chat.
const MESSENGER_WEB = 'https://www.facebook.com/messages/'

const openMessengerWeb = () =>
  window.open(MESSENGER_WEB, '_blank', 'noopener,noreferrer')

function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M.001 11.639C.001 4.949 5.241 0 12.001 0S24 4.95 24 11.639c0 6.689-5.24 11.638-12 11.638-1.21 0-2.38-.16-3.47-.46a.96.96 0 00-.64.05l-2.39 1.05a.96.96 0 01-1.35-.85l-.07-2.14a.97.97 0 00-.32-.68A11.39 11.389 0 01.002 11.64zm8.32-2.19l-3.52 5.6c-.35.53.32 1.139.82.75l3.79-2.87c.26-.2.6-.2.87 0l2.8 2.1c.84.63 2.04.4 2.6-.48l3.52-5.6c.35-.53-.32-1.13-.82-.75l-3.79 2.87c-.25.2-.6.2-.86 0l-2.8-2.1a1.8 1.8 0 00-2.61.48z" />
    </svg>
  )
}

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
  // Phones and tablets get the system share sheet, which lists the Messenger
  // app. Read after mount: the server can't know the device.
  const [shareSheet, setShareSheet] = useState(false)

  useEffect(() => {
    setShareSheet(
      'share' in navigator && window.matchMedia('(pointer: coarse)').matches,
    )
  }, [])

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

  const recordMessenger = () =>
    share.mutate('messenger', {
      onSuccess: async () => {
        await invalidate()
        onOpenChange(false)
      },
    })

  const sendMessenger = async () => {
    if (!prep.data) return
    const link = prep.data.publicUrl
    // The link carries the preview card, so it must survive the owner's edits.
    const text = message.includes(link) ? message : `${message.trim()}\n${link}`

    if (shareSheet) {
      try {
        // First thing in the tap: Safari only opens the sheet during the gesture.
        await navigator.share({ text })
        recordMessenger()
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        // Sheet unavailable: fall through to copy + open.
      }
    }

    try {
      // Before opening the tab: writing to the clipboard fails once the page loses focus.
      await navigator.clipboard.writeText(text)
    } catch {
      // No clipboard access: leave the message selected so it can be copied by hand.
      document.querySelector<HTMLTextAreaElement>('#share-message')?.select()
      return
    }
    openMessengerWeb()
    // The action is a direct click, so it still works if the browser blocked the tab.
    toast.success(t.docs.share.messengerCopied, {
      duration: 10_000,
      action: { label: t.docs.share.openMessenger, onClick: openMessengerWeb },
    })
    recordMessenger()
  }

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
                className="h-12 justify-start gap-3 overflow-hidden bg-[#0084FF] text-white hover:bg-[#0074e0]"
                disabled={share.isPending}
                onClick={sendMessenger}
              >
                {share.isPending && share.variables === 'messenger' ? (
                  <Spinner />
                ) : (
                  <MessengerIcon className="size-5 shrink-0" />
                )}
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-semibold">
                    {t.docs.share.messenger}
                  </span>
                  <span className="block truncate text-xs font-normal opacity-90">
                    {shareSheet
                      ? t.docs.share.messengerHelp
                      : t.docs.share.messengerHelpDesktop}
                  </span>
                </span>
              </Button>
              {SMS_ENABLED && (
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
                    <span className="flex items-center gap-2 font-semibold">
                      {t.docs.share.sms}
                      {!prep.data.smsConfigured && (
                        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                          {t.docs.share.smsComingSoon}
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs font-normal">
                      {prep.data.smsConfigured
                        ? t.docs.share.smsHelp
                        : t.docs.share.smsComingSoonHelp}
                    </span>
                  </span>
                </Button>
              )}
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

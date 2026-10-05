import { useCallback, useEffect, useMemo, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DefaultChatTransport } from 'ai'
import {
  History,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { ToolResult } from './tool-results'
import type { AssistantMessage, AssistantToolPart } from './types'
import type { Dictionary } from '@/lib/i18n'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input'
import { Shimmer } from '@/components/ai-elements/shimmer'
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  conversationKeys,
  conversationsQuery,
  deleteConversationFn,
  getConversationFn,
} from '@/data/assistant/conversations'
import { useIsMobile } from '@/hooks/use-mobile'
import { errorMessage, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'

function errorText(t: Dictionary, err: Error): string {
  const m = err.message
  if (m.includes('NOT_CONFIGURED') || m.includes('503'))
    return t.assistant.notConfigured
  if (m.includes('UNAUTHORIZED') || m.includes('401'))
    return t.assistant.unauthorized
  return t.assistant.error
}

interface Session {
  id: string
  initialMessages: Array<AssistantMessage>
}

const newSession = (): Session => ({
  id: crypto.randomUUID(),
  initialMessages: [],
})

/**
 * Floating AI assistant. Always mounted inside the signed-in layout; visibility
 * and width live in the UI store. Each conversation is a ChatSession keyed by
 * its id so switching history entries remounts useChat cleanly.
 */
export function AssistantPanel() {
  const t = useT()
  const isMobile = useIsMobile()
  const open = useUiStore((s) => s.assistantOpen)
  const mode = useUiStore((s) => s.assistantMode)
  const closeAssistant = useUiStore((s) => s.closeAssistant)
  const toggleAssistant = useUiStore((s) => s.toggleAssistant)
  const [session, setSession] = useState<Session>(newSession)

  // ⌘K / Ctrl+K toggles, Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        toggleAssistant()
      } else if (e.key === 'Escape' && useUiStore.getState().assistantOpen) {
        closeAssistant()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleAssistant, closeAssistant])

  if (!open) return null

  const full = mode === 'full' || isMobile

  return (
    <aside
      role="dialog"
      aria-label={t.assistant.title}
      className={cn(
        'bg-background fixed z-50 flex flex-col shadow-2xl',
        full ? 'inset-0' : 'inset-y-0 right-0 w-full border-l sm:w-[440px]',
      )}
    >
      <ChatSession
        key={session.id}
        session={session}
        full={full}
        onNewSession={() => setSession(newSession())}
        onOpenSession={setSession}
      />
    </aside>
  )
}

function ChatSession({
  session,
  full,
  onNewSession,
  onOpenSession,
}: {
  session: Session
  full: boolean
  onNewSession: () => void
  onOpenSession: (s: Session) => void
}) {
  const t = useT()
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const mode = useUiStore((s) => s.assistantMode)
  const closeAssistant = useUiStore((s) => s.closeAssistant)
  const setAssistantMode = useUiStore((s) => s.setAssistantMode)

  const transport = useMemo(
    () =>
      new DefaultChatTransport<AssistantMessage>({
        api: '/api/ai/chat',
        // Read the UI language at send time so a mid-conversation switch is honored.
        prepareSendMessagesRequest: ({ id, messages }) => ({
          body: { id, messages, locale: useUiStore.getState().locale },
        }),
      }),
    [],
  )

  const { messages, sendMessage, status, stop, error, clearError } =
    useChat<AssistantMessage>({
      id: session.id,
      messages: session.initialMessages,
      transport,
      onFinish: () =>
        queryClient.invalidateQueries({ queryKey: conversationKeys.all }),
    })

  const ask = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      clearError()
      void sendMessage({ text: trimmed })
    },
    [sendMessage, clearError],
  )

  const busy = status === 'submitted' || status === 'streaming'
  const lastMessage = messages.at(-1)
  // Navigating away from a result on a phone should close the overlay.
  const onNavigate = isMobile ? closeAssistant : undefined

  return (
    <>
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="leading-tight font-semibold">{t.assistant.title}</div>
          <div className="text-muted-foreground text-xs">
            {t.assistant.subtitle}
          </div>
        </div>
        <HistoryMenu
          currentId={session.id}
          onOpen={(s) => {
            stop()
            onOpenSession(s)
          }}
          onDeletedCurrent={onNewSession}
        />
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            title={t.assistant.clear}
            aria-label={t.assistant.clear}
            onClick={() => {
              stop()
              onNewSession()
            }}
          >
            <RotateCcw className="size-4" />
          </Button>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            title={mode === 'full' ? t.assistant.collapse : t.assistant.expand}
            aria-label={
              mode === 'full' ? t.assistant.collapse : t.assistant.expand
            }
            onClick={() => setAssistantMode(mode === 'full' ? 'panel' : 'full')}
          >
            {mode === 'full' ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          title={t.assistant.close}
          aria-label={t.assistant.close}
          onClick={closeAssistant}
        >
          <X className="size-4" />
        </Button>
      </header>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          full && 'mx-auto w-full max-w-3xl',
        )}
      >
        <Conversation className="flex-1">
          <ConversationContent className="gap-6 px-4 py-5">
            {messages.length === 0 ? (
              <ConversationEmptyState className="justify-center">
                <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl">
                  <Sparkles className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">{t.assistant.emptyTitle}</h3>
                  <p className="text-muted-foreground max-w-sm text-sm">
                    {t.assistant.emptyBody}
                  </p>
                </div>
                <div className="flex max-w-md flex-wrap justify-center gap-2 pt-2">
                  {t.assistant.suggestions.map((s) => (
                    <Suggestion
                      key={s}
                      suggestion={s}
                      onClick={ask}
                      className="h-8 text-xs"
                    />
                  ))}
                </div>
              </ConversationEmptyState>
            ) : (
              messages.map((m) => {
                const isLast = m.id === lastMessage?.id
                return (
                  <Message from={m.role} key={m.id}>
                    <MessageContent className="w-full">
                      {m.parts.map((part, i) => {
                        if (part.type === 'text') {
                          return m.role === 'assistant' ? (
                            <MessageResponse
                              key={i}
                              isAnimating={isLast && status === 'streaming'}
                            >
                              {part.text}
                            </MessageResponse>
                          ) : (
                            <p key={i} className="whitespace-pre-wrap">
                              {part.text}
                            </p>
                          )
                        }
                        if (part.type.startsWith('tool-')) {
                          const toolPart = part as AssistantToolPart
                          return (
                            <ToolResult
                              key={toolPart.toolCallId}
                              part={toolPart}
                              onNavigate={onNavigate}
                            />
                          )
                        }
                        return null
                      })}
                    </MessageContent>
                  </Message>
                )
              })
            )}
            {status === 'submitted' && (
              <Shimmer className="text-muted-foreground text-sm">
                {t.assistant.thinking}
              </Shimmer>
            )}
            {error && (
              <div
                role="alert"
                className="bg-destructive/10 text-destructive flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm"
              >
                <span>{errorText(t, error)}</span>
                <Button variant="ghost" size="sm" onClick={clearError}>
                  {t.common.close}
                </Button>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t p-3">
          {messages.length > 0 && !busy && (
            <Suggestions className="mb-2">
              {t.assistant.suggestions.slice(0, 3).map((s) => (
                <Suggestion
                  key={s}
                  suggestion={s}
                  onClick={ask}
                  className="h-7 text-xs"
                />
              ))}
            </Suggestions>
          )}
          <PromptInput onSubmit={({ text }) => ask(text)}>
            <PromptInputBody>
              <PromptInputTextarea
                placeholder={t.assistant.placeholder}
                autoFocus
              />
            </PromptInputBody>
            <PromptInputFooter>
              <span className="text-muted-foreground px-1 text-[11px]">
                {t.assistant.hint}
              </span>
              <PromptInputSubmit status={status} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </>
  )
}

/** Saved conversations (Postgres). Opening one remounts the chat with its messages. */
function HistoryMenu({
  currentId,
  onOpen,
  onDeletedCurrent,
}: {
  currentId: string
  onOpen: (s: Session) => void
  onDeletedCurrent: () => void
}) {
  const t = useT()
  const locale = useUiStore((s) => s.locale)
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const { data: conversations } = useQuery({
    ...conversationsQuery(),
    enabled: menuOpen,
  })

  const load = useMutation({
    mutationFn: (id: string) => getConversationFn({ data: { id } }),
    onSuccess: (c) => {
      onOpen({
        id: c.id,
        initialMessages: c.messages.map((m) => ({
          id: m.id,
          role: m.role as AssistantMessage['role'],
          parts: m.parts as unknown as AssistantMessage['parts'],
        })),
      })
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteConversationFn({ data: { id } }),
    onSuccess: async (_r, id) => {
      await queryClient.invalidateQueries({ queryKey: conversationKeys.all })
      if (id === currentId) onDeletedCurrent()
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  })

  const fmt = new Intl.DateTimeFormat(locale === 'es' ? 'es-US' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title={t.assistant.history}
          aria-label={t.assistant.history}
        >
          <History className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>{t.assistant.history}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!conversations || conversations.length === 0 ? (
          <div className="text-muted-foreground px-2 py-3 text-sm">
            {t.assistant.historyEmpty}
          </div>
        ) : (
          conversations.map((c) => (
            <DropdownMenuItem
              key={c.id}
              className="flex items-start gap-2"
              onSelect={() => load.mutate(c.id)}
            >
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    'truncate text-sm',
                    c.id === currentId && 'font-semibold',
                  )}
                >
                  {c.title ?? t.assistant.untitled}
                </div>
                <div className="text-muted-foreground text-xs">
                  {fmt.format(new Date(c.updatedAt))}
                </div>
              </div>
              <button
                type="button"
                aria-label={t.assistant.deleteConversation}
                className="text-muted-foreground hover:text-destructive rounded p-1"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  remove.mutate(c.id)
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

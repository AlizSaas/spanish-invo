import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Plus, Search, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { clientsListQuery } from '@/data/clients/queries'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useT } from '@/lib/i18n'

export const Route = createFileRoute('/_app/clients/')({
  loader: ({ context }) =>
    context.queryClient.query({ ...clientsListQuery(), staleTime: 'static' }),
  component: ClientsPage,
})

function ClientsPage() {
  const t = useT()
  const [q, setQ] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const debounced = useDebouncedValue(q, 250)
  const { data, isPending } = useQuery(
    clientsListQuery({ q: debounced || undefined, includeArchived }),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.clients.title}
        subtitle={t.clients.subtitle}
        actions={
          <Button asChild>
            <Link to="/clients/new">
              <Plus className="size-4" />
              {t.clients.new}
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <InputGroup className="sm:max-w-sm">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            placeholder={t.clients.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </InputGroup>
        <Label className="flex items-center gap-2 text-sm font-normal">
          <Switch
            checked={includeArchived}
            onCheckedChange={setIncludeArchived}
          />
          {t.clients.showArchived}
        </Label>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>{t.clients.emptyTitle}</EmptyTitle>
            <EmptyDescription>{t.clients.emptyBody}</EmptyDescription>
          </EmptyHeader>
          <Button asChild>
            <Link to="/clients/new">
              <UserPlus className="size-4" />
              {t.clients.new}
            </Link>
          </Button>
        </Empty>
      ) : (
        <ul className="bg-card divide-y overflow-hidden rounded-xl border">
          {data.map((c) => (
            <li key={c.id}>
              <Link
                to="/clients/$clientId"
                params={{ clientId: c.id }}
                className="hover:bg-accent/40 flex items-center gap-4 px-4 py-3 transition-colors"
              >
                <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                  {c.name
                    .split(' ')
                    .map((w) => w[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{c.name}</span>
                    {c.archived && (
                      <Badge variant="secondary">{t.clients.archived}</Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground truncate text-sm">
                    {[c.company, c.phone, c.email].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="text-muted-foreground hidden text-sm tabular-nums sm:block">
                  {c.documentCount} {t.dashboard.invoicesCount}
                </div>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

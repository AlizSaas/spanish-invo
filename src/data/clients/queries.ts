import { queryOptions } from '@tanstack/react-query'
import { getClientFn, listClientsFn } from './clients'

export const clientKeys = {
  all: ['clients'] as const,
  list: (q?: string, includeArchived?: boolean) =>
    [
      'clients',
      'list',
      { q: q ?? '', includeArchived: !!includeArchived },
    ] as const,
  detail: (id: string) => ['clients', 'detail', id] as const,
}

export const clientsListQuery = (
  opts: { q?: string; includeArchived?: boolean } = {},
) =>
  queryOptions({
    queryKey: clientKeys.list(opts.q, opts.includeArchived),
    queryFn: () => listClientsFn({ data: opts }),
  })

export const clientDetailQuery = (id: string) =>
  queryOptions({
    queryKey: clientKeys.detail(id),
    queryFn: () => getClientFn({ data: { id } }),
  })

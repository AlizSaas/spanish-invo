import { queryOptions } from '@tanstack/react-query'
import { getSettingsFn } from './settings'

export const SETTINGS_QUERY_KEY = ['settings'] as const

export const settingsQueryOptions = () =>
  queryOptions({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => getSettingsFn(),
  })

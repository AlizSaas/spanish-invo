import { getRouteApi } from '@tanstack/react-router'

const appRoute = getRouteApi('/_app')

/** user + settings resolved once in the /_app layout's beforeLoad. */
export function useAppContext() {
  return appRoute.useRouteContext()
}

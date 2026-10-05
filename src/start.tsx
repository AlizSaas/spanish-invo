import { createCsrfMiddleware, createStart } from '@tanstack/react-start'

// Server functions are same-origin RPC endpoints: reject calls whose
// Sec-Fetch-Site / Origin / Referer can't be proven same-origin (403).
// Server routes under /api are left alone: Better Auth does its own origin
// checks, and the PDF/logo routes are plain GETs opened from shared links.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

// Worker bindings are exposed to server functions through
// src/middlewares/dependencies.ts (context.env) and to server routes via
// getEnv() in src/lib/env.ts, so no Register augmentation is needed here.
export const startInstance = createStart(() => ({
  defaultSsr: true,
  requestMiddleware: [csrfMiddleware],
}))

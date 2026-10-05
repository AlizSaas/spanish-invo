//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  {
    // Generated or non-TS files that the type-aware parser can't load,
    // plus shadcn-generated UI primitives (vendored, not hand-maintained).
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'worker-configuration.d.ts',
      'src/routeTree.gen.ts',
      'src/components/ui/**',
      'src/components/ai-elements/**',
      'drizzle/**',
      'dist/**',
      '.wrangler/**',
      '.tanstack/**',
    ],
  },
  ...tanstackConfig,
]

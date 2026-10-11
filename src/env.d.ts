/// <reference types="astro/client" />

/**
 * Server-only secrets. They intentionally have NO `PUBLIC_` prefix, so Vite never
 * inlines them into client bundles. Read them only through `@/lib/server/config`.
 */
interface ImportMetaEnv {
  readonly OPENWEATHER_API_KEY?: string;
  readonly UNSPLASH_ACCESS_KEY?: string;
  readonly TOMTOM_API_KEY?: string;
  /** "true" / "false" - see isMockMode() in src/lib/server/config.ts. */
  readonly MOCK_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

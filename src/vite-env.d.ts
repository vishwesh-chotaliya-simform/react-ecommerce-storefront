/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Deployed API origin. Unset in dev — the Vite proxy handles `/api` instead. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

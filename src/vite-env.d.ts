/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_API_KEY: string
  readonly VITE_SPREADSHEET_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

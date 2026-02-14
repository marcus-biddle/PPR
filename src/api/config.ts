/**
 * API configuration.
 * All env vars prefixed with VITE_ are exposed to the client.
 */

export const apiConfig = {
  /** Google API key (restrict to Sheets API in Google Cloud Console). */
  googleApiKey: import.meta.env.VITE_GOOGLE_API_KEY ?? '',
  /** ID of the Google Spreadsheet (from the sheet URL). */
  spreadsheetId: import.meta.env.VITE_SPREADSHEET_ID ?? '',
} as const

/** Base URL for Google Sheets API v4. */
export const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

/**
 * Whether the app has minimal config to call the Sheets API.
 * Use this to show setup instructions when keys are missing.
 */
export function hasSheetsConfig(): boolean {
  return Boolean(
    apiConfig.googleApiKey &&
    apiConfig.spreadsheetId
  )
}

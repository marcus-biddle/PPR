/**
 * API layer – config, client, and sheet actions.
 *
 * Structure:
 *   api/
 *     config.ts     – env and base URLs
 *     client.ts     – low-level fetch wrappers (get/put/post)
 *     types.ts      – shared types for API responses
 *     sheets/
 *       actions.ts  – sheet-specific actions (get, update, append, etc.)
 *       index.ts    – re-exports for sheets
 */

export { apiConfig, hasSheetsConfig, SHEETS_API_BASE } from './config'
export { sheetsGet, sheetsPut, sheetsPost } from './client'
export * from './sheets'
export type {
  ValueRange,
  ValuesGetResponse,
  ValuesBatchGetResponse,
  ValuesUpdateResponse,
  ValuesAppendResponse,
  ValueRangeBody,
  SheetRangeOptions,
} from './types'

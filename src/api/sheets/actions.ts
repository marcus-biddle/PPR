/**
 * Google Sheets API actions.
 * Import these throughout the app when you need to read/write sheet data.
 *
 * Usage:
 *   import { getSheetValues, appendRows, updateRange } from '@/api/sheets/actions'
 */

import {
  sheetsGet,
  sheetsPut,
  sheetsPost,
} from '../client'
import type {
  ValueRange,
  ValuesGetResponse,
  ValuesBatchGetResponse,
  ValuesUpdateResponse,
  ValuesAppendResponse,
  ValueRangeBody,
  SheetRangeOptions,
} from '../types'

const VALUES_PREFIX = 'values'

/**
 * Read a single range from the spreadsheet.
 * @param range - A1 notation, e.g. "Sheet1!A1:D10"
 * @param majorDimension - "ROWS" (default) or "COLUMNS"
 */
export async function getSheetValues(
  range: string,
  majorDimension: 'ROWS' | 'COLUMNS' = 'ROWS'
): Promise<ValuesGetResponse> {
  const encoded = encodeURIComponent(range)
  return sheetsGet<ValuesGetResponse>(`${VALUES_PREFIX}/${encoded}`, {
    majorDimension,
  })
}

/**
 * Read multiple ranges in one request.
 * @param ranges - Array of A1 notation ranges
 * @param majorDimension - "ROWS" (default) or "COLUMNS"
 */
export async function getSheetValuesBatch(
  ranges: string[],
  majorDimension: 'ROWS' | 'COLUMNS' = 'ROWS'
): Promise<ValuesBatchGetResponse> {
  // API path is values:batchGet (colon), not values/batchGet
  const rangeParams = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&')
  return sheetsGet<ValuesBatchGetResponse>(
    `${VALUES_PREFIX}:batchGet?${rangeParams}&majorDimension=${majorDimension}`
  )
}

/**
 * Update a single range with new values.
 * @param options - range, optional majorDimension and valueInputOption
 * @param values - 2D array of values (rows × columns)
 */
export async function updateRange(
  options: SheetRangeOptions,
  values: unknown[][]
): Promise<ValuesUpdateResponse> {
  const encoded = encodeURIComponent(options.range)
  const body: ValueRangeBody = {
    range: options.range,
    majorDimension: options.majorDimension ?? 'ROWS',
    values,
  }
  return sheetsPut<ValuesUpdateResponse>(
    `${VALUES_PREFIX}/${encoded}`,
    body,
    { valueInputOption: options.valueInputOption ?? 'USER_ENTERED' }
  )
}

/**
 * Append rows (or columns) to the end of a sheet/range.
 * @param range - A1 notation of the table range to append to, e.g. "Sheet1!A:D"
 * @param values - 2D array of values to append
 * @param valueInputOption - "USER_ENTERED" (default) or "RAW"
 */
export async function appendRows(
  range: string,
  values: unknown[][],
  valueInputOption: 'RAW' | 'USER_ENTERED' = 'USER_ENTERED'
): Promise<ValuesAppendResponse> {
  const encoded = encodeURIComponent(range)
  const body: ValueRangeBody = {
    range,
    majorDimension: 'ROWS',
    values,
  }
  return sheetsPost<ValuesAppendResponse>(
    `${VALUES_PREFIX}/${encoded}:append`,
    body,
    { valueInputOption }
  )
}

/**
 * Clear a range (set values to empty).
 * Uses update with empty values.
 */
export async function clearRange(range: string): Promise<ValuesUpdateResponse> {
  return updateRange({ range }, [])
}

/**
 * Helper: get values as a 2D array, or empty array if no values.
 */
export function getValuesArray(response: ValueRange): unknown[][] {
  return response.values ?? []
}

/**
 * Types for Google Sheets API v4 (values resource).
 * Use these across the app when working with sheet data.
 */

/** Response from spreadsheets.values.get or batchGet. */
export interface ValueRange {
  range: string
  majorDimension?: 'ROWS' | 'COLUMNS'
  values?: unknown[][]
}

/** Response from spreadsheets.values.get. */
export interface ValuesGetResponse extends ValueRange {}

/** Response from spreadsheets.values.batchGet. */
export interface ValuesBatchGetResponse {
  spreadsheetId: string
  valueRanges: ValueRange[]
}

/** Response from spreadsheets.values.update. */
export interface ValuesUpdateResponse {
  spreadsheetId: string
  updatedRange: string
  updatedRows: number
  updatedColumns: number
  updatedCells: number
}

/** Response from spreadsheets.values.append. */
export interface ValuesAppendResponse {
  spreadsheetId: string
  tableRange: string
  updates: {
    spreadsheetId: string
    updatedRange: string
    updatedRows: number
    updatedColumns: number
    updatedCells: number
  }
}

/** Body for update or append requests. */
export interface ValueRangeBody {
  range?: string
  majorDimension?: 'ROWS' | 'COLUMNS'
  values: unknown[][]
}

/** Options for listing or updating a range. */
export interface SheetRangeOptions {
  /** A1 notation, e.g. "Sheet1!A1:D10" or "Sheet1" for whole sheet. */
  range: string
  /** How to interpret values; default ROWS. */
  majorDimension?: 'ROWS' | 'COLUMNS'
  /** For append: how to interpret input; default ROWS. */
  valueInputOption?: 'RAW' | 'USER_ENTERED'
}

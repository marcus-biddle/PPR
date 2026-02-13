/**
 * Google Sheets API – public exports.
 * Use: import { getSheetValues, appendRows, ... } from '@/api/sheets'
 */

export {
  getSheetValues,
  getSheetValuesBatch,
  updateRange,
  appendRows,
  clearRange,
  getValuesArray,
} from './actions'

export type { SheetRangeOptions } from '../types'

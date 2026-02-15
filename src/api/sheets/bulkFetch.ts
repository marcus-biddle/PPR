/**
 * Bulk fetch for Google Sheets API.
 * Fetches all data for all sheets in ONE API call to avoid quota limits.
 */

import { getSheetValuesBatch, getValuesArray } from './actions'
import type { SheetName } from '@/contexts/PickerContext'

const DATES_ROW_START = 6
const MAX_ROWS = 3500 // ~10 years of daily data

export type LeaderboardEntry = { rank: number; name: string; total: number }

function parseDateCell(cell: unknown): Date | null {
  if (cell == null || cell === '') return null
  const s = String(cell).trim()
  if (!s) return null
  const n = Number(s)
  if (!Number.isNaN(n) && n > 0) {
    const ms = (n - 25569) * 86400 * 1000
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Compute leaderboard (ranked by total) for a specific month from pre-fetched rows. */
function computeLeaderboardForMonth(
  dateRows: unknown[][],
  valueRowsByIndex: unknown[][][],
  names: string[],
  year: number,
  month: number,
  stopAtIndex: number
): LeaderboardEntry[] {
  const totalsByIndex = names.map(() => 0)
  for (let rowIdx = 0; rowIdx < stopAtIndex; rowIdx++) {
    const dateCell = dateRows[rowIdx]?.[0]
    const date = parseDateCell(dateCell)
    if (!date || date.getFullYear() !== year || date.getMonth() + 1 !== month) continue
    for (let nameIdx = 0; nameIdx < names.length; nameIdx++) {
      const val = valueRowsByIndex[nameIdx]?.[rowIdx]?.[0]
      const n = Number(val)
      if (!Number.isNaN(n)) totalsByIndex[nameIdx] += n
    }
  }
  return names
    .map((name, i) => ({ name, total: totalsByIndex[i] ?? 0 }))
    .sort((a, b) => b.total - a.total)
    .map((e, i) => ({ rank: i + 1, name: e.name, total: e.total }))
}

export type SheetBulkData = {
  names: string[]
  dateRows: unknown[][]
  valueRowsByIndex: unknown[][][]
  stopAtIndex: number
}

/** Fetch all sheets in ONE API call (batchGet supports multiple ranges from different sheets). */
async function fetchAllSheetsBulk(
  sheetNames: readonly SheetName[]
): Promise<Map<SheetName, SheetBulkData>> {
  const ranges: string[] = []
  for (const sheet of sheetNames) {
    ranges.push(`'${sheet}'!E5:Z5`)
    ranges.push(`'${sheet}'!D${DATES_ROW_START}:Z${DATES_ROW_START + MAX_ROWS - 1}`)
  }
  const res = await getSheetValuesBatch(ranges)
  const vr = res.valueRanges ?? []
  const result = new Map<SheetName, SheetBulkData>()

  for (let s = 0; s < sheetNames.length; s++) {
    const sheet = sheetNames[s]
    const namesRow = getValuesArray(vr[s * 2] ?? { values: [] })
    const dataRows = getValuesArray(vr[s * 2 + 1] ?? { values: [] })

    const names = (namesRow[0] ?? [])
      .map((cell) => String(cell ?? '').trim())
      .filter(Boolean) as string[]

    const today = new Date()
    const dateRows: unknown[][] = []
    const valueRowsByIndex: unknown[][][] = names.map(() => [])
    let stopAtIndex = dataRows.length

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] ?? []
      const dateCell = row[0]
      dateRows.push([dateCell])
      const parsed = parseDateCell(dateCell)
      if (parsed && isSameCalendarDay(parsed, today)) {
        stopAtIndex = i + 1
      }
      for (let nameIdx = 0; nameIdx < names.length; nameIdx++) {
        const val = row[nameIdx + 1]
        valueRowsByIndex[nameIdx].push(Array.isArray(val) ? val : [val])
      }
    }
    result.set(sheet, { names, dateRows, valueRowsByIndex, stopAtIndex })
  }
  return result
}

export type MedalByType = Record<SheetName, { gold: number; silver: number; bronze: number }>

export type MedalCountWithByType = {
  name: string
  gold: number
  silver: number
  bronze: number
  byType?: MedalByType
}

/** Fetch all sheets and compute medal totals for a year. Uses 1 API call total. */
export async function fetchMedalTotalsBulk(
  sheetNames: readonly SheetName[],
  year: number
): Promise<{
  byYear: MedalCountWithByType[]
  byQuarter: Record<1 | 2 | 3 | 4, MedalCountWithByType[]>
  byMonth: Record<number, MedalCountWithByType[]>
}> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const monthsToFetch = year < currentYear ? 12 : year === currentYear ? currentMonth : 0

  if (monthsToFetch === 0) {
    return {
      byYear: [],
      byQuarter: { 1: [], 2: [], 3: [], 4: [] },
      byMonth: {},
    }
  }

  const aggregateYear = new Map<string, { gold: number; silver: number; bronze: number }>()
  const aggregateByMonth = new Map<number, Map<string, { gold: number; silver: number; bronze: number }>>()
  const aggregateByQuarter = new Map<number, Map<string, { gold: number; silver: number; bronze: number }>>()
  const aggregateBySheet = new Map<SheetName, Map<string, { gold: number; silver: number; bronze: number }>>()
  const aggregateBySheetByMonth = new Map<number, Map<SheetName, Map<string, { gold: number; silver: number; bronze: number }>>>()
  const aggregateBySheetByQuarter = new Map<number, Map<SheetName, Map<string, { gold: number; silver: number; bronze: number }>>>()

  function getOrCreateSheetMap(sheet: SheetName) {
    let m = aggregateBySheet.get(sheet)
    if (!m) {
      m = new Map()
      aggregateBySheet.set(sheet, m)
    }
    return m
  }

  function getOrCreateSheetMapForMonth(month: number, sheet: SheetName) {
    let monthMap = aggregateBySheetByMonth.get(month)
    if (!monthMap) {
      monthMap = new Map()
      aggregateBySheetByMonth.set(month, monthMap)
    }
    let sheetMap = monthMap.get(sheet)
    if (!sheetMap) {
      sheetMap = new Map()
      monthMap.set(sheet, sheetMap)
    }
    return sheetMap
  }

  function getOrCreateSheetMapForQuarter(month: number, sheet: SheetName) {
    const q = Math.ceil(month / 3) as 1 | 2 | 3 | 4
    let quarterMap = aggregateBySheetByQuarter.get(q)
    if (!quarterMap) {
      quarterMap = new Map()
      aggregateBySheetByQuarter.set(q, quarterMap)
    }
    let sheetMap = quarterMap.get(sheet)
    if (!sheetMap) {
      sheetMap = new Map()
      quarterMap.set(sheet, sheetMap)
    }
    return sheetMap
  }

  function getOrCreateMonth(month: number) {
    let m = aggregateByMonth.get(month)
    if (!m) {
      m = new Map()
      aggregateByMonth.set(month, m)
    }
    return m
  }

  function getOrCreateQuarter(month: number) {
    const q = Math.ceil(month / 3) as 1 | 2 | 3 | 4
    let map = aggregateByQuarter.get(q)
    if (!map) {
      map = new Map()
      aggregateByQuarter.set(q, map)
    }
    return map
  }

  function addMedal(
    map: Map<string, { gold: number; silver: number; bronze: number }>,
    name: string,
    type: 'gold' | 'silver' | 'bronze'
  ) {
    const cur = map.get(name) ?? { gold: 0, silver: 0, bronze: 0 }
    cur[type] += 1
    map.set(name, cur)
  }

  function buildByType(
    name: string,
    sheetAggregates: Map<SheetName, Map<string, { gold: number; silver: number; bronze: number }>>
  ): MedalByType | undefined {
    const byType: MedalByType = {} as MedalByType
    for (const sheet of sheetNames) {
      const sheetMap = sheetAggregates.get(sheet)
      const c = sheetMap?.get(name)
      if (c && (c.gold > 0 || c.silver > 0 || c.bronze > 0)) {
        byType[sheet] = { gold: c.gold, silver: c.silver, bronze: c.bronze }
      }
    }
    return Object.keys(byType).length > 0 ? byType : undefined
  }

  function sortCounts(
    entries: [string, { gold: number; silver: number; bronze: number }][],
    sheetAggregates: Map<SheetName, Map<string, { gold: number; silver: number; bronze: number }>>
  ): MedalCountWithByType[] {
    return entries
      .map(([name, counts]) => ({
        name,
        ...counts,
        byType: buildByType(name, sheetAggregates),
      }))
      .filter((e) => e.gold > 0 || e.silver > 0 || e.bronze > 0)
      .sort((a, b) => {
        const totalA = a.gold * 3 + a.silver * 2 + a.bronze
        const totalB = b.gold * 3 + b.silver * 2 + b.bronze
        if (totalB !== totalA) return totalB - totalA
        if (b.gold !== a.gold) return b.gold - a.gold
        if (b.silver !== a.silver) return b.silver - a.silver
        return b.bronze - a.bronze
      })
  }

  const sheetsData = await fetchAllSheetsBulk(sheetNames)
  for (const sheet of sheetNames) {
    const data = sheetsData.get(sheet)
    if (!data) continue
    const { names, dateRows, valueRowsByIndex, stopAtIndex } = data
    for (let month = 1; month <= monthsToFetch; month++) {
      const leaderboard = computeLeaderboardForMonth(
        dateRows,
        valueRowsByIndex,
        names,
        year,
        month,
        stopAtIndex
      )
      const gold = leaderboard[0]
      const silver = leaderboard[1]
      const bronze = leaderboard[2]
      const monthMap = getOrCreateMonth(month)
      const quarterMap = getOrCreateQuarter(month)
      const sheetMap = getOrCreateSheetMap(sheet)
      const sheetMonthMap = getOrCreateSheetMapForMonth(month, sheet)
      const sheetQuarterMap = getOrCreateSheetMapForQuarter(month, sheet)
      if (gold) {
        addMedal(aggregateYear, gold.name, 'gold')
        addMedal(monthMap, gold.name, 'gold')
        addMedal(quarterMap, gold.name, 'gold')
        addMedal(sheetMap, gold.name, 'gold')
        addMedal(sheetMonthMap, gold.name, 'gold')
        addMedal(sheetQuarterMap, gold.name, 'gold')
      }
      if (silver) {
        addMedal(aggregateYear, silver.name, 'silver')
        addMedal(monthMap, silver.name, 'silver')
        addMedal(quarterMap, silver.name, 'silver')
        addMedal(sheetMap, silver.name, 'silver')
        addMedal(sheetMonthMap, silver.name, 'silver')
        addMedal(sheetQuarterMap, silver.name, 'silver')
      }
      if (bronze) {
        addMedal(aggregateYear, bronze.name, 'bronze')
        addMedal(monthMap, bronze.name, 'bronze')
        addMedal(quarterMap, bronze.name, 'bronze')
        addMedal(sheetMap, bronze.name, 'bronze')
        addMedal(sheetMonthMap, bronze.name, 'bronze')
        addMedal(sheetQuarterMap, bronze.name, 'bronze')
      }
    }
  }

  const byYear = sortCounts(Array.from(aggregateYear.entries()), aggregateBySheet)
  const byQuarter: Record<1 | 2 | 3 | 4, MedalCountWithByType[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
  }
  for (const [q, map] of aggregateByQuarter) {
    const sheetAgg = aggregateBySheetByQuarter.get(q) ?? new Map()
    byQuarter[q as 1 | 2 | 3 | 4] = sortCounts(Array.from(map.entries()), sheetAgg)
  }
  const byMonth: Record<number, MedalCountWithByType[]> = {}
  for (const [m, map] of aggregateByMonth) {
    const sheetAgg = aggregateBySheetByMonth.get(m) ?? new Map()
    byMonth[m] = sortCounts(Array.from(map.entries()), sheetAgg)
  }

  return { byYear, byQuarter, byMonth }
}

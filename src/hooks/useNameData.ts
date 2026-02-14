import { useState, useEffect, useRef } from 'react'
import { getSheetValuesBatch, getValuesArray } from '@/api/sheets'
import type { SheetName } from '@/contexts/PickerContext'

const NAMEDATA_CACHE_PREFIX = 'ppr-namedata-'
const DATES_ROW_START = 6
const CHUNK_SIZE = 200
const MAX_CHUNKS = 25

export type DateValueRow = { date: string; value: string }

function getColumnLetterForNameIndex(nameIndex: number): string {
  return String.fromCharCode(69 + nameIndex)
}

/** Parse sheet cell to Date (handles serial numbers and date strings). */
export function parseDateCell(cell: unknown): Date | null {
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

/** Quarter 1–4 from month 1–12. */
function getQuarter(month: number): number {
  return Math.ceil(month / 3)
}

/** Filter rows by optional year, quarter, month. Empty string = no filter for that dimension. */
export function filterByDate(
  rows: DateValueRow[],
  filterYear: number | '',
  filterQuarter: 1 | 2 | 3 | 4 | '',
  filterMonth: number | ''
): DateValueRow[] {
  if (!filterYear && !filterQuarter && !filterMonth) return rows
  return rows.filter((row) => {
    const d = parseDateCell(row.date)
    if (!d) return false
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const q = getQuarter(m)
    if (filterYear !== '' && y !== filterYear) return false
    if (filterQuarter !== '' && q !== filterQuarter) return false
    if (filterMonth !== '' && m !== filterMonth) return false
    return true
  })
}

export function getCachedNameData(sheet: SheetName | '', name: string): DateValueRow[] {
  if (!sheet || !name) return []
  try {
    const raw = sessionStorage.getItem(NAMEDATA_CACHE_PREFIX + sheet + '|' + name)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (row): row is DateValueRow =>
        row != null &&
        typeof row === 'object' &&
        'date' in row &&
        'value' in row &&
        typeof (row as DateValueRow).date === 'string' &&
        typeof (row as DateValueRow).value === 'string'
    )
  } catch {
    return []
  }
}

export function useNameData(
  selectedSheet: SheetName | '',
  selectedName: string,
  names: string[]
): { nameData: DateValueRow[]; loading: boolean; error: string | null } {
  const [nameData, setNameData] = useState<DateValueRow[]>(() =>
    getCachedNameData(selectedSheet, selectedName)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cacheRef = useRef<Record<string, DateValueRow[]>>({})

  useEffect(() => {
    if (!selectedSheet || !selectedName) {
      setNameData([])
      return
    }
    if (names.length === 0) return

    const nameIndex = names.indexOf(selectedName)
    if (nameIndex < 0) {
      setNameData([])
      return
    }

    const cacheKey = `${selectedSheet}|${selectedName}`
    const cached = cacheRef.current[cacheKey]
    if (cached) {
      setNameData(cached)
      setError(null)
      return
    }

    let cancelled = false
    const colLetter = getColumnLetterForNameIndex(nameIndex)
    const today = new Date()

    setError(null)
    setLoading(true)

    const allDateRows: unknown[][] = []
    const allValueRows: unknown[][] = []

    function fetchChunk(chunkIndex: number): Promise<void> {
      if (cancelled) return Promise.resolve()
      const startRow = DATES_ROW_START + chunkIndex * CHUNK_SIZE
      const endRow = startRow + CHUNK_SIZE - 1
      const datesRange = `'${selectedSheet}'!D${startRow}:D${endRow}`
      const valuesRange = `'${selectedSheet}'!${colLetter}${startRow}:${colLetter}${endRow}`

      return getSheetValuesBatch([datesRange, valuesRange]).then((res) => {
        if (cancelled) return
        const dateRows = getValuesArray(res.valueRanges[0] ?? { range: '', values: [] })
        const valueRows = getValuesArray(res.valueRanges[1] ?? { range: '', values: [] })
        const maxLen = Math.max(dateRows.length, valueRows.length)
        for (let i = 0; i < maxLen; i++) {
          allDateRows.push(dateRows[i] ?? [])
          allValueRows.push(valueRows[i] ?? [])
        }
        const foundTodayIndex = allDateRows.findIndex((row) => {
          const parsed = parseDateCell(row[0])
          return parsed != null && isSameCalendarDay(parsed, today)
        })
        if (foundTodayIndex >= 0) return
        if (dateRows.length < CHUNK_SIZE || chunkIndex >= MAX_CHUNKS - 1) return
        return fetchChunk(chunkIndex + 1)
      })
    }

    fetchChunk(0)
      .then(() => {
        if (cancelled) return
        const todayIndex = allDateRows.findIndex((row) => {
          const parsed = parseDateCell(row[0])
          return parsed != null && isSameCalendarDay(parsed, today)
        })
        const stop = todayIndex >= 0 ? todayIndex + 1 : allDateRows.length
        const rows: DateValueRow[] = []
        for (let i = 0; i < stop; i++) {
          const date = String(allDateRows[i]?.[0] ?? '').trim()
          const value = String(allValueRows[i]?.[0] ?? '').trim()
          if (date || value) rows.push({ date, value })
        }
        cacheRef.current[cacheKey] = rows
        try {
          sessionStorage.setItem(
            NAMEDATA_CACHE_PREFIX + selectedSheet + '|' + selectedName,
            JSON.stringify(rows)
          )
        } catch {
          /* ignore */
        }
        setNameData(rows)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load data')
        setNameData([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedSheet, selectedName, names])

  return { nameData, loading, error }
}

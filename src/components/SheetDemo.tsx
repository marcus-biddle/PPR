import { type ReactNode, useState, useEffect, useMemo, useRef } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  getSheetValues,
  getSheetValuesBatch,
  getValuesArray,
} from '@/api/sheets'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Toggle } from '@/components/ui/toggle'
import { Badge } from '@/components/ui/badge'

const SHEET_NAMES = ['Push', 'Pull', 'Run'] as const
const NAMES_RANGE = 'E5:Z5' // Row 5, columns E–Z: every name on the sheet
const PICKER_STORAGE_KEY = 'ppr-sheet-picker'
const NAMES_CACHE_PREFIX = 'ppr-names-'
const NAMEDATA_CACHE_PREFIX = 'ppr-namedata-'

type SheetName = (typeof SHEET_NAMES)[number]

export type DateValueRow = { date: string; value: string }

/** Display labels for sheet names in the UI (underlying sheet tab names stay Push/Pull/Run). */
const SHEET_DISPLAY_NAMES: Record<SheetName, string> = {
  Push: 'Push-ups',
  Pull: 'Pull-ups',
  Run: 'Run',
}

const DEBOUNCE_MS = 400

/** Returns value after it has been stable for delayMs. Reduces API reads on rapid UI changes. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

function getStoredPicker(): { sheet: SheetName | ''; name: string } {
  try {
    const raw = localStorage.getItem(PICKER_STORAGE_KEY)
    if (!raw) return { sheet: '', name: '' }
    const parsed = JSON.parse(raw) as { sheet?: string; name?: string }
    const sheet = (SHEET_NAMES as readonly string[]).includes(parsed.sheet ?? '')
      ? (parsed.sheet as SheetName)
      : ''
    const name = typeof parsed.name === 'string' ? parsed.name : ''
    return { sheet, name }
  } catch {
    return { sheet: '', name: '' }
  }
}

function getCachedNames(sheet: SheetName | ''): string[] {
  if (!sheet) return []
  try {
    const raw = sessionStorage.getItem(NAMES_CACHE_PREFIX + sheet)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) && parsed.every((x) => typeof x === 'string') ? parsed : []
  } catch {
    return []
  }
}

function getCachedNameData(sheet: SheetName | '', name: string): DateValueRow[] {
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
const DATES_ROW_START = 6
const CHUNK_SIZE = 200
const MAX_CHUNKS = 25 // cap at 5000 rows if today's date never found

// Column E = index 0, F = 1, ... (E is 5th column, char code 69)
function getColumnLetterForNameIndex(nameIndex: number): string {
  return String.fromCharCode(69 + nameIndex)
}

/** Parse sheet cell to Date (handles serial numbers and date strings). */
function parseDateCell(cell: unknown): Date | null {
  if (cell == null || cell === '') return null
  const s = String(cell).trim()
  if (!s) return null
  const n = Number(s)
  if (!Number.isNaN(n) && n > 0) {
    // Sheets/Excel serial: days since 1899-12-30; 25569 = 1970-01-01
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

/** True if b is exactly one calendar day after a. */
function isNextCalendarDay(a: Date, b: Date): boolean {
  const next = new Date(a)
  next.setDate(next.getDate() + 1)
  return isSameCalendarDay(next, b)
}

function isWorkingValue(value: string): boolean {
  const v = value.trim()
  if (!v) return false
  const n = Number(v)
  return Number.isNaN(n) || n !== 0
}

/** Quarter 1–4 from month 1–12. */
function getQuarter(month: number): number {
  return Math.ceil(month / 3)
}

/** Months 1–12 in a given quarter. */
function getMonthsInQuarter(quarter: 1 | 2 | 3 | 4): number[] {
  const start = (quarter - 1) * 3 + 1
  return [start, start + 1, start + 2]
}

/** Day of year 1–366. */
function getDayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0)
  const diff = d.getTime() - start.getTime()
  return Math.floor(diff / (86400 * 1000))
}

/** Filter rows to a given year, up to and including the same day-of-year (for YTD comparison). */
function filterByYTDPeriod(
  rows: DateValueRow[],
  year: number,
  upToDayOfYear: number
): DateValueRow[] {
  return rows.filter((row) => {
    const d = parseDateCell(row.date)
    if (!d || d.getFullYear() !== year) return false
    return getDayOfYear(d) <= upToDayOfYear
  })
}

/** Percent change from previous to current. Returns null if previous is 0 or both equal. */
function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  if (current === previous) return 0
  return Math.round(((current - previous) / previous) * 100)
}

/** Filter rows by optional year, quarter, month. Empty string = no filter for that dimension. */
function filterByDate(
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

/** Compute longest consecutive (by calendar day) working streak and longest time off. */
function getStreaks(rows: DateValueRow[]): { longestStreak: number; longestTimeOff: number } {
  if (rows.length === 0) return { longestStreak: 0, longestTimeOff: 0 }
  const withDate = rows
    .map((row) => ({ row, date: parseDateCell(row.date) }))
    .filter((x): x is { row: DateValueRow; date: Date } => x.date != null)
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  let longestStreak = 0
  let longestTimeOff = 0
  let streak = 0
  let timeOff = 0
  let prevDate: Date | null = null

  for (const { row, date } of withDate) {
    const working = isWorkingValue(row.value)
    const consecutive = prevDate != null && isNextCalendarDay(prevDate, date)

    if (working) {
      streak = consecutive ? streak + 1 : 1
      timeOff = 0
      longestStreak = Math.max(longestStreak, streak)
    } else {
      timeOff = consecutive ? timeOff + 1 : 1
      streak = 0
      longestTimeOff = Math.max(longestTimeOff, timeOff)
    }
    prevDate = date
  }
  return { longestStreak, longestTimeOff }
}

export function SheetDemo() {
  const storedPicker = useMemo(() => getStoredPicker(), [])
  const [selectedSheet, setSelectedSheet] = useState<SheetName | ''>(() => storedPicker.sheet)
  const [names, setNames] = useState<string[]>(() => getCachedNames(storedPicker.sheet))
  const [selectedName, setSelectedName] = useState(() => storedPicker.name)
  const [pickerOpen, setPickerOpen] = useState(() => !(storedPicker.sheet && storedPicker.name))
  const [loadingNames, setLoadingNames] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nameData, setNameData] = useState<DateValueRow[]>(() =>
    getCachedNameData(storedPicker.sheet, storedPicker.name)
  )
  const [loadingNameData, setLoadingNameData] = useState(false)
  const [nameDataError, setNameDataError] = useState<string | null>(null)

  // Date filters: empty string = no filter (show all)
  const [filterYear, setFilterYear] = useState<number | ''>('')
  const [filterQuarter, setFilterQuarter] = useState<1 | 2 | 3 | 4 | ''>('')
  const [filterMonth, setFilterMonth] = useState<number | ''>('')

  // Debounce sheet/name so we don't hit the API on every quick dropdown change
  const debouncedSheet = useDebouncedValue(selectedSheet, DEBOUNCE_MS)
  const debouncedName = useDebouncedValue(selectedName, DEBOUNCE_MS)

  // In-memory cache to avoid refetching same sheet or sheet+name (stays within session)
  const namesCacheRef = useRef<Partial<Record<SheetName, string[]>>>({})
  const nameDataCacheRef = useRef<Record<string, DateValueRow[]>>({})

  const filteredData = useMemo(
    () => filterByDate(nameData, filterYear, filterQuarter, filterMonth),
    [nameData, filterYear, filterQuarter, filterMonth]
  )
  const chartData = useMemo(() => {
    return filteredData.map((row) => {
      const n = Number(row.value)
      const value = row.value.trim() === '' || Number.isNaN(n) ? null : n
      const d = parseDateCell(row.date)
      const dateLabel = d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : row.date || '—'
      return { date: dateLabel, value, dateTime: d?.getTime() ?? 0 }
    }).sort((a, b) => a.dateTime - b.dateTime)
  }, [filteredData])
  const yearsInData = useMemo(
    () =>
      Array.from(
        new Set(
          nameData
            .map((row) => parseDateCell(row.date)?.getFullYear())
            .filter((y): y is number => y != null)
        )
      ).sort((a, b) => a - b),
    [nameData]
  )

  // When debounced sheet changes, load names from that sheet's E5:Z5 (with cache + cancel)
  useEffect(() => {
    if (!debouncedSheet) {
      setNames([])
      setSelectedName('')
      return
    }
    const cached = namesCacheRef.current[debouncedSheet]
    if (cached) {
      setNames(cached)
      setSelectedName((prev) => (cached.includes(prev) ? prev : ''))
      return
    }
    let cancelled = false
    setError(null)
    setLoadingNames(true)
    const rangeA1 = `'${debouncedSheet}'!${NAMES_RANGE}`
    getSheetValues(rangeA1)
      .then((res) => {
        if (cancelled) return
        const rows = getValuesArray(res)
        const firstRow = rows[0] ?? []
        const list = firstRow
          .map((cell) => String(cell ?? '').trim())
          .filter(Boolean)
        namesCacheRef.current[debouncedSheet] = list
        try {
          sessionStorage.setItem(NAMES_CACHE_PREFIX + debouncedSheet, JSON.stringify(list))
        } catch {
          /* ignore */
        }
        setNames(list)
        setSelectedName((prev) => (list.includes(prev) ? prev : ''))
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load names')
        setNames([])
        setSelectedName('')
      })
      .finally(() => {
        if (!cancelled) setLoadingNames(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedSheet])

  // Persist sheet and name to localStorage so they survive refresh
  useEffect(() => {
    try {
      localStorage.setItem(
        PICKER_STORAGE_KEY,
        JSON.stringify({ sheet: selectedSheet, name: selectedName })
      )
    } catch {
      // ignore quota or private browsing
    }
  }, [selectedSheet, selectedName])

  // When debounced sheet + name selected, load dates and numbers (with cache + cancel).
  // Fetch in chunks and stop when we hit a row whose date matches today (format-agnostic).
  useEffect(() => {
    if (!debouncedSheet || !debouncedName) {
      setNameData([])
      return
    }
    if (names.length === 0) {
      // Don't clear nameData here: it may be rehydrated from sessionStorage; wait for names to load
      return
    }
    const nameIndex = names.indexOf(debouncedName)
    if (nameIndex < 0) {
      setNameData([])
      return
    }
    const cacheKey = `${debouncedSheet}|${debouncedName}`
    const cached = nameDataCacheRef.current[cacheKey]
    if (cached) {
      setNameData(cached)
      setNameDataError(null)
      return
    }

    let cancelled = false
    const colLetter = getColumnLetterForNameIndex(nameIndex)
    const today = new Date()

    setNameDataError(null)
    setLoadingNameData(true)

    const allDateRows: unknown[][] = []
    const allValueRows: unknown[][] = []

    function fetchChunk(chunkIndex: number): Promise<void> {
      if (cancelled) return Promise.resolve()
      const startRow = DATES_ROW_START + chunkIndex * CHUNK_SIZE
      const endRow = startRow + CHUNK_SIZE - 1
      const datesRange = `'${debouncedSheet}'!D${startRow}:D${endRow}`
      const valuesRange = `'${debouncedSheet}'!${colLetter}${startRow}:${colLetter}${endRow}`

      return getSheetValuesBatch([datesRange, valuesRange]).then((res) => {
        if (cancelled) return
        const dateRows = getValuesArray(res.valueRanges[0] ?? {})
        const valueRows = getValuesArray(res.valueRanges[1] ?? {})
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
        nameDataCacheRef.current[cacheKey] = rows
        try {
          sessionStorage.setItem(
            NAMEDATA_CACHE_PREFIX + debouncedSheet + '|' + debouncedName,
            JSON.stringify(rows)
          )
        } catch {
          /* ignore */
        }
        setNameData(rows)
      })
      .catch((e) => {
        if (cancelled) return
        setNameDataError(e instanceof Error ? e.message : 'Failed to load data')
        setNameData([])
      })
      .finally(() => {
        if (!cancelled) setLoadingNameData(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedSheet, debouncedName, names])

  return (
    <div className="space-y-8">
      {/* ─── Choose data ───────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <Collapsible
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          className="w-full"
        >
          <div className="flex w-full flex-wrap items-center gap-2">
            <CollapsibleTrigger className="flex w-full flex-wrap items-center gap-2 rounded-lg border-0 bg-transparent px-0 py-1 text-left text-base font-semibold uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              {selectedSheet && selectedName ? (
                <>
                  <span className="font-semibold normal-case tracking-normal text-slate-800">{SHEET_DISPLAY_NAMES[selectedSheet]}</span>
                  <span className="text-slate-400">→</span>
                  <span className="font-semibold normal-case tracking-normal text-slate-800">{selectedName}</span>
                </>
              ) : (
                'Choose data'
              )}
              <span className="ml-1 inline-block text-slate-400" aria-hidden>
                {pickerOpen ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                )}
              </span>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <p className="mt-3 text-sm text-slate-600">
              Pick a sheet and a name to view stats, chart, and history.
            </p>
            <div className="mt-5 flex flex-wrap items-end gap-4 sm:gap-6">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700">Sheet</span>
                <Select
                  value={selectedSheet || undefined}
                  onValueChange={(v) => setSelectedSheet((v || '') as SheetName | '')}
                >
                  <SelectTrigger className="min-w-[140px]">
                    <SelectValue placeholder="Select sheet…" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHEET_NAMES.map((name) => (
                      <SelectItem key={name} value={name}>
                        {SHEET_DISPLAY_NAMES[name]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <Select
                  value={selectedName || undefined}
                  onValueChange={(v) => {
                    setSelectedName(v)
                    setPickerOpen(false)
                  }}
                  disabled={!selectedSheet || loadingNames || names.length === 0}
                >
                  <SelectTrigger className="min-w-[180px]">
                    <SelectValue
                      placeholder={
                        loadingNames ? 'Loading…' : names.length === 0 ? 'No names' : 'Select name…'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {names.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
          </CollapsibleContent>
        </Collapsible>
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {selectedSheet && selectedName && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            {nameDataError && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{nameDataError}</p>
            )}
            {loadingNameData ? (
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                Loading dates & numbers…
              </div>
            ) : nameData.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                No date/number rows for this name.
              </p>
            ) : (
              <>
                {(() => {
                  const totalSum = filteredData.reduce((sum, row) => {
                    const n = Number(row.value)
                    return sum + (Number.isNaN(n) ? 0 : n)
                  }, 0)
                  const workingDays = filteredData.filter((row) => isWorkingValue(row.value)).length
                  const { longestStreak, longestTimeOff } = getStreaks(filteredData)
                  const parsedDates = filteredData
                    .map((row) => parseDateCell(row.date))
                    .filter((d): d is Date => d != null)
                  const firstDate = parsedDates.length > 0 ? new Date(Math.min(...parsedDates.map((d) => d.getTime()))) : null
                  const today = new Date()
                  const totalDays =
                    firstDate != null
                      ? Math.max(0, Math.floor((today.getTime() - firstDate.getTime()) / (86400 * 1000)) + 1)
                      : 0
                  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

                  const currentYear = today.getFullYear()
                  const isYTD = filterYear === currentYear && !filterQuarter && !filterMonth
                  const dayOfYear = getDayOfYear(today)
                  const lastYearRows = isYTD ? filterByYTDPeriod(nameData, currentYear - 1, dayOfYear) : []
                  const lastYearTotalSum = lastYearRows.reduce((sum, row) => {
                    const n = Number(row.value)
                    return sum + (Number.isNaN(n) ? 0 : n)
                  }, 0)
                  const lastYearWorkingDays = lastYearRows.filter((row) => isWorkingValue(row.value)).length
                  const lastYearStreaks = getStreaks(lastYearRows)
                  const lastYearTotalDays = dayOfYear

                  const statCards = [
                    {
                      label: 'Total count',
                      value: totalSum.toLocaleString(),
                      accent: true,
                      percentChange: isYTD ? percentChange(totalSum, lastYearTotalSum) : null,
                      higherIsBetter: true,
                      lastYearValue: lastYearTotalSum.toLocaleString(),
                    },
                    {
                      label: 'Working days',
                      value: String(workingDays),
                      accent: false,
                      percentChange: isYTD ? percentChange(workingDays, lastYearWorkingDays) : null,
                      higherIsBetter: true,
                      lastYearValue: String(lastYearWorkingDays),
                    },
                    {
                      label: 'Days covered',
                      value: `${totalDays} days`,
                      accent: false,
                      percentChange: isYTD ? percentChange(totalDays, lastYearTotalDays) : null,
                      higherIsBetter: true,
                      lastYearValue: `${lastYearTotalDays} days`,
                    },
                    {
                      label: 'Longest streak',
                      value: `${longestStreak} days`,
                      accent: false,
                      percentChange: isYTD ? percentChange(longestStreak, lastYearStreaks.longestStreak) : null,
                      higherIsBetter: true,
                      lastYearValue: `${lastYearStreaks.longestStreak} days`,
                    },
                    {
                      label: 'Longest time off',
                      value: `${longestTimeOff} days`,
                      accent: false,
                      percentChange: isYTD ? percentChange(longestTimeOff, lastYearStreaks.longestTimeOff) : null,
                      higherIsBetter: false,
                      lastYearValue: `${lastYearStreaks.longestTimeOff} days`,
                    },
                  ]

                  const daysCoveredStat = statCards.find((s) => s.label === 'Days covered')
                  const otherStats = statCards.filter((s) => s.label !== 'Days covered')

                  return (
                    <div className="space-y-6">
                      {/* Filters */}
                      <div className="flex flex-wrap items-center gap-3">
                        <Toggle
                          variant="outline"
                          pressed={
                            filterYear === new Date().getFullYear() && !filterQuarter && !filterMonth
                          }
                          onPressedChange={(pressed) => {
                            if (pressed) {
                              setFilterYear(new Date().getFullYear())
                              setFilterQuarter('')
                              setFilterMonth('')
                            } else {
                              setFilterYear('')
                              setFilterQuarter('')
                              setFilterMonth('')
                            }
                          }}
                          className="min-w-0 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-slate-700 shadow-sm hover:bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 data-[state=on]:border-blue-500 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-800 data-[state=on]:hover:bg-blue-100 data-[state=on]:hover:text-blue-800"
                        >
                          Year to Date
                        </Toggle>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                              </svg>
                              Filter
                              {(filterYear !== '' || filterQuarter !== '' || filterMonth !== '') && (
                                <span className="ml-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 px-1.5 text-xs font-medium text-blue-700">
                                  {[filterYear !== '', filterQuarter !== '', filterMonth !== ''].filter(Boolean).length}
                                </span>
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-auto p-4">
                            <div className="space-y-4">
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-slate-800">Filter by date</h4>
                                <label className="flex flex-col gap-1.5">
                                  <span className="text-xs font-medium text-slate-600">Year</span>
                                  <Select
                                    value={filterYear === '' ? '__all__' : String(filterYear)}
                                    onValueChange={(v) => setFilterYear(v === '__all__' ? '' : Number(v))}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="All years" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__all__">All years</SelectItem>
                                      {yearsInData.map((y) => (
                                        <SelectItem key={y} value={String(y)}>
                                          {y}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </label>
                                <label className="flex flex-col gap-1.5">
                                  <span className="text-xs font-medium text-slate-600">Quarter</span>
                                  <Select
                                    value={filterQuarter === '' ? '__all__' : String(filterQuarter)}
                                    onValueChange={(v) => {
                                      const q = v === '__all__' ? '' : (Number(v) as 1 | 2 | 3 | 4)
                                      setFilterQuarter(q)
                                      if (q !== '' && filterMonth !== '' && !getMonthsInQuarter(q).includes(filterMonth)) {
                                        setFilterMonth('')
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="All quarters" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__all__">All quarters</SelectItem>
                                      {(
                                        filterMonth !== ''
                                          ? [getQuarter(filterMonth) as 1 | 2 | 3 | 4]
                                          : ([1, 2, 3, 4] as const)
                                      ).map((q) => (
                                        <SelectItem key={q} value={String(q)}>
                                          Q{q}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </label>
                                <label className="flex flex-col gap-1.5">
                                  <span className="text-xs font-medium text-slate-600">Month</span>
                                  <Select
                                    value={filterMonth === '' ? '__all__' : String(filterMonth)}
                                    onValueChange={(v) => {
                                      const m = v === '__all__' ? '' : Number(v)
                                      setFilterMonth(m)
                                      if (m !== '') {
                                        setFilterQuarter(getQuarter(m) as 1 | 2 | 3 | 4)
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="All months" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__all__">All months</SelectItem>
                                      {(filterQuarter !== ''
                                        ? getMonthsInQuarter(filterQuarter)
                                        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
                                      ).map((num) => (
                                        <SelectItem key={num} value={String(num)}>
                                          {MONTH_NAMES[num - 1]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </label>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFilterYear('')
                                  setFilterQuarter('')
                                  setFilterMonth('')
                                }}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                              >
                                Reset filters
                              </button>
                            </div>
                          </PopoverContent>
                        </Popover>
                        {filteredData.length < nameData.length && (
                          <span className="text-xs text-slate-500">
                            Showing {filteredData.length} of {nameData.length} rows
                          </span>
                        )}
                      </div>

                      {/* Stats: Days covered full width, then other metrics */}
                      <div className="flex flex-col gap-3">
                        {daysCoveredStat && (
                          <div className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              {daysCoveredStat.label}
                            </p>
                            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-800">
                              {daysCoveredStat.value}
                            </p>
                            {daysCoveredStat.percentChange != null && (
                              <div className="mt-1">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="flex-shrink-0 border-0 bg-transparent p-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                                    >
                                      <Badge
                                        variant="outline"
                                        className={`cursor-pointer border-0 text-sm font-bold tabular-nums transition-colors hover:opacity-90 ${
                                          daysCoveredStat.percentChange === 0
                                            ? 'bg-slate-200 !text-slate-800'
                                            : (daysCoveredStat.percentChange > 0 && daysCoveredStat.higherIsBetter) ||
                                                (daysCoveredStat.percentChange < 0 && !daysCoveredStat.higherIsBetter)
                                              ? 'bg-emerald-200 !text-emerald-800'
                                              : 'bg-rose-200 !text-rose-800'
                                        }`}
                                      >
                                        {daysCoveredStat.percentChange > 0 ? '+' : ''}{daysCoveredStat.percentChange}%
                                      </Badge>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent align="start" side="bottom" className="z-50 w-auto p-3">
                                    <p className="text-sm text-slate-700">
                                      Same period last year: {daysCoveredStat.lastYearValue}
                                    </p>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="grid w-full grid-cols-2 gap-3">
                        {otherStats.map(({ label, value, accent, percentChange: pct, higherIsBetter, lastYearValue }) => (
                          <div
                            key={label}
                            className={`min-w-0 rounded-xl border p-4 ${
                              accent
                                ? 'border-blue-200 bg-blue-50/80'
                                : 'border-slate-200 bg-slate-50/60'
                            }`}
                          >
                            <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
                              {label}
                            </p>
                            <p className={`mt-1 text-xl font-semibold tabular-nums ${accent ? 'text-blue-700' : 'text-slate-800'}`}>
                              {value}
                            </p>
                            {pct != null && (
                              <div className="mt-1">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="border-0 bg-transparent p-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                                    >
                                      <Badge
                                        variant="outline"
                                        className={`cursor-pointer border-0 text-sm font-bold tabular-nums transition-colors hover:opacity-90 ${
                                          pct === 0
                                            ? 'bg-slate-200 !text-slate-800'
                                            : (pct > 0 && higherIsBetter) || (pct < 0 && !higherIsBetter)
                                              ? 'bg-emerald-200 !text-emerald-800'
                                              : 'bg-rose-200 !text-rose-800'
                                        }`}
                                      >
                                        {pct > 0 ? '+' : ''}{pct}%
                                      </Badge>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent align="start" side="bottom" className="z-50 w-auto p-3">
                                    <p className="text-sm text-slate-700">Same period last year: {lastYearValue}</p>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
                          </div>
                        ))}
                        </div>
                      </div>

                      {/* Chart */}
                      {chartData.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <h3 className="mb-3 text-sm font-semibold text-slate-700">Activity over time</h3>
                          <div
                            className="overflow-x-auto overflow-y-hidden rounded-lg bg-slate-50/50 scroll-smooth pb-2"
                            style={{ WebkitOverflowScrolling: 'touch' }}
                          >
                            <div className="h-[260px] min-w-[560px] pr-4">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity={0.35} />
                                      <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity={0.05} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={40} />
                                  <Tooltip
                                    contentStyle={{
                                      borderRadius: 10,
                                      border: '1px solid #e2e8f0',
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    }}
                                    labelStyle={{ color: '#334155', fontWeight: 600 }}
                                    formatter={(value: unknown): [ReactNode, string] => [
                                      value == null || value === undefined ? '—' : String(value),
                                      'Value',
                                    ]}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="rgb(59, 130, 246)"
                                    strokeWidth={2}
                                    fill="url(#areaGradient)"
                                    connectNulls
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-slate-500 sm:hidden">Swipe to view full chart</p>
                        </div>
                      )}

                      {/* Data table */}
                      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                          <h3 className="text-sm font-semibold text-slate-700">Date & value</h3>
                        </div>
                        <div className="max-h-[320px] overflow-auto">
                          <table className="min-w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-slate-100">
                              <tr>
                                <th className="px-4 py-2.5 text-left font-medium text-slate-600">Date</th>
                                <th className="px-4 py-2.5 text-left font-medium text-slate-600">Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...filteredData]
                                .sort((a, b) => {
                                  const da = parseDateCell(a.date)?.getTime() ?? 0
                                  const db = parseDateCell(b.date)?.getTime() ?? 0
                                  return db - da
                                })
                                .map((row, i) => (
                                  <tr
                                    key={i}
                                    className="border-b border-slate-100 transition-colors hover:bg-slate-50/80"
                                  >
                                    <td className="px-4 py-2.5 font-medium text-slate-800">{row.date || '—'}</td>
                                    <td className="px-4 py-2.5 tabular-nums text-slate-700">{row.value || '—'}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

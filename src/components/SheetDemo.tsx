import { type ReactNode, useState, useEffect, useMemo } from 'react'
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
import { usePicker } from '@/contexts/PickerContext'
import {
  useNameData,
  filterByDate,
  parseDateCell,
  type DateValueRow,
} from '@/hooks/useNameData'

const DEBOUNCE_MS = 400

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

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

function getQuarter(month: number): number {
  return Math.ceil(month / 3)
}

function getMonthsInQuarter(quarter: 1 | 2 | 3 | 4): number[] {
  const start = (quarter - 1) * 3 + 1
  return [start, start + 1, start + 2]
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
  const { selectedSheet, selectedName, names } = usePicker()
  const debouncedSheet = useDebouncedValue(selectedSheet, DEBOUNCE_MS)
  const debouncedName = useDebouncedValue(selectedName, DEBOUNCE_MS)
  const { nameData, loading: loadingNameData, error: nameDataError } = useNameData(
    debouncedSheet,
    debouncedName,
    names
  )

  const [filterYear, setFilterYear] = useState<number | ''>('')
  const [filterQuarter, setFilterQuarter] = useState<1 | 2 | 3 | 4 | ''>('')
  const [filterMonth, setFilterMonth] = useState<number | ''>('')

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

  if (!selectedSheet || !selectedName) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-zinc-900/40 p-12 text-center">
        <p className="text-zinc-400">Select your profile from the menu above.</p>
        <p className="mt-1 text-sm text-zinc-500">Click the circular profile button to choose a sheet and name.</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* Robinhood-style: single main section, no heavy card wrapper */}
      <div className="px-0">
        {nameDataError && (
          <p className="mb-6 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{nameDataError}</p>
        )}
        {loadingNameData ? (
          <div className="flex items-center gap-2 rounded-xl bg-zinc-900/60 px-4 py-4 text-sm text-zinc-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#00c805]" />
            Loading dates & numbers…
          </div>
        ) : nameData.length === 0 ? (
          <p className="rounded-xl bg-zinc-900/60 px-4 py-4 text-sm text-zinc-500">
            No date/number rows for this name.
          </p>
        ) : (
          (() => {
            const totalSum = filteredData.reduce((sum, row) => {
              const n = Number(row.value)
              return sum + (Number.isNaN(n) ? 0 : n)
            }, 0)
            const workingDays = filteredData.filter((row) => isWorkingValue(row.value)).length
            const { longestStreak, longestTimeOff } = getStreaks(filteredData)
            const today = new Date()
            const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            const currentYear = today.getFullYear()

            const statCards = [
              { label: 'Working days', value: String(workingDays) },
              { label: 'Days covered', value: `${filteredData.length} days` },
              { label: 'Longest streak', value: `${longestStreak} days` },
              { label: 'Longest time off', value: `${longestTimeOff} days` },
            ]

            return (
              <div className="space-y-8">
                {/* Hero: big number (Robinhood-style) */}
                <div className="pt-2 pb-4">
                  <p className="text-sm font-medium text-zinc-500">Total count</p>
                  <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-white sm:text-5xl">
                    {totalSum.toLocaleString()}
                  </p>
                </div>

                {/* Pill filters (Robinhood-style) */}
                <div className="flex flex-wrap items-center gap-2">
                  <Toggle
                    variant="outline"
                    pressed={filterYear === currentYear && !filterQuarter && !filterMonth}
                    onPressedChange={(pressed) => {
                      if (pressed) {
                        setFilterYear(currentYear)
                        setFilterQuarter('')
                        setFilterMonth('')
                      } else {
                        setFilterYear('')
                        setFilterQuarter('')
                        setFilterMonth('')
                      }
                    }}
                    className="rounded-full border border-zinc-700 bg-transparent px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800/80 data-[state=on]:border-[#00c805] data-[state=on]:bg-[#00c805]/10 data-[state=on]:text-[#00c805]"
                  >
                    YTD
                  </Toggle>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-transparent px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800/80 focus:outline-none focus:ring-2 focus:ring-[#00c805]/50 focus:ring-offset-2 focus:ring-offset-zinc-950"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        Filter
                        {(filterYear !== '' || filterQuarter !== '' || filterMonth !== '') && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#00c805]/20 px-1.5 text-xs font-semibold text-[#00c805]">
                            {[filterYear !== '', filterQuarter !== '', filterMonth !== ''].filter(Boolean).length}
                          </span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto rounded-xl border-zinc-800 bg-zinc-900 p-4 shadow-xl">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-white">Date range</h4>
                        <div className="space-y-3">
                          <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-zinc-500">Year</span>
                            <Select value={filterYear === '' ? '__all__' : String(filterYear)} onValueChange={(v) => setFilterYear(v === '__all__' ? '' : Number(v))}>
                              <SelectTrigger className="w-full rounded-lg border-zinc-700 bg-zinc-800 text-white">
                                <SelectValue placeholder="All years" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-zinc-800 bg-zinc-900">
                                <SelectItem value="__all__">All years</SelectItem>
                                {yearsInData.map((y) => (
                                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </label>
                          <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-zinc-500">Quarter</span>
                            <Select
                              value={filterQuarter === '' ? '__all__' : String(filterQuarter)}
                              onValueChange={(v) => {
                                const q = v === '__all__' ? '' : (Number(v) as 1 | 2 | 3 | 4)
                                setFilterQuarter(q)
                                if (q !== '' && filterMonth !== '' && !getMonthsInQuarter(q).includes(filterMonth)) setFilterMonth('')
                              }}
                            >
                              <SelectTrigger className="w-full rounded-lg border-zinc-700 bg-zinc-800 text-white">
                                <SelectValue placeholder="All quarters" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-zinc-800 bg-zinc-900">
                                <SelectItem value="__all__">All quarters</SelectItem>
                                {(filterMonth !== '' ? [getQuarter(filterMonth) as 1 | 2 | 3 | 4] : ([1, 2, 3, 4] as const)).map((q) => (
                                  <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </label>
                          <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-zinc-500">Month</span>
                            <Select
                              value={filterMonth === '' ? '__all__' : String(filterMonth)}
                              onValueChange={(v) => {
                                const m = v === '__all__' ? '' : Number(v)
                                setFilterMonth(m)
                                if (m !== '') setFilterQuarter(getQuarter(m) as 1 | 2 | 3 | 4)
                              }}
                            >
                              <SelectTrigger className="w-full rounded-lg border-zinc-700 bg-zinc-800 text-white">
                                <SelectValue placeholder="All months" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-zinc-800 bg-zinc-900">
                                <SelectItem value="__all__">All months</SelectItem>
                                {(filterQuarter !== '' ? getMonthsInQuarter(filterQuarter) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).map((num) => (
                                  <SelectItem key={num} value={String(num)}>{MONTH_NAMES[num - 1]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setFilterYear(''); setFilterQuarter(''); setFilterMonth('') }}
                          className="w-full rounded-full border border-zinc-700 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                        >
                          Clear
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {filteredData.length < nameData.length && (
                    <span className="text-xs text-zinc-500">{filteredData.length} of {nameData.length} rows</span>
                  )}
                </div>

                {/* Stat cards: minimal, no borders */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {statCards.map(({ label, value }) => (
                    <div key={label} className="rounded-2xl bg-zinc-900/50 px-4 py-4">
                      <p className="text-xs font-medium text-zinc-500">{label}</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-white">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Chart: clean, green gradient, minimal grid */}
                {chartData.length > 0 && (
                  <div className="rounded-2xl bg-zinc-900/50 px-4 py-5">
                    <p className="mb-4 text-sm font-medium text-zinc-500">Activity</p>
                    <div className="overflow-x-auto overflow-y-hidden rounded-xl pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <div className="h-[240px] min-w-[520px] pr-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="detailsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#00c805" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#00c805" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 2" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#71717a' }} width={36} axisLine={false} tickLine={false} />
                            <Tooltip
                              contentStyle={{
                                borderRadius: 12,
                                border: '1px solid #27272a',
                                backgroundColor: '#18181b',
                                color: '#fafafa',
                                fontSize: 12,
                              }}
                              labelStyle={{ color: '#a1a1aa', fontWeight: 600 }}
                              formatter={(value: unknown): [ReactNode, string] => [value == null || value === undefined ? '—' : String(value), 'Value']}
                              cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#00c805" strokeWidth={2} fill="url(#detailsAreaGradient)" connectNulls isAnimationActive={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500 sm:hidden">Swipe to see full chart</p>
                  </div>
                )}

                {/* Table: minimal list style */}
                <div className="rounded-2xl bg-zinc-900/50 overflow-hidden">
                  <div className="border-b border-zinc-800/80 px-4 py-3">
                    <p className="text-sm font-medium text-zinc-500">History</p>
                  </div>
                  <div className="max-h-[320px] overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Date</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">Value</th>
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
                            <tr key={i} className="border-b border-zinc-800/60 last:border-0 hover:bg-white/[0.02]">
                              <td className="px-4 py-3 font-medium text-zinc-200">{row.date || '—'}</td>
                              <td className="px-4 py-3 text-right tabular-nums text-white">{row.value || '—'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          })()
        )}
      </div>
    </div>
  )
}

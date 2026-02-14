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
import { Badge } from '@/components/ui/badge'
import { usePicker } from '@/contexts/PickerContext'
import {
  useNameData,
  filterByDate,
  filterByYTDPeriod,
  getDayOfYear,
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

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  if (current === previous) return 0
  return Math.round(((current - previous) / previous) * 100)
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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 p-12 text-center">
        <p className="text-zinc-400">Select your profile from the menu above.</p>
        <p className="mt-1 text-sm text-zinc-500">Click the circular profile button to choose a sheet and name.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8">
        <div>
            {nameDataError && (
              <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{nameDataError}</p>
            )}
            {loadingNameData ? (
              <div className="flex items-center gap-2 rounded-lg bg-zinc-800/60 px-4 py-3 text-sm text-zinc-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Loading dates & numbers…
              </div>
            ) : nameData.length === 0 ? (
              <p className="rounded-lg bg-zinc-800/60 px-4 py-3 text-sm text-zinc-500">
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
                  const today = new Date()
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
                      value: `${filteredData.length} days`,
                      accent: false,
                      percentChange: isYTD ? percentChange(filteredData.length, lastYearRows.length) : null,
                      higherIsBetter: true,
                      lastYearValue: `${lastYearRows.length} days`,
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
                              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3.5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950"
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
                                <h4 className="text-sm font-semibold text-zinc-100">Filter by date</h4>
                                <label className="flex flex-col gap-1.5">
                                  <span className="text-xs font-medium text-zinc-500">Year</span>
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
                                  <span className="text-xs font-medium text-zinc-500">Month</span>
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
                          <span className="text-xs text-zinc-500">
                            Showing {filteredData.length} of {nameData.length} rows
                          </span>
                        )}
                      </div>

                      {/* Stats: Days covered full width, then other metrics */}
                      <div className="flex flex-col gap-3">
                        {daysCoveredStat && (
                          <div className="w-full rounded-xl border border-zinc-700 bg-zinc-800/40 p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                              {daysCoveredStat.label}
                            </p>
                            <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-100">
                              {daysCoveredStat.value}
                            </p>
                            {daysCoveredStat.percentChange != null && (
                              <div className="mt-1">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="flex-shrink-0 border-0 bg-transparent p-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
                                    >
                                      <Badge
                                        variant="outline"
                                        className={`cursor-pointer border-0 text-sm font-bold tabular-nums transition-colors hover:opacity-90 ${
                                          daysCoveredStat.percentChange === 0
                                            ? 'bg-zinc-700 !text-zinc-300'
                                            : (daysCoveredStat.percentChange > 0 && daysCoveredStat.higherIsBetter) ||
                                                (daysCoveredStat.percentChange < 0 && !daysCoveredStat.higherIsBetter)
                                              ? 'bg-emerald-500/20 !text-emerald-400'
                                              : 'bg-red-500/20 !text-red-400'
                                        }`}
                                      >
                                        {daysCoveredStat.percentChange > 0 ? '+' : ''}{daysCoveredStat.percentChange}%
                                      </Badge>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent align="start" side="bottom" className="z-50 w-auto p-3">
                                    <p className="text-sm text-zinc-300">
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
                                ? 'border-emerald-700/50 bg-emerald-500/10'
                                : 'border-zinc-700 bg-zinc-800/40'
                            }`}
                          >
                            <p className="truncate text-xs font-medium uppercase tracking-wide text-zinc-500">
                              {label}
                            </p>
                            <p className={`mt-1 text-xl font-semibold tabular-nums ${accent ? 'text-emerald-400' : 'text-zinc-100'}`}>
                              {value}
                            </p>
                            {pct != null && (
                              <div className="mt-1">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="border-0 bg-transparent p-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
                                    >
                                      <Badge
                                        variant="outline"
                                        className={`cursor-pointer border-0 text-sm font-bold tabular-nums transition-colors hover:opacity-90 ${
                                          pct === 0
                                            ? 'bg-zinc-700 !text-zinc-300'
                                            : (pct > 0 && higherIsBetter) || (pct < 0 && !higherIsBetter)
                                              ? 'bg-emerald-500/20 !text-emerald-400'
                                              : 'bg-red-500/20 !text-red-400'
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
                        <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 p-4">
                          <h3 className="mb-3 text-sm font-semibold text-zinc-300">Activity over time</h3>
                          <div
                            className="overflow-x-auto overflow-y-hidden rounded-lg scroll-smooth pb-2"
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
                                    stroke="#34d399"
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
                      <div className="rounded-xl border border-zinc-700 bg-zinc-800/40">
                        <div className="border-b border-zinc-700 bg-zinc-800/60 px-4 py-3">
                          <h3 className="text-sm font-semibold text-zinc-300">Date & value</h3>
                        </div>
                        <div className="max-h-[320px] overflow-auto">
                          <table className="min-w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-zinc-800/90">
                              <tr>
                                <th className="px-4 py-2.5 text-left font-medium text-zinc-500">Date</th>
                                <th className="px-4 py-2.5 text-left font-medium text-zinc-500">Value</th>
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
                                    className="border-b border-zinc-700/50 transition-colors hover:bg-zinc-700/30"
                                  >
                                    <td className="px-4 py-2.5 font-medium text-zinc-200">{row.date || '—'}</td>
                                    <td className="px-4 py-2.5 tabular-nums text-zinc-300">{row.value || '—'}</td>
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
      </section>
    </div>
  )
}

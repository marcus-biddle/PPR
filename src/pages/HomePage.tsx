import { type ReactNode, useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Link } from 'react-router-dom'
import { usePicker } from '@/contexts/PickerContext'
import { useNameData, filterByDate, parseDateCell } from '@/hooks/useNameData'
import { useLeaderboardData } from '@/hooks/useLeaderboardData'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function HomePage() {
  const { selectedSheet, selectedName, names, SHEET_DISPLAY_NAMES } = usePicker()
  const { nameData, loading, error } = useNameData(selectedSheet, selectedName, names)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const currentMonthData = filterByDate(nameData, currentYear, '', currentMonth)

  const totalCount = currentMonthData.reduce((sum, row) => {
    const n = Number(row.value)
    return sum + (Number.isNaN(n) ? 0 : n)
  }, 0)

  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevMonthData = filterByDate(nameData, prevYear, '', prevMonth)

  const prevMonthTotal = prevMonthData.reduce((sum, row) => {
    const n = Number(row.value)
    return sum + (Number.isNaN(n) ? 0 : n)
  }, 0)

  const chartData = currentMonthData
    .map((row) => {
      const n = Number(row.value)
      const value = row.value.trim() === '' || Number.isNaN(n) ? null : n
      const d = parseDateCell(row.date)
      const dateLabel = d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : row.date || '—'
      return { date: dateLabel, value, dateTime: d?.getTime() ?? 0 }
    })
    .sort((a, b) => a.dateTime - b.dateTime)

  const monthLabel = MONTH_NAMES[currentMonth - 1]
  const sheetLabel = selectedSheet ? SHEET_DISPLAY_NAMES[selectedSheet] : ''
  const { leaderboard, loading: leaderboardLoading } = useLeaderboardData(
    selectedSheet,
    names,
    currentYear,
    currentMonth
  )

  const [carouselApi, setCarouselApi] = useState<{ scrollTo: (index: number) => void } | null>(null)

  const goalStorageKey = selectedSheet && selectedName
    ? `ppr-monthly-goal-${selectedSheet}-${selectedName}-${currentYear}-${currentMonth}`
    : null

  const [monthlyGoal, setMonthlyGoalState] = useState<number | null>(() => {
    if (!goalStorageKey || typeof window === 'undefined') return null
    const stored = localStorage.getItem(goalStorageKey)
    if (stored == null) return null
    const n = Number(stored)
    return Number.isNaN(n) || n < 1 ? null : n
  })

  const setMonthlyGoal = (value: number | null) => {
    setMonthlyGoalState(value)
    if (goalStorageKey) {
      if (value == null || value < 1) {
        localStorage.removeItem(goalStorageKey)
      } else {
        localStorage.setItem(goalStorageKey, String(Math.floor(value)))
      }
    }
  }

  useEffect(() => {
    if (!goalStorageKey) return
    const stored = localStorage.getItem(goalStorageKey)
    if (stored == null) return
    const n = Number(stored)
    setMonthlyGoalState(Number.isNaN(n) || n < 1 ? null : n)
  }, [goalStorageKey])

  useEffect(() => {
    if (!carouselApi || leaderboard.length === 0 || !selectedName) return
    const userIndex = leaderboard.findIndex((e) => e.name === selectedName)
    if (userIndex === -1) return
    const slideIndex = Math.floor(userIndex / 3)
    carouselApi.scrollTo(slideIndex)
  }, [carouselApi, leaderboard, selectedName])

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
      {error && (
        <p className="mb-6 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {/* Hero: Total count with sparkline on right */}
      <div className="mb-10 flex items-center gap-6">
        <div className="shrink-0">
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            {sheetLabel} · {monthLabel} {currentYear}
          </p>
          <p className="mt-3 text-5xl font-bold tabular-nums tracking-tight text-white sm:text-6xl">
            {loading ? '—' : totalCount.toLocaleString()}
          </p>
          <p className="mt-1.5 text-sm text-zinc-500">
            Total count this month
          </p>
        </div>
        {loading ? (
          <div className="flex shrink-0 items-center gap-2 rounded-xl bg-zinc-900/80 px-4 py-3 text-sm text-zinc-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Loading…
          </div>
        ) : chartData.length > 0 ? (
          <div className="min-w-0 flex-1">
            <ResponsiveContainer width="100%" height={48}>
              <AreaChart
                data={chartData}
                margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
              >
                <defs>
                  <linearGradient id="homeSparklineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #27272a',
                    backgroundColor: '#18181b',
                    color: '#fafafa',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#a1a1aa', fontWeight: 600, fontSize: 12 }}
                  formatter={(value: unknown): [ReactNode, string] => [
                    value == null || value === undefined ? '—' : String(value),
                    'Value',
                  ]}
                  cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#34d399"
                  strokeWidth={1.5}
                  fill="url(#homeSparklineGradient)"
                  connectNulls
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>

      {/* Leaderboard: All users with monthly count, 3 per carousel slide */}
      {(leaderboardLoading || leaderboard.length > 0) && (
        <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60">
          {leaderboardLoading ? (
            <>
              <div className="border-b border-zinc-700/80 px-4 py-3">
                <h3 className="text-sm font-semibold text-zinc-300">
                  Leaderboard this month
                </h3>
              </div>
              <div className="divide-y divide-zinc-700/50 px-4 py-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3">
                    <div className="h-6 w-6 shrink-0 rounded-full bg-zinc-700/60" />
                    <div className="h-4 flex-1 animate-pulse rounded bg-zinc-700/40" />
                    <div className="h-4 w-12 shrink-0 animate-pulse rounded bg-zinc-700/40" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Carousel
              opts={{ align: 'start', loop: false }}
              setApi={(api) => setCarouselApi(api ?? null)}
              className="w-full"
            >
              <div className="flex items-center justify-between border-b border-zinc-700/80 px-4 py-3">
                <h3 className="text-sm font-semibold text-zinc-300">
                  Leaderboard this month
                </h3>
                <div className="flex items-center gap-1">
                  <CarouselPrevious className="static flex h-8 w-8 translate-y-0 items-center justify-center rounded-md border-0 bg-transparent text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-30" />
                  <CarouselNext className="static flex h-8 w-8 translate-y-0 items-center justify-center rounded-md border-0 bg-transparent text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-30" />
                </div>
              </div>
              <div className="w-full px-4 py-4">
                <CarouselContent className="-ml-4 w-full">
                  {leaderboard.reduce<Array<typeof leaderboard>>((chunks, _, i) => {
                    if (i % 3 === 0) chunks.push(leaderboard.slice(i, i + 3))
                    return chunks
                  }, []).map((chunk, chunkIndex) => (
                    <CarouselItem key={chunkIndex} className="min-w-full basis-full pl-4">
                      <div className="w-full divide-y divide-zinc-700/50">
                        {chunk.map(({ rank, name, total }) => (
                          <div
                            key={name}
                            className={`flex w-full items-center gap-4 px-4 py-3 ${
                              name === selectedName ? 'bg-emerald-500/10' : ''
                            }`}
                          >
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                                rank === 1
                                  ? 'bg-amber-500/30 text-amber-400'
                                  : rank === 2
                                    ? 'bg-zinc-400/30 text-zinc-300'
                                    : rank === 3
                                      ? 'bg-amber-700/40 text-amber-200'
                                      : 'bg-zinc-700/60 text-zinc-400'
                              }`}
                            >
                              {rank}
                            </span>
                            <span className={`min-w-0 flex-1 truncate ${name === selectedName ? 'font-medium text-white' : 'text-zinc-300'}`}>
                              {name}
                              {name === selectedName && (
                                <span className="ml-2 text-xs text-emerald-400">(you)</span>
                              )}
                            </span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-100">
                              {total.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </div>
            </Carousel>
          )}
        </div>
      )}

      {/* Path to #1: How many per day to reach #1 */}
      {!leaderboardLoading && leaderboard.length > 0 && selectedName && (() => {
        const first = leaderboard[0]
        if (!first) return null
        const userEntry = leaderboard.find((e) => e.name === selectedName)
        const userTotal = userEntry?.total ?? totalCount
        const isFirst = first.name === selectedName
        const lastDay = new Date(currentYear, currentMonth, 0).getDate()
        const daysRemaining = Math.max(1, lastDay - now.getDate() + 1)

        if (isFirst) {
          return (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-4">
              <p className="text-sm font-medium text-emerald-400">
                You&apos;re #1!
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Keep it up to stay on top.
              </p>
            </div>
          )
        }

        const gap = Math.max(0, first.total - userTotal)
        if (gap === 0) return null

        const daysElapsed = Math.max(1, now.getDate())
        const firstPlaceAvgPerDay = first.total / daysElapsed
        const perDayRaw = (gap / daysRemaining) + firstPlaceAvgPerDay
        const perDay = Math.ceil(perDayRaw)

        return (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-4">
            <p className="text-sm font-medium text-zinc-300">
              To reach #1
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-white">
              {perDay.toLocaleString()}
              <span className="ml-2 text-base font-normal text-zinc-400">
                per day
              </span>
            </p>
            <p className="mt-1.5 text-sm text-zinc-500">
              {gap.toLocaleString()} to close the gap + ~{Math.round(firstPlaceAvgPerDay).toLocaleString()}/day to outpace {first.name}&apos;s current pace
            </p>
          </div>
        )
      })()}

      {/* Personal milestone: progress bar & goal */}
      {selectedName && !loading && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">
              Personal milestone
            </h3>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-zinc-600 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-zinc-700/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                  {monthlyGoal != null ? 'Edit goal' : 'Set goal'}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <p className="text-sm font-medium text-zinc-300">
                  Monthly count goal
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {monthLabel} {currentYear}
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={monthlyGoal ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === '') setMonthlyGoal(null)
                      else {
                        const n = parseInt(v, 10)
                        if (!Number.isNaN(n) && n >= 1) setMonthlyGoal(n)
                      }
                    }}
                    placeholder="e.g. 500"
                    className="flex-1 rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setMonthlyGoal(null)}
                    className="rounded-md border border-zinc-600 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
                  >
                    Clear
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Progress bar: beat last month */}
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span>You: {totalCount.toLocaleString()}</span>
            <span>Last month: {prevMonthTotal.toLocaleString()}</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-700/60">
            <div
              className="h-full rounded-full bg-emerald-500/80 transition-all duration-500"
              style={{
                width: prevMonthTotal > 0
                  ? `${Math.min(100, (totalCount / prevMonthTotal) * 100)}%`
                  : totalCount > 0 ? '100%' : '0%',
              }}
            />
          </div>
          {prevMonthTotal > 0 && totalCount >= prevMonthTotal && (
            <p className="mt-1.5 text-xs font-medium text-emerald-400">
              You&apos;ve beaten last month!
            </p>
          )}

          {monthlyGoal != null && monthlyGoal >= 1 ? (
            <>
              {(() => {
                const gap = monthlyGoal - totalCount
                if (gap <= 0) return null

                const roundToNice = (n: number): number => {
                  if (n < 10) return Math.ceil(n / 5) * 5
                  if (n < 100) return Math.ceil(n / 10) * 10
                  if (n < 1000) return Math.ceil(n / 25) * 25
                  return Math.ceil(n / 50) * 50
                }

                const NUM_STEPS = 4
                const milestones: number[] = []
                for (let i = 1; i < NUM_STEPS; i++) {
                  const raw = totalCount + (gap * i) / NUM_STEPS
                  const nice = roundToNice(raw)
                  if (nice > totalCount && nice <= monthlyGoal && !milestones.includes(nice)) {
                    milestones.push(nice)
                  }
                }
                if (!milestones.includes(monthlyGoal)) {
                  milestones.push(monthlyGoal)
                }
                milestones.sort((a, b) => a - b)

                return milestones.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Milestone plan
                    </p>
                    {milestones.map((target) => {
                      const needed = Math.max(0, target - totalCount)
                      const isGoal = target === monthlyGoal
                      return (
                        <div
                          key={target}
                          className="flex items-center justify-between rounded-lg border border-zinc-700/60 bg-zinc-800/40 px-3 py-2"
                        >
                          <span className="text-sm text-zinc-300">
                            {isGoal ? `Goal (${target.toLocaleString()})` : target.toLocaleString()}
                          </span>
                          <span className="text-sm font-medium tabular-nums text-white">
                            {needed > 0 ? `${needed.toLocaleString()} to go` : 'Reached'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : null
              })()}
            </>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              Set a monthly count goal to track milestones toward your target.
            </p>
          )}
        </div>
      )}

      <div className="mt-8">
            <Link
              to="/details"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              View full details & filters
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
        </Link>
      </div>
    </div>
  )
}

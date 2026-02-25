import { type ReactNode, useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { usePicker } from '@/contexts/PickerContext'
import { useNameData, filterByDate, parseDateCell } from '@/hooks/useNameData'
import { useLeaderboardData, useLeaderboardDataForQuarter, useLeaderboardDataForYear } from '@/hooks/useLeaderboardData'
import { useMedalTotals } from '@/hooks/useMedalTotals'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Crown, Flame, Medal, Trophy } from 'lucide-react'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Badge for monthly rank. Matches Medals page "Month to month": Medal (1st & 2nd), text badge (3rd). */
function MonthlyRankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-sm" title="1st place this month">
        <Medal className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
        <span className="font-medium tabular-nums text-amber-400">#{rank}</span>
        <span className="text-amber-400/90">this month</span>
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-400/15 px-2.5 py-1 text-sm" title="2nd place this month">
        <Medal className="h-4 w-4 shrink-0 text-zinc-300" aria-hidden />
        <span className="font-medium tabular-nums text-zinc-300">#{rank}</span>
        <span className="text-zinc-400/90">this month</span>
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-700/20 px-2.5 py-1 text-sm" title="3rd place this month">
        <span className="font-medium tabular-nums text-amber-200">#{rank}</span>
        <span className="text-amber-200/80">this month</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-700/50 px-2.5 py-1 text-sm" title={`Rank #${rank} this month`}>
      <span className="font-medium tabular-nums text-zinc-400">#{rank}</span>
      <span className="text-zinc-500">this month</span>
    </span>
  )
}

/** Top-3 badge for quarter or year. Matches Medals page: Quarter = Crown/Trophy, Year = Goat/Flame; 3rd = text badge. */
function Top3PeriodBadge({
  rank,
  periodLabel,
  period,
}: {
  rank: number
  periodLabel: string
  period: 'quarter' | 'year'
}) {
  if (rank === 1) {
    return period === 'quarter' ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-sm" title={`1st place ${periodLabel}`}>
        <Crown className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
        <span className="font-medium tabular-nums text-amber-400">#{rank}</span>
        <span className="text-amber-400/90">{periodLabel}</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-sm text-amber-400" title={`1st place ${periodLabel} · GOAT`}>
        <span className="text-sm leading-none shrink-0" aria-hidden>🐐</span>
        <span className="font-medium tabular-nums">#{rank}</span>
        <span className="text-amber-400/90">{periodLabel}</span>
      </span>
    )
  }
  if (rank === 2) {
    return period === 'quarter' ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-400/15 px-2.5 py-1 text-sm" title={`2nd place ${periodLabel}`}>
        <Trophy className="h-4 w-4 shrink-0 text-zinc-300" aria-hidden />
        <span className="font-medium tabular-nums text-zinc-300">#{rank}</span>
        <span className="text-zinc-400/90">{periodLabel}</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-400/15 px-2.5 py-1 text-sm" title={`2nd place ${periodLabel}`}>
        <Flame className="h-4 w-4 shrink-0 text-zinc-300" aria-hidden />
        <span className="font-medium tabular-nums text-zinc-300">#{rank}</span>
        <span className="text-zinc-400/90">{periodLabel}</span>
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-700/20 px-2.5 py-1 text-sm" title={`3rd place ${periodLabel}`}>
        <span className="font-medium tabular-nums text-amber-200">#{rank}</span>
        <span className="text-amber-200/80">{periodLabel}</span>
      </span>
    )
  }
  return null
}

export function HomePage() {
  const { selectedSheet, selectedName, names, SHEET_NAMES, SHEET_DISPLAY_NAMES } = usePicker()
  const { nameData, loading, error } = useNameData(selectedSheet, selectedName, names)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const currentMonthData = filterByDate(nameData, currentYear, '', currentMonth)

  const totalCount = currentMonthData.reduce((sum, row) => {
    const n = Number(row.value)
    return sum + (Number.isNaN(n) ? 0 : n)
  }, 0)

  // Stats: today's count, daily average this month, same day last year, average same day in previous years
  const daysElapsedThisMonth = Math.max(1, now.getDate())
  const dailyAvgThisMonth = totalCount / daysElapsedThisMonth
  const thisMonth = now.getMonth()
  const thisDay = now.getDate()
  const todayRow = nameData.find((row) => {
    const d = parseDateCell(row.date)
    return d && d.getFullYear() === currentYear && d.getMonth() === thisMonth && d.getDate() === thisDay
  })
  const todayCount = todayRow != null ? (Number(todayRow.value) || 0) : null
  const lastYearSameDayRow = nameData.find((row) => {
    const d = parseDateCell(row.date)
    return d && d.getFullYear() === currentYear - 1 && d.getMonth() === thisMonth && d.getDate() === thisDay
  })
  const lastYearSameDayCount = lastYearSameDayRow ? (Number(lastYearSameDayRow.value) || 0) : null
  const previousYearsSameDayRows = nameData.filter((row) => {
    const d = parseDateCell(row.date)
    return d && d.getFullYear() < currentYear && d.getMonth() === thisMonth && d.getDate() === thisDay
  })
  const previousYearsSameDayValues = previousYearsSameDayRows
    .map((row) => Number(row.value))
    .filter((n) => !Number.isNaN(n))
  const avgPreviousYearsSameDay =
    previousYearsSameDayValues.length > 0
      ? previousYearsSameDayValues.reduce((a, b) => a + b, 0) / previousYearsSameDayValues.length
      : null

  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevMonthData = filterByDate(nameData, prevYear, '', prevMonth)

  const prevMonthTotal = prevMonthData.reduce((sum, row) => {
    const n = Number(row.value)
    return sum + (Number.isNaN(n) ? 0 : n)
  }, 0)

  // Exhaustion: sustainable pace (last year same month, or last month as fallback) vs current pace
  const lastYearSameMonthData = filterByDate(nameData, currentYear - 1, '', currentMonth)
  const lastYearSameMonthTotal = lastYearSameMonthData.reduce((sum, row) => {
    const n = Number(row.value)
    return sum + (Number.isNaN(n) ? 0 : n)
  }, 0)
  const daysInLastYearMonth = new Date(currentYear - 1, currentMonth, 0).getDate()
  const lastMonthDays = new Date(prevYear, prevMonth, 0).getDate()
  const sustainableDaily =
    daysInLastYearMonth > 0 && lastYearSameMonthTotal > 0
      ? lastYearSameMonthTotal / daysInLastYearMonth
      : lastMonthDays > 0 && prevMonthTotal > 0
        ? prevMonthTotal / lastMonthDays
        : null
  const sustainableLabel =
    daysInLastYearMonth > 0 && lastYearSameMonthTotal > 0
      ? `${MONTH_NAMES[currentMonth - 1]} last year`
      : lastMonthDays > 0 && prevMonthTotal > 0
        ? `${MONTH_NAMES[prevMonth - 1]}`
        : ''
  const expectedByToday = sustainableDaily != null ? sustainableDaily * daysElapsedThisMonth : null
  const restDebtDays = expectedByToday != null && sustainableDaily != null && sustainableDaily > 0
    ? (totalCount - expectedByToday) / sustainableDaily
    : null
  const paceVsSustainable = sustainableDaily != null && sustainableDaily > 0
    ? (dailyAvgThisMonth / sustainableDaily) * 100
    : null

  const chartData = currentMonthData
    .map((row) => {
      const n = Number(row.value)
      const value = row.value.trim() === '' || Number.isNaN(n) ? null : n
      const d = parseDateCell(row.date)
      const dateLabel = d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : row.date || '—'
      return { date: dateLabel, value, dateTime: d?.getTime() ?? 0 }
    })
    .sort((a, b) => a.dateTime - b.dateTime)

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const barDataByDay = currentMonthData.reduce<number[]>((acc, row) => {
    const d = parseDateCell(row.date)
    const n = Number(row.value)
    const value = row.value.trim() === '' || Number.isNaN(n) ? 0 : n
    if (d) {
      const dayIndex = d.getDay()
      acc[dayIndex] = (acc[dayIndex] ?? 0) + value
    }
    return acc
  }, [])
  const barDataTotal = DAY_NAMES.map((day, i) => ({
    day,
    value: barDataByDay[i] ?? 0,
  }))
  // Average: same month across all years (current + previous)
  const allYearsMonthData = filterByDate(nameData, '', '', currentMonth)
  const { sumsByDay: avgSumsByDay, countsByDay: avgCountsByDay } = allYearsMonthData.reduce<{
    sumsByDay: number[]
    countsByDay: number[]
  }>(
    (acc, row) => {
      const d = parseDateCell(row.date)
      const n = Number(row.value)
      const value = row.value.trim() === '' || Number.isNaN(n) ? 0 : n
      if (d) {
        const dayIndex = d.getDay()
        acc.sumsByDay[dayIndex] = (acc.sumsByDay[dayIndex] ?? 0) + value
        acc.countsByDay[dayIndex] = (acc.countsByDay[dayIndex] ?? 0) + 1
      }
      return acc
    },
    { sumsByDay: [], countsByDay: [] }
  )
  const barDataAverage = DAY_NAMES.map((day, i) => ({
    day,
    value: (avgCountsByDay[i] ?? 0) > 0 ? (avgSumsByDay[i] ?? 0) / (avgCountsByDay[i] ?? 1) : 0,
  }))

  const monthLabel = MONTH_NAMES[currentMonth - 1]
  const sheetLabel = selectedSheet ? SHEET_DISPLAY_NAMES[selectedSheet] : ''
  const { totals: medalTotals, loading: medalsLoading, loadTotals: loadMedalTotals, hasDataForYear: hasMedalData } = useMedalTotals(currentYear, SHEET_NAMES)
  const userMedal = selectedName ? medalTotals.byYear.find((m) => m.name === selectedName) : null

  const { leaderboard, loading: leaderboardLoading } = useLeaderboardData(
    selectedSheet,
    names,
    currentYear,
    currentMonth
  )
  const { leaderboard: quarterLeaderboard } = useLeaderboardDataForQuarter(
    selectedSheet,
    names,
    currentYear,
    currentMonth
  )
  const { leaderboard: yearLeaderboard } = useLeaderboardDataForYear(
    selectedSheet,
    names,
    currentYear,
    currentMonth
  )
  const userRank = selectedName ? leaderboard.find((e) => e.name === selectedName)?.rank : null
  const userQuarterRank = selectedName ? quarterLeaderboard.find((e) => e.name === selectedName)?.rank ?? null : null
  const userYearRank = selectedName ? yearLeaderboard.find((e) => e.name === selectedName)?.rank ?? null : null
  const showQuarterBadge = userQuarterRank != null && userQuarterRank >= 1 && userQuarterRank <= 3
  const showYearBadge = userYearRank != null && userYearRank >= 1 && userYearRank <= 3
  const showTop3PeriodBadges = showQuarterBadge || showYearBadge

  const [carouselApi, setCarouselApi] = useState<{ scrollTo: (index: number) => void } | null>(null)
  const [dayOfWeekMetric, setDayOfWeekMetric] = useState<'total' | 'average'>('total')

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

      {/* Badges row: monthly rank + quarter/year top-3 */}
      {(userRank != null || leaderboardLoading || showTop3PeriodBadges) && (
        <div className="flex flex-wrap items-center gap-2">
          {userRank != null && <MonthlyRankBadge rank={userRank} />}
          {leaderboardLoading && userRank == null && selectedName && (
            <span className="text-sm text-zinc-500">Loading rank…</span>
          )}
          {showQuarterBadge && (
            <Top3PeriodBadge
              rank={userQuarterRank!}
              periodLabel={`Q${Math.ceil(currentMonth / 3)} ${currentYear}`}
              period="quarter"
            />
          )}
          {showYearBadge && (
            <Top3PeriodBadge rank={userYearRank!} periodLabel={`${currentYear}`} period="year" />
          )}
        </div>
      )}

      {/* Stats — minimal list (consider shadcn Card + Separator for more polish) */}
      {selectedSheet && selectedName && (
        <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30">
          <dl className="divide-y divide-zinc-800/60">
            <div className="flex items-center justify-between px-3 py-2">
              <dt className="text-xs text-zinc-500">Today&apos;s count</dt>
              <dd className="text-sm font-medium tabular-nums text-[#00C805]">
                {loading ? '—' : todayCount !== null ? todayCount.toLocaleString() : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <dt className="text-xs text-zinc-500">Same day last year</dt>
              <dd className="text-sm font-medium tabular-nums text-zinc-200">
                {loading ? '—' : lastYearSameDayCount !== null ? lastYearSameDayCount.toLocaleString() : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <dt className="text-xs text-zinc-500">Avg this date (past years)</dt>
              <dd className="text-sm font-medium tabular-nums text-zinc-200">
                {loading ? '—' : avgPreviousYearsSameDay !== null ? avgPreviousYearsSameDay.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <dt className="text-xs text-zinc-500">Avg/day this month</dt>
              <dd className="text-sm font-medium tabular-nums text-zinc-200">
                {loading ? '—' : dailyAvgThisMonth.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Exhaustion: pace vs sustainable / rest debt */}
      {selectedSheet && selectedName && !loading && sustainableDaily != null && sustainableDaily > 0 && (
        <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-500">
              Pace vs {sustainableLabel}
            </span>
            <span className="text-xs font-medium tabular-nums text-zinc-300">
              {paceVsSustainable != null ? `${Math.round(paceVsSustainable)}%` : '—'}
            </span>
          </div>
          <Progress
            value={Math.min(100, paceVsSustainable ?? 0)}
            className="mt-1.5 h-1.5 min-w-0"
          />
          {restDebtDays != null && (
            <p className={`mt-1 text-[11px] ${restDebtDays >= 0 ? 'text-amber-400/80' : 'text-emerald-400/80'}`}>
              {restDebtDays >= 0
                ? `~${Math.round(restDebtDays)} day${Math.round(restDebtDays) === 1 ? '' : 's'} ahead`
                : `~${Math.round(-restDebtDays)} day${Math.round(-restDebtDays) === 1 ? '' : 's'} below`}
            </p>
          )}
        </div>
      )}

      {/* Bar chart: count by day of week this month */}
      {!loading && barDataTotal.some((d) => d.value > 0) && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-300">
              {dayOfWeekMetric === 'total' ? 'Total' : 'Average'} count by day of week · {monthLabel}
              {dayOfWeekMetric === 'average' && ' (all years)'}
            </h3>
            <Select value={dayOfWeekMetric} onValueChange={(v) => setDayOfWeekMetric(v as 'total' | 'average')}>
              <SelectTrigger className="h-8 w-[7.5rem] border-zinc-700 bg-zinc-800/80 text-xs text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[8rem] border-zinc-700 bg-zinc-800 text-zinc-200">
                <SelectItem value="total" className="text-zinc-200 focus:bg-zinc-700 focus:text-white">
                  Total
                </SelectItem>
                <SelectItem value="average" className="text-zinc-200 focus:bg-zinc-700 focus:text-white">
                  Average
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3 h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dayOfWeekMetric === 'total' ? barDataTotal : barDataAverage}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  axisLine={{ stroke: '#3f3f46' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)))}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #27272a',
                    backgroundColor: '#18181b',
                    color: '#fafafa',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                    fontSize: 12,
                  }}
                  formatter={(value: unknown): [ReactNode, string] => [
                    value != null ? (dayOfWeekMetric === 'average' ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 }) : Number(value).toLocaleString()) : '—',
                    dayOfWeekMetric === 'average' ? 'Avg' : 'Count',
                  ]}
                  cursor={{ fill: '#27272a' }}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="value"
                  fill="#34d399"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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

      {/* Your medals this year (active user only) */}
      {selectedName && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center justify-between border-b border-zinc-700/80 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-300">
              Your medals · {currentYear}
            </h3>
            <div className="flex items-center gap-2">
              {!hasMedalData && (
                <button
                  type="button"
                  onClick={() => loadMedalTotals()}
                  disabled={medalsLoading}
                  className="text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300 disabled:opacity-50"
                >
                  {medalsLoading ? 'Loading…' : 'Load'}
                </button>
              )}
              <Link
                to="/medals"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
                aria-label="View medals page"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </div>
          </div>
          <div className="px-4 py-4">
            {medalsLoading ? (
              <div className="flex items-end justify-between gap-4">
                <div className="flex gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="h-3 w-12 animate-pulse rounded bg-zinc-700/60" />
                      <div className="h-8 w-8 animate-pulse rounded bg-zinc-700/40" />
                    </div>
                  ))}
                </div>
              </div>
            ) : userMedal ? (
              <div className="flex items-end justify-between gap-4">
                <div className="flex gap-4 sm:gap-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-amber-400/80">Gold</span>
                    <span className="text-2xl font-bold tabular-nums text-amber-400 sm:text-3xl">{userMedal.gold}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Silver</span>
                    <span className="text-2xl font-bold tabular-nums text-zinc-300 sm:text-3xl">{userMedal.silver}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-amber-200/80">Bronze</span>
                    <span className="text-2xl font-bold tabular-nums text-amber-200/90 sm:text-3xl">{userMedal.bronze}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Score</span>
                  <p className="text-lg font-bold tabular-nums text-zinc-100">
                    {userMedal.gold * 3 + userMedal.silver * 2 + userMedal.bronze}
                  </p>
                </div>
              </div>
            ) : hasMedalData ? (
              <p className="text-sm text-zinc-500">No medals yet this year.</p>
            ) : (
              <p className="text-sm text-zinc-500">
                Load medal totals to see your count.
              </p>
            )}
          </div>
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

                const lastDay = new Date(currentYear, currentMonth, 0).getDate()
                const daysRemaining = Math.max(1, lastDay - now.getDate() + 1)
                const perDay = Math.ceil(gap / daysRemaining)

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

                return (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                      <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">
                        Daily target to reach goal
                      </p>
                      <p className="mt-1 text-lg font-bold tabular-nums text-white">
                        {perDay.toLocaleString()}
                        <span className="ml-1.5 text-sm font-normal text-zinc-400">
                          per day
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {gap.toLocaleString()} to go in {daysRemaining} day{daysRemaining === 1 ? '' : 's'}
                      </p>
                    </div>
                    {milestones.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Milestone plan · dates at {perDay}/day pace
                      </p>
                      {milestones.map((target) => {
                        const needed = Math.max(0, target - totalCount)
                        const isGoal = target === monthlyGoal
                        const daysToReach = Math.ceil(needed / perDay)
                        const projectedDate = new Date(now)
                        projectedDate.setDate(projectedDate.getDate() + daysToReach)
                        const lastDayOfMonth = new Date(currentYear, currentMonth - 1, lastDay)
                        const cappedDate = projectedDate > lastDayOfMonth ? lastDayOfMonth : projectedDate
                        const dateLabel = cappedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        return (
                          <div
                            key={target}
                            className="flex items-center justify-between rounded-lg border border-zinc-700/60 bg-zinc-800/40 px-3 py-2"
                          >
                            <span className="text-sm text-zinc-300">
                              {isGoal ? `Goal (${target.toLocaleString()})` : target.toLocaleString()}
                            </span>
                            <span className="text-sm font-medium tabular-nums text-white">
                              by {dateLabel}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    )}
                  </div>
                )
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

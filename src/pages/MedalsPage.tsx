import { useState, useEffect } from 'react'
import { usePicker } from '@/contexts/PickerContext'
import { useLeaderboardData } from '@/hooks/useLeaderboardData'
import { useMedalTotals } from '@/hooks/useMedalTotals'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SheetName } from '@/contexts/PickerContext'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const MONTH_OPTIONS = MONTH_NAMES.map((name, i) => ({ value: String(i + 1), label: name }))

function getYearOptions(): { value: string; label: string }[] {
  const current = new Date().getFullYear()
  return [
    { value: String(current), label: String(current) },
    { value: String(current - 1), label: String(current - 1) },
    { value: String(current - 2), label: String(current - 2) },
  ]
}

function MedalIcon({ type }: { type: 'gold' | 'silver' | 'bronze' }) {
  const colors = {
    gold: 'bg-amber-500/25 text-amber-400',
    silver: 'bg-zinc-400/25 text-zinc-300',
    bronze: 'bg-amber-700/30 text-amber-200',
  }
  const icons = {
    gold: '🥇',
    silver: '🥈',
    bronze: '🥉',
  }
  return (
    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg ${colors[type]}`}>
      {icons[type]}
    </span>
  )
}

export function MedalsPage() {
  const { selectedSheet, setSelectedSheet, selectedName, names, loadingNames, SHEET_NAMES, SHEET_DISPLAY_NAMES } = usePicker()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  const activeSheet: SheetName = selectedSheet || SHEET_NAMES[0]

  useEffect(() => {
    if (!selectedSheet && SHEET_NAMES.length > 0) {
      setSelectedSheet(SHEET_NAMES[0])
    }
  }, [selectedSheet, SHEET_NAMES, setSelectedSheet])

  const namesForSheet = loadingNames ? [] : names

  const { leaderboard, loading: leaderboardLoading, error: leaderboardError } = useLeaderboardData(
    activeSheet,
    namesForSheet,
    selectedYear,
    selectedMonth
  )

  const { totals, loading: totalsLoading, error: totalsError, loadTotals, hasDataForYear } = useMedalTotals(selectedYear, SHEET_NAMES)

  const podium = leaderboard.filter((e) => e.rank <= 3)
  const yearOptions = getYearOptions()

  return (
    <div className="space-y-6 sm:space-y-8">
      {(leaderboardError || totalsError) && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {leaderboardError ?? totalsError}
        </p>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
          Medals
        </h2>
        <p className="mt-1 text-sm text-zinc-500 sm:mt-1.5 sm:text-base">
          Gold (1st), silver (2nd), bronze (3rd) by month and year
        </p>
      </div>

      {/* Month & Year selectors */}
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[120px]">
          <label htmlFor="medals-month" className="mb-1 block text-xs font-medium text-zinc-500">
            Month
          </label>
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger id="medals-month" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[100px]">
          <label htmlFor="medals-year" className="mb-1 block text-xs font-medium text-zinc-500">
            Year
          </label>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger id="medals-year" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Podium for selected month: tabs per sheet */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-300">
          {MONTH_NAMES[selectedMonth - 1]} {selectedYear} · Podium
        </h3>
        <Tabs value={activeSheet} onValueChange={(v) => setSelectedSheet(v as SheetName)}>
          <TabsList variant="line" className="mb-4 gap-2 sm:gap-6">
            {SHEET_NAMES.map((sheet) => (
              <TabsTrigger key={sheet} value={sheet} variant="line">
                {SHEET_DISPLAY_NAMES[sheet]}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={activeSheet}>
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
              {leaderboardLoading || leaderboard.length === 0 ? (
                <div className="space-y-0 divide-y divide-zinc-700/50">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-6">
                      <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-700/60 animate-pulse" />
                      <div className="h-5 flex-1 max-w-[120px] rounded bg-zinc-700/40 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : podium.length === 0 ? (
                <div className="px-4 py-10 text-center sm:py-12 sm:px-6">
                  <p className="text-zinc-500">No medal data for this month.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-700/50">
                  {podium.map((entry) => {
                    const medalType = entry.rank === 1 ? 'gold' : entry.rank === 2 ? 'silver' : 'bronze'
                    const isYou = entry.name === selectedName
                    return (
                      <div
                        key={entry.name}
                        className={`flex items-center gap-4 px-4 py-4 sm:px-6 ${isYou ? 'bg-emerald-500/10' : ''}`}
                      >
                        <MedalIcon type={medalType} />
                        <div className="min-w-0 flex-1">
                          <span className={`block truncate font-medium ${isYou ? 'text-white' : 'text-zinc-200'}`}>
                            {entry.name}
                            {isYou && (
                              <span className="ml-2 text-xs font-normal text-emerald-400">You</span>
                            )}
                          </span>
                        </div>
                        <span className="shrink-0 text-sm text-zinc-500">
                          {entry.total.toLocaleString()} count
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Medal totals for selected year */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-300">
            {selectedYear} totals
          </h3>
          {hasDataForYear && (
            <button
              type="button"
              onClick={loadTotals}
              disabled={totalsLoading}
              className="text-xs text-zinc-500 transition-colors hover:text-zinc-400 disabled:opacity-50"
              aria-label="Refresh totals"
            >
              Refresh
            </button>
          )}
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
          {!hasDataForYear && !totalsLoading ? (
            <div className="px-4 py-10 text-center sm:py-12 sm:px-6">
              <p className="mb-4 text-sm text-zinc-500">
                Load medal totals for {selectedYear}. This may take a minute to avoid API rate limits.
              </p>
              <button
                type="button"
                onClick={loadTotals}
                disabled={totalsLoading}
                className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-zinc-700/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50"
              >
                Load year totals
              </button>
            </div>
          ) : totalsLoading ? (
            <div className="space-y-0 divide-y divide-zinc-700/50">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-6">
                  <div className="h-5 flex-1 max-w-[100px] rounded bg-zinc-700/40 animate-pulse" />
                  <div className="h-5 w-12 rounded bg-zinc-700/40 animate-pulse" />
                  <div className="h-5 w-12 rounded bg-zinc-700/40 animate-pulse" />
                  <div className="h-5 w-12 rounded bg-zinc-700/40 animate-pulse" />
                </div>
              ))}
            </div>
          ) : totals.length === 0 ? (
            <div className="px-4 py-10 text-center sm:py-12 sm:px-6">
              <p className="text-zinc-500">No medals in {selectedYear}.</p>
            </div>
          ) : (
            <>
              <div className="border-b border-zinc-700/50 px-4 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500 sm:px-6">
                <div className="flex items-center gap-4">
                  <span className="flex-1">Name</span>
                  <span className="w-10 text-center">🥇</span>
                  <span className="w-10 text-center">🥈</span>
                  <span className="w-10 text-center">🥉</span>
                </div>
              </div>
              <div className="divide-y divide-zinc-700/50">
                {totals.map((t) => {
                  const isYou = t.name === selectedName
                  return (
                    <div
                      key={t.name}
                      className={`flex items-center gap-4 px-4 py-3.5 sm:px-6 sm:py-4 ${isYou ? 'bg-emerald-500/10' : ''}`}
                    >
                      <span className={`min-w-0 flex-1 truncate font-medium ${isYou ? 'text-white' : 'text-zinc-200'}`}>
                        {t.name}
                        {isYou && (
                          <span className="ml-2 text-xs font-normal text-emerald-400">You</span>
                        )}
                      </span>
                      <span className="w-10 text-center text-sm font-bold tabular-nums text-amber-400">
                        {t.gold}
                      </span>
                      <span className="w-10 text-center text-sm font-bold tabular-nums text-zinc-300">
                        {t.silver}
                      </span>
                      <span className="w-10 text-center text-sm font-bold tabular-nums text-amber-200">
                        {t.bronze}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

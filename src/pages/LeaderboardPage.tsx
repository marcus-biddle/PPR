import { useEffect } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip } from 'recharts'
import { usePicker } from '@/contexts/PickerContext'
import { useLeaderboardData } from '@/hooks/useLeaderboardData'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { SheetName } from '@/contexts/PickerContext'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const EMPTY_NAMES: string[] = []

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/25 text-sm font-bold tabular-nums text-amber-400">
        {rank}
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-400/25 text-sm font-bold tabular-nums text-zinc-300">
        {rank}
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-700/30 text-sm font-bold tabular-nums text-amber-200">
        {rank}
      </span>
    )
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700/60 text-sm font-semibold tabular-nums text-zinc-400">
      {rank}
    </span>
  )
}

export function LeaderboardPage() {
  const { selectedSheet, setSelectedSheet, selectedName, names, loadingNames, SHEET_NAMES, SHEET_DISPLAY_NAMES } = usePicker()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const monthLabel = MONTH_NAMES[currentMonth - 1]

  const activeSheet: SheetName = selectedSheet || SHEET_NAMES[0]

  useEffect(() => {
    if (!selectedSheet && SHEET_NAMES.length > 0) {
      setSelectedSheet(SHEET_NAMES[0])
    }
  }, [selectedSheet, SHEET_NAMES, setSelectedSheet])

  // Only pass names after they've loaded for the active sheet. Otherwise we'd request
  // the new sheet with the previous sheet's name count and hit Sheets API "grid limit" errors.
  // Use a stable empty array to avoid infinite re-renders ([] creates a new reference each render).
  const namesForSheet = loadingNames ? EMPTY_NAMES : names

  const { leaderboard, loading, error, refresh } = useLeaderboardData(
    activeSheet,
    namesForSheet,
    currentYear,
    currentMonth
  )

  return (
    <div className="space-y-6 sm:space-y-8">
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {/* Header: title + graph same row on all sizes */}
      <div className="flex items-center gap-3 sm:gap-6">
        <div className="min-w-0 shrink-0">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Leaderboard
          </h2>
          <p className="mt-1 text-sm text-zinc-500 sm:mt-1.5 sm:text-base">
            {monthLabel} {currentYear}
          </p>
        </div>
        {loading || leaderboard.length === 0 ? (
          <div className="ml-auto h-12 w-[100px] shrink-0 rounded bg-zinc-800/50 sm:w-24" aria-hidden />
        ) : (() => {
          const chartData = leaderboard.filter((e) => e.total > 0)
          return chartData.length === 0 ? (
            <div className="ml-auto h-12 w-[100px] shrink-0 rounded bg-zinc-800/50 sm:w-24" aria-hidden />
          ) : (
          <div className="ml-auto w-[100px] shrink-0 sm:w-[180px]" style={{ height: 64 }}>
            <ResponsiveContainer width="100%" height={64}>
              <BarChart
                data={chartData}
                margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                barCategoryGap="0%"
                barSize={12}
              >
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #27272a',
                    backgroundColor: '#18181b',
                    color: '#fafafa',
                    fontSize: 12,
                  }}
                  formatter={(value: number | undefined) => [value != null ? value.toLocaleString() : '—', 'Count']}
                  labelFormatter={(_, payload) => payload[0]?.payload?.name ?? ''}
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="total"
                  fill="#34d399"
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          )
        })()}
      </div>

      {/* Tabs + refresh: full-width tabs on mobile, touch-friendly */}
      <Tabs
        value={activeSheet}
        onValueChange={(value) => setSelectedSheet(value as SheetName)}
      >
        <div className="flex flex-nowrap items-center gap-2">
          <TabsList variant="line" className="min-h-[44px] min-w-0 flex-1 gap-2 sm:gap-6">
            {SHEET_NAMES.map((sheet) => (
              <TabsTrigger key={sheet} value={sheet} variant="line" className="min-h-[44px] min-w-0 flex-1 truncate sm:flex-none">
                {SHEET_DISPLAY_NAMES[sheet]}
              </TabsTrigger>
            ))}
          </TabsList>
          <button
            type="button"
            onClick={refresh}
            disabled={loading || loadingNames}
            className="flex h-10 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:pointer-events-none sm:py-1.5"
            aria-label="Refresh leaderboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            Refresh
          </button>
        </div>

        <TabsContent value={activeSheet} className="mt-4">
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
            {loading ? (
              <div className="divide-y divide-zinc-700/50">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:py-4 sm:px-6">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-700/60 animate-pulse" />
                    <div className="h-5 flex-1 max-w-[120px] rounded bg-zinc-700/40 animate-pulse sm:max-w-[140px]" />
                    <div className="h-6 w-14 shrink-0 rounded bg-zinc-700/40 animate-pulse sm:w-16" />
                  </div>
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="px-4 py-10 text-center sm:py-12 sm:px-6">
                <p className="text-zinc-500">No data for this month yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-700/50">
                {leaderboard.map((entry) => {
                  const isYou = entry.name === selectedName
                  return (
                    <div
                      key={entry.name}
                      className={`flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:py-4 sm:px-6 ${isYou ? 'bg-emerald-500/10' : ''}`}
                    >
                      <RankBadge rank={entry.rank} />
                      <div className="min-w-0 flex-1">
                        <span className={`block truncate text-sm font-medium sm:text-base ${isYou ? 'text-white' : 'text-zinc-200'}`}>
                          {entry.name}
                          {isYou && (
                            <span className="ml-2 text-xs font-normal text-emerald-400">You</span>
                          )}
                        </span>
                      </div>
                      <span className={`shrink-0 text-base font-bold tabular-nums sm:text-lg ${isYou ? 'text-emerald-400' : 'text-white'}`}>
                        {entry.total.toLocaleString()}
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
  )
}

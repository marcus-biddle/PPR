import { useState, useEffect } from 'react'
import { usePicker } from '@/contexts/PickerContext'
import { useMedalTotals, type MedalCount } from '@/hooks/useMedalTotals'
import { Carousel, CarouselContent, CarouselItem, useCarousel } from '@/components/ui/carousel'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Crown, Flame, Medal, Trophy } from 'lucide-react'
import type { SheetName } from '@/contexts/PickerContext'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getYearOptions(): { value: string; label: string }[] {
  const current = new Date().getFullYear()
  return [
    { value: String(current), label: String(current) },
    { value: String(current - 1), label: String(current - 1) },
    { value: String(current - 2), label: String(current - 2) },
  ]
}

function medalScore(m: MedalCount) {
  return m.gold * 3 + m.silver * 2 + m.bronze
}

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

function CarouselIndicators({ slideCount }: { slideCount: number }) {
  const { api } = useCarousel()
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (!api) return
    setSelectedIndex(api.selectedScrollSnap())
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap())
    api.on('select', onSelect)
    return () => { api.off('select', onSelect) }
  }, [api])

  return (
    <div className="flex items-center justify-center gap-1.5 py-2" role="tablist" aria-label="Carousel slides">
      {Array.from({ length: slideCount }).map((_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === selectedIndex}
          aria-label={`Slide ${i + 1} of ${slideCount}`}
          onClick={() => api?.scrollTo(i)}
          className={`rounded-full transition-all duration-200 touch-manipulation [-webkit-tap-highlight-color:transparent] ${
            i === selectedIndex ? 'h-1.5 w-4 bg-emerald-500' : 'h-1.5 w-1.5 bg-zinc-600 hover:bg-zinc-500'
          }`}
        />
      ))}
    </div>
  )
}

function placeLabel(rank: number): string {
  if (rank === 1) return '1st place'
  if (rank === 2) return '2nd place'
  if (rank === 3) return '3rd place'
  return ''
}

function PersonalMedalSlide({
  label,
  data,
  rank,
  firstPlaceVariant = 'badge',
  secondPlaceVariant = 'badge',
  sheetLabel,
  medalScoreFn,
}: {
  label: string
  data: MedalCount | null
  rank: number
  firstPlaceVariant?: 'badge' | 'crown' | 'goat' | 'medal'
  secondPlaceVariant?: 'badge' | 'flame' | 'trophy' | 'medal'
  sheetLabel: string
  medalScoreFn: (m: MedalCount) => number
}) {
  const place = rank >= 1 && rank <= 3 ? placeLabel(rank) : ''
  const showCrown = rank === 1 && firstPlaceVariant === 'crown'
  const showGoat = rank === 1 && firstPlaceVariant === 'goat'
  const showMedal = rank === 1 && firstPlaceVariant === 'medal'
  const showFlame = rank === 2 && secondPlaceVariant === 'flame'
  const showTrophy = rank === 2 && secondPlaceVariant === 'trophy'
  const showSecondMedal = rank === 2 && secondPlaceVariant === 'medal'
  return (
    <div className="px-4 py-3 sm:px-6 sm:py-4">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <span className="text-sm text-zinc-400">{label}</span>
        {showCrown && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5" title="1st place">
            <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
            <span className="text-xs font-medium tabular-nums text-amber-400">#{rank}</span>
          </span>
        )}
        {showGoat && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-400" title="1st place · GOAT">
            <span className="text-sm leading-none shrink-0" aria-hidden>🐐</span>
            <span className="text-xs font-medium tabular-nums">#{rank}</span>
          </span>
        )}
        {showMedal && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5" title="1st place">
            <Medal className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
            <span className="text-xs font-medium tabular-nums text-amber-400">#{rank}</span>
          </span>
        )}
        {showFlame && (
          <span className="flex items-center gap-1.5 rounded-full bg-zinc-400/15 px-2 py-0.5" title="2nd place">
            <Flame className="h-3.5 w-3.5 shrink-0 text-zinc-300" aria-hidden />
            <span className="text-xs font-medium tabular-nums text-zinc-300">#{rank}</span>
          </span>
        )}
        {showTrophy && (
          <span className="flex items-center gap-1.5 rounded-full bg-zinc-400/15 px-2 py-0.5" title="2nd place">
            <Trophy className="h-3.5 w-3.5 shrink-0 text-zinc-300" aria-hidden />
            <span className="text-xs font-medium tabular-nums text-zinc-300">#{rank}</span>
          </span>
        )}
        {showSecondMedal && (
          <span className="flex items-center gap-1.5 rounded-full bg-zinc-400/15 px-2 py-0.5" title="2nd place">
            <Medal className="h-3.5 w-3.5 shrink-0 text-zinc-300" aria-hidden />
            <span className="text-xs font-medium tabular-nums text-zinc-300">#{rank}</span>
          </span>
        )}
        {place && !showCrown && !showGoat && !showMedal && !showFlame && !showTrophy && !showSecondMedal && (
          <span
            className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
              rank === 1 ? 'bg-amber-500/15 text-amber-400' : rank === 2 ? 'bg-zinc-400/15 text-zinc-300' : 'bg-amber-700/20 text-amber-200'
            }`}
          >
            {place}
            <span>#{rank}</span>
          </span>
        )}
      </div>
      {data ? (
        <div className="flex items-end justify-between gap-4">
          <div className="flex gap-5 sm:gap-6">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-amber-400/90">Gold</span>
              <span className="text-xl font-bold tabular-nums text-amber-400 sm:text-2xl">{data.gold}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Silver</span>
              <span className="text-xl font-bold tabular-nums text-zinc-300 sm:text-2xl">{data.silver}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-amber-200/90">Bronze</span>
              <span className="text-xl font-bold tabular-nums text-amber-200/90 sm:text-2xl">{data.bronze}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Score</span>
            <p className="text-base font-bold tabular-nums text-zinc-100 sm:text-lg">{medalScoreFn(data)}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No medals in {sheetLabel} for this period.</p>
      )}
    </div>
  )
}

type ViewScope = 'personal' | 'everyone-sheet'

export function MedalsPage() {
  const { selectedName, selectedSheet, SHEET_NAMES, SHEET_DISPLAY_NAMES } = usePicker()
  const now = new Date()
  const currentYear = now.getFullYear()

  const [selectedYear, setSelectedYear] = useState(currentYear)

  const { totals, loading: totalsLoading, error: totalsError, loadTotals, hasDataForYear } = useMedalTotals(selectedYear, SHEET_NAMES)

  const yearOptions = getYearOptions()

  const activeSheet: SheetName = selectedSheet || SHEET_NAMES[0]
  const sheetLabel = SHEET_DISPLAY_NAMES[activeSheet]

  const listYear = totals.byYear

  function toListActiveSheet(list: MedalCount[], sheet: SheetName): MedalCount[] {
    return list
      .map((m) => {
        const c = m.byType?.[sheet]
        return {
          name: m.name,
          gold: c?.gold ?? 0,
          silver: c?.silver ?? 0,
          bronze: c?.bronze ?? 0,
        }
      })
      .filter((m) => m.gold > 0 || m.silver > 0 || m.bronze > 0)
      .sort((a, b) => medalScore(b) - medalScore(a))
  }

  const listActiveSheet = toListActiveSheet(listYear, activeSheet)

  const [viewScope, setViewScope] = useState<ViewScope>('personal')

  const rankedCombined = [...listYear].sort((a, b) => medalScore(b) - medalScore(a))
  const rankedCombinedWithIndex = rankedCombined.map((m, i) => ({ medal: m, rank: i + 1 }))
  const rankedSheetWithIndex = listActiveSheet.map((m, i) => ({ medal: m, rank: i + 1 }))

  const personalYear = selectedName ? listActiveSheet.find((m) => m.name === selectedName) : null
  const yearRank = selectedName ? listActiveSheet.findIndex((m) => m.name === selectedName) + 1 || 0 : 0

  const yearSlides: { label: string; data: MedalCount | null; rank: number }[] = [
    { label: String(selectedYear), data: personalYear ?? null, rank: yearRank },
  ]

  const monthSlides: { label: string; data: MedalCount | null; rank: number }[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
    const list = totals.byMonth[m] ?? []
    const listSheet = toListActiveSheet(list, activeSheet)
    const idx = selectedName ? listSheet.findIndex((x) => x.name === selectedName) : -1
    const data = idx >= 0 ? listSheet[idx] ?? null : null
    const rank = idx >= 0 ? idx + 1 : 0
    return { label: `${MONTH_NAMES[m - 1]} ${selectedYear}`, data, rank }
  })

  const quarterSlides: { label: string; data: MedalCount | null; rank: number }[] = ([1, 2, 3, 4] as const).map((q) => {
    const list = totals.byQuarter[q] ?? []
    const listSheet = toListActiveSheet(list, activeSheet)
    const idx = selectedName ? listSheet.findIndex((x) => x.name === selectedName) : -1
    const data = idx >= 0 ? listSheet[idx] ?? null : null
    const rank = idx >= 0 ? idx + 1 : 0
    return { label: `Q${q} ${selectedYear}`, data, rank }
  })

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      {totalsError && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{totalsError}</p>
      )}

      {/* Header: title + year (Robinhood-style) */}
      <div className="flex items-center justify-between gap-3 sm:gap-6">
        <div className="min-w-0 shrink-0">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Medals
          </h2>
          <p className="mt-1 text-sm text-zinc-500 sm:mt-1.5 sm:text-base">
            {selectedYear}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger id="medals-year" className="h-9 min-w-[88px] border border-zinc-700/80 bg-zinc-800/40 text-zinc-300 sm:h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasDataForYear && (
            <button
              type="button"
              onClick={() => loadTotals(true)}
              disabled={totalsLoading}
              className="flex h-9 min-w-[36px] shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 sm:h-8"
              aria-label="Refresh medals"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={totalsLoading ? 'animate-spin' : ''}>
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Card: active exercise (Robinhood-style) */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
        <Tabs value={viewScope} onValueChange={(v) => setViewScope(v as ViewScope)}>
          <div className="flex items-center justify-between border-b border-zinc-700/80 px-4 py-3 sm:px-6">
            <h3 className="text-sm font-semibold text-zinc-300">
              {sheetLabel}
            </h3>
            <TabsList variant="line" className="w-auto gap-4">
              <TabsTrigger variant="line" value="personal">
                Personal
              </TabsTrigger>
              <TabsTrigger variant="line" value="everyone-sheet">
                Top 3
              </TabsTrigger>
            </TabsList>
          </div>

          {!hasDataForYear && !totalsLoading ? (
            <div className="px-4 py-10 text-center sm:py-12 sm:px-6">
              <p className="text-sm text-zinc-500">
                Load medal totals for {selectedYear}. This may take a minute to avoid API rate limits.
              </p>
              <button
                type="button"
                onClick={() => loadTotals()}
                disabled={totalsLoading}
                className="mt-4 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50"
              >
                Load totals
              </button>
            </div>
          ) : totalsLoading ? (
            <div className="divide-y divide-zinc-700/50">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:py-4 sm:px-6">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-700/50 animate-pulse" />
                  <div className="h-4 flex-1 max-w-[100px] rounded bg-zinc-700/40 animate-pulse" />
                  <div className="h-5 w-12 shrink-0 rounded bg-zinc-700/40 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <TabsContent value="personal" className="mt-0">
                {!selectedName ? (
                  <div className="px-4 py-10 text-center sm:py-12 sm:px-6">
                    <p className="text-sm text-zinc-500">Select your name in the header to see your medals.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-700/50">
                    {/* Year */}
                    <div>
                      <p className="px-4 pt-3 text-sm font-semibold text-zinc-300 sm:px-6">
                        Year
                      </p>
                      <Carousel opts={{ align: 'start', loop: false, dragFree: false, containScroll: 'trimSnaps' }} className="w-full">
                        <CarouselContent className="-ml-2">
                          {yearSlides.map((slide, i) => (
                            <CarouselItem key={i} className="pl-2 basis-full">
                              <PersonalMedalSlide label={slide.label} data={slide.data} rank={slide.rank} firstPlaceVariant="goat" secondPlaceVariant="flame" sheetLabel={sheetLabel} medalScoreFn={medalScore} />
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        {yearSlides.length > 1 && <CarouselIndicators slideCount={yearSlides.length} />}
                      </Carousel>
                    </div>

                    {/* Quarter to quarter */}
                    <div>
                      <p className="px-4 pt-3 text-sm font-semibold text-zinc-300 sm:px-6">
                        Quarter to quarter
                      </p>
                      <Carousel opts={{ align: 'start', loop: false, dragFree: false, containScroll: 'trimSnaps' }} className="w-full">
                        <CarouselContent className="-ml-2">
                          {quarterSlides.map((slide, i) => (
                            <CarouselItem key={i} className="pl-2 basis-full">
                              <PersonalMedalSlide label={slide.label} data={slide.data} rank={slide.rank} firstPlaceVariant="crown" secondPlaceVariant="trophy" sheetLabel={sheetLabel} medalScoreFn={medalScore} />
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselIndicators slideCount={quarterSlides.length} />
                      </Carousel>
                    </div>

                    {/* Month to month */}
                    <div>
                      <p className="px-4 pt-3 text-sm font-semibold text-zinc-300 sm:px-6">
                        Month to month
                      </p>
                      <Carousel opts={{ align: 'start', loop: false, dragFree: false, containScroll: 'trimSnaps' }} className="w-full">
                        <CarouselContent className="-ml-2">
                          {monthSlides.map((slide, i) => (
                            <CarouselItem key={i} className="pl-2 basis-full">
                              <PersonalMedalSlide label={slide.label} data={slide.data} rank={slide.rank} firstPlaceVariant="medal" secondPlaceVariant="medal" sheetLabel={sheetLabel} medalScoreFn={medalScore} />
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselIndicators slideCount={monthSlides.length} />
                      </Carousel>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="everyone-sheet" className="mt-0">
                {listActiveSheet.length === 0 ? (
                  <div className="px-4 py-10 text-center sm:py-12 sm:px-6">
                    <p className="text-sm text-zinc-500">No medals in {sheetLabel} for {selectedYear}.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-700/50">
                    {rankedSheetWithIndex.slice(0, 3).map(({ medal, rank }) => {
                      const isYou = medal.name === selectedName
                      const score = medalScore(medal)
                      return (
                        <div
                          key={medal.name}
                          className={`flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:py-4 sm:px-6 ${isYou ? 'bg-emerald-500/10' : ''}`}
                        >
                          <RankBadge rank={rank} />
                          <div className="min-w-0 flex-1">
                            <span className={`block truncate text-sm font-medium sm:text-base ${isYou ? 'text-white' : 'text-zinc-200'}`}>
                              {medal.name}
                              {isYou && <span className="ml-2 text-xs font-normal text-emerald-400">You</span>}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
                            <span className="w-8 text-right text-sm tabular-nums text-amber-400 sm:w-10">{medal.gold}</span>
                            <span className="w-8 text-right text-sm tabular-nums text-zinc-400 sm:w-10">{medal.silver}</span>
                            <span className="w-8 text-right text-sm tabular-nums text-amber-200/90 sm:w-10">{medal.bronze}</span>
                            <span className={`w-10 text-right text-sm font-semibold tabular-nums sm:w-12 ${isYou ? 'text-emerald-400' : 'text-zinc-100'}`}>
                              {score}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* Combined: all exercises (Robinhood-style) */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
        <div className="border-b border-zinc-700/80 px-4 py-3 sm:px-6">
          <h3 className="text-sm font-semibold text-zinc-300">
            Combined
          </h3>
        </div>
        {!hasDataForYear && !totalsLoading ? (
          <div className="px-4 py-8 text-center sm:py-10 sm:px-6">
            <p className="text-sm text-zinc-500">Load medal totals above to see combined standings.</p>
          </div>
        ) : totalsLoading ? (
          <div className="divide-y divide-zinc-700/50">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:py-4 sm:px-6">
                <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-700/50 animate-pulse" />
                <div className="h-4 flex-1 max-w-[100px] rounded bg-zinc-700/40 animate-pulse" />
                <div className="h-5 w-12 shrink-0 rounded bg-zinc-700/40 animate-pulse" />
              </div>
            ))}
          </div>
        ) : listYear.length === 0 ? (
          <div className="px-4 py-10 text-center sm:py-12 sm:px-6">
            <p className="text-sm text-zinc-500">No medals for {selectedYear}.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-700/50">
            {rankedCombinedWithIndex.map(({ medal, rank }) => {
              const isYou = medal.name === selectedName
              const score = medalScore(medal)
              const medalIcon =
                rank === 1 ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center" title="1st">
                    <Medal className="h-5 w-5 text-amber-400" aria-hidden />
                  </span>
                ) : rank === 2 ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center" title="2nd">
                    <Medal className="h-5 w-5 text-zinc-300" aria-hidden />
                  </span>
                ) : rank === 3 ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center" title="3rd">
                    <Medal className="h-5 w-5 text-amber-200/90" aria-hidden />
                  </span>
                ) : (
                  <RankBadge rank={rank} />
                )
              return (
                <div
                  key={medal.name}
                  className={`flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:py-4 sm:px-6 ${isYou ? 'bg-emerald-500/10' : ''}`}
                >
                  {medalIcon}
                  <div className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-medium sm:text-base ${isYou ? 'text-white' : 'text-zinc-200'}`}>
                      {medal.name}
                      {isYou && <span className="ml-2 text-xs font-normal text-emerald-400">You</span>}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 sm:gap-4">
                    <span className="w-8 text-right text-sm tabular-nums text-amber-400 sm:w-10">{medal.gold}</span>
                    <span className="w-8 text-right text-sm tabular-nums text-zinc-400 sm:w-10">{medal.silver}</span>
                    <span className="w-8 text-right text-sm tabular-nums text-amber-200/90 sm:w-10">{medal.bronze}</span>
                    <span className={`w-10 text-right text-sm font-semibold tabular-nums sm:w-12 ${isYou ? 'text-emerald-400' : 'text-zinc-100'}`}>
                      {score}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

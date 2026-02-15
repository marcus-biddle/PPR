import { useState, useEffect } from 'react'
import { usePicker } from '@/contexts/PickerContext'
import { useMedalTotals, type MedalCount } from '@/hooks/useMedalTotals'
import { Carousel, CarouselContent, CarouselItem, useCarousel } from '@/components/ui/carousel'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

const QUARTER_OPTIONS = [
  { value: '1', label: 'Q1' },
  { value: '2', label: 'Q2' },
  { value: '3', label: 'Q3' },
  { value: '4', label: 'Q4' },
] as const

type PeriodType = 'year' | 'quarter' | 'month'

function getYearOptions(): { value: string; label: string }[] {
  const current = new Date().getFullYear()
  return [
    { value: String(current), label: String(current) },
    { value: String(current - 1), label: String(current - 1) },
    { value: String(current - 2), label: String(current - 2) },
  ]
}

const SHEET_ORDER: SheetName[] = ['Push', 'Pull', 'Run']

function CarouselIndicators({ slideCount }: { slideCount: number }) {
  const { api } = useCarousel()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [hintDismissed, setHintDismissed] = useState(false)

  useEffect(() => {
    if (!api) return
    setSelectedIndex(api.selectedScrollSnap())
    const onSelect = () => {
      setSelectedIndex(api.selectedScrollSnap())
      setHintDismissed(true)
    }
    api.on('select', onSelect)
    return () => {
      api.off('select', onSelect)
    }
  }, [api])

  return (
    <div className="mt-3 flex flex-col items-center gap-2">
      {!hintDismissed && (
        <p className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <span className="opacity-60 animate-pulse">←</span>
          <span>Swipe for breakdown</span>
          <span className="opacity-60 animate-pulse">→</span>
        </p>
      )}
      <div className="-mb-1 flex items-center justify-center gap-2 py-2" role="tablist" aria-label="Carousel slides">
        {Array.from({ length: slideCount }).map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === selectedIndex}
            aria-label={`Slide ${i + 1} of ${slideCount}`}
            onClick={() => {
              api?.scrollTo(i)
              setHintDismissed(true)
            }}
            className={`rounded-full transition-all duration-200 touch-manipulation [-webkit-tap-highlight-color:transparent] ${
              i === selectedIndex ? 'h-2 w-5 bg-emerald-500' : 'h-2 w-2 bg-zinc-600 hover:bg-zinc-500 active:bg-zinc-500'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function MedalSlide({
  label,
  gold,
  silver,
  bronze,
  showScore,
}: {
  label: string
  gold: number
  silver: number
  bronze: number
  showScore?: boolean
}) {
  const total = gold * 3 + silver * 2 + bronze
  return (
    <div className="py-1">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500 sm:mb-3 sm:text-xs">{label}</p>
      <div className="flex items-end justify-between gap-2 sm:gap-4">
        <div className="flex gap-3 sm:gap-6">
          <div className="flex flex-col gap-0.5 sm:gap-1">
            <span className="text-[9px] font-medium uppercase tracking-wider text-amber-400/80 sm:text-[10px]">Gold</span>
            <span className="text-xl font-bold tabular-nums text-amber-400 sm:text-2xl md:text-3xl">{gold}</span>
          </div>
          <div className="flex flex-col gap-0.5 sm:gap-1">
            <span className="text-[9px] font-medium uppercase tracking-wider text-zinc-400 sm:text-[10px]">Silver</span>
            <span className="text-xl font-bold tabular-nums text-zinc-300 sm:text-2xl md:text-3xl">{silver}</span>
          </div>
          <div className="flex flex-col gap-0.5 sm:gap-1">
            <span className="text-[9px] font-medium uppercase tracking-wider text-amber-200/80 sm:text-[10px]">Bronze</span>
            <span className="text-xl font-bold tabular-nums text-amber-200/90 sm:text-2xl md:text-3xl">{bronze}</span>
          </div>
        </div>
        {showScore && (
          <div className="text-right shrink-0">
            <span className="text-[9px] font-medium uppercase tracking-wider text-zinc-500 sm:text-[10px]">Score</span>
            <p className="text-base font-bold tabular-nums text-zinc-100 sm:text-lg">{total}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function UserMedalCard({
  medal,
  selectedName,
  periodLabel,
  sheetDisplayNames,
}: {
  medal: MedalCount
  selectedName: string
  periodLabel: string
  sheetDisplayNames: Record<SheetName, string>
}) {
  const isYou = medal.name === selectedName
  const hasByType = medal.byType && Object.keys(medal.byType).length > 0
  const slides = [{ label: 'Total', gold: medal.gold, silver: medal.silver, bronze: medal.bronze, showScore: true }]
  if (hasByType && medal.byType) {
    for (const sheet of SHEET_ORDER) {
      const c = medal.byType[sheet]
      if (c && (c.gold > 0 || c.silver > 0 || c.bronze > 0)) {
        slides.push({
          label: sheetDisplayNames[sheet],
          gold: c.gold,
          silver: c.silver,
          bronze: c.bronze,
          showScore: false,
        })
      }
    }
  }

  return (
    <div
      className={`rounded-2xl border bg-zinc-900/80 p-4 transition-colors active:opacity-95 sm:p-5 ${
        isYou ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-zinc-800/80 hover:border-zinc-700'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`min-w-0 truncate font-semibold ${isYou ? 'text-white' : 'text-zinc-100'}`}>
          {medal.name}
          {isYou && (
            <span className="ml-2 text-xs font-medium text-emerald-400">You</span>
          )}
        </span>
        <span className="shrink-0 text-xs text-zinc-500">{periodLabel}</span>
      </div>
      {slides.length === 1 ? (
        <MedalSlide
          label={slides[0].label}
          gold={slides[0].gold}
          silver={slides[0].silver}
          bronze={slides[0].bronze}
          showScore={slides[0].showScore}
        />
      ) : (
        <Carousel opts={{ align: 'start', loop: true, dragFree: false, containScroll: 'trimSnaps' }} className="w-full">
          <CarouselContent className="-ml-2">
            {slides.map((s, i) => (
              <CarouselItem key={i} className="pl-2 basis-full">
                <MedalSlide label={s.label} gold={s.gold} silver={s.silver} bronze={s.bronze} showScore={s.showScore} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselIndicators slideCount={slides.length} />
        </Carousel>
      )}
    </div>
  )
}

export function MedalsPage() {
  const { setSelectedSheet, selectedName, SHEET_NAMES, SHEET_DISPLAY_NAMES } = usePicker()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [periodType, setPeriodType] = useState<PeriodType>('year')
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>(1)

  useEffect(() => {
    setSelectedSheet(SHEET_NAMES[0])
  }, [SHEET_NAMES, setSelectedSheet])

  const { totals, loading: totalsLoading, error: totalsError, loadTotals, hasDataForYear } = useMedalTotals(selectedYear, SHEET_NAMES)

  const yearOptions = getYearOptions()

  // Resolve which list and label to show
  let list: MedalCount[] = []
  let periodLabel = ''
  if (periodType === 'year') {
    list = totals.byYear
    periodLabel = `${selectedYear}`
  } else if (periodType === 'quarter') {
    list = totals.byQuarter[selectedQuarter] ?? []
    periodLabel = `Q${selectedQuarter} ${selectedYear}`
  } else {
    list = totals.byMonth[selectedMonth] ?? []
    periodLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
  }

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      {totalsError && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {totalsError}
        </p>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
          Medals
        </h2>
        <p className="mt-1 text-sm text-zinc-500 sm:mt-1.5 sm:text-base">
          1st, 2nd, 3rd place by period
        </p>
      </div>

      {/* Controls: Year + period selector (Robinhood-style segmented) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full min-w-0 sm:w-auto sm:min-w-[100px]">
          <label htmlFor="medals-year" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Year
          </label>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger id="medals-year" className="h-11 min-h-[44px] w-full border-zinc-700 bg-zinc-900/80 sm:h-10 sm:min-h-0">
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
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-500">Period</label>
          <Tabs value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
            <TabsList className="flex h-11 min-h-[44px] w-full gap-0 rounded-xl border border-zinc-700/80 bg-zinc-900/80 p-1 sm:h-10 sm:min-h-0 sm:w-fit">
              <TabsTrigger
                value="year"
                className="min-h-[36px] flex-1 rounded-lg px-3 py-2.5 text-sm font-medium data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:shadow-none sm:flex-none sm:px-4"
              >
                Year
              </TabsTrigger>
              <TabsTrigger
                value="quarter"
                className="min-h-[36px] flex-1 rounded-lg px-3 py-2.5 text-sm font-medium data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:shadow-none sm:flex-none sm:px-4"
              >
                Quarter
              </TabsTrigger>
              <TabsTrigger
                value="month"
                className="min-h-[36px] flex-1 rounded-lg px-3 py-2.5 text-sm font-medium data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:shadow-none sm:flex-none sm:px-4"
              >
                Month
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {periodType === 'quarter' && (
          <div className="w-full min-w-0 sm:w-auto sm:min-w-[80px]">
            <label htmlFor="totals-quarter" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Quarter
            </label>
            <Select value={String(selectedQuarter)} onValueChange={(v) => setSelectedQuarter(Number(v) as 1 | 2 | 3 | 4)}>
              <SelectTrigger id="totals-quarter" className="h-11 min-h-[44px] w-full border-zinc-700 bg-zinc-900/80 sm:h-10 sm:min-h-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUARTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {periodType === 'month' && (
          <div className="w-full min-w-0 sm:w-auto sm:min-w-[120px]">
            <label htmlFor="totals-month" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Month
            </label>
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger id="totals-month" className="h-11 min-h-[44px] w-full border-zinc-700 bg-zinc-900/80 sm:h-10 sm:min-h-0">
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
        )}
            {hasDataForYear && (
              <button
                type="button"
                onClick={() => loadTotals(true)}
                disabled={totalsLoading}
                className="h-11 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/80 hover:text-white active:bg-zinc-800/80 disabled:opacity-50 sm:h-10 sm:min-h-0 sm:w-auto"
              >
                Refresh
              </button>
            )}
      </div>

      {/* Medal totals: Robinhood-style user cards */}
      <div>
        {!hasDataForYear && !totalsLoading ? (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-6 py-16 text-center">
            <p className="mb-5 text-sm text-zinc-400">
              Load medal totals for {selectedYear}. This may take a minute to avoid API rate limits.
            </p>
            <button
              type="button"
              onClick={() => loadTotals()}
              disabled={totalsLoading}
              className="min-h-[44px] rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 active:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50"
            >
              Load totals
            </button>
          </div>
        ) : totalsLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/80 p-5">
                <div className="mb-4 h-5 w-24 rounded bg-zinc-700/40 animate-pulse" />
                <div className="flex gap-6">
                  <div className="h-8 w-12 rounded bg-zinc-700/40 animate-pulse" />
                  <div className="h-8 w-12 rounded bg-zinc-700/40 animate-pulse" />
                  <div className="h-8 w-12 rounded bg-zinc-700/40 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-6 py-16 text-center">
            <p className="text-zinc-500">
              No medals for {periodLabel}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {list.map((medal) => (
              <UserMedalCard
                key={medal.name}
                medal={medal}
                selectedName={selectedName}
                periodLabel={periodLabel}
                sheetDisplayNames={SHEET_DISPLAY_NAMES}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

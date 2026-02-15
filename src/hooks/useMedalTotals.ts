import { useState, useCallback, useRef, useEffect } from 'react'
import { fetchMedalTotalsBulk } from '@/api/sheets/bulkFetch'
import { getCachedTotals, setCachedTotals } from '@/lib/medalCache'
import type { SheetName } from '@/contexts/PickerContext'

export type MedalByType = Record<SheetName, { gold: number; silver: number; bronze: number }>

export type MedalCount = {
  name: string
  gold: number
  silver: number
  bronze: number
  byType?: MedalByType
}

export type MedalTotalsByPeriod = {
  byYear: MedalCount[]
  byQuarter: Record<1 | 2 | 3 | 4, MedalCount[]>
  byMonth: Record<number, MedalCount[]>
}

const totalsCache = new Map<number, MedalTotalsByPeriod>()

export function useMedalTotals(
  year: number,
  sheetNames: readonly SheetName[]
): {
  totals: MedalTotalsByPeriod
  loading: boolean
  error: string | null
  loadTotals: (forceRefresh?: boolean) => void
  hasDataForYear: boolean
} {
  const cached = totalsCache.get(year)
  const [totals, setTotals] = useState<MedalTotalsByPeriod>(() => cached ?? {
    byYear: [],
    byQuarter: { 1: [], 2: [], 3: [], 4: [] },
    byMonth: {},
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runIdRef = useRef(0)
  const loadTotals = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) totalsCache.delete(year)

    const cachedNow = totalsCache.get(year)
    if (cachedNow !== undefined && !forceRefresh) {
      setTotals(cachedNow)
      setError(null)
      return
    }

    const thisRunId = ++runIdRef.current
    setError(null)
    setLoading(true)

    try {
      // Check IndexedDB cache first (avoids API call if fresh), skip when force refresh
      const dbCached = forceRefresh ? null : await getCachedTotals(year)
      if (thisRunId !== runIdRef.current) return
      if (dbCached) {
        const result: MedalTotalsByPeriod = {
          byYear: dbCached.byYear,
          byQuarter: dbCached.byQuarter as Record<1 | 2 | 3 | 4, MedalCount[]>,
          byMonth: dbCached.byMonth,
        }
        totalsCache.set(year, result)
        setTotals(result)
        setLoading(false)
        return
      }

      // Single API call for all data
      const data = await fetchMedalTotalsBulk(sheetNames, year)
      if (thisRunId !== runIdRef.current) return

      const result: MedalTotalsByPeriod = {
        byYear: data.byYear,
        byQuarter: data.byQuarter,
        byMonth: data.byMonth,
      }
      totalsCache.set(year, result)
      setTotals(result)

      // Persist to IndexedDB for next visit
      await setCachedTotals({ year, ...data })
    } catch (e) {
      if (thisRunId === runIdRef.current) {
        setError(e instanceof Error ? e.message : 'Failed to load medal totals')
        setTotals({
          byYear: [],
          byQuarter: { 1: [], 2: [], 3: [], 4: [] },
          byMonth: {},
        })
      }
    } finally {
      if (thisRunId === runIdRef.current) setLoading(false)
    }
  }, [year, sheetNames])

  useEffect(() => {
    const cachedNow = totalsCache.get(year)
    if (cachedNow !== undefined) {
      setTotals(cachedNow)
      setError(null)
      return
    }
    setTotals({ byYear: [], byQuarter: { 1: [], 2: [], 3: [], 4: [] }, byMonth: {} })
    setError(null)
    // Try IndexedDB on mount (e.g. after page refresh)
    let cancelled = false
    getCachedTotals(year).then((dbCached) => {
      if (cancelled) return
      if (dbCached && !totalsCache.has(year)) {
        const result: MedalTotalsByPeriod = {
          byYear: dbCached.byYear,
          byQuarter: dbCached.byQuarter as Record<1 | 2 | 3 | 4, MedalCount[]>,
          byMonth: dbCached.byMonth,
        }
        totalsCache.set(year, result)
        setTotals(result)
      }
    }).catch(() => { /* ignore */ })
    return () => { cancelled = true }
  }, [year])

  const hasDataForYear = totalsCache.has(year)

  return { totals, loading, error, loadTotals, hasDataForYear }
}

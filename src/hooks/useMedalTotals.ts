import { useState, useCallback, useRef, useEffect } from 'react'
import { fetchLeaderboardForMonth } from './useLeaderboardData'
import { fetchNamesForSheet } from './useNamesForSheet'
import type { SheetName } from '@/contexts/PickerContext'

export type MedalCount = { name: string; gold: number; silver: number; bronze: number }

const DELAY_MS = 1500

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

const totalsCache = new Map<number, MedalCount[]>()

export function useMedalTotals(
  year: number,
  sheetNames: readonly SheetName[]
): { totals: MedalCount[]; loading: boolean; error: string | null; loadTotals: () => void } {
  const [totals, setTotals] = useState<MedalCount[]>(() => totalsCache.get(year) ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runIdRef = useRef(0)
  const loadTotals = useCallback(() => {
    const cached = totalsCache.get(year)
    if (cached !== undefined) {
      setTotals(cached)
      setError(null)
      return
    }

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const monthsToFetch =
      year < currentYear ? 12 : year === currentYear ? currentMonth : 0

    if (monthsToFetch === 0) {
      setTotals([])
      return
    }

    const thisRunId = ++runIdRef.current
    setError(null)
    setLoading(true)

    const aggregate = new Map<string, { gold: number; silver: number; bronze: number }>()

    async function run() {
      try {
        for (const sheet of sheetNames) {
          const names = await fetchNamesForSheet(sheet)
          if (thisRunId !== runIdRef.current) return
          await delay(DELAY_MS)
          for (let month = 1; month <= monthsToFetch; month++) {
            if (thisRunId !== runIdRef.current) return
            const leaderboard = await fetchLeaderboardForMonth(sheet, names, year, month)
            if (thisRunId !== runIdRef.current) return
            await delay(DELAY_MS)
            const gold = leaderboard[0]
            const silver = leaderboard[1]
            const bronze = leaderboard[2]
            if (gold) {
              const cur = aggregate.get(gold.name) ?? { gold: 0, silver: 0, bronze: 0 }
              cur.gold += 1
              aggregate.set(gold.name, cur)
            }
            if (silver) {
              const cur = aggregate.get(silver.name) ?? { gold: 0, silver: 0, bronze: 0 }
              cur.silver += 1
              aggregate.set(silver.name, cur)
            }
            if (bronze) {
              const cur = aggregate.get(bronze.name) ?? { gold: 0, silver: 0, bronze: 0 }
              cur.bronze += 1
              aggregate.set(bronze.name, cur)
            }
          }
        }
        if (thisRunId !== runIdRef.current) return
        const result: MedalCount[] = Array.from(aggregate.entries())
          .map(([name, counts]) => ({ name, ...counts }))
          .filter((e) => e.gold > 0 || e.silver > 0 || e.bronze > 0)
          .sort((a, b) => {
            const totalA = a.gold * 3 + a.silver * 2 + a.bronze
            const totalB = b.gold * 3 + b.silver * 2 + b.bronze
            if (totalB !== totalA) return totalB - totalA
            if (b.gold !== a.gold) return b.gold - a.gold
            if (b.silver !== a.silver) return b.silver - a.silver
            return b.bronze - a.bronze
          })
        totalsCache.set(year, result)
        setTotals(result)
      } catch (e) {
        if (thisRunId === runIdRef.current) {
          setError(e instanceof Error ? e.message : 'Failed to load medal totals')
          setTotals([])
        }
      } finally {
        if (thisRunId === runIdRef.current) setLoading(false)
      }
    }

    run()
  }, [year, sheetNames])

  useEffect(() => {
    const cached = totalsCache.get(year)
    if (cached !== undefined) {
      setTotals(cached)
    } else {
      setTotals([])
    }
    setError(null)
  }, [year])

  const hasDataForYear = totalsCache.has(year)

  return { totals, loading, error, loadTotals, hasDataForYear }
}

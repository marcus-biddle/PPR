import { useState, useEffect, useCallback } from 'react'
import { getSheetValuesBatch, getValuesArray } from '@/api/sheets'
import { parseDateCell } from './useNameData'
import type { SheetName } from '@/contexts/PickerContext'

const DATES_ROW_START = 6
const CHUNK_SIZE = 200
const MAX_CHUNKS = 25

function getColumnLetterForNameIndex(nameIndex: number): string {
  return String.fromCharCode(69 + nameIndex)
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export type LeaderboardEntry = { rank: number; name: string; total: number }

const CACHE_KEY_PREFIX = 'ppr-leaderboard-'

function cacheKey(sheet: string, year: number, month: number): string {
  return `${CACHE_KEY_PREFIX}${sheet}-${year}-${month}`
}

const leaderboardCache = new Map<string, LeaderboardEntry[]>()

export async function fetchLeaderboardForMonth(
  sheet: SheetName,
  names: string[],
  year: number,
  month: number
): Promise<LeaderboardEntry[]> {
  if (names.length === 0) return []

  const key = cacheKey(sheet, year, month)
  const cached = leaderboardCache.get(key)
  if (cached !== undefined) return cached

  const allDateRows: unknown[][] = []
  const allValueRowsByIndex: unknown[][][] = names.map(() => [])
  const today = new Date()

  async function fetchChunk(chunkIndex: number): Promise<void> {
    const startRow = DATES_ROW_START + chunkIndex * CHUNK_SIZE
    const endRow = startRow + CHUNK_SIZE - 1
    const ranges = [
      `'${sheet}'!D${startRow}:D${endRow}`,
      ...names.map((_, i) => {
        const col = getColumnLetterForNameIndex(i)
        return `'${sheet}'!${col}${startRow}:${col}${endRow}`
      }),
    ]
    const res = await getSheetValuesBatch(ranges)
    const vr = res.valueRanges
    const vr0 = (vr != null && Array.isArray(vr) && vr[0] != null) ? vr[0] : { range: '', values: [] }
    const dateRows = getValuesArray(vr0)
    const maxLen = dateRows.length
    for (let i = 0; i < maxLen; i++) {
      allDateRows.push(dateRows[i] ?? [])
    }
    for (let nameIdx = 0; nameIdx < names.length; nameIdx++) {
      const vri = (vr != null && Array.isArray(vr) ? vr[nameIdx + 1] : null) ?? { range: '', values: [] }
      const valueRows = getValuesArray(vri)
      for (let i = 0; i < maxLen; i++) {
        allValueRowsByIndex[nameIdx].push(valueRows[i] ?? [])
      }
    }
    const foundTodayIndex = allDateRows.findIndex((row) => {
      const parsed = parseDateCell(row[0])
      return parsed != null && isSameCalendarDay(parsed, today)
    })
    if (foundTodayIndex >= 0) return
    if (dateRows.length < CHUNK_SIZE || chunkIndex >= MAX_CHUNKS - 1) return
    return fetchChunk(chunkIndex + 1)
  }

  await fetchChunk(0)
  const todayIndex = allDateRows.findIndex((row) => {
    const parsed = parseDateCell(row[0])
    return parsed != null && isSameCalendarDay(parsed, today)
  })
  const stop = todayIndex >= 0 ? todayIndex + 1 : allDateRows.length

  const totalsByIndex = names.map(() => 0)
  for (let rowIdx = 0; rowIdx < stop; rowIdx++) {
    const dateCell = allDateRows[rowIdx]?.[0]
    const date = parseDateCell(dateCell)
    if (!date || date.getFullYear() !== year || date.getMonth() + 1 !== month) continue
    for (let nameIdx = 0; nameIdx < names.length; nameIdx++) {
      const val = allValueRowsByIndex[nameIdx]?.[rowIdx]?.[0]
      const n = Number(val)
      if (!Number.isNaN(n)) totalsByIndex[nameIdx] += n
    }
  }

  const entries: LeaderboardEntry[] = names
    .map((name, i) => ({ name, total: totalsByIndex[i] ?? 0 }))
    .sort((a, b) => b.total - a.total)
    .map((e, i) => ({ rank: i + 1, name: e.name, total: e.total }))

  leaderboardCache.set(key, entries)
  return entries
}

export function useLeaderboardData(
  selectedSheet: SheetName | '',
  names: string[],
  currentYear: number,
  currentMonth: number
): { leaderboard: LeaderboardEntry[]; loading: boolean; error: string | null; refresh: () => void } {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const refresh = useCallback(() => {
    leaderboardCache.delete(cacheKey(selectedSheet, currentYear, currentMonth))
    setRefreshTrigger((t) => t + 1)
  }, [selectedSheet, currentYear, currentMonth])

  useEffect(() => {
    if (!selectedSheet || names.length === 0) {
      setLeaderboard([])
      setError(null)
      return
    }

    const key = cacheKey(selectedSheet, currentYear, currentMonth)
    const cached = leaderboardCache.get(key)
    if (cached !== undefined) {
      setLeaderboard(cached)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    const today = new Date()

    setError(null)
    setLoading(true)

    const allDateRows: unknown[][] = []
    const allValueRowsByIndex: unknown[][][] = names.map(() => [])

    function fetchChunk(chunkIndex: number): Promise<void> {
      if (cancelled) return Promise.resolve()
      const startRow = DATES_ROW_START + chunkIndex * CHUNK_SIZE
      const endRow = startRow + CHUNK_SIZE - 1

      const ranges = [
        `'${selectedSheet}'!D${startRow}:D${endRow}`,
        ...names.map((_, i) => {
          const col = getColumnLetterForNameIndex(i)
          return `'${selectedSheet}'!${col}${startRow}:${col}${endRow}`
        }),
      ]

      return getSheetValuesBatch(ranges).then((res) => {
        if (cancelled) return
        const vr = res.valueRanges
        const vr0 = (vr != null && Array.isArray(vr) ? vr[0] : null) ?? { range: '', values: [] }
        const dateRows = getValuesArray(vr0)
        const maxLen = dateRows.length
        for (let i = 0; i < maxLen; i++) {
          allDateRows.push(dateRows[i] ?? [])
        }
        for (let nameIdx = 0; nameIdx < names.length; nameIdx++) {
          const vri = (vr != null && Array.isArray(vr) ? vr[nameIdx + 1] : null) ?? { range: '', values: [] }
          const valueRows = getValuesArray(vri)
          for (let i = 0; i < maxLen; i++) {
            allValueRowsByIndex[nameIdx].push(valueRows[i] ?? [])
          }
        }
        const foundTodayIndex = allDateRows.findIndex((row) => {
          const parsed = parseDateCell(row[0])
          return parsed != null && isSameCalendarDay(parsed, today)
        })
        if (foundTodayIndex >= 0) return
        if (dateRows.length < CHUNK_SIZE || chunkIndex >= MAX_CHUNKS - 1) return
        return fetchChunk(chunkIndex + 1)
      })
    }

    fetchChunk(0)
      .then(() => {
        if (cancelled) return
        const todayIndex = allDateRows.findIndex((row) => {
          const parsed = parseDateCell(row[0])
          return parsed != null && isSameCalendarDay(parsed, today)
        })
        const stop = todayIndex >= 0 ? todayIndex + 1 : allDateRows.length

        const totalsByIndex = names.map(() => 0)
        for (let rowIdx = 0; rowIdx < stop; rowIdx++) {
          const dateCell = allDateRows[rowIdx]?.[0]
          const date = parseDateCell(dateCell)
          if (!date || date.getFullYear() !== currentYear || date.getMonth() + 1 !== currentMonth) continue
          for (let nameIdx = 0; nameIdx < names.length; nameIdx++) {
            const val = allValueRowsByIndex[nameIdx]?.[rowIdx]?.[0]
            const n = Number(val)
            if (!Number.isNaN(n)) totalsByIndex[nameIdx] += n
          }
        }

        const entries: LeaderboardEntry[] = names
          .map((name, i) => ({ name, total: totalsByIndex[i] ?? 0 }))
          .sort((a, b) => b.total - a.total)
          .map((e, i) => ({ rank: i + 1, name: e.name, total: e.total }))

        leaderboardCache.set(key, entries)
        setLeaderboard(entries)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load leaderboard')
        setLeaderboard([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedSheet, names, currentYear, currentMonth, refreshTrigger])

  return { leaderboard, loading, error, refresh }
}

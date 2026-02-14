import { useState, useEffect } from 'react'
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

export function useLeaderboardData(
  selectedSheet: SheetName | '',
  names: string[],
  currentYear: number,
  currentMonth: number
): { leaderboard: LeaderboardEntry[]; loading: boolean; error: string | null } {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedSheet || names.length === 0) {
      setLeaderboard([])
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
        const dateRows = getValuesArray(res.valueRanges?.[0] ?? {})
        const maxLen = dateRows.length
        for (let i = 0; i < maxLen; i++) {
          allDateRows.push(dateRows[i] ?? [])
        }
        for (let nameIdx = 0; nameIdx < names.length; nameIdx++) {
          const valueRows = getValuesArray(res.valueRanges?.[nameIdx + 1] ?? {})
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
  }, [selectedSheet, names, currentYear, currentMonth])

  return { leaderboard, loading, error }
}

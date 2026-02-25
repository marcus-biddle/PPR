import { useState, useEffect } from 'react'
import { getSheetValues, getValuesArray } from '@/api/sheets'
import { getCached, setCached } from '@/lib/sheetsCache'
import type { SheetName } from '@/contexts/PickerContext'

const NAMES_RANGE = 'E5:Z5'
const NAMES_CACHE_PREFIX = 'ppr-names-'

const namesCache = new Map<string, string[]>()

export async function fetchNamesForSheet(sheet: SheetName): Promise<string[]> {
  const cached = namesCache.get(sheet)
  if (cached !== undefined) return cached
  const persisted = getCached<string[]>(NAMES_CACHE_PREFIX + sheet)
  if (Array.isArray(persisted) && persisted.every((x) => typeof x === 'string')) {
    namesCache.set(sheet, persisted)
    return persisted
  }
  const rangeA1 = `'${sheet}'!${NAMES_RANGE}`
  const res = await getSheetValues(rangeA1)
  const rows = getValuesArray(res)
  const firstRow = rows[0] ?? []
  const list = firstRow
    .map((cell) => String(cell ?? '').trim())
    .filter(Boolean)
  namesCache.set(sheet, list)
  setCached(NAMES_CACHE_PREFIX + sheet, list)
  return list
}

export function useNamesForSheet(sheet: SheetName | ''): {
  names: string[]
  loading: boolean
  error: string | null
} {
  const [names, setNames] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sheet) {
      setNames([])
      return
    }

    const cached = namesCache.get(sheet)
    if (cached !== undefined) {
      setNames(cached)
      setError(null)
      return
    }
    const persisted = getCached<string[]>(NAMES_CACHE_PREFIX + sheet)
    if (Array.isArray(persisted) && persisted.every((x) => typeof x === 'string')) {
      namesCache.set(sheet, persisted)
      setNames(persisted)
      setError(null)
      return
    }

    let cancelled = false
    setError(null)
    setLoading(true)

    const rangeA1 = `'${sheet}'!${NAMES_RANGE}`
    getSheetValues(rangeA1)
      .then((res) => {
        if (cancelled) return
        const rows = getValuesArray(res)
        const firstRow = rows[0] ?? []
        const list = firstRow
          .map((cell) => String(cell ?? '').trim())
          .filter(Boolean)
        namesCache.set(sheet, list)
        setCached(NAMES_CACHE_PREFIX + sheet, list)
        setNames(list)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load names')
        setNames([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [sheet])

  return { names, loading, error }
}

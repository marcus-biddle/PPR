import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react'
import { getSheetValues, getValuesArray } from '@/api/sheets'

const SHEET_NAMES = ['Push', 'Pull', 'Run'] as const
const NAMES_RANGE = 'E5:Z5'
const PICKER_STORAGE_KEY = 'ppr-sheet-picker'
const NAMES_CACHE_PREFIX = 'ppr-names-'
const DEBOUNCE_MS = 400

export type SheetName = (typeof SHEET_NAMES)[number]

export const SHEET_DISPLAY_NAMES: Record<SheetName, string> = {
  Push: 'Push-ups',
  Pull: 'Pull-ups',
  Run: 'Run',
}

function getStoredPicker(): { sheet: SheetName | ''; name: string } {
  try {
    const raw = localStorage.getItem(PICKER_STORAGE_KEY)
    if (!raw) return { sheet: '', name: '' }
    const parsed = JSON.parse(raw) as { sheet?: string; name?: string }
    const sheet = (SHEET_NAMES as readonly string[]).includes(parsed.sheet ?? '')
      ? (parsed.sheet as SheetName)
      : ''
    const name = typeof parsed.name === 'string' ? parsed.name : ''
    return { sheet, name }
  } catch {
    return { sheet: '', name: '' }
  }
}

function getCachedNames(sheet: SheetName | ''): string[] {
  if (!sheet) return []
  try {
    const raw = sessionStorage.getItem(NAMES_CACHE_PREFIX + sheet)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) && parsed.every((x) => typeof x === 'string') ? parsed : []
  } catch {
    return []
  }
}

type PickerContextValue = {
  selectedSheet: SheetName | ''
  selectedName: string
  setSelectedSheet: (v: SheetName | '') => void
  setSelectedName: (v: string) => void
  names: string[]
  loadingNames: boolean
  error: string | null
  SHEET_NAMES: readonly SheetName[]
  SHEET_DISPLAY_NAMES: Record<SheetName, string>
}

const PickerContext = createContext<PickerContextValue | null>(null)

export function usePicker(): PickerContextValue {
  const ctx = useContext(PickerContext)
  if (!ctx) throw new Error('usePicker must be used within PickerProvider')
  return ctx
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export function PickerProvider({ children }: { children: ReactNode }) {
  const storedPicker = useMemo(() => getStoredPicker(), [])
  const [selectedSheet, setSelectedSheet] = useState<SheetName | ''>(() => storedPicker.sheet)
  const [selectedName, setSelectedName] = useState(() => storedPicker.name)
  const [names, setNames] = useState<string[]>(() => getCachedNames(storedPicker.sheet))
  const [loadingNames, setLoadingNames] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const namesCacheRef = useRef<Partial<Record<SheetName, string[]>>>({})
  const debouncedSheet = useDebouncedValue(selectedSheet, DEBOUNCE_MS)

  useEffect(() => {
    if (!debouncedSheet) {
      setNames([])
      setSelectedName((prev) => (prev ? '' : prev))
      return
    }
    const cached = namesCacheRef.current[debouncedSheet]
    if (cached) {
      setNames(cached)
      setSelectedName((prev) => (cached.includes(prev) ? prev : ''))
      return
    }
    let cancelled = false
    setError(null)
    setLoadingNames(true)
    const rangeA1 = `'${debouncedSheet}'!${NAMES_RANGE}`
    getSheetValues(rangeA1)
      .then((res) => {
        if (cancelled) return
        const rows = getValuesArray(res)
        const firstRow = rows[0] ?? []
        const list = firstRow
          .map((cell) => String(cell ?? '').trim())
          .filter(Boolean)
        namesCacheRef.current[debouncedSheet] = list
        try {
          sessionStorage.setItem(NAMES_CACHE_PREFIX + debouncedSheet, JSON.stringify(list))
        } catch {
          /* ignore */
        }
        setNames(list)
        setSelectedName((prev) => (list.includes(prev) ? prev : ''))
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load names')
        setNames([])
        setSelectedName('')
      })
      .finally(() => {
        if (!cancelled) setLoadingNames(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedSheet])

  useEffect(() => {
    try {
      localStorage.setItem(
        PICKER_STORAGE_KEY,
        JSON.stringify({ sheet: selectedSheet, name: selectedName })
      )
    } catch {
      /* ignore */
    }
  }, [selectedSheet, selectedName])

  const value: PickerContextValue = useMemo(
    () => ({
      selectedSheet,
      selectedName,
      setSelectedSheet,
      setSelectedName,
      names,
      loadingNames,
      error,
      SHEET_NAMES,
      SHEET_DISPLAY_NAMES,
    }),
    [selectedSheet, selectedName, names, loadingNames, error]
  )

  return <PickerContext.Provider value={value}>{children}</PickerContext.Provider>
}

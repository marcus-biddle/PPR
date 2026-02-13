import { useState } from 'react'
import {
  getSheetValues,
  appendRows,
  getValuesArray,
} from '@/api/sheets'

const DEFAULT_RANGE = 'Sheet1!A1:D'

export function SheetDemo() {
  const [range, setRange] = useState(DEFAULT_RANGE)
  const [data, setData] = useState<unknown[][]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appendMessage, setAppendMessage] = useState('')

  async function handleRead() {
    setError(null)
    setLoading(true)
    try {
      const res = await getSheetValues(range)
      setData(getValuesArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read sheet')
    } finally {
      setLoading(false)
    }
  }

  async function handleAppend() {
    if (!appendMessage.trim()) return
    setError(null)
    setLoading(true)
    try {
      await appendRows(range.split('!')[0] + '!A:D', [
        [new Date().toISOString(), appendMessage.trim()],
      ])
      setAppendMessage('')
      await handleRead()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to append')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium">Read from sheet</h2>
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Sheet1!A1:D10"
          />
          <button
            type="button"
            onClick={handleRead}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Read'}
          </button>
        </div>
        {error && (
          <p className="mb-2 text-sm text-red-600">{error}</p>
        )}
        {data.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <tbody>
                {data.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-100 even:bg-slate-50"
                  >
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2">
                        {String(cell ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium">Append row</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={appendMessage}
            onChange={(e) => setAppendMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAppend()}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Type a message to append…"
          />
          <button
            type="button"
            onClick={handleAppend}
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Append
          </button>
        </div>
      </section>
    </div>
  )
}

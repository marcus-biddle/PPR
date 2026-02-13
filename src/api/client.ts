/**
 * Low-level HTTP client for Google Sheets API.
 * All sheet actions use this to keep auth and base URL in one place.
 */

import { apiConfig, SHEETS_API_BASE } from './config'

type RequestInit = globalThis.RequestInit

function buildUrl(path: string, searchParams?: Record<string, string>): string {
  const url = new URL(`${SHEETS_API_BASE}/${apiConfig.spreadsheetId}/${path}`)
  url.searchParams.set('key', apiConfig.googleApiKey)
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return url.toString()
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text()
    let message = `Sheets API error ${res.status}: ${res.statusText}`
    try {
      const json = JSON.parse(text)
      message = json.error?.message ?? message
    } catch {
      if (text) message += ` - ${text.slice(0, 200)}`
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

/**
 * GET request to the Sheets API (values or other resources).
 */
export async function sheetsGet<T>(
  path: string,
  searchParams?: Record<string, string>,
  init?: RequestInit
): Promise<T> {
  const url = buildUrl(path, searchParams)
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json', ...init?.headers },
    ...init,
  })
  return handleResponse<T>(res)
}

/**
 * PUT request to the Sheets API (e.g. values.update).
 */
export async function sheetsPut<T>(
  path: string,
  body: unknown,
  searchParams?: Record<string, string>,
  init?: RequestInit
): Promise<T> {
  const url = buildUrl(path, searchParams)
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...init?.headers,
    },
    body: JSON.stringify(body),
    ...init,
  })
  return handleResponse<T>(res)
}

/**
 * POST request to the Sheets API (e.g. values.append).
 */
export async function sheetsPost<T>(
  path: string,
  body: unknown,
  searchParams?: Record<string, string>,
  init?: RequestInit
): Promise<T> {
  const url = buildUrl(path, searchParams)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...init?.headers,
    },
    body: JSON.stringify(body),
    ...init,
  })
  return handleResponse<T>(res)
}

# PPR – React + Tailwind + TypeScript + Google Sheets

A React app built with Vite, Tailwind CSS, and TypeScript that connects to Google Sheets. The API layer is separated so you can reuse sheet actions across the project.

---

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). If you haven’t set up the sheet connection yet, you’ll see setup instructions.

---

## Setting up the Google Sheet connection

### 1. Create a Google Cloud project and enable the Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or pick an existing one).
3. Open **APIs & Services** → **Library**.
4. Search for **Google Sheets API** and open it.
5. Click **Enable**.

### 2. Create an API key

1. Go to **APIs & Services** → **Credentials**.
2. Click **Create credentials** → **API key**.
3. Copy the key. (Optional but recommended: click **Edit API key**, under **API restrictions** choose **Restrict key**, and select only **Google Sheets API** so the key can’t be used for other APIs.)
4. Click **Save**.

### 3. Get your Spreadsheet ID

1. Open your Google Sheet in the browser.
2. Look at the URL. It looks like:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```
3. Copy the long string between `/d/` and `/edit`. That’s your **Spreadsheet ID**.

### 4. Share the sheet so the API key can access it

- **View-only:** In the sheet, click **Share** → set access to **Anyone with the link** → **Viewer**. The API key will be able to read the sheet.
- **Read and write:**  
  - Either share the sheet with **Anyone with the link** → **Editor**, or  
  - Use a [Google Service Account](https://cloud.google.com/iam/docs/service-accounts), share the sheet with the service account email as Editor, and call the API from a backend (this app uses the API key from the browser for simplicity).

### 5. Add environment variables to the project

1. In the project root, copy the example env file:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and set:
   ```env
   VITE_GOOGLE_API_KEY=your_api_key_here
   VITE_SPREADSHEET_ID=your_spreadsheet_id_here
   ```
3. Restart the dev server:
   ```bash
   npm run dev
   ```

The app will read and write using the range you specify (default: `Sheet1!A1:D`). You can change the sheet name and range in the UI or in your code.

---

## Project structure

```
src/
  api/                    # API layer – reuse across the app
    config.ts             # Env and base URLs (VITE_GOOGLE_API_KEY, VITE_SPREADSHEET_ID)
    client.ts             # Low-level fetch wrappers (sheetsGet, sheetsPut, sheetsPost)
    types.ts              # Shared types for Sheets API responses
    sheets/
      actions.ts          # Sheet actions: get, batch get, update, append, clear
      index.ts            # Re-exports for sheets
    index.ts              # Re-exports for the whole API layer
  components/             # React components
  App.tsx
  main.tsx
  index.css
```

---

## Using the API actions in your project

Import from `@/api` or `@/api/sheets`:

```ts
import {
  getSheetValues,
  getSheetValuesBatch,
  updateRange,
  appendRows,
  clearRange,
  getValuesArray,
} from '@/api/sheets'
```

### Read a single range

```ts
const res = await getSheetValues('Sheet1!A1:D10')
const rows = getValuesArray(res)  // unknown[][]
```

### Read multiple ranges

```ts
const res = await getSheetValuesBatch(['Sheet1!A1:A10', 'Sheet2!B1:B5'])
res.valueRanges.forEach((vr) => {
  const rows = getValuesArray(vr)
  // ...
})
```

### Update a range

```ts
await updateRange(
  { range: 'Sheet1!A1:C1', valueInputOption: 'USER_ENTERED' },
  [['Name', 'Email', 'Date']]
)
```

### Append rows

```ts
await appendRows('Sheet1!A:D', [
  ['Alice', 'alice@example.com', '2025-02-13'],
  ['Bob', 'bob@example.com', '2025-02-13'],
])
```

### Clear a range

```ts
await clearRange('Sheet1!A2:D100')
```

---

## Scripts

| Command       | Description          |
|---------------|----------------------|
| `npm run dev` | Start dev server     |
| `npm run build` | Production build   |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint          |

---

## Security note

`VITE_*` variables are embedded in the client bundle. The API key is therefore visible to anyone who opens your app. To avoid abuse:

1. **Restrict the API key** in Google Cloud (e.g. by HTTP referrer so only your domain can use it).
2. For private or sensitive data, use a **backend** that holds a **service account** key and calls the Sheets API; your React app should call your backend, not Google directly.

This setup is intended for personal or low-risk use and clear separation of API actions so you can later move them to a backend if needed.

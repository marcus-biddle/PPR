import { SheetDemo } from './components/SheetDemo'
import { hasSheetsConfig } from './api'

function App() {
  const configured = hasSheetsConfig()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">
          PPR – Google Sheets
        </h1>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        {configured ? (
          <SheetDemo />
        ) : (
          <SetupInstructions />
        )}
      </main>
    </div>
  )
}

function SetupInstructions() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
      <h2 className="mb-2 text-lg font-semibold">Setup required</h2>
      <p className="mb-4">
        Add your Google API key and Spreadsheet ID to connect. See{' '}
        <code className="rounded bg-amber-100 px-1.5 py-0.5 text-sm">
          README.md
        </code>{' '}
        for step-by-step instructions.
      </p>
      <ol className="list-inside list-decimal space-y-1 text-sm">
        <li>Create a <code>.env</code> file in the project root.</li>
        <li>Add <code>VITE_GOOGLE_API_KEY=your_api_key</code></li>
        <li>Add <code>VITE_SPREADSHEET_ID=your_sheet_id</code></li>
        <li>Restart the dev server (<code>npm run dev</code>).</li>
      </ol>
    </div>
  )
}

export default App

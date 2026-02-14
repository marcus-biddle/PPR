import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { MedalsPage } from './pages/MedalsPage'
import { SheetDemo } from './components/SheetDemo'
import { PickerProvider } from './contexts/PickerContext'
import { hasSheetsConfig } from './api'

function SetupInstructions() {
  return (
    <div className="rounded-xl border border-amber-700/50 bg-amber-500/10 p-6 text-amber-200">
      <h2 className="mb-2 text-lg font-semibold">Setup required</h2>
      <p className="mb-4">
        Add your Google API key and Spreadsheet ID to connect. See{' '}
        <code className="rounded bg-amber-500/20 px-1.5 py-0.5 text-sm text-amber-100">
          README.md
        </code>{' '}
        for step-by-step instructions.
      </p>
      <ol className="list-inside list-decimal space-y-1 text-sm text-zinc-300">
        <li>Create a <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">.env</code> file in the project root.</li>
        <li>Add <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">VITE_GOOGLE_API_KEY=your_api_key</code></li>
        <li>Add <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">VITE_SPREADSHEET_ID=your_sheet_id</code></li>
        <li>Restart the dev server (<code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">npm run dev</code>).</li>
      </ol>
    </div>
  )
}

function App() {
  const configured = hasSheetsConfig()

  const content = (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route
            index
            element={configured ? <HomePage /> : <SetupInstructions />}
          />
          <Route
            path="leaderboard"
            element={configured ? <LeaderboardPage /> : <SetupInstructions />}
          />
          <Route
            path="medals"
            element={configured ? <MedalsPage /> : <SetupInstructions />}
          />
          <Route
            path="details"
            element={configured ? <SheetDemo /> : <SetupInstructions />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )

  return configured ? <PickerProvider>{content}</PickerProvider> : content
}

export default App

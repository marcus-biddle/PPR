import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { usePicker } from '@/contexts/PickerContext'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  }
  return name.slice(0, 2).toUpperCase() || '?'
}

export function ProfileDropdown() {
  const {
    selectedSheet,
    selectedName,
    setSelectedSheet,
    setSelectedName,
    names,
    loadingNames,
    error,
    SHEET_NAMES,
    SHEET_DISPLAY_NAMES,
  } = usePicker()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="focus:outline-none rounded-full ring-offset-2 ring-offset-zinc-950 focus:ring-2 focus:ring-[#00c805] transition-all"
          aria-label="Select profile"
        >
          <Avatar className="h-10 w-10 rounded-full border-2 border-zinc-700/80 bg-zinc-800 shadow-lg transition-all hover:border-[#00c805]/60 hover:shadow-[0_0_20px_rgba(0,200,5,0.15)]">
            <AvatarFallback className="rounded-full bg-zinc-800 text-sm font-semibold text-white">
              {selectedName ? getInitials(selectedName) : '?'}
            </AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-72 rounded-2xl border-zinc-800 bg-zinc-900/95 p-4 shadow-xl backdrop-blur-xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Exercise
          </p>
          <div className="flex flex-wrap gap-2">
            {SHEET_NAMES.map((sheet) => (
              <button
                key={sheet}
                type="button"
                onClick={() => setSelectedSheet(sheet)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  selectedSheet === sheet
                    ? 'border border-[#00c805] bg-[#00c805]/15 text-[#00c805]'
                    : 'border border-zinc-700 bg-transparent text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                {SHEET_DISPLAY_NAMES[sheet]}
              </button>
            ))}
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Name {loadingNames && '· loading…'} {!selectedSheet && '· pick exercise first'}
            </p>
            {error && (
              <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}
            {selectedSheet && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-zinc-800/80">
                {loadingNames ? (
                  <div className="flex items-center gap-2 px-4 py-6 text-sm text-zinc-500">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#00c805]" />
                    Loading names…
                  </div>
                ) : names.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-zinc-500">No names in this sheet.</p>
                ) : (
                  <div className="divide-y divide-zinc-800/80 py-1">
                    {names.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setSelectedName(name)}
                        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-zinc-800/60 ${
                          selectedName === name
                            ? 'bg-[#00c805]/10 font-medium text-[#00c805]'
                            : 'text-zinc-200'
                        }`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-400">
                          {getInitials(name)}
                        </span>
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

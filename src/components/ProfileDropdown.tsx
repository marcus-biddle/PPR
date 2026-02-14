import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-950 rounded-full"
          aria-label="Select profile"
        >
          <Avatar className="h-10 w-10 border-2 border-zinc-700 shadow-md hover:border-zinc-600 transition-colors cursor-pointer">
            <AvatarFallback className="bg-zinc-700 text-white hover:bg-zinc-600">
              {selectedName ? getInitials(selectedName) : '?'}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Select profile</DropdownMenuLabel>
        {error && (
          <p className="px-2 py-1.5 text-sm text-red-600 bg-red-50 rounded-sm mx-1">{error}</p>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-zinc-500">Sheet</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={selectedSheet || undefined}
          onValueChange={(v) => setSelectedSheet((v || '') as 'Push' | 'Pull' | 'Run' | '')}
        >
          {SHEET_NAMES.map((name) => (
            <DropdownMenuRadioItem key={name} value={name}>
              {SHEET_DISPLAY_NAMES[name]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-zinc-500">
          Name {loadingNames && '(loading…)'} {!selectedSheet && '(select sheet first)'}
        </DropdownMenuLabel>
        {names.length > 0 && (
          <DropdownMenuRadioGroup value={selectedName || undefined} onValueChange={setSelectedName}>
            {names.map((name) => (
              <DropdownMenuRadioItem key={name} value={name}>
                {name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

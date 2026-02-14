import { Outlet } from 'react-router-dom'
import { NavLink } from 'react-router-dom'
import { ProfileDropdown } from './ProfileDropdown'
import { hasSheetsConfig } from '@/api'
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'

export function Layout() {
  const configured = hasSheetsConfig()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/95 supports-[backdrop-filter]:bg-zinc-950/90 backdrop-blur">
        <div className="flex flex-col gap-0">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                PPR
              </span>
              <span className="text-zinc-400">Sheets</span>
            </h1>
            {configured && <ProfileDropdown />}
          </div>
          {configured && (
            <div className="border-t border-zinc-800 bg-zinc-900/30">
              <NavigationMenu className="mx-4 max-w-none justify-start sm:mx-6">
                <NavigationMenuList className="h-10 justify-start gap-1 border-0 bg-transparent p-0">
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <NavLink
                        to="/"
                        className={({ isActive }) =>
                          cn(
                            navigationMenuTriggerStyle(),
                            'h-8 rounded-md bg-transparent px-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white',
                            isActive && 'bg-zinc-800 text-white hover:bg-zinc-800 hover:text-white'
                          )
                        }
                      >
                        Home
                      </NavLink>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <NavLink
                        to="/details"
                        className={({ isActive }) =>
                          cn(
                            navigationMenuTriggerStyle(),
                            'h-8 rounded-md bg-transparent px-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white',
                            isActive && 'bg-zinc-800 text-white hover:bg-zinc-800 hover:text-white'
                          )
                        }
                      >
                        Details
                      </NavLink>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}

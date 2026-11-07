import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { FolderKanban, Gamepad2, LayoutDashboard, LogOut, Menu, UserCog, UserPlus, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/utils'

function NavItem({ to, end, icon, children, onNavigate }: {
  to: string
  end?: boolean
  icon: ReactNode
  children: ReactNode
  onNavigate: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-4',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )
      }
    >
      {icon}
      {children}
    </NavLink>
  )
}

export function AppLayout() {
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const renderNav = (label: string) => (
    <nav aria-label={label} className="flex flex-col gap-1">
      <NavItem to="/" end icon={<LayoutDashboard />} onNavigate={close}>Dashboard</NavItem>
      <Separator className="my-2" />
      <NavItem to="/campaigns" icon={<FolderKanban />} onNavigate={close}>Campaigns</NavItem>
      <NavItem to="/games" icon={<Gamepad2 />} onNavigate={close}>Games</NavItem>
      <Separator className="my-2" />
      <NavItem to="/account" icon={<UserCog />} onNavigate={close}>User edition</NavItem>
      {profile?.is_admin && (
        <NavItem to="/users/new" icon={<UserPlus />} onNavigate={close}>User creation</NavItem>
      )}
      <Button
        variant="ghost"
        className="justify-start px-3 text-muted-foreground"
        onClick={signOut}
      >
        <LogOut /> Logout
      </Button>
    </nav>
  )

  return (
    <div className="min-h-svh bg-muted/40 md:flex">
      <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
        <span className="font-semibold">sn-posts</span>
        <Button
          variant="outline"
          size="icon"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </header>
      {open && (
        <div className="border-b bg-background p-3 md:hidden">{renderNav('Mobile navigation')}</div>
      )}
      <aside className="hidden w-60 shrink-0 border-r bg-background p-4 md:block">
        <div className="mb-4 px-3 font-semibold">sn-posts</div>
        {renderNav('Main navigation')}
      </aside>
      <main className="min-w-0 flex-1 p-4 py-8 md:px-8">
        <div className="mx-auto max-w-4xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

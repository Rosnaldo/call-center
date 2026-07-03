import { Users } from "lucide-react"
import { useLocation } from "react-router-dom"
import { cn } from '@/lib/utils';
import { UserProfileBadge } from '@/components/user-profile-badge';

const navItems = [
  { href: "/myadmin/users", label: "Usuarios", icon: Users },
]

export function Header() {
    const location = useLocation()
    const pathname = location.pathname;

    return (
        <header className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
            <nav className="flex items-center gap-1">
            {navItems.map((item) => {
                const isActive =
                item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)
                return (
                <a
                    key={item.href}
                    href={item.href}
                    className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                </a>
                )
            })}
            </nav>

            <div className="ml-auto">
                <UserProfileBadge />
            </div>
        </div>
        </header>
    )
}

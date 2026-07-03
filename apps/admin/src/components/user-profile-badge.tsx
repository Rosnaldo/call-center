import { LayoutDashboard, LogOut, User as UserIcon } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/providers/auth-provider"
import { useCurrentUser } from "@/hooks/use-current-user"

export function UserProfileBadge() {
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const { logout, loggedUser } = useAuth()
    const { data: currentUser } = useCurrentUser()

    const fullname = currentUser
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : loggedUser.fullname
    const initials = fullname
        ? fullname.trim().charAt(0).toUpperCase()
        : "?"

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-accent focus:outline-none"
                    aria-label="Menu do usuário"
                >
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUser?.avatar?.url} alt={fullname} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-medium text-card-foreground sm:inline">
                        {fullname}
                    </span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                    <span className="text-sm font-semibold text-card-foreground">{fullname}</span>
                    <span className="text-xs font-normal text-muted-foreground truncate">
                        {loggedUser.email}
                    </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!pathname.startsWith("/users") && (
                    <DropdownMenuItem onClick={() => navigate("/users")}>
                        <LayoutDashboard className="h-4 w-4" />
                        Voltar para o painel
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <UserIcon className="h-4 w-4" />
                    Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                    <LogOut className="h-4 w-4" />
                    Sair
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

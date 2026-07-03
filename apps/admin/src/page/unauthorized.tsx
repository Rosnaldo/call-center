import { ArrowLeft, ShieldAlert } from "lucide-react"
import { useAuth } from "@/providers/auth-provider"

export default function Unauthorized() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">

      <div className="relative z-10 text-center px-4">
        <ShieldAlert className="w-20 h-20 text-destructive mx-auto mb-6" />

        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Acesso não autorizado</h2>
        <p className="text-muted-foreground mb-6">
          Você não tem permissão para acessar o painel administrativo.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
                type="button"
                onClick={logout}
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-6 cursor-pointer"
            >
                <ArrowLeft className="w-4 h-4" />
                Fazer logout e ir para login
            </button>
        </div>
      </div>
    </div>
  )
}

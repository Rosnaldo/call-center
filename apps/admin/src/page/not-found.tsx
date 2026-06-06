import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">

      <div className="relative z-10 text-center px-4">
        {/* 404 Number with anime style */}
        <div className="relative mb-8">
          <h1 className="text-[150px] md:text-[200px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent leading-none">
            404
          </h1>
          <div className="absolute inset-0 text-[150px] md:text-[200px] font-bold text-primary/10 blur-2xl leading-none">
            404
          </div>
        </div>

        {/* Message */}
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Página não encontrada</h2>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Voltar para o login
            </Link>
        </div>
      </div>
    </div>
  )
}

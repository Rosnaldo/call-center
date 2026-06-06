import { Button } from "@/components/ui/button"
import { AnimeBackground } from "@/components/anime-background"
import { Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      <AnimeBackground />

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
        <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
          Parece que você se perdeu no caminho para a chácara. Essa página não existe ou foi movida.
        </p>

        {/* Decorative sakura */}
        <div className="flex justify-center gap-2 mb-8">
          {[...Array(5)].map((_, i) => (
            <svg
              key={i}
              className="w-6 h-6 text-primary/40 animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
              viewBox="0 0 20 20"
            >
              <path d="M10 0 C12 4 16 6 20 10 C16 12 12 16 10 20 C8 16 4 12 0 10 C4 8 8 4 10 0" fill="currentColor" />
            </svg>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="gap-2">
            <a href="/">
              <Home className="w-4 h-4" />
              Voltar ao Início
            </a>
          </Button>

        </div>
      </div>
    </div>
  )
}

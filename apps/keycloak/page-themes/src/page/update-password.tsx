import React from "react"

import Link from "next/link"
import { Ticket, Eye, EyeOff, Lock, ShieldCheck, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AnimeBackground } from "@/components/anime-background"

export default function AlterarSenhaPage() {

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto relative py-8">

      <div className="w-full max-w-md mx-auto px-4 relative z-10">
        {/* Voltar */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2 mb-4">
            <Ticket className="w-10 h-10 text-primary animate-glow" />
            <span className="text-2xl font-bold tracking-tight">
              Chácara<span className="text-primary">Meets</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-6 h-6 text-accent" />
            <h1 className="text-xl font-semibold">Alterar Senha</h1>
          </div>
          <p className="text-muted-foreground text-center">
            Mantenha sua conta segura atualizando sua senha
          </p>
        </div>

        {/* Alterar Senha Card */}
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
          <form className="space-y-5">
            {/* Senha Atual */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="currentPassword"
                  type={"password"}
                  placeholder="Digite sua senha atual"
                  className={`bg-background/50 pl-10 pr-10`}
                />

              </div>
            </div>

            <div className="border-t border-border/50 my-4" />

            {/* Nova Senha */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={"password"}
                  placeholder="Digite sua nova senha"
                  className={`bg-background/50 pl-10 pr-10 `}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres</p>
            </div>

            {/* Confirmar Nova Senha */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={"password"}
                  placeholder="Confirme sua nova senha"
                  className={`bg-background/50 pl-10 pr-10`}
                />
              </div>
            </div>

            {/* Dicas de Segurança */}
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-medium text-accent">Dicas para uma senha segura:</h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Use pelo menos 8 caracteres</li>
                <li>Combine letras maiúsculas e minúsculas</li>
                <li>Inclua números e símbolos especiais</li>
                <li>Evite informações pessoais óbvias</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {"Alterar Senha"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Esqueceu sua senha atual?{" "}
            <Link href="/esqueci-senha" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              Recuperar senha
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

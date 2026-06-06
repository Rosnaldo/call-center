
import React from 'react'

import Link from "next/link"
import { Ticket, ArrowLeft, Mail, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function EsqueciSenhaPage() {

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto flex items-center justify-center relative py-8">

      <div className="w-full max-w-md mx-4 relative z-10">
        {/* Logo */}

        {/* Reset Card */}
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Esqueceu sua senha?</h2>
                <p className="text-muted-foreground text-sm">
                  Digite seu e-mail e enviaremos um link para você redefinir sua senha.
                </p>
              </div>

              <form className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    className="bg-background/50"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {"Enviar link de recuperação"}
                </Button>
              </form>

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para o login
              </Link>
            </>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Lembrou da senha?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  )
}

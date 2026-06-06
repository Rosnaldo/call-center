import React from "react"
import Link from "next/link"
import { Ticket, Mail, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"


export default function VerificarEmailContent() {

  return (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-2">Verifique seu e-mail</h1>
                <p className="text-muted-foreground">
                  Enviamos um link de verificação para{" "}
                  . Clique no link
                  para ativar sua conta.
                </p>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
                <p className="mb-2">Não recebeu o e-mail?</p>
                <ul className="text-left space-y-1 list-disc list-inside">
                  <li>Verifique sua pasta de spam</li>
                  <li>Confirme se o e-mail está correto</li>
                  <li>Aguarde alguns minutos e tente novamente</li>
                </ul>
              </div>

              <Button
                variant="outline"
                className="w-full"
              >
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reenviar e-mail de verificação
                  </>
              </Button>

              <Link
                href="/login"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Voltar para o login
              </Link>
            </div>
  )
}

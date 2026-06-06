
import React from 'react'
import { Ticket, Instagram, Eye, EyeOff, ArrowLeft, User, Mail, Lock } from "lucide-react"
import { AnimeBackground } from "@/components/anime-background"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Span } from "@/components/span"
import { Label } from "@/components/ui/label"

export default function RegisterPage() {
    return (
        <main className="h-screen overflow-y-auto kc-scrollbar flex items-center justify-center relative">
            <AnimeBackground />
            <div className="justify-start flex flex-col w-full max-w-md mx-4 relative z-10 py-4">
                {/* Logo */}
                <div className="flex flex-col items-center mb-2">
                    <a href="/" className="flex items-center gap-2 mb-4">
                        <Ticket className="w-10 h-10 text-primary animate-glow" />
                        <p className="text-2xl font-bold tracking-tight">
                        <Span className="text-primary-foreground">Chácara</Span><Span className="text-primary">Meets</Span>
                        </p>
                    </a>
                </div>


                {/* Login Card */}
                <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
                <form action="${url.registrationAction}" method="post" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">Nome</Label>
                            <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                id="firstName"
                                name="firstName"
                                type="text"
                                placeholder="João"
                                className={`bg-background/50 px-10`}
                            />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lastName">Sobrenome</Label>
                            <Input
                                id="lastName"
                                name="lastName"
                                type="text"
                                placeholder="Silva"
                                className={`bg-background/50 `}
                            />
                        </div>
                    </div>
                    <Input
                        type="hidden"
                        id="username"
                        name="username"
                    />
                    <div className="space-y-2">
                    <Label className="text-primary-foreground">e-mail</Label>
                     <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            placeholder="seu@email.com"
                            className={`bg-background/50 px-10`}
                        />
                    </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-primary-foreground">senha</Label>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                placeholder="••••••••"
                                required
                                className={`bg-background/50 px-10`}
                            />
                            <button
                                type="button"
                                id="toggle-password"
                                className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Span id="eye-off">
                                    <EyeOff className="w-4 h-4" />
                                </Span>
                                <Span id="eye" className="hidden">
                                    <Eye className="w-4 h-4" />
                                </Span>
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between pt-2">
                            <Label className="text-primary-foreground">confirmar</Label>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                id="password-confirm"
                                type="password"
                                name="password-confirm"
                                placeholder="••••••••"
                                required
                                className={`bg-background/50 px-10`}
                            />
                            <button
                                type="button"
                                id="confirm-toggle-password"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Span id="confirm-eye-off">
                                    <EyeOff className="w-4 h-4" />
                                </Span>
                                <Span id="confirm-eye" className="hidden">
                                    <Eye className="w-4 h-4" />
                                </Span>
                            </button>
                        </div>
                    </div>

                    <p className="text-xs text-destructive">usuario já existe</p>
                    <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    >
                        Registrar
                    </Button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                    <Span className="bg-card px-4 text-muted-foreground">ou continue com</Span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Button className="w-full bg-background/50 hover:bg-background/80">
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Google
                    </Button>
                    <Button className="w-full bg-background/50 hover:bg-background/80">
                        <Instagram className="w-5 h-5 mr-2" />
                        Instagram
                    </Button>
                </div>

                <a
                    href="${url.loginUrl}"
                    className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para o login
                </a>

                </div>


                {/* <p className="text-center text-xs text-muted-foreground mt-6">
                    Ao continuar, você concorda com nossos{" "}
                    <a href="/termos" className="text-primary hover:underline">
                        Termos de Uso
                    </a>{" "}
                    e{" "}
                    <a href="/privacidade" className="text-primary hover:underline">
                        Política de Privacidade
                    </a>
                </p> */}
            </div>
        </main>
    )
}

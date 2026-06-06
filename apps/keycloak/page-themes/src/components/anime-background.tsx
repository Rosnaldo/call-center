import React from 'react'
import { useMemo, useId } from "react"

type Sakura = {
    id: number
    left: number
    delay: number
    size: number
}

function seededRandom(seed: number) {
    return () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
    }
}

export function AnimeBackground() {
    const reactId = useId()

    const sakuras = useMemo<Sakura[]>(() => {
        // gera seed estável a partir do useId
        const seed = reactId
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0)

        const random = seededRandom(seed)

        return Array.from({ length: 20 }, (_, i) => ({
            id: i,
            left: random() * 100,
            delay: random() * 10,
            size: random() * 15 + 10,
        }))
    }, [reactId])

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />

        {/* Decorative SVGs */}
        <svg className="absolute top-20 right-10 w-64 h-64 opacity-10 animate-float" viewBox="0 0 200 200">
            <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(350, 80%, 70%)" />
                <stop offset="100%" stopColor="hsl(180, 60%, 60%)" />
            </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="80" fill="none" stroke="url(#grad1)" strokeWidth="2" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="url(#grad1)" strokeWidth="1" />
            <path d="M100 20 L100 180 M20 100 L180 100" stroke="url(#grad1)" strokeWidth="1" opacity="0.5" />
        </svg>

        {/* Sakura petals */}
        {sakuras.map((sakura) => (
            <svg
            key={sakura.id}
            className="absolute animate-sakura opacity-30"
            style={{
                left: `${sakura.left}%`,
                animationDelay: `${sakura.delay}s`,
                width: sakura.size,
                height: sakura.size,
            }}
            viewBox="0 0 20 20"
            >
            <path
                d="M10 0 C12 4 16 6 20 10 C16 12 12 16 10 20 C8 16 4 12 0 10 C4 8 8 4 10 0"
                fill="hsl(350, 80%, 75%)"
            />
            </svg>
        ))}

        {/* Pattern */}
        <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23ffffff' d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/svg%3E")`,
            }}
        />
        </div>
    )
}

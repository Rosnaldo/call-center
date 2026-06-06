import React from 'react'
import { cn } from "@/lib/utils";

type Props = {
    className?: string;
    id?: string;
}

export function Span({ children, className, id }: React.PropsWithChildren<Props>) {
    return (
        <span
            id={id}
            className={cn(
                className,
                "font-roboto"
            )}
        >
            {children}
        </span>
    )
}

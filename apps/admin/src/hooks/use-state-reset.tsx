import { useState, useCallback, useEffect } from "react";
import _ from "lodash";

export function useStateReset<T extends object>(
    initialState: T,
    transform?: (oldState: T) => T,
    deps: any[] = []
) {
    const [state, setState] = useState<T>(initialState);

    const resetState = useCallback(() => {
        const scrollPos = window.scrollY;

        setState(oldState => {
            if (!transform) return oldState;

            const newState = transform(oldState);

            // só atualiza se mudou de fato
            if (!_.isEqual(oldState, newState)) {
                return newState;
            }

            return oldState; // mantém referência para evitar re-render desnecessário
        });

        window.scrollTo(0, scrollPos);
    }, [transform]);

    useEffect(() => {
        resetState();
    }, deps);

    return [state, setState, resetState] as const;
}
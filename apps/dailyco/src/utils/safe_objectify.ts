
// 1) Retorna OBJETO sem ciclos (não retorna string aqui)
const removeCircularObject = (obj: any) => {
    const seen = new WeakMap<object, string>(); // guarda caminho para referência
    const stack: string[] = [];

    const _walk = (value: any): any => {
        // Primitivos ficam como estão
        if (value === null) return null;
        const t = typeof value;

        if (t !== 'object') {
            if (t === 'bigint') return String(value); // BigInt não é serializável nativamente
            if (t === 'symbol') return value.toString();
            return value;
        }

        // Date, Buffer, Error, Map/Set: serialização amigável
        if (value instanceof Date) return value.toISOString();
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return `Buffer(${value.length} bytes)`;
        if (value instanceof Error) {
            return {
                name: value.name,
                message: value.message,
                stack: value.stack,
            };
        }
        if (value instanceof Map) {
            return { type: 'Map', entries: Array.from(value.entries()).map(([k, v]) => [k, _walk(v)]) };
        }
        if (value instanceof Set) {
            return { type: 'Set', values: Array.from(value.values()).map((v) => _walk(v)) };
        }

        // Detecção de ciclos com caminho
        if (seen.has(value)) {
        return `[Circular ~${seen.get(value)}]`;
        }

        // Caminho atual para debug
        const path = stack.join('.') || '~';
        if (typeof value === 'object') seen.set(value, path);

        // Array
        if (Array.isArray(value)) {
            stack.push('[]');
            const arr = value.map((v) => _walk(v));
            stack.pop();
            return arr;
        }

        // Objeto
        const result: Record<string, any> = {};
        for (const key of Object.keys(value)) {
            stack.push(key);
            result[key] = _walk(value[key]);
            stack.pop();
        }
        return result;
    };

    return _walk(obj);
};

// 2) Agora SIM stringifica apenas uma vez:
export const safeObjectify = (obj: any) => {
    try {
        return removeCircularObject(obj);
    } catch {
        // fallback mínimo para não quebrar log
        return { Unstringifiable: '[Unstringifiable]' };
    }
};

declare global {
    interface Array<T> {
        transformInDict: <K extends keyof T>(field: K) => Record<T[K] & string, { value: T; originalIndex: number }>;
    }
}

Object.defineProperty(Array.prototype, 'transformInDict', {
    value: function <K>(field: K) {
        return this.reduce((map: any, value: any) => {
            map[value[field] as keyof typeof map] = { value };

            return map;
        }, {});
    },
});

export default Array.prototype.transformInDict;

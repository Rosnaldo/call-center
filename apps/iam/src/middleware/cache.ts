import { type Request, type Response, type NextFunction } from 'express';
import { cacheGet, cacheSet } from '#utils/cache';

export const cacheMiddleware = (keyFn: (req: Request) => string) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const cacheKey = keyFn(req);

        const cached = await cacheGet<unknown>(cacheKey);
        if (cached) {
            return res.status(200).send(cached);
        }

        const originalSend = res.send.bind(res);
        res.send = ((body: any) => {
            if (res.statusCode === 200 && body) {
                const data = typeof body === 'string' ? body : JSON.stringify(body);
                cacheSet(cacheKey, JSON.parse(data)).catch(() => {});
            }
            return originalSend(body);
        }) as typeof res.send;

        return next();
    };

import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function traceMiddleware(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-trace-id'];
    req.traceId = typeof incoming === 'string' ? incoming : randomUUID();
    res.setHeader('x-trace-id', req.traceId);
    next();
}

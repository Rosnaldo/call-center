import { type Request, type Response, type NextFunction } from 'express';
import jwt, { JwtHeader, JwtPayload } from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';
import _ from 'lodash';

import properties from '#properties';

function getKey(client: JwksClient, header: JwtHeader): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!header.kid) return reject(new Error('No KID found in token header'));
        client.getSigningKey(header.kid, (err, key) => {
            if (err) return reject(err);
            const signingKey = key?.getPublicKey();
            if (!signingKey) throw new Error('Public key not found for KID');
            resolve(signingKey);
        });
    });
}

async function resolveToken(key: string, token: string, issuer: string): Promise<JwtPayload> {
    return new Promise((resolve, reject) => {
        jwt.verify(
            token,
            key,
                {
                    issuer,
                    algorithms: ['RS256'],
                },
                (err, decoded) => {
                    if (err) return reject(err);
                    resolve(decoded as JwtPayload);
                }
            );
    });
}

export function makeValidateToken(): (token: string) => Promise<JwtPayload> {
    if (properties.nodeEnv === "e2e") {
        return async (_token: string): Promise<JwtPayload> => ({
            sub: "sub",
            email: "andreytsuzuki@gmail.com",
            given_name: "Andrey",
            family_name: "Tsuzuki"
        });
    }

    return validateToken;
}

async function validateToken(token: string): Promise<JwtPayload> {
    const payload = jwt.decode(token) as JwtPayload;
    const issuer = payload.iss || '';

    const jclient = jwksClient({
        jwksUri: `${properties.keycloakUri}/realms/poc/protocol/openid-connect/certs`,
        cache: true,
        cacheMaxEntries: 5,
        cacheMaxAge: 10 * 60 * 1000
    });
    const decodedHeader = jwt.decode(token, { complete: true })?.header as JwtHeader;
    if (!decodedHeader) throw new Error('Invalid token');

    const key = await getKey(jclient, decodedHeader);
    return await resolveToken(key, token, issuer);
}

export const GetKeycloakUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization || '';
        const result = await makeValidateToken()(token);

        req.userKc = {
            id: result.sub!,
            email: result.email,
            firstName: result.given_name,
            lastName: result.family_name,
        };

        return next();
    } catch (error) {
        console.log('GetKeycloakUser: Não autorizado', error)
        return res.status(403).send({ isError: true, data: {}, message: 'Não autorizado', status: 401 });
    }
};

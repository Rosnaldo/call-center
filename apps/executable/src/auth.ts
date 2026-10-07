// Authentication for the executable service, same token validation as IAM's
// GetKeycloakUser (apps/iam/src/middleware/get_keycloak_user.ts): callers
// send a Keycloak access token (client_credentials of a service client, see
// the chatbot's service-token.ts) in the Authorization header, with or
// without "Bearer ". On top of that, its `azp` (the client that requested
// it) must be one of EXECUTABLE_ALLOWED_CLIENTS, so tokens of logged-in
// users or of other services don't get through.
import type { IncomingMessage } from "http";
import jwt, { type JwtHeader, type JwtPayload } from "jsonwebtoken";
import jwksClient, { type JwksClient } from "jwks-rsa";

const KEYCLOAK_URI = process.env.KEYCLOAK_URI;
if (!KEYCLOAK_URI) throw new Error("KEYCLOAK_URI is not set");
const ALLOWED_CLIENTS = (process.env.EXECUTABLE_ALLOWED_CLIENTS ?? "chatbot")
  .split(",")
  .map((client) => client.trim())
  .filter(Boolean);

let _jwksClient: JwksClient | undefined;

function getJwksClient(): JwksClient {
  if (!_jwksClient) {
    _jwksClient = jwksClient({
      jwksUri: `${KEYCLOAK_URI}/realms/poc/protocol/openid-connect/certs`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 10 * 60 * 1000,
    });
  }
  return _jwksClient;
}

function getKey(client: JwksClient, header: JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!header.kid) return reject(new Error("No KID found in token header"));
    client.getSigningKey(header.kid, (err, key) => {
      if (err) return reject(err);
      const signingKey = key?.getPublicKey();
      if (!signingKey) return reject(new Error("Public key not found for KID"));
      resolve(signingKey);
    });
  });
}

function resolveToken(key: string, token: string, issuer: string): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, key, { issuer, algorithms: ["RS256"] }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded as JwtPayload);
    });
  });
}

export async function validateToken(token: string): Promise<JwtPayload> {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded.payload === "string") throw new Error("Invalid token");
  const issuer = decoded.payload.iss || "";

  const key = await getKey(getJwksClient(), decoded.header);
  return await resolveToken(key, token, issuer);
}

// Resolves to the authenticated client id; rejects when the request isn't
// authenticated.
export async function authenticate(req: IncomingMessage): Promise<string> {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Missing token");
  const { azp } = await validateToken(token);
  const client = typeof azp === "string" ? azp : "";
  if (!ALLOWED_CLIENTS.includes(client)) throw new Error(`Client ${client || "(none)"} not allowed`);
  return client;
}

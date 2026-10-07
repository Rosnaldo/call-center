// Whether a web user is logged in: their Keycloak access token is checked by
// IAM (POST /auth/validate-token), same as realtime's auth/verify_token.ts.
// The chatbot is anonymous, so the web sends the token only with the requests
// that need a logged-in user (the installer).

const REQUEST_TIMEOUT_MS = 10_000;

// Resolves to false for a missing, invalid or expired token; rejects when IAM
// can't be reached, so that isn't taken for a logged-out user.
export type IsLoggedIn = (token: string | undefined) => Promise<boolean>;

export const createUserAuthClient =
    (iamUri: string): IsLoggedIn =>
    async (token) => {
        if (!token) return false;
        const res = await fetch(`${iamUri}/auth/validate-token`, {
            method: 'POST',
            headers: { Authorization: token },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (res.status === 401) return false;
        if (!res.ok) throw new Error(`IAM answered ${res.status}: ${await res.text()}`);
        return true;
    };

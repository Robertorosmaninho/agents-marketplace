/**
 * Bearer-token parsing for admin-gated routes.
 *
 * The broader wallet-auth surface (challenges, session tokens, Ed25519
 * verification) lived here in the upstream marketplace but isn't used by
 * the phase-1 commerce abstraction — the commerce flow is HMAC-based, not
 * wallet-session-based, and the admin endpoints use a bearer admin token.
 */
export function parseBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

import { type Auth } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase/admin";

/** Thrown when the request lacks a valid Firebase ID token (→ 401). */
export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Thrown when the server itself cannot verify tokens — e.g. a missing or
 * malformed service account (→ 503). This is a server misconfiguration, NOT a
 * problem with the caller's token, so it must not be reported as a 401.
 */
export class AdminConfigError extends Error {
  constructor(message = "Server authentication is not configured") {
    super(message);
    this.name = "AdminConfigError";
  }
}

export type AuthedUser = { uid: string };

/** Resolve the Admin Auth instance, or throw a typed config error (with logging). */
function getVerifier(): Auth {
  try {
    return adminAuth();
  } catch (err) {
    // The real reason (e.g. "FIREBASE_SERVICE_ACCOUNT_KEY must be ...") is logged
    // server-side so it's diagnosable; the client just gets a generic 503.
    console.error("[auth] Firebase Admin SDK is not configured:", err);
    throw new AdminConfigError();
  }
}

/**
 * Verify the Firebase ID token from the `Authorization: Bearer <token>` header.
 * Returns the authenticated user's uid. Throws `AdminConfigError` if the server
 * can't verify (misconfig) or `UnauthorizedError` if the token is missing/invalid.
 */
export async function requireUser(request: Request): Promise<AuthedUser> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new UnauthorizedError("Missing or malformed Authorization header");
  }

  const auth = getVerifier();
  try {
    const decoded = await auth.verifyIdToken(match[1].trim());
    return { uid: decoded.uid };
  } catch (err) {
    console.error("[auth] verifyIdToken rejected the token:", err);
    throw new UnauthorizedError("Invalid or expired token");
  }
}

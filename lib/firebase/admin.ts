import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK initialization (server only).
 *
 * The Admin SDK bypasses Firestore security rules, so it must never be imported
 * into client code. It is used exclusively by API route handlers to (1) verify
 * caller ID tokens and (2) perform all writes. Initialization is lazy so that
 * importing this module never throws at build time when secrets are absent.
 */
function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
  }
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY must be the service-account JSON on a single line",
    );
  }
}

let cachedApp: App | undefined;

function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(loadServiceAccount()) });
  return cachedApp;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}

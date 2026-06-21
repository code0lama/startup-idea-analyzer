/** Map Firebase Auth error codes to friendly, user-facing messages. */
const MESSAGES: Record<string, string> = {
  "auth/invalid-email": "That email address is not valid.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Password should be at least 6 characters.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/cancelled-popup-request": "Sign-in was cancelled.",
  "auth/popup-blocked":
    "The sign-in popup was blocked. Allow popups and try again.",
  "auth/network-request-failed":
    "Network error. Check your connection and try again.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
};

export function authErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: unknown }).code);
    if (code in MESSAGES) return MESSAGES[code];
  }
  return "Something went wrong. Please try again.";
}

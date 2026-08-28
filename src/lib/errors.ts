// Supabase errors (PostgrestError, AuthError, etc.) don't reliably survive
// `instanceof Error` checks once they cross the RN/web bundle's async/fetch
// boundaries, even though the classes are declared as `extends Error`. Duck-type
// on `.message` instead so real server error text (RLS denials, RPC
// `raise exception` messages, auth errors) reaches the user instead of a
// generic fallback.
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message) {
    return err.message;
  }
  return fallback;
}

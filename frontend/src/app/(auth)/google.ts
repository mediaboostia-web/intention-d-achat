import 'server-only';

/** Same three keys as tryCreateGoogleProvider: without them the button would lead to a 404. */
export function googleSignInEnabled(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI,
  );
}

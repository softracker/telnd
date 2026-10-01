// My Account (§14.51) — the admin-style shell (header, rail, content
// pane) is live; the actual account contents land in a later round
// ("later we will change and put the contents into it"), so this page
// only holds the placeholder card. The shell around it already knows
// who is signed in and shows their name in the header.

export default function MyAccountPage() {
  return (
    <>
      <h1>My Account</h1>
      <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Welcome to your account
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          Your account overview, profile, security and notification settings
          will live here. This space is the shell only — the contents arrive
          in a later round.
        </p>
      </div>
    </>
  );
}

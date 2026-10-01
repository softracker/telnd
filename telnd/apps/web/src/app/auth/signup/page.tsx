import { redirect } from 'next/navigation';

// Sign-up shares the welcome sheet's flow ("Sign up or Log in"). Any
// `?next=` rides along (§14.51) — dropping it here would strand the
// visitor on home after signup instead of where they came from. The
// welcome sheet re-sanitizes the value before it is ever remembered.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = typeof params.next === 'string' && params.next ? params.next : null;
  redirect(raw ? `/auth?next=${encodeURIComponent(raw)}` : '/auth');
}

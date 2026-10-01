import { redirect } from 'next/navigation';

// Sign-up shares the welcome sheet's flow ("Sign up or Log in").
export default function SignupPage() {
  redirect('/auth');
}

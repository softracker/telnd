import { redirect } from 'next/navigation';

// The welcome / method chooser is the single entry to the flow now.
export default function LoginPage() {
  redirect('/auth');
}

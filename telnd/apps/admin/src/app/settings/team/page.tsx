import { redirect } from 'next/navigation';

// The Team and Account settings pages were merged into one page.
export default function TeamSettingsPage() {
  redirect('/settings/account');
}

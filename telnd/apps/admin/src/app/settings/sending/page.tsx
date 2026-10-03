import { redirect } from 'next/navigation';

// Sending analytics moved to the Reports section (§14.60 follow-up).
export default function SettingsSendingPage() {
  redirect('/reports/sending');
}

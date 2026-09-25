import { notFound } from 'next/navigation';

/**
 * Rewrite target for middleware: a signed-in admin opening a settings
 * section their role has no grant for lands here, so the URL answers
 * exactly like any other route that does not exist (404) and reveals
 * nothing about what the section contains.
 */
export default function SettingsDeniedPage() {
  notFound();
}

'use client';

// Settings -> General values any client screen may render (the sign-in
// page's logo and mascot). The root layout fetches them server-side and
// provides them here, so the very first paint already carries the real
// URLs — a client-side fetch would show the app-name text / bundled bunny
// first and swap them a frame later (the refresh flash).

import { createContext, useContext, useMemo, type ReactNode } from 'react';

export interface GeneralSettingsValue {
  primaryLogoLight: string;
  bunnyImage: string;
}

const GeneralSettingsContext = createContext<GeneralSettingsValue>({
  primaryLogoLight: '',
  bunnyImage: '',
});

export function GeneralSettingsProvider({
  primaryLogoLight,
  bunnyImage,
  children,
}: GeneralSettingsValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ primaryLogoLight, bunnyImage }),
    [primaryLogoLight, bunnyImage],
  );
  return <GeneralSettingsContext.Provider value={value}>{children}</GeneralSettingsContext.Provider>;
}

export function useGeneralSettings(): GeneralSettingsValue {
  return useContext(GeneralSettingsContext);
}

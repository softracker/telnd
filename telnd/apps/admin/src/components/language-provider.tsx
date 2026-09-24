'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { translations, type TranslationKey, type Language } from '@/lib/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'telnd_admin_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  // Start from the server value so the first client render matches the server
  // HTML; the stored preference is applied after hydration (reading
  // localStorage during the first render is a classic hydration mismatch).
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored && ['en', 'bn'].includes(stored)) {
      setLanguageState(stored);
    }
  }, []);

  // Apply language to html element
  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  // Load from database on auth
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get<{ success: boolean; data: Record<string, any> }>('/api/user-preferences')
      .then((res) => {
        if (res.success && res.data.language) {
          const saved = res.data.language as Language;
          if (['en', 'bn'].includes(saved)) {
            setLanguageState(saved);
          }
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    if (isAuthenticated) {
      api.put('/api/user-preferences', { language: newLang }).catch(() => {});
    }
  }, [isAuthenticated]);

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    const raw = translations[language][key] || translations.en[key] || key;
    if (!params) return raw;
    // Optional {placeholder} interpolation — t('account.pageOf', { page: 1, total: 3 })
    return raw.replace(/\{(\w+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
    );
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

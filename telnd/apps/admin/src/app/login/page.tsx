'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  const showCaptcha = failedAttempts >= 2 && turnstileSiteKey;

  // Load Turnstile site key from public captcha config
  useEffect(() => {
    async function loadSiteKey() {
      try {
        // Relative on purpose: same-origin through the /api rewrite proxy,
        // so the fetch survives HTTPS tunnels (see lib/api.ts).
        const res = await fetch('/api/captcha-config');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data.enabled && data.data.siteKey) {
            setTurnstileSiteKey(data.data.siteKey);
          }
        }
      } catch {
        // ignore — captcha won't show
      }
    }
    loadSiteKey();
  }, []);

  // Render Turnstile widget when captcha becomes required
  useEffect(() => {
    if (!showCaptcha || !turnstileRef.current) return;

    // Load script if not loaded
    if (!document.getElementById('turnstile-script')) {
      const script = document.createElement('script');
      script.id = 'turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const renderWidget = () => {
      if (turnstileRef.current && (window as any).turnstile && !turnstileWidgetId.current) {
        turnstileWidgetId.current = (window as any).turnstile.render(turnstileRef.current, {
          sitekey: turnstileSiteKey,
          callback: (token: string) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(''),
          theme: 'light',
        });
      }
    };

    // Try to render, or wait for script
    if ((window as any).turnstile) {
      renderWidget();
    } else {
      const interval = setInterval(() => {
        if ((window as any).turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [showCaptcha, turnstileSiteKey]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password, showCaptcha ? turnstileToken : undefined);
      setFailedAttempts(0);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError(t('login.error.tooMany'));
          setFailedAttempts(3);
        } else if (err.status === 400 && (err as any)?.data?.error?.code === 'CAPTCHA_REQUIRED') {
          setError(t('login.error.captchaRequired'));
          setFailedAttempts(3);
        } else if (err.status === 400 && (err as any)?.data?.error?.code === 'CAPTCHA_FAILED') {
          setError(t('login.error.captchaFailed'));
          // Reset turnstile widget
          if ((window as any).turnstile && turnstileWidgetId.current) {
            (window as any).turnstile.reset(turnstileWidgetId.current);
            setTurnstileToken('');
          }
        } else {
          setError(err.message);
        }
      } else {
        setError(t('login.error.general'));
      }
      setFailedAttempts(prev => prev + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left 60% - Branding */}
      <div style={{
        flex: '0 0 60%',
        background: 'linear-gradient(160deg, #d4efed 0%, #b8e6e2 40%, #9fddd8 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(3, 69, 72, 0.06)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-120px',
          left: '-60px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(3, 69, 72, 0.05)',
        }} />

        {/* Tagline */}
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem',
          zIndex: 1,
        }}>
          <h1 style={{
            fontSize: '2.25rem',
            fontWeight: 800,
            color: '#034548',
            lineHeight: 1.2,
            marginBottom: '0.75rem',
          }}>
            {t('login.welcome')}
          </h1>
          <p style={{
            fontSize: '1.05rem',
            color: '#034548',
            opacity: 0.7,
            maxWidth: '320px',
            margin: '0 auto',
          }}>
            {t('login.tagline')}
          </p>
        </div>

        {/* Bunny Character */}
        <div style={{ zIndex: 1 }}>
          <img
            src="/images/bunny.png"
            alt="TELND Bunny"
            style={{
              width: '280px',
              height: 'auto',
              filter: 'drop-shadow(0 20px 40px rgba(3, 69, 72, 0.15))',
            }}
          />
        </div>

        {/* Bottom branding */}
        <div style={{
          position: 'absolute',
          bottom: '1.5rem',
          fontSize: '0.8rem',
          color: '#034548',
          opacity: 0.5,
          zIndex: 1,
        }}>
          &copy; {new Date().getFullYear()} {t('login.copyright')}
        </div>
      </div>

      {/* Right 40% - Login Form */}
      <div style={{
        flex: '0 0 40%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2.5rem',
        background: '#ffffff',
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          {/* Logo on mobile/compact */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#034548',
              marginBottom: '1rem',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#034548',
              marginBottom: '0.25rem',
            }}>
              {t('login.signIn')}
            </h2>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
            }}>
              {t('login.signInDesc')}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {error && (
              <div style={{
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                color: '#b91c1c',
              }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.375rem',
              }}>
                {t('login.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@telnd.com"
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  padding: '0 0.75rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#0d9488';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.15), 0 2px 8px rgba(3, 69, 72, 0.08)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label htmlFor="password" style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.375rem',
              }}>
                {t('login.password')}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    padding: '0 2.5rem 0 0.75rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0d9488';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.15), 0 2px 8px rgba(3, 69, 72, 0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#374151'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M14.12 14.12a3 3 0 11-4.24-4.24" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {showCaptcha && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                  {t('login.captcha')}
                </label>
                <div ref={turnstileRef} id="turnstile-widget" />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '8px',
                backgroundColor: isSubmitting ? '#5aa6a4' : '#034548',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#023638'; }}
              onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#034548'; }}
            >
              {isSubmitting ? (
                <>
                  <svg style={{ animation: 'spin 0.7s linear infinite' }} width="16" height="16" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75" />
                  </svg>
                  {t('login.signingIn')}
                </>
              ) : (
                t('login.signIn')
              )}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            fontSize: '0.75rem',
            color: '#9ca3af',
            marginTop: '2rem',
          }}>
            {t('login.footer')}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          div[style*="flex: 0 0 60%"] { display: none !important; }
          div[style*="flex: 0 0 40%"] { flex: 1 1 100% !important; }
        }
      `}</style>
    </div>
  );
}

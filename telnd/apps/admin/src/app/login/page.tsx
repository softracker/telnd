'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { useGeneralSettings } from '@/lib/general-settings';
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
  // A refused password goes straight back under the cursor (selected, so
  // the next keystroke replaces it) — retrying is all this screen is for
  // once the answer came back wrong.
  const passwordRef = useRef<HTMLInputElement>(null);
  // Settings -> General (mascot + primary logo) arrives WITH the server
  // render via the root layout's provider — the first paint already shows
  // the real assets, so a refresh can't flash the app-name text first and
  // swap the image in a frame later. A dead logo URL falls back to the text.
  const { primaryLogoLight, bunnyImage } = useGeneralSettings();
  const [logoFailed, setLogoFailed] = useState(false);
  const logoImage = logoFailed ? '' : primaryLogoLight;
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
      passwordRef.current?.focus();
      passwordRef.current?.select();
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
        // The light wash the portal welcome uses — the teal gradient came
        // off there first, and this page follows it now.
        background: '#E6F6F5',
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

        {/* Bunny Character — Settings -> General upload when one exists,
            otherwise the bundled image; a stale/removed upload URL falls
            back through onError so the mascot never disappears. */}
        <div style={{ zIndex: 1 }}>
          <img
            src={bunnyImage || '/images/bunny.png'}
            alt="TELND Bunny"
            onError={(e) => {
              const el = e.currentTarget;
              if (!el.src.endsWith('/images/bunny.png')) el.src = '/images/bunny.png';
            }}
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
        <div style={{ width: '100%', maxWidth: '400px' }}>
          {/* Logo + sign-in heading — the logo is Settings -> General's
              primary upload (the same source as the admin header's); a
              dead URL or nothing configured falls back to the app name. */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              {logoImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoImage}
                  alt="TELND"
                  onError={() => setLogoFailed(true)}
                  style={{ height: '40px', width: 'auto', display: 'block' }}
                />
              ) : (
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#034548',
                  letterSpacing: '0.04em',
                  lineHeight: 1,
                }}>
                  {t('app.name')}
                </div>
              )}
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
              {/* The user login's filled field (AuthInput): 52px, radius 14,
                  #F1F5F9 fill, border transparent → #034548 on focus, with a
                  leading glyph — inline-styled to match the web app. */}
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: 'rgba(0, 0, 0, 0.38)',
                  display: 'flex',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 6L8.91302 9.91697C11.4616 11.361 12.5384 11.361 15.087 9.91697L22 6" />
                    <path d="M2.01577 13.4756C2.08114 16.5412 2.11383 18.0739 3.24496 19.2094C4.37608 20.3448 5.95033 20.3843 9.09883 20.4634C11.0393 20.5122 12.9607 20.5122 14.9012 20.4634C18.0497 20.3843 19.6239 20.3448 20.7551 19.2094C21.8862 18.0739 21.9189 16.5412 21.9842 13.4756C22.0053 12.4899 22.0053 11.5101 21.9842 10.5244C21.9189 7.45886 21.8862 5.92609 20.7551 4.79066C19.6239 3.65523 18.0497 3.61568 14.9012 3.53657C12.9607 3.48781 11.0393 3.48781 9.09882 3.53656C5.95033 3.61566 4.37608 3.65521 3.24495 4.79065C2.11382 5.92608 2.08114 7.45885 2.01576 10.5244C1.99474 11.5101 1.99475 12.4899 2.01577 13.4756Z" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  className="auth-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@telnd.com"
                  required
                  autoComplete="email"
                  style={{
                    width: '100%',
                    height: '52px',
                    borderRadius: '14px',
                    border: '1px solid transparent',
                    backgroundColor: '#F1F5F9',
                    padding: '0 14px 0 44px',
                    fontSize: '15px',
                    color: '#1F2937',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#034548';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                />
              </div>
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
                <span style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: 'rgba(0, 0, 0, 0.38)',
                  display: 'flex',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 15C5 11.134 8.13401 8 12 8C15.866 8 19 11.134 19 15C19 18.866 15.866 22 12 22C8.13401 22 5 18.866 5 15Z" />
                    <path d="M16.5 9.5V6.5C16.5 4.01472 14.4853 2 12 2C9.51472 2 7.5 4.01472 7.5 6.5V9.5" strokeLinecap="round" />
                    <path d="M10.125 15H10M10.25 15C10.25 15.1381 10.1381 15.25 10 15.25C9.86193 15.25 9.75 15.1381 9.75 15C9.75 14.8619 9.86193 14.75 10 14.75C10.1381 14.75 10.25 14.8619 10.25 15Z" strokeLinecap="round" />
                    <path d="M14.125 15H14M14.25 15C14.25 15.1381 14.1381 15.25 14 15.25C13.8619 15.25 13.75 15.1381 13.75 15C13.75 14.8619 13.8619 14.75 14 14.75C14.1381 14.75 14.25 14.8619 14.25 15Z" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  id="password"
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  className="auth-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    height: '52px',
                    borderRadius: '14px',
                    border: '1px solid transparent',
                    backgroundColor: '#F1F5F9',
                    padding: '0 48px 0 44px',
                    fontSize: '15px',
                    color: '#1F2937',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#034548';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                />
                {/* Portal-style suffix: 36px circle inside the field, hover
                    tint via CSS, labelled for screen readers. */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="auth-field-eye"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <path d="M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

            {/* The user login's PrimaryButton: 52px / radius 14 / 16px semibold,
                brand fill with #023638 hover, opacity + arc spinner while busy. */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                height: '52px',
                borderRadius: '14px',
                backgroundColor: '#034548',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 600,
                border: 'none',
                cursor: isSubmitting ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: isSubmitting ? 0.9 : 1,
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#023638'; }}
              onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#034548'; }}
            >
              {isSubmitting ? (
                <>
                  <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
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
        /* Portal AuthInput parity: placeholder + eye hover tint (the two
           things inline styles can't reach). */
        .auth-field::placeholder { color: rgba(0, 0, 0, 0.25); }
        .auth-field-eye { color: rgba(0, 0, 0, 0.4); transition: color 0.15s ease; }
        .auth-field-eye:hover { color: rgba(0, 0, 0, 0.7); }
        @media (max-width: 768px) {
          div[style*="flex: 0 0 60%"] { display: none !important; }
          div[style*="flex: 0 0 40%"] { flex: 1 1 100% !important; }
        }
      `}</style>
    </div>
  );
}

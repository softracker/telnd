# TELND — Done So Far

> Last updated: 2026-09-24

---

## 1. Project Overview

**TELND** is a full-stack monorepo application with a web frontend (Next.js), admin dashboard, and a Flutter mobile app.

**Monorepo structure** (npm workspaces):
```
telnd/
├── apps/
│   ├── web/          # Next.js web app
│   └── mobile/       # Flutter mobile app
├── packages/
│   └── database/     # Prisma schema & migrations
├── services/
├── docker-compose.yml
├── .env
└── generate-pptx.js  # Brand color definitions
```

---

## 2. Infrastructure & Setup

### 2.1 Docker Services
- **PostgreSQL** (PostGIS) — port 5432, database `telnd`, user `telnd`, password `telnd_password`
- **Redis** — port 6379
- **MailHog** — SMTP port 1025, UI port 8025
- Run with: `sudo docker compose up -d`

### 2.2 Environment
- `.env` at root AND `packages/database/.env` — both must match
- Removed `vector` extension from Prisma schema (pgvector not available in PostGIS image)
- `npm run db:migrate` runs successfully

### 2.3 Flutter Mobile
- Flutter 3.47.4 installed at `~/flutter/`
- Android SDK at `~/Android/Sdk`, Java 17
- Phone: `A063` serial `P12279002956`, Android 15 (API 35)
- `compileSdk = 36` hardcoded in `android/app/build.gradle.kts`
- Debug APK builds and installs via USB

### 2.4 Next.js Web
- Dev server running at `http://localhost:3000`
- `package.json` scripts: `dev`, `build`, `start`, `lint`, `typecheck`

---

## 3. Design System & Brand Colors

### 3.1 Brand Colors (from `generate-pptx.js`)
| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#034548` | Dark teal — main brand |
| Secondary | `#0B1B2F` | Dark navy |
| Accent1 | `#30A9A2` | Teal — CTAs, highlights |
| Accent2 | `#FE793F` | Orange — accents |
| Background | `#F9F6F0` | Warm off-white |
| Light | `#F1F5F9` | Light backgrounds |
| Dark | `#1F2937` | Dark text |
| Gray | `#64748B` | Secondary text |
| LightGray | `#E2E8F0` | Borders, dividers |

### 3.2 Tailwind Config (`tailwind.config.ts`)
- Added brand color scales: `primary`, `secondary`, `accent`, `orange`
- Semantic tokens via CSS variables in `globals.css`

### 3.3 CSS Variables (`globals.css`)
- Light and dark mode CSS variables using brand colors
- `.bg-glow` background applied to body (permanent, all pages)
- Added `contain: layout style` on `.bg-glow` for performance
- Added `will-change: transform` on sticky sidebars

### 3.4 Performance Constraints
- No `backdrop-filter: blur()` — GPU-heavy, use solid semi-transparent backgrounds instead

---

## 4. Branding & Assets

- Logo files: `TELND-Logo-1.png`, `TELND-Logo-2.png`, `TELND-Logo-3.png`
- Logo 3 is currently used throughout
- Logo files at: `apps/web/public/TELND-Logo-3.png`

---

## 5. Architecture Decisions

- Header is **page-specific**, not global
  - Home page: Logo 3 + ThemeToggle (simple)
  - Components pages: `Header` component with Logo 3 + search + nav + ThemeToggle
- Search bar lives in Header component, accepts `searchValue`/`onSearchChange`/`showSearch` props
- Component cards link to their showcase pages via `componentRoutes` mapping
- All showcase/temp files go in `apps/web/src/_showcase/` — entire folder + `/components` page to be deleted after project completion
- **No third-party CDNs** — all assets must be self-hosted or downloaded locally
- **Flutter checkbox dropdown** — fully controlled component pattern (parent owns state, component calls onChanged)

---

## 6. Web Components Built

### 6.1 Buttons
| Component | File | Features |
|-----------|------|----------|
| **Button** | `src/components/Button.tsx` | 8 variants (primary, secondary, accent, orange, outline, ghost, danger, link), 5 sizes (xs-xl), loading, icon left/right, fullWidth |
| **IconButton** | `src/components/IconButton.tsx` | 7 variants, 4 sizes, tooltip |
| **ButtonGroup** | `src/components/ButtonGroup.tsx` | horizontal/vertical, attached mode |
| **FAB** | `src/components/FAB.tsx` | 4 variants, 2 sizes, 3 positions, label support |

### 6.2 Dropdowns
| Component | File | Features |
|-----------|------|----------|
| **Dropdown** | `src/components/Dropdown.tsx` | Click trigger, keyboard nav, icons, shortcuts, separators, disabled, danger, left/right align, searchable, closeOnSelect |
| **ContextMenu** | `src/components/ContextMenu.tsx` | Right-click trigger, same features as Dropdown, auto-positions |
| **SelectSearch** | `src/components/SelectSearch.tsx` | Multi-select with search, checkboxes, maxSelected, clear all, selected tags |
| **FormSelect** | `src/components/FormSelect.tsx` | Form-ready dropdown with label, required, helper text, error, disabled, searchable, 3 sizes |

### 6.3 Forms & Inputs
| Component | File | Features |
|-----------|------|----------|
| **Input** | `src/components/Input.tsx` | Label, required, helper text, error, left/right icons, 3 sizes |
| **Textarea** | `src/components/Textarea.tsx` | Label, helper text, error, character count, auto-resize, 3 sizes |
| **Checkbox** | `src/components/Checkbox.tsx` | Label, description, indeterminate, 3 sizes |
| **Radio** | `src/components/Radio.tsx` | Label, description, 3 sizes, group support |
| **Switch** | `src/components/Switch.tsx` | Label, description, 3 sizes |
| **SearchBar** | `src/components/SearchBar.tsx` | Clear button, suggestions, recent searches, keyboard nav |
| **FileUpload** | `src/components/FileUpload.tsx` | Drag-and-drop, file preview, remove, max size validation |
| **DatePicker** | `src/components/DatePicker.tsx` | Calendar popup, month navigation, today highlight |
| **Autocomplete** | `src/components/Autocomplete.tsx` | Search with categories, keyboard nav |
| **Slider** | `src/components/Slider.tsx` | Drag handle, marks, min/max/step |

### 6.4 Utility Components
| Component | File | Features |
|-----------|------|----------|
| **ThemeProvider** | `src/components/ThemeProvider.tsx` | Light/dark mode toggle, fixed |
| **Header** | `src/components/Header.tsx` | Page-specific, search, nav, ThemeToggle |

---

## 7. Showcase Pages

| Route | Content |
|-------|---------|
| `/` | Home page with Logo 3 header |
| `/components` | Main showcase — 112 component cards, 16 categories, color panels |
| `/components/buttons` | Button, IconButton, ButtonGroup, FAB |
| `/components/dropdowns` | Dropdown, ContextMenu, SelectSearch, FormSelect |
| `/components/forms` | Input, Textarea, Checkbox, Radio, Switch, SearchBar, FileUpload, DatePicker, Autocomplete, Slider |

---

## 8. Mobile App (Flutter)

### 8.1 Theme
- Light background: `#F9F6F0` (warm off-white, matches web)
- Dark background: `#0F172A`
- Primary (light): `#034548` (dark teal)
- Primary (dark): `#30A9A2` (teal)
- Accent: `#30A9A2` (teal)
- Orange: `#FE793F`
- All surface, text, border colors aligned with web brand

### 8.2 Packages
- `geocoding` upgraded `^3.0.0` → `^5.0.0`
- `geolocator` upgraded `^11.0.0` → `^14.0.0`
- `intl` upgraded to `^0.20.3`
- `CardTheme` → `CardThemeData` fix in `theme.dart`

### 8.3 Components Built

#### Buttons (`shared/presentation/widgets/components/`)
| Component | File | Features |
|-----------|------|----------|
| **AppButton** | `app_button.dart` | 8 variants (primary, secondary, accent, orange, outline, ghost, danger, link), 5 sizes (xs-xl), loading, icon leading/trailing, fullWidth |
| **AppIconButton** | `app_icon_button.dart` | Tooltip, customizable size/color |
| **AppFAB** | `app_fab.dart` | 4 variants, extended with label option |

#### Dropdowns & Selects
| Component | File | Features |
|-----------|------|----------|
| **AppDropdown** | `app_dropdown.dart` | Popup menu, icons, danger items, disabled |
| **AppFormSelect** | `app_form_select.dart` | Bottom sheet picker, label, required, error, searchable |

#### Forms & Inputs
| Component | File | Features |
|-----------|------|----------|
| **AppInput** | `app_input.dart` | Label, required, helper text, error, prefix/suffix icons, 3 sizes |
| **AppTextarea** | `app_textarea.dart` | Label, helper text, error, max lines, character count |
| **AppCheckbox** | `app_checkbox.dart` | Label, description, 3 sizes |
| **AppRadio** | `app_radio.dart` | Label, description, 3 sizes |
| **AppSwitch** | `app_switch.dart` | Label, description, 3 sizes, fixed disabled state |

#### Dropdowns & Selects (Additional)
| Component | File | Features |
|-----------|------|----------|
| **AppSearchDropdown** | `app_search_dropdown.dart` | Search filter, icons, selected display |
| **AppCheckboxDropdown** | `app_checkbox_dropdown.dart` | Multi-select with checkboxes, maxSelected, clear all, selected chips. Fully controlled API (parent owns selectedLabels) |
| **AppImageOptionDropdown** | `app_image_option_dropdown.dart` | Image/icon/avatar leading, selected check |
| **AppActionsDropdown** | `app_actions_dropdown.dart` | PopupMenu with icons, shortcuts, danger items |
| **AppFileUpload** | `app_file_upload.dart` | Camera/gallery/files picker, file preview thumbnails, remove files, size validation, max files limit |

### 8.4 Fixes Applied (2026-09-17)
- **AppSwitch disabled state** — added `Opacity(0.4)` wrapper + grayed label/description text when disabled
- **AppCheckboxDropdown** — rewrote to fully controlled API. Parent passes `selectedLabels` (List<String>), component calls `onChanged` with updated list. No more internal state mutations.
- **Bottom sheet heights** — all bottom sheets now use `shrinkWrap: true` + `ConstrainedBox(maxHeight: 0.4)` to match content height
- **image_picker package** — added `image_picker: ^1.0.0` to pubspec.yaml for file upload

### 8.5 Showcase Screens
- **ShowcaseScreen** — main entry, accessible from Profile tab
- **ButtonsShowcase** — all button variants, sizes, icons, loading, FAB
- **FormsShowcase** — input, textarea, checkbox, radio, switch
- **DisplayShowcase** — actions dropdown, dropdown (long press), form select, search dropdown, checkbox dropdown, image option dropdown, file upload

All in `_showcase/presentation/pages/` — temporary, to be deleted after project completion.

### 8.6 UI Polish (2026-09-19)

#### Quick Action Cards (Home Page)
- Increased font sizes: title 15, description 12
- Horizontal scrollable list extends to right edge (per-child padding only)
- Updated color scheme: `Color.lerp` with surface colors + subtle borders
- App background changed to near-white `#FCFCFD` with softer glow gradient
- Find Jobs icon color changed from `#034548` to `#0891B2` (cyan)
- Services reordered: Find Jobs, Tutors, Doctors, Matrimony, Fix (cards); + Laundry, Influencers, Learn (all services modal only)
- All Services modal changed from `DraggableScrollableSheet` to `Container` with `mainAxisSize: MainAxisSize.min`
- All icons switched from Material Icons to SVGs from `assets/icons/`

#### Explore Page
- Search bar moved into app bar (`ExploreAppBar`)
- 5-column Wrap grid in glass card
- Filtered by Riverpod `exploreSearchQueryProvider`
- App bar position alignment fixed (search bar height 36px)

#### AI Page
- Animated glow background (`CustomPainter` with pulse/glow controllers)
- Pulsing brain icon (removed — already in bottom nav)
- Search bar with inline icons (file-upload.svg, voice-input.svg, send)
- Upload modal with Camera/Photos/Files using SVG icons
- App bar with chat-history.svg + talk to ai.svg + new chat button
- "Hey, what's on your mind?" text with "Start Talking" gradient button

#### Bottom Navigation
- AI center button: 52x52 gradient container with `brain-stroke.svg`, protrudes with `top: 0`
- Animated glow on Telnd AI button only — triple-layered pulsing box shadows (primary + secondary colors, 2s cycle)
- Static glow on other active tabs (no animation)
- Dark mode nav bar background changed from navy `#1A2639` to near-black/gray `#14161A`

#### Messages Page
- Custom `MessagesAppBar` — logo + "Messages" title + new-message icon button
- Removed duplicate `AppBar` from messages page scaffold
- Empty state icon: `message-blocked-stroke-rounded.svg`

#### Home App Bar
- Added "Pro" button with orange (`AppTheme.orange`) background next to logo
- Red "Free" badge positioned at top-right corner of Pro button

#### Dark Mode Color Updates (2026-09-19)
- `darkBackground`: `#0F172A` → `#0D0D0D` (near-black)
- `darkSurface`: `#1E293B` → `#1C1C1E` (dark gray)
- `darkBorder`: `#334155` → `#2C2C2E` (neutral gray)
- All hardcoded dark colors in home page, AI page, and bottom nav updated to match

### 8.7 WiFi ADB Setup
- Phone IP: `192.168.1.2:5555`
- Connected via `adb connect 192.168.1.2:5555`
- Package name: `com.example.telnd_mobile`
- Device: Poco A063, Android 15

---

## 9. Generated Files

- `TELND_PROJECT_COMMANDS.pdf` — 223KB reference PDF

---

## 10. Admin Dashboard (2026-09-22)

### 10.1 Overview
Full Next.js admin dashboard built from scratch with real authentication, API integration, and advanced responsive layout matching the reference project.

### 10.2 Authentication System
- **Login**: `admin@telnd.com` / `admin12345` → JWT → dashboard
- **JWT**: `hono/jwt`, 7d access / 30d refresh tokens, bcrypt password hashing
- **Session**: Stored in DB, cookie-based middleware protection
- **Auth context**: `useAuth()` hook, login/logout, token persistence (localStorage + cookies)
- **Middleware**: Server-side route protection, redirects unauthenticated to `/login`, authenticated away from `/login`

### 10.3 API Server (`packages/api`)
- Standalone server via `@hono/node-server` on port 3001
- Auth routes: real bcrypt comparison, JWT signing, session creation, `lastLoginAt` update
- Rate limiter: Redis-backed with graceful fallback when Redis unavailable
- CORS: configured for ports 3000, 3001, 3002
- Dev mode: returns actual error messages for debugging

### 10.4 Admin App (`apps/admin`)
- **Config**: `tailwind.config.ts` (TELND brand colors), `postcss.config.js`, `globals.css`
- **API client**: `src/lib/api.ts` — typed fetch wrapper with `ApiError` class
- **Auth context**: `src/lib/auth-context.tsx` — `AuthProvider`, `useAuth` hook
- **Middleware**: `src/middleware.ts` — server-side route protection
- **Root layout**: `src/app/layout.tsx` — wraps in `AuthProvider` + `AdminLayout`
- **Dashboard**: `src/app/page.tsx` — stat cards (users, companies, jobs, applications), skeleton loading

### 10.5 Advanced Admin Layout
Built to match reference project (`/home/pranta-biswas/next-js/`):

**`src/styles/admin.css`** — Full layout CSS:
- Fixed header (56px), fixed sidebar (250px expanded / 60px collapsed)
- Sidebar collapse with `0.3s ease` transitions
- Collapsed mode: flyout submenus as fixed-position cards with shadow
- Submenu expand/collapse with `max-height` animation
- User dropdown with fade-in/slide-up animation
- Mobile responsive (≤768px): sidebar slides off-screen, hamburger menu, overlay backdrop

**`src/components/layout/sidebar.tsx`** — Navigation sidebar:
- 3 sections (Main, Management, Platform) with SVG icons
- Submenu toggle with arrow rotation, auto-opens active submenu
- Click-outside closes flyout menus in collapsed mode

**`src/components/layout/header.tsx`** — Top header bar:
- Desktop toggle (collapse/expand) + mobile hamburger
- User avatar + name + dropdown (Dashboard, Settings, Sign out)

**`src/components/layout/admin-layout.tsx`** — Orchestrator:
- Persisted collapse state in `localStorage`
- Auth redirects (login ↔ dashboard)
- Shows children directly on login page when unauthenticated

### 10.6 Login Page Design
Redesigned 60/40 split layout:
- **Left 60%**: Light teal gradient background, decorative circles, "Welcome to TELND Admin" tagline, bunny character image (`/images/bunny.png`), copyright footer
- **Right 40%**: Clean white login form with TELND icon, email/password inputs with teal focus ring, sign-in button with loading spinner
- Mobile: left panel hidden, form goes full-width (≤768px)

### 10.7 Database Seed
- Admin user created with hashed password
- Demo company created
- `packages/database/src/seed.ts`

### 10.8 Running Services
- API: `localhost:3001`
- Admin: `localhost:3002`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MailHog: `localhost:8025`

---

## 11. Settings Suite, Object Storage & UX (2026-09-24)

Full day of admin settings work — 9 commits (`0f18408e` → `51849a4e`), 70 files changed, +5,607/−439, all pushed to `main`.

### 11.1 Settings foundation & auth hardening (00:17–04:27)
- **Key-value settings store** — `packages/api/src/routes/settings.ts`: `GET /api/settings` (all rows), `GET /api/settings/:key`, `PUT /api/settings` (upserts arbitrary `{ key: value }` payloads), backed by the Prisma `Setting` model; `roleGuard('ADMIN')` on write/secret reads
- **Email service** — `packages/api/src/lib/email.ts`: nodemailer wrapper with `testSmtpConnection()` used by `POST /api/settings/smtp/test`
- **Auth hardening** — `lib/loginLockout.ts` (Redis-backed: 5-min window, lockout after 20 failed attempts, escalating 15→120 min, cross-IP attack detection at 3 IPs), `lib/getIp.ts`, upgraded rate limiter (stricter login window), stricter auth middleware; `.env.example` + nginx sample config added
- **Settings area** — `settings/layout.tsx` nav with grouped sub-sections; `0f18408e` created the first **SMTP** and **CAPTCHA** pages; `8261e2f9` added General, Security, Account, Organization, Team, Offices, Payment, Gateway, Login Providers, About, Preferences pages + page headers
- **User preferences** — `routes/user-preferences.ts` + Prisma `UserPreference` model, `theme-provider.tsx`, `language-provider.tsx`, Preferences settings page expanded (theme/language persisted server-side)
- **FOUC prevention** (`b6b18b54`) — inline pre-paint theme script in the admin root layout
- **Theming** (`278283a7`, `d0ad90ce`) — settings UI migrated to CSS variables; dark-mode variables + sidebar active states tuned
- **i18n** (`3880fd37`) — translations expanded (~390 lines): sidebar, header, login and every settings page bilingual (en/bn); Bengali stored as `\uXXXX` escapes to keep `translations.ts` ASCII-only

### 11.2 Cloudflare R2 object storage (`39dfd654`, 09:39)
- New page `settings/object-storage/page.tsx` + sidebar entry, saved as the `r2` settings row
- `packages/api/src/lib/r2.ts` (new):
  - `initR2Client()` / test client use `forcePathStyle: true` — AWS SDK's default virtual-hosted hostname (`bucket.<account>.r2.cloudflarestorage.com`) 404s on R2; path-style (`<account>.r2.cloudflarestorage.com/<bucket>/`) works. Fixed Test Connection **and** uploads/deletes
  - `testR2Connection()` maps SDK errors to actionable messages (endpoint/bucket validation; ENOTFOUND/EPROTO/Invalid URL; 401/403/404/other status branches) — replaces the SDK's literal `UnknownError` returned for empty-body HEAD responses
  - `describeR2Error()` 404 self-diagnosis: calls ListBuckets and reports the account's actual bucket names, a casing mismatch, or "account has no buckets"
- `POST /api/settings/r2/test` route (does **not** persist — Save must still be clicked)
- `packages/api/src/routes/upload.ts` (new) — upload/delete against R2, sharp → WebP conversion, folder-scoped object keys (e.g. `settings/favicon/`); new deps `@aws-sdk/client-s3`, `sharp`
- `ImageUploader` component + `api.upload()` FormData helper (skips the JSON `Content-Type` header); General page gained favicon/light+dark logos/secondary logos/OG image fields; `generalSettingsSchema` + `r2SettingsSchema` added to `packages/validation`

### 11.3 Public route shadowing fix (`packages/api/src/index.ts`)
- `GET /captcha-config` and `GET /settings/general` moved **above** `app.route('/settings', …)` — Hono matches in registration order, and the settings router's `GET /:key` + `roleGuard('ADMIN')` was answering anonymous requests with 403 (broke the captcha site-key fetch and public general settings)
- `/api/settings/general` also added to `publicPaths`

### 11.4 Toast component + spinner buttons (`39dfd654`, `51849a4e`)
- New `apps/admin/src/components/toast.tsx` — compact popup pinned top-center just below the 56px header (`calc(var(--admin-header-height) + 12px)`), white bg + layered shadow, success/warning/error variants each with their own color + icon, 2s auto-dismiss with fade/slide-out, `role="status"` `aria-live="polite"`, `pointer-events: none`
- Applied to Object Storage, General, CAPTCHA, SMTP: top-of-page banner divs removed; Test Connection / Save buttons swap their label for a loading spinner while pending (min-width keeps them from jumping; `aria-label`s added)

### 11.5 Settings pages reworked to cards + toggles (`51849a4e`, 10:22)
- **General** — `Section` cards (Branding / General Information / SEO & Meta / Contact & Legal), right-aligned Save with spinner
- **SMTP** — object-storage-style "Enable SMTP" toggle card; Server (host/port/SSL) + Account (user/pass/from) cards; config cards + Test Connection hidden while disabled; right-aligned Test Connection + Save with spinners
- **CAPTCHA** — "Enable CAPTCHA" toggle card (replaced the old Status card); API Keys card hidden while disabled; right-aligned Save
- `enabled` persists through `PUT /api/settings` (route upserts any key); `testSmtpSchema` strips the unknown `enabled` key on the test endpoint

### 11.6 Step-by-step setup guides
- Numbered info boxes (accent-tinted card, `<ol>`, en + bn) — object storage 5 steps; SMTP and CAPTCHA 4 steps
- Boxes live **inside** the `enabled` block (same as object storage); the redundant "turn on the toggle" first step was removed from SMTP/CAPTCHA since the box only renders once enabled
- CAPTCHA guide notes that the backend verifies tokens via `TURNSTILE_SECRET_KEY` in the API `.env` while the site key is served from settings

### 11.7 Login CAPTCHA threshold 3+ → 2+
- `auth.ts`: `failedCount >= 3` → `>= 2`; admin login page: `showCaptcha = failedAttempts >= 2`; `captcha.description` updated (en + bn)
- Lockout itself unchanged (20 failures / 5-min window)

### 11.8 Notes & gotchas
- **SMTP has no settings row in the DB** → the page loads `enabled: false`, so config cards and instructions stay hidden until "Enable SMTP" is toggled on and saved (CAPTCHA and R2 rows exist with `enabled: true`)
- `smtp.enabled` is UI-only so far — nothing on the API consumes it yet
- Real R2 credentials can't be verified from this dev environment; all R2 error branches were tested against local mock servers
- Typecheck green: `apps/admin`, `packages/api`, `packages/validation`

### 11.9 Commits (2026-09-24)
| Hash | Time | Summary |
|------|------|---------|
| `0f18408e` | 00:17 | Settings key-value store, email service, harden auth |
| `8261e2f9` | 01:24 | Expand settings with general, security, and admin sub-sections |
| `79c3859c` | 01:50 | Add user preferences, theme/language providers, preferences UI |
| `b6b18b54` | 01:59 | FOUC-prevention theme script |
| `278283a7` | 02:32 | Settings UI → CSS variables, theme support |
| `d0ad90ce` | 02:40 | Dark-mode CSS variables, sidebar active states |
| `3880fd37` | 04:27 | Sidebar/header translations + i18n across settings pages |
| `39dfd654` | 09:39 | R2 object storage, image uploads, toast notifications |
| `51849a4e` | 10:22 | Toast/card pattern, guides, CAPTCHA threshold → 2+ |

---

## 12. Known Issues

- Linux desktop Flutter build fails due to `flutter_secure_storage_linux` / clang 21 incompatibility
- `flutter run -d chrome` crashes with "Dart compiler exited unexpectedly" (headless environment issue; `flutter build web` succeeds)

---

## 13. Next Steps (Planned)

### Web
- Build remaining component categories: Data Display, Feedback, Navigation, Layout

### Flutter
- Build remaining showcase categories: Feedback (Alert, Modal, Toast)
- Add more Display components: Avatar, Badge, Card, Divider
- Continue mobile app feature development

### Admin
- Build out management pages: Users, Companies, Jobs, Applications, Packages, Reports
- Add Activity Logs and Support pages (Settings suite is now largely built — see section 11)
- Add data tables with search, filter, pagination
- Add chart/graph widgets for dashboard

### Both
- Delete `_showcase/` folders and `/components` page after all components are complete

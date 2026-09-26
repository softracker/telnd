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

---

## 14. Team & Account Merge, Website Content CMS & Role-Based Access Control (2026-09-24)

Three-in-one feature set: merged settings page, public content mini-CMS, and a complete RBAC system. Not yet committed (awaiting confirmation).

### 14.1 Database & seed
- **`ContentPage` Prisma model** — `slug` (unique), `title`, `content` (HTML), `isPublished`; migration `20260924120000_add_content_pages` created manually (`migrate diff --from-url` → `migrate deploy` → `generate`; `migrate dev` refuses non-TTY shells)
- **Seed** (`packages/database/src/seed.ts`, run): `AdminRole` "Super Admin" (`permissions: ['*']`, `isSystem: true`) linked to `admin@telnd.com` via new `AdminUser` row; 3 published content pages (`about-us`, `privacy-policy`, `terms-and-conditions`)

### 14.2 Permission model & API middleware
- Flat string grants on `AdminRole.permissions`: `"resource.action"` (e.g. `admins.delete`) or `"*"` wildcard (super admin bypass); validated by `/^(\*|[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+)$/`
- `middleware/auth.ts` gained `requireAdmin`, `hasPermission`, `requirePermission(...)`, `requireAnyPermission(...)` (suspend/activate accepts `users.edit` **or** `admins.edit`)

### 14.3 API routes
- **`routes/admin.ts`** — every route permission-gated: `dashboard.view`, `users.view/edit`, `maintenance.view/edit`, `reports.view/edit`, `audit.view`, `support.*` (support.ts), `roles.*`. **New admins CRUD** `GET/POST/PATCH/DELETE /api/admin/admins` (`admins.view/create/edit/delete`): cannot change own role or delete own account; Prisma P2003 → 409 "Suspend it instead". Roles gained `PUT/DELETE /api/admin/roles/:id` (400 for `isSystem`, 409 if assigned), duplicate-name 409, and `_count.users` on list
- **`routes/pages.ts` (new)** — public `GET /api/pages` (published slugs+titles) and `GET /api/pages/:slug` (published only, slug regex, 404 otherwise); admin CRUD under `/api/pages/admin` gated by `content.*`, registered before `/:slug`
- **`routes/settings.ts`** — now behind `requireAdmin`; `GET` filters keys through a KEY→permission map (`general→general.*`, `r2→storage.*`, `smtp→email.*`, `captcha`, `security`, `loginProviders`, `offices`, `organization`, `payment`, `gateway`, `team→team.*`); `PUT` rejects each unauthorized key with 403 naming the missing edit-permission; **unknown keys are super-admin (`*`) only**; `/smtp/test` and `/r2/test` gated by their key's edit permission
- **`index.ts`** — publicPaths += `/api/settings/team`, `/api/pages`; public `GET /api/settings/team` (mirrors `/settings/general`, registered before the settings mount); `/pages` route mounted. **Soft auth on public paths**: public paths now run auth in "populate but never reject" mode so logged-in admins get `user` context on `/api/pages/admin` while anonymous visitors still reach the public endpoints (hard bypass returned 401 to logged-in admins)
- **`routes/auth.ts`** — login response and new `GET /api/auth/me` include `adminRole: { name, permissions }`; **`routes/users.ts`** — `PATCH /api/users/me` (firstName/lastName/email only, 409 on duplicate email)
- **`routes/support.ts`** — admin ticket list → `support.view`; update/reply → `support.edit`

### 14.4 Validation (`packages/validation`)
- `adminRoleSchema.permissions` → `string[]` with grant regex; new `createAdminSchema`, `updateAdminSchema`, `updateAccountSchema`, `contentPageSchema`

### 14.5 Admin UI
- **`lib/permissions.ts`** — catalog of 20 resources × actions (`view/create/edit/delete`), wildcard-aware `can()`; `lib/auth-context.tsx` exposes `permissions`, `roleName`, `isFullAccess`, `can()`, `refreshUser()` (background `/auth/me` refresh on mount so name/email/role stay current)
- **`components/role-badge.tsx`** — role pill (filled accent + star for `*` full access, light chip otherwise); shown in the header user dropdown and the Admins table
- **Settings nav** — `team` entry removed; `account` relabeled "Team & Account"; new **Roles & Permissions** (`/settings/roles`, award icon) and **Website Content** (`/settings/content`, file icon) entries; old `/settings/team` redirects to `/settings/account` (dev serves `NEXT_REDIRECT;replace;…;307` digest — browser swaps on hydration)
- **`/settings/account`** (merged page) — three cards: **My Account** (name/email → `PATCH /users/me` + `refreshUser`), **Admins** (table with role badge, active/suspended status pills, add/edit/suspend/activate/delete with 2-step confirm; own row protected and role select disabled for self; roles fetched tolerantly so `admins.view` without `roles.view` still lists), **Our Team** (public-website members stored under the `team` settings key: ImageUploader (`settings/team` folder, 400×400), reorder ↑/↓, 48×26 visibility pill, bio/LinkedIn/email fields; R2 orphan cleanup — superseded photos deleted on save, abandoned session uploads deleted on leave)
- **`/settings/roles`** — role cards (member count, "System" tag, full-access badge vs "N permissions" chip) + editor with **permission matrix** (20 resources × 4 actions, row select-all, unsupported cells disabled); full-access roles show a banner and keep `['*']` on save; delete is 2-step confirm (400 system / 409 in-use surfaced from API)
- **`/settings/content`** — pages table (published/draft pills, monospace slug, updated date), **Tiptap WYSIWYG** (v3 StarterKit with bundled link extension, `immediatelyRender: false`, toolbar: B/I/S, H1–H3, UL/OL, quote, code, HR, link prompt, undo/redo), title→auto-slug until touched, Published/Draft toggle, HTML stored verbatim. Deps: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `pm`
- **Translations** — 122 new en+bn keys inserted via an ASCII-escaping Python script; `translations.ts` verified pure ASCII (71,557 bytes)

### 14.6 Web app (public site)
- `src/app/[slug]/page.tsx` — server component, `revalidate: 300`, `notFound()` on 404/empty, `generateMetadata` with slug-derived fallback, HTML rendered in `.content-prose`
- `src/app/team/page.tsx` — renders `visible` members from public `GET /api/settings/team`; `notFound()` while the member list is empty (**/team 404s until the first member is saved**)
- `src/components/Footer.tsx` — border-top footer with About Us / Privacy Policy / Terms & Conditions / Team links, wired into root layout
- `globals.css` gained `.content-prose` styles (headings, lists, quotes, tables, code, images; light + dark); `next.config.ts` added `**.r2.dev` remote pattern

### 14.7 Verification
- Typecheck green: `packages/api`, `packages/validation`, `apps/admin`; web shows only the 2 pre-existing errors (`buttons/page.tsx(273)`, `components/Input.tsx(3)`)
- Admin pages `/settings/account|roles|content|team` all HTTP 200, zero error markers; web `/`, `/privacy-policy`, `/about-us`, `/terms-and-conditions` HTTP 200 with footer links present
- **E2E RBAC suite (20+ assertions, all passing)** — super admin CRUD; limited role (`content.view` only): admins/roles/dashboard/support → 403, settings GET → filtered `{}`, settings PUT → 403, content list → 200, content create → 403, own-profile edit → 200; anonymous `/api/pages/admin` → 401; system-role delete → 400; role-in-use delete → 409; own-account delete → 400; content publish/unpublish controls public visibility; test fixtures fully cleaned up (DB left with only Super Admin + `admin@telnd.com` + 3 seed pages)

### 14.8 Notes & gotchas
- Pre-existing `ADMIN` users without an `AdminUser` row now fail `requireAdmin` on settings/admin routes — onboard them through the new Admins UI so they get a role
- The permission catalog includes `team.*` grants for the Our Team card; the members themselves live in the `team` settings row (per-key filtering covers them)
- `upload` routes stay role-guard only (any admin panel user may upload — images are needed by whichever section they're allowed to edit)

### 14.9 Revisions (post-review pass)
- **Bengali-under-English bug fixed** — the original translation-update script replaced the *first* occurrence of each updated key twice, writing Bengali values into the EN block for `settingsNav.account`, `settingsNav.accountDesc`, `account.title`, `account.description`. Now replaced by block-region classification (EN vs BN); `translations.ts` re-verified pure ASCII (71,529 bytes)
- **Renames**: "Team & Account" → **Accounts** (nav label, page title, description); `roles.fullAccess` → **Full access**; content pages list heading → **Custom Pages**; content nav description now mentions the website team
- **Our Team moved** from `/settings/account` → `/settings/content` (still gated by `team.view`/`team.edit`, full member CRUD + reorder + visibility + R2 orphan cleanup carried over). `/settings/content` renders for admins with `content.view` **or** `team.view`, each card gated individually; `/settings/account` is now My Account + Admins only
- **Website Content restructure**: separate **Static Pages card** — About Us, Privacy Policy, Terms & Conditions (edit-only: no add, no delete, no add button; `STATIC_SLUGS` splits the lists) + **Custom Pages card** keeping the full add/edit/delete system + Our Team card
- New keys: `content.staticPages`, `content.staticPagesDesc`, `content.customPagesDesc` (en+bn, ASCII-escaped)
- Re-verified: `tsc` green for `apps/admin`; `/settings/account|content|roles|team` all HTTP 200

### 14.10 Round-2 UI fixes
- **Static Pages card** — now Title / Updated / "Edit Content" only (slug + status columns removed); description trimmed to "Core pages shown on the website."
- **Edit Content label** — new key `content.editContent`; static rows' action button and the editor heading for static slugs show "Edit Content" (custom pages keep "Edit page"/"New page")
- **Editor above Our Team** — the Tiptap editor block now renders before the team card, so editing no longer opens underneath it
- **"No pages yet."** moved below the custom-pages table, centered
- **Team card: no more Save button** — every action persists immediately (`persistTeam`: member add/edit → toast, reorder/visibility/delete → silent, errors toast + local revert). Superseded-photo R2 cleanup runs on each successful persist; `SaveButton`/`savingTeam`/outer `<form>` removed (the member form was a nested `<form>` — invalid HTML surfaced when opening Add member)
- **Hydration fixes (app shell)** — `language-provider`, `theme-provider`, and settings-sidebar collapse no longer read `localStorage`/`matchMedia` during the first render; they initialize from server-consistent defaults and apply stored values in an effect (the classic "Hydration failed" source; `translations.ts` still pure ASCII, 71,394 bytes)
- Re-verified: `tsc` green; `/settings/content|account|roles` HTTP 200

### 14.11 General-page images incident (root cause + recovery)
- **Cause**: the RBAC E2E suite's `PUT /settings '{"general":{"applicationName":"TELND"}}'` (super-edit-ok test) hit a handler that **fully replaced** each key's stored JSON — the partial write wiped `favicon`/`primaryLogoLight`/`primaryLogoDark` from the `general` row (2026-09-24T17:25:21Z). R2 objects themselves were never touched (9 objects still in bucket; no settings audit trail exists to consult)
- **Recovery**: `general` row restored with the last-saved object per slot (all verified HTTP 200): favicon `favicon-mufnztz6k0xac.webp`, light logo `logo-primary-light/web-logo-dark-mufpj5rhbjr5h.webp`, dark logo `logo-primary-dark/web-logo-light-mufpj9fsxwbok.webp`
- **Hardening**: `PUT /api/settings` now **shallow-merges** plain-object values with the stored row (arrays/primitives replace; explicit `""` still clears) — replaying the exact partial payload no longer clobbers siblings; api tsc green, public `/api/settings/general` returns all three URLs

### 14.12 Content page round-3 revisions
- **Static editor**: slug field + status toggle hidden when editing a core page (`editingStatic` → single-column title + editor only); slug/status still saved unchanged
- **Form alignment**: page form grid `alignItems: 'end'` → `'start'` (title/slug labels + toggle top-aligned, add & edit)
- **Member photo race**: `ImageUploader` gained optional `onUploadingChange`; member form submit (button + Enter guard) disabled with spinner while photo uploads; Cancel resets it
- **Visibility in form**: Add/Edit member modal has a "Visibility" pill (`account.visibility` key, EN+BN escapes)
- **Delete confirm + feedback**: member delete is two-click ("Delete" → "Confirm?") via `pendingMemberDelete`, success toast `account.memberDeleted`
- **Modal**: Add/Edit member renders as fixed overlay (max-w 560, 90vh scroll, × header, Escape closes, body scroll locked, backdrop click deliberately does not close)
- **Server-side search + pagination**: new `GET /api/settings/team/members?search=&page=&pageSize=5` (`requireKeyView('team')`, filter name/position/email, clamp page; registered before `/:key`); UI = debounced (300ms) search box left of Add Member + pager ("Prev / Page x of y / Next", `account.showingRange`/`account.pageOf`/`common.prev` keys); rows come from the server, full `members` array remains the mutation baseline, `persistTeam` re-queries after every change; `t()` now supports `{placeholder}` interpolation (language-provider)
- Verified: api+admin tsc green, translations pure ASCII, endpoint 403 unauth /200 auth, search+pageSize+clamp all pass, `/settings/content` 200

### 14.13 Content page round-4: loading spinners + Custom Pages DataTables
- **Spinners**: initial page load now shows a spinner above the loading text (with its own `@keyframes spin` — that early return renders outside the main tree); every team list query shows a 16px `role="status"` spinner under the (dimmed, 0.6 opacity) rows, and is the only thing shown when the current page is empty mid-query ("No members found." waits for `!teamRowsLoading`)
- **Custom Pages header gap fixed**: title/description now use the exact Static Pages / Our Team margins (h3 mb 0.25rem, p mb 0.75rem); the search box + Add Page button moved to their own row below (mirrors the Our Team card)
- **Custom Pages = server-side DataTables, same as team**: `GET /api/pages/admin` accepts `?search=&page=&pageSize=&exclude=` — any of them switches to `{items, page, pageSize, totalPages, filteredTotal, total}` (server-side filter + slice, page clamped to last); no params keeps the legacy full-array shape the static card needs. Search matches title, slug, and status keywords (published/draft); `?exclude=` takes a comma list — the UI sends `STATIC_SLUGS` so core pages never appear in the custom table (would otherwise duplicate the static card and skew counts)
- **Client**: `pagesSearchInput` (debounced 300ms → `pagesSearch`, resets page) + `pageRows`/`pageMeta`/`pageRowsLoading`; table rows come from the server (dimmed while querying + spinner), empty state = "No pages yet." or `common.noResults` when searching; save/delete re-query alongside `loadPages()`
- **Shared pager**: extracted `ListPager` (range text + Prev / Page x of y / Next, disabled while loading) now used by both cards; `PAGE_SIZE = 5` module constant
- New keys: `common.noResults`, `content.searchPages` (en+bn, ASCII escapes)
- Verified: admin+api tsc green, translations pure ASCII; legacy array intact (3 core pages); paged mode page 1/2 slices, search + status-keyword filters, page-99 clamp, exclude-filtered totals, unauth 401; `/settings/content` 200

### 14.14 Admins list → Our-Team-style DataTable with modals
- **Shared pager extracted**: `ListPager` + `pagerBtnStyle` moved from `settings/content` into `components/list-pager.tsx` (exported, `pageSize` prop default 5) — content page now imports it; Accounts reuses it
- **API**: `GET /api/admin/admins` gains `?search=&role=&page=&pageSize=` → `{items, page, pageSize, totalPages, filteredTotal, total}` (search matches full name, email, role name, active/suspended keywords; `role` filters by role id; page clamped to last); bare GET keeps the legacy `{admins, total}` shape for existing callers/tests
- **Admins card = DataTables like Our Team**: debounced (300ms) search box + **role filter dropdown** ("All roles" + each role; resets to page 1) + accent Add Admin button; server-side pagination 5/page via shared `ListPager`; rows dim + spinner while querying; empty state = "No admins yet." or `common.noResults` when search/filter active; all mutations (save/suspend/delete) re-query
- **Row view replaces the table** (header removed): avatar (photo or initial circle) · name + "(you)" + RoleBadge + Active/Suspended status pill · email sub-line · icon actions (edit / suspend-activate / delete with two-click confirm) right-aligned
- **Add/Edit now a modal** (mirrors the member modal): fixed overlay z-1100, max-w 560/90vh, × header, Escape closes, body scroll locked, backdrop click deliberately does not close; same fields (first/last/email/password-on-create/role select) + Cancel & Save-with-spinner footer; inline form and its Cancel-mode button removed
- Initial page gate now shows a spinner above the loading text
- New keys: `account.searchAdmins`, `account.allRoles`, `account.noAdmins` (en+bn, ASCII escapes)
- Verified: api+admin tsc green, translations pure ASCII; legacy shape intact `{admins,total}`; paged/search/role-filter (right id → 1, wrong id → 0)/clamp/unauth 401 all pass; `/settings/account|content` 200

### 14.15 Modern dropdown replaces native <select>
- New `components/dropdown.tsx` — listbox-style `Dropdown`: button trigger (selected label + rotating chevron, accent focus border, tooltip on overflow) + floating menu card (`--dropdown-bg`, 10px radius, deep shadow); options highlight on hover (`--accent-light`), selected option renders in accent + checkmark, label ellipsis
- Behavior: opens downward, flips upward when the trigger is near the viewport bottom; menu is **position: fixed** (measured at open) so it never clips inside the scrolling add/edit modal; closes on outside click, Escape (returns focus to trigger), focus-out, page scroll, and resize — scrolling *inside* the menu does not close it
- Keyboard/ARIA: ArrowUp/Down + Home/End move the highlight, Enter/Space select, Escape closes; focus stays on the trigger; `role=listbox/option`, `aria-expanded`, `aria-haspopup`, `aria-selected`
- Applied to both native selects that existed in the admin app (all on the Accounts page): the toolbar **role filter** (36px, "All roles" + role list, resets to page 1) and the add/edit modal **role picker** (40px, label + required star preserved, still disabled for your own row); the old `Select` component was deleted — **zero `<select>` elements remain in apps/admin**
- Verified: admin tsc green, `/settings/account` 200, `grep <select` → only a comment, translations still pure ASCII

### 14.16 Modal dividers + scrollable body (both modals)
- Add/Edit admin modal and Add/Edit member modal now share the same three-zone layout: **pinned header** (× title, `borderBottom` divider, `flexShrink: 0`), **scrollable body** (the only `overflowY: auto` region, `minHeight: 0`, padded1.25/1.5), **pinned footer** (Cancel + save, `borderTop` divider, `flexShrink: 0`)
- Card switched from "whole card scrolls + padding" to `flex column + overflow hidden + maxHeight 90vh + padding 0` with the form as the inner column flex — long content (photo uploader, bio, role grids) scrolls between the dividers while header/footer stay visible
- Verified: admin tsc green (JSX balance), `/settings/account|content` 200, exactly one divider per zone per modal

### 14.17 Add Admin redesign: emailed invite instead of preset password
- The form no longer asks for a password — the server generates a 16-char `randomBytes(12).toString('base64url')` temporary password, bcrypt-12 hashes it, and emails login instructions to the confirmed address via new `sendAdminInviteEmail` (`lib/email.ts`): login URL from `ADMIN_URL` env (default `http://localhost:3002`, added to `.env.example`), email, temp password, role, and a **"Recommended … optional"** note to change the password after first sign-in — nothing forces it (password-change UI is planned for a later Security tab)
- Email failure = fail + roll back: `502 EMAIL_FAILED` with `$transaction([adminUser.deleteMany, user.delete])` (AdminUser first; its relation has no cascade); tested against a dead SMTP — no orphan admin *or* user row survives
- `createAdminSchema`: `password` removed, `confirmEmail` added with `.refine` match; `updateAdminSchema`: optional `confirmEmail` whose refine requires a match whenever `email` is present → **both create and edit** block a mistyped address (`400` + `details.confirmEmail`)
- Form redesign (create mode): accent **invite-note callout** explaining where credentials come from, then **Details** section (First/Last/Email/Confirm-email in a 2-col grid, `emailHelp` helper under Email on create only) and a bordered **Access** section (Role dropdown); Confirm-email gets a red border + inline `emailMismatch` error, armed only after a failed submit and self-clearing once the addresses match; the local `Input` component gained an optional `error` prop (red border + red message, takes precedence over `helperText`)
- Modal title now uses `account.editAdmin`; success toast `adminCreated` includes `{email}`; the client guard trims both addresses before comparing/sending so it matches the server's exact-match rule
- Translations: added `editAdmin/groupDetails/groupAccess/confirmEmail/emailHelp/emailMismatch/inviteNote` (en + bn), `adminCreated` now takes `{email}`, removed `initialPassword/passwordHint` — file re-verified **pure ASCII**
- E2E (SMTP swapped to MailHog, original config backed up at `/tmp/opencode/smtp-backup.json`): mismatch create→400, missing confirm→400, valid create→201 + invite email landed (login URL, temp password, role, optional-change note) + **login with the emailed password→200**; edit mismatch→400, edit missing-confirm→400, edit valid→200; dead-SMTP create→502 with clean rollback; test admin deleted, SMTP restored byte-identical (MATCH vs backup), admins back to 1
- Verified: validation + api + admin tsc all green, `/settings/account` 200

### 14.18 Invite email: From display name + deliverability root cause
- `sendEmail` now builds the From header as **`{ name, address }`** — the display name is fetched at send time from `general.applicationName` (General settings), so clients show **"TELND \<address\>"** instead of falling back to the bare mailbox initial (was showing "hq" for `hq@prezmi.com`); no restart needed — changing the Application Name field affects the very next email; falls back to the plain address if the field is empty (name is CRLF-sanitized, nodemailer RFC 2047-encodes it)
- Invite email subject / heading / button were hardcoded "TELND" — now interpolated from the same `applicationName` (fallback `'TELND'`), HTML-escaped
- Deliverability incident diagnosed earlier this session (kept for the record): original SMTP (`ceo@exeelo.com` via Hostinger/MailChannels) was **hard-blocked by Gmail — `550-5.7.26 sender is unauthenticated`** because `exeelo.com` had **zero TXT records (no SPF)** and no DKIM; bounces were retrieved and read from the `ceo@exeelo.com` IMAP inbox, root cause confirmed via DNS (`relay.mailchannels.net` SPF covers the exact egress IPs `23.83.208.0/20`). Fix prescribed: TXT `@  v=spf1 include:spf.mx.hostinger.com ~all` at Cloudflare — **user instead switched SMTP to `hq@prezmi.com`, which delivers**; incident closed
- Verified: api tsc green; live send through the app's own `sendEmail()` → accepted, MailHog empty (no fallback), **no new bounce** in the exeelo inbox (baseline 3 unchanged)

### 14.19 Super-admin password regenerate action
- New row action on the Accounts page: **Regenerate password** — super-admin only (`isFullAccess`, i.e. `permissions.includes('*')`), shown on **every row including your own** (it doubles as the only self-service password-change path until the Security tab exists); follows the established two-click pattern: rotate-arrow icon → armed state (tinted background + `ConfirmIcon`, aria-label/tooltip switch to "Confirm?") → executes; a `Spinner` replaces the icon while the request is in flight
- New endpoint `POST /api/admin/admins/:id/regenerate-password` (super-admin check done inline against `c.get('admin').role.permissions`): 403 for non-super admins ("Super admin access is required to regenerate passwords."), 404 unknown/non-admin id, 400 `NO_EMAIL` if the target has no address, `502 EMAIL_FAILED` if the send fails
- **Email-first ordering** (deliberate difference from create): the temp password (`randomBytes(12).toString('base64url')`, bcrypt-12) is hashed and emailed **before** the hash is swapped — a failed send leaves the current password untouched, so an unknown secret can never be stored; only after the SMTP accept does `user.passwordHash` get updated; on success `REGENERATE_ADMIN_PASSWORD` is logged with the target email
- `sendAdminInviteEmail` gained a `kind?: 'invite' | 'reset'` param (default `invite`, create route unchanged): reset kind sends subject "Your {appName} Admin password has been reset" and intro "a new temporary password has been generated for your account — your previous password no longer works"; details table, sign-in button, optional-change recommendation identical
- Frontend: `RefreshIcon` added to `action-icons.tsx`; page gained `pendingRegenAdmin`/`regeneratingId` state + `handleAdminRegenerate` (mirrors `handleAdminDelete`); button slotted between Edit and Suspend/Activate; success toast `account.passwordRegenerated` includes `{email}`
- Translations en+bn: `account.regenerate` ("Regenerate password"), `account.confirmRegenerate` ("Confirm?"), `account.passwordRegenerated` ("New password sent to {email}.") — file re-verified **pure ASCII**
- E2E (SMTP swapped to MailHog, current prezmi config re-backed up at `/tmp/opencode/smtp-backup.json` overwriting the stale hostinger one): invite P1 landed (From **`TELND <noreply@test.local>`**, correct invite wording) + login P1→200; regenerate→200 + reset email landed (new subject, P2, reset intro, From TELND); login **old P1→401**, **new P2→200** (rotation proven); non-super session→403, bogus id→404; dead-SMTP regenerate→502 `EMAIL_FAILED` with **P2 still logging in** (hash untouched — email-first verified); SMTP restored byte-identical (MATCH, `hq@prezmi.com`), test admin deleted, MailHog cleared
- Verified: api + admin tsc green, `/settings/account` 200

### 14.20 Role-gated settings options + 404 for direct URLs
- Requirement: an option the admin's role doesn't grant must not be shown at all, and typing the URL by hand must answer 404 (not a "forbidden" page that confirms the section exists)
- `lib/permissions.ts` gained the single source of truth: `SETTINGS_SECTIONS` (nav order: href → required grant — a `resource.action`, an any-of list, or `null` for open sections), `SETTINGS_SECTION_BY_HREF`, and `sectionPermitted(permission, can)` (`'*'` passes via `can`)
  - general→`general.view`, account→`admins.view`, roles→`roles.view`, security→`security.view`, login-providers→`loginProviders.view`, captcha→`captcha.view`, smtp→`email.view`, object-storage→`storage.view`, offices→`offices.view`, organization→`organization.view`, content→`content.view` **or** `team.view` (one page hosts both lists), payment→`payment.view`, gateway→`gateway.view`; **preferences + about stay open** to every signed-in admin — mirrors the API's `KEY_PERMISSIONS`/route guards
- Settings nav (desktop + mobile + search): `settingsNavKeys` filtered through `sectionPermitted` — a section with no grant never renders as an option
- `/settings` index no longer hardcodes `/settings/general`: it redirects to the **first section in nav order the role can view** (so an admin without `general.view` still reaches their own section instead of a 404)
- `middleware.ts` (was a no-op stub) now guards the 13 gated paths: forwards the incoming cookie to `/api/auth/me` server-side (cookies are host-scoped, ports don't matter), **401 → redirect `/login`**, API unreachable → **fail open** (the section's own API guards still protect data; lying would 404 for everyone), no grant → `NextResponse.rewrite('/settings/denied', { status: 404 })`
- New `app/settings/denied/page.tsx`: a server page that only calls `notFound()` — renders Next's default "404: This page could not be found." **with a real HTTP 404 status** while the URL bar keeps showing the section the admin typed
- E2E (temp role `TempGuard ['general.view']` + temp admin via MailHog): denied paths `/settings/account|roles|smtp|content|security` → **404**; permitted `/settings/general` and open `/settings/preferences|about` → **200**; super admin → **200**; no cookie → **307 → /login**; error-digest check confirmed the not-found tree renders only for denied paths; `{ status: 404 }` on the rewrite verified as the thing that turns the 200 into a true 404
- Incident note: mid-test the live panel suspended the temp test admin (real user action from the browser, no audit row) — reactivated it once to finish verification, then deleted it; temp role deleted; SMTP restored byte-identical (MATCH, `hq@prezmi.com`); MailHog cleared; admins back to the 3 real accounts, roles back to Moderator + Super Admin (Moderator observed to now be `['storage.view']` — user was editing it live)
- Scope note: the **main** sidebar (dashboard/users/reports/support/activity-logs + the not-yet-built pages) was left ungated — only settings is permission-gated for now
- Verified: admin tsc green; translations file untouched (pure ASCII re-checked); no API changes (route guards already enforce every section)

### 14.21 Suspended account is logged out on the next page refresh
- Requirement: suspending a user must log that account out on their next page refresh (not mid-session polling — just the next load)
- Server side already did its part: `PATCH /users/:id/suspend` sets `user.isActive=false` **and** revokes every `session` + `refreshToken` row, so from that moment all API calls answer `401` ("Session expired or revoked") and re-login answers `403 ACCOUNT_DEACTIVATED`
- The gap was client-side: `auth-context.refreshUser` (run on every page load) swallowed **all** errors and kept the cached `localStorage` identity — a suspended user refreshed and still saw themselves logged in with a UI full of failing requests
- `refreshUser` now treats `ApiError` **401/403** as "the session is gone server-side" → clears `telnd_admin_user` from localStorage and `setUser(null)`, which `AdminLayout`'s existing effect turns into an instant `router.replace('/login')` on that same load; any other failure (API restarting, offline) keeps the cached user exactly as before
- Refresh on a `/settings/*` URL is even faster: §14.20's middleware already answers a dead session with `307 → /login` server-side, before hydration
- The web app has no cached-identity pattern (only theme in localStorage) — nothing to mirror there
- E2E (temp admin on the real Moderator role, MailHog swap): login → `/me` 200 baseline; suspend → 200; **old cookie `/me` → 401** (the exact signal refreshUser now acts on); **settings URL → 307 → `/login`**; re-login → **403 ACCOUNT_DEACTIVATED**; temp admin deleted, SMTP restored byte-identical (MATCH), MailHog cleared
- Verified: admin tsc green; translations untouched

### 14.22 My Account photo upload + compact My Account card
- Requirement: "My Account should have a photo upload option. Keep it My Account cards compact — just profile picture, name, email, and an edit icon that shows all the options to edit." Scoped to the **My Account card only**: an intermediate pass also compacted the Admins list rows and moved their actions into the edit modal, but the user questioned the change and it was **fully restored** — role badge, "No role", Active/Suspended pill, "(you)", and the edit/regenerate/suspend/delete row actions are back exactly as §14.13–14.19 left them (including regenerate on your own row, §14.19's self-service path); the modal's added "Account actions" group and its `editingAdmin` state were removed with it
- **My Account card** now renders compact by default: avatar (48px, initials fallback), name, email, one pencil icon; the pencil expands the card in place into the full editor (photo upload → name grid → email → Cancel/Save) and it collapses back to compact after a successful save
  - Photo upload reuses the existing `ImageUploader` + `POST /api/upload/image` (webp → R2, `folder="avatars"`, max 512×512, quality 85) — the same machinery as the Our Team member photos
  - Upload gating: `onUploadingChange` keeps Save disabled and an Enter-submit inert until the upload lands, so the profile can never persist mid-upload
  - Photo lifecycle mirrors the team-photo pattern with a single-photo simplification: `savedAvatarRef` (last persisted URL) vs `sessionUploadsRef` (uploaded this visit, never saved) — replacing or removing an unsaved upload deletes the orphan immediately; removing the **saved** photo only clears the form (Cancel restores it untouched); on save the new upload graduates from pending and a replaced/cleared saved photo is deleted from R2; a page-unmount sweep `deleteKeepalive`s anything still pending
- **Backend** (`PATCH /api/users/me`): `updateAccountSchema` gained `avatar: z.string().max(1000).nullable().optional()` (a public URL minted by the upload endpoint, never raw bytes) and the route stores `body.avatar || null` (empty string normalizes to null); `/auth/me` already spreads `avatar` and the admin `User` interface already had it — no other API changes
- Translations: `account.myAccountDesc` now mentions the photo (en+bn); file re-verified **pure ASCII**
- E2E (API-level, live server): set avatar → 200 stored; clear via `""` → null; clear via `null` → null; wrong type (number) → **400**; name-only edit still 200; final `/me` avatar back to `null` (original state)
- Additions after user review: the name grid in the expanded form gained `marginTop: 1rem` (photo uploader and First name were too close), and the **Suspend/Activate row button now uses the two-click confirm** like delete/regenerate — first click arms it (tinted background, label/aria switch to the new `account.confirmStatus` "Confirm?"), second click actually calls the endpoint; armed state is keyed per row id and cleared before the request
- Identity tweaks: the "(you)" marker was **removed** from the admin rows (own row now reads like every other), and the **My Account compact card gained the role badge** beside the name — same `RoleBadge` (`roleName` + `isFullAccess` from auth context, `small`) the admin list uses, with the `account.noRole` fallback
- Verified: admin + api + validation tsc all green; translations pure ASCII; UI verification left to the user (browser)

### 14.23 Own row hidden from the Admins list (details live in My Account)
- Requirement (user's call): the My Account card already shows the viewer's picture/name/role/email, so their own row must not appear in the Admins list — and **no** regenerate-password option for themselves for now; self password reset will come later via a Security tab
- `GET /api/admin/admins` now excludes the caller's own id in the Prisma query itself (`where: { role: 'ADMIN', NOT: { id: selfId } }`), so `total`, `filteredTotal`, and the page slices are all consistent — done server-side rather than client filtering, which would have skewed the pager (pageSize 5)
  - Applies per viewer: every admin sees all other admins, never themselves; both the paged shape and the legacy bare shape go through the same base array
  - `isSelf` stays in the response shape (now always false) and the frontend `!a.isSelf` gates stay as harmless belt-and-braces
- Consequence accepted by the user: a super admin can no longer rotate their **own** password (the §14.19 row action went away with the row; nothing was added to My Account by explicit request) — until the Security tab lands; regenerate on other admins' rows is untouched
- Also in this review round (previous bullets in §14.22): "(you)" removed from rows, role badge added beside the name in the My Account card, 1rem gap under the photo uploader, and the Suspend/Activate button gained the two-click confirm (`account.confirmStatus`)
- E2E: paged `GET /admin/admins` as admin@telnd.com → items = the other 2 admins, `total: 2`, self id absent
- Verified: api tsc green; admin tsc green earlier this round

### 14.24 Profile picture in the top bar
- The header's right-side user chip (`admin-header-right` → `.admin-user-avatar`, 30px circle with `overflow: hidden`) now renders the admin's **photo** (`user.avatar` from the auth context) filling the circle with `objectFit: cover` — the initials letter remains as the fallback when no photo is set
- Live after save: the My Account photo flow ends in `refreshUser()`, so the new picture appears in the top bar immediately without a reload; if the image URL ever breaks, the circle just renders empty (same as elsewhere in the app)
- Verified: admin tsc green

### 14.25 Super Admin sorts first on the Roles page
- The Roles grid previously rendered the server's alphabetical order, so Moderator sat above Super Admin — `loadRoles` now sorts the wildcard (`"*"`) role to the front before `setRoles`; the stable sort leaves every other role in the server's name-ascending order, and it re-applies after every create/edit/delete reload
- Scoped to the Roles page only: the account page's role filter/role dropdowns keep their alphabetical order (user asked for the role page)
- Verified: admin tsc green

### 14.26 Create-admin modal starts with no role selected
- `startAddAdmin` no longer pre-selects `roles[0]` — the Role picker starts empty and shows the new `common.select` placeholder ("Select" / bn "নির্বাচন করুন") instead of the em-dash; edit mode still loads the admin's existing role
- Submit guard mirrors the confirm-email pattern: clicking Create with no role arms an inline `account.roleRequired` ("Role is required.") under the dropdown, which clears itself the moment a role is picked (server-side `roleId: min(1)` stays as the backstop); `roleErrorArmed` resets on open of both create and edit
- Translations en+bn (`common.select`, `account.roleRequired`) — file re-verified **pure ASCII**
- Verified: admin tsc green

### 14.28 Token-based password links replace emailed passwords (forgot / reset / invite)
- Trigger: the user asked whether emailing generated passwords is a security issue vs sending a reset link, and chose **"Build token-based links"** when offered the options. One token system now covers all four delivery paths: public forgot-password, the Security page's "email me a link", the super-admin row regenerate, and the admin invite created by Add Admin — **no password ever appears in an email again** (supersedes §14.27's emailed-temp-password design)
- **Schema + migration** (`20260925013000_password_tokens`, additive): new `PasswordToken` model — `tokenHash` (SHA-256 hex of the raw link value, unique), `kind` (`reset` | `invite`), `expiresAt`, `usedAt`, `userId` FK cascade. Only the hash is stored, so a DB leak yields no usable link; TTLs: reset **60 min**, invite **72 h**
- **`packages/api/src/lib/passwordTokens.ts`** (new): `issuePasswordToken` (256-bit `randomBytes(32)` base64url; deletes any previous live token of the same kind first, so at most one working link per user+kind and re-sending always kills the older mail), `findUsablePasswordToken` (kind + expiry check), `discardPasswordToken` (email-first rollback), `adminUrl()`
- **New public routes** (added to `publicPaths`, rate-limited 5/min **per path**):
  - `POST /api/auth/forgot-password` — always `200 {success:true}` for unknown/suspended addresses (no enumeration); known+active → issue `reset` token → email link; send failure → token discarded + `502 EMAIL_FAILED` (honest failure over enumeration during SMTP outages)
  - `POST /api/auth/reset-password` — accepts either kind; one transaction spends the token (`deleteMany` + count check → a second use finds nothing), writes the new hash, and **revokes every session of that user**; admin actors get an `AdminAction` `RESET_PASSWORD_VIA_LINK` with `details.kind`; any failure → `400 TOKEN_INVALID`
- **Rewired endpoints**: `/api/users/me/regenerate-password` now emails a `reset` link to the admin's own address (audit action `REGENERATE_SELF_PASSWORD` kept, `NO_EMAIL` kept, email-first: failed send discards the token); super-admin `POST /admin/admins/:id/regenerate-password` emails a link instead of a temp password (**behavior change: the target's current password keeps working until the link is used**; `REGENERATE_ADMIN_PASSWORD` kept); `POST /admin/admins` creates the user with **`passwordHash: null`** + a 72-hour `invite` link — login is impossible until the link is used (null hash → 401), and the failed-send rollback still deletes the user (token cascades)
- **Emails** (`lib/email.ts`): `sendAdminInviteEmail` rewritten — no password block; CTA button "Choose your password"/"Set a new password" → `/reset-password?token=…`, expiry line, role/login rows kept; new `sendPasswordResetEmail` for self-service recovery
- **Rate-limit fix** (pre-existing bug, fixed because the new routes would starve login): keys were `ratelimit:<ip>` shared across ALL rate-limited routes — now `ratelimit:<path>:<ip>` (in-memory + redis branches)
- **Admin UI**: login page gained a "Forgot password?" link; two new public pages `/forgot-password` (generic "if that address belongs to an account…" success state) and `/reset-password` (`useSearchParams` in Suspense, new+confirm password with the eye toggle, missing/bad/expired token collapses into one generic invalid state with "Request a new link"; success → sign-in CTA); backdrop/keyboard follow the login page's conventions; copy updates: `security.regenerateSelf` → "Email me a password reset link", `security.regeneratedSelf`, `account.emailHelp`, `account.inviteNote`, `account.regenerate` → "Send reset link", `account.passwordRegenerated` → "Reset link sent to {email}."; ~16 new keys (forgot.*/reset.*/login.forgotPassword) en+bn
- **E2E (all green, MailHog swapped in and out)**: create admin → 201 + invite mail with link; pre-set login → 401 (null hash); consume → 200; reuse → 400; login with new password → 200; forgot (known) → 200 + mail, forgot (unknown) → identical 200 with **no mail**; consume → 200, reuse → 400, pre-reset session → 401 (all sessions revoked), old password → 401; expired token (backdated row, hash-matched) → 400; corrupt token → 400; super-admin regenerate → 200 + link mail → consume → 200; Security-page self-regenerate → 200 + exactly one mail, session survives; dead SMTP: forgot/create/regenerate/self-regenerate → all 502 with token discarded and the created user rolled back (NONE); audit rows exactly: `CREATE_ADMIN`, `REGENERATE_ADMIN_PASSWORD`, 3× `RESET_PASSWORD_VIA_LINK` (invite+reset kinds), `REGENERATE_SELF_PASSWORD`, none for failed sends
- Environment restored: SMTP restored → **RESTORE_MATCH** vs fresh backup (also byte-equal to the §14.27 backup), MailHog cleared, temp admin + its audit rows deleted, stray test session removed (37 real sessions intact), repo helper script removed; admin/api/validation tsc green; translations pure ASCII

### 14.29 Forgot-password removed (super-admin-only resets) + emailed-link redirect fix
- User instruction after trying the flow: "Forgot Password should not have any link on the login page — only super admin can reset it. And the email password reset link is redirecting to the login page."
- **Login page**: the "Forgot password?" link (§14.28) is removed again, along with its `Link` import
- **Self-service recovery removed end to end**: the `/forgot-password` page is deleted, `POST /api/auth/forgot-password` is deleted, and the path is out of `publicPaths` (a request now answers the standard `401 UNAUTHORIZED` from the auth middleware). Dead translation keys dropped, en+bn: `login.forgotPassword`, `forgot.title/description/submit/sending/sent`, `reset.requestNew` (14 lines; file re-verified **pure ASCII**)
  - Password-reset links now come from exactly three places: the super-admin **Send reset link** row action, the **admin invite** (Add Admin), and the **Security page's** self-service button while signed in — the last one is logged-in-only and kept per §14.27 (flagged to the user in case they want it gone too)
- **Redirect bug fixed** (root cause): `AdminLayout` wraps every route and redirected any pathname other than `/login` to `/login` when unauthenticated — so every emailed `/reset-password?token=…` link bounced to the login screen (invite links were broken the same way). It now treats `/reset-password` as a public page alongside `/login`: no redirect, rendered bare without sidebar/header, and it stays reachable even if a session exists
- **Copy**: `/reset-password`'s invalid state lost its "Request a new link" button (single Sign in button now); `reset.invalid` (en+bn) and the API's `TOKEN_INVALID` message (3 occurrences in `auth.ts`) now say **"Ask your administrator to send a new one."** instead of "request a new one"; stale `rateLimit` comment example updated
- Kept intact: `POST /api/auth/reset-password` (public link target), the `/reset-password` page, `sendPasswordResetEmail`, and the Security-page regenerate — only the unauthenticated entry points went away
- Re-verified live: `POST /api/auth/forgot-password` → **401**; `POST /api/auth/reset-password` (bogus token) → **400 TOKEN_INVALID** with the new message; admin + api tsc green; translations pure ASCII

### 14.30 Settings tabs open to any account + super admins invisible to non-super admins
- User: *"as like preferences and about tab the security and accounts tab will also accessible for any account but in the account only admins management card only accessible if they have the access and also only super admin can delete super admins no one can delete a super admin even if they have admin access they don't even see super admins on the list"*
- **Sections opened** (`apps/admin/src/lib/permissions.ts`): `/settings/account` and `/settings/security` → `permission: null`. SETTINGS_SECTIONS is the single source, so the settings-nav filter, the `/settings` index redirect and Next middleware's direct-URL 404 all follow automatically; a comment explains Account/Security are self-service like Preferences/About
- **Admins management card**: already wrapped in `can('admins.view')` inside the Account page (whole `<Section>`, lines 572→953, with `loadRoles`/`loadAdminRows` guarded) — verified, no change needed; My Account card is open to everyone
- **Super-admin invisibility** (`packages/api/src/routes/admin.ts`): new `isSuper()` helper (role permission list contains `"*"`)
  - `GET /admin/admins` filters super admins out for non-super viewers *before* paging, so bare-list `total` and paged `filteredTotal` stay honest; a super viewer still sees every other super (own row stays hidden per §14.23)
  - Direct-ID guards — super target + non-super actor → **404 `Admin not found`** (the same answer their list implies): `PATCH /admin/admins/:id` (also blocks demoting a super by raw API), `DELETE /admin/admins/:id`, `PATCH /users/:id/suspend`, `PATCH /users/:id/activate` (both now load the row first instead of blind-updating)
  - Net rule: only a super admin can see, edit, suspend or delete a super admin; a non-super admin with `admins.delete` can still delete ordinary admins
- **E2E** (temp role `E2E NonSuper` with admins.view/edit/delete + temp non-super/super/victim admins, created straight in the DB to skip invite email): **12/12 list assertions** (super sees pranta0004 + temp super, hides self; non-super sees **zero** supers in bare and paged lists, hides self, still sees moderators, `filteredTotal` matches); **4/4 direct-ID probes → 404** (PATCH/DELETE/suspend/activate on a real super target by id); allowed paths: non-super PATCH moderator → 200, non-super DELETE ordinary admin → 200, **super DELETE super → 200**; middleware (no session): `/settings/account` + `/settings/security` → **200**, control `/settings/roles` → **307 → /login**
- Cleanup: fixtures, fixture audit rows, both test sessions and dangling rows removed — 0 stray e2e users/roles, audit history (incl. the user's own 22:47–22:51 invite/regenerate/reset rows) intact; repo helper scripts deleted; tsc api+admin green; translations untouched
- Git: user committed and pushed §14.25–14.28 themselves as `18f7dea3`; **§14.30 (permissions.ts + admin.ts) uncommitted**

### 14.31 Reset page validates the link on load ("link expired" up front)
- User: *"the input boxes show and it only says expired after they input and click submit — if the link has expired it should say link expired at the beginning"*
- **New public endpoint** `POST /api/auth/reset-password/check` (auth.ts, rate 20/min on its own per-path bucket, added to `publicPaths`): dry-run of the emailed link via new `checkPasswordToken()` helper in `lib/passwordTokens.ts` returning `valid | expired | invalid` — same rules as the consume route (right kind, not spent, user active) but never spends the token; distinguishes **`TOKEN_EXPIRED`** (row exists, past `expiresAt`) from **`TOKEN_INVALID`** (unknown/already-spent/inactive) so the timeout case gets its own wording
- **Schema**: `checkResetTokenSchema` (`{ token: min 1 }`) in validation/src/auth.ts + type export
- **Page** (`app/reset-password/page.tsx`): new `checking` state — a spinner + "Checking your link..." shows first; a `useEffect` fires the check on load and maps 400 → `TOKEN_EXPIRED` → new red **`reset.expired`** box, otherwise the existing `reset.invalid` box — both now appear **before any typing**, with the Sign-in button; network/429 hiccups fail *open* (form shows; submit still validates), missing token still shows the notice immediately; submit-time 400s map the same way (expired wording if the link died between load and submit)
- **Translations**: `reset.checking` + `reset.expired` added en+bn by script (file re-verified **pure ASCII**); other copy unchanged
- **E2E (all public, no session — proves no 401): 8/8 PASS** — valid → 200; expired → 400 `TOKEN_EXPIRED`; unknown → 400 `TOKEN_INVALID`; empty token → 400 validation; consume → 200; spent link → 400 `TOKEN_INVALID`; reuse → 400; suspended user's valid link → 400 `TOKEN_INVALID`; temp user/tokens cleaned (0 stray users; the 2 remaining token rows are pre-existing live links from the user's own invite/regenerate actions)
- tsc green (validation, api, admin); server hot-reloaded; **§14.31 uncommitted**

### 14.32 Refresh loop no longer flips a dead link into the form
- User: *"very strange when I am continuously refreshing the input boxes is appearing"*
- **Root cause**: the check endpoint was limited to 20/min — a refresh loop (doubled in dev by StrictMode's double effect, so ~10 reloads suffice) hit **429**, and the page's deliberate fail-open (only 400 mapped to a dead-link notice) let any non-400 fall through to the form
- **Fix, two layers**:
  1. `POST /reset-password/check` limit raised **20 → 60/min** (auth.ts) — a dead link costs one call thanks to layer 2, and even if a *live* link's reload loop exhausts the bucket, the fallback form is the correct state for it
  2. **Tab-local verdict cache** (`sessionStorage`, `telnd_reset_dead:<token>`, page.tsx): once the check answers 400, the verdict (`expired`/`invalid`) is remembered — every refresh in that tab renders the notice **instantly with zero API calls**, so refreshing can never re-drain the bucket or race it into the form. Only `TOKEN_EXPIRED`/`TOKEN_INVALID` are cached (a future server-side validation 400 can't poison a live link); live links are never cached and re-checked each load; submit-time 400s write the same cache; storage failures (private mode) degrade to the live check
- **E2E: 4/4 PASS** — **30 rapid checks back-to-back, zero 429** (the old cap would have failed from call #21), valid → 200, consume → 200, spent → 400 `TOKEN_INVALID`; temp fixtures cleaned (0 stray users/roles; 2 remaining token rows are pre-existing real links); tsc api+admin green
- The sessionStorage layer is browser-only — user to verify in the UI (§14.31's flow otherwise E2E-covered); **§14.32 uncommitted**

### 14.33 Dead-link notice drops its Sign in button
- User: *"when the link expired is showing no need show sign in button"* — the expired/invalid branch rendered a full teal "Sign in" button on top of the card's always-present "Back to sign in" text link (redundant navigation)
- `reset-password/page.tsx`: the dead-link branch now renders the notice only (bottom margin tightened to `0.25rem`); the card's "Back to sign in" link remains the way out. The success state keeps its Sign in button (still useful there), `reset.signIn` stays in use — no translation changes; tsc admin green. **Uncommitted**

### 14.34 Security audit of the reset-link flow — 2 real gaps found & fixed
- User: *"are you sure the reset link is totally secure? ... if you confirm we will work on next"* — full review instead of a bare yes
- **Gap 1 (real): refresh tokens survived a password reset.** The consume transaction deleted `session` rows but not `refreshToken` rows, and `/api/auth/refresh` trusts its DB row alone (it even *creates* a new session if the old one is gone) — a stolen refresh token would outlive the reset by up to 30 days and regain access. **Fixed**: `refreshToken` deleteMany added inside the consume transaction (auth.ts). E2E: after consume, old access → 401, **old refresh → 401**, sessions=0, refreshTokens=0
- **Gap 2 (race): issuing could leave two live links.** `issuePasswordToken` did delete-then-insert non-atomically — two concurrent issuances could both sweep and both insert, so a re-send might fail to invalidate the older mail. **Fixed**: create the fresh row first, then sweep everything except it — a sweep can only end with the new row, one rival's, or none (rare mutual sweep fails closed → 0 links, resend). E2E: 20 concurrent issuances → **0 live links (≤1 held)**; sequential re-send → exactly 1 with a different raw (old mail invalidated) ✓
- **Confirmed solid**: 256-bit `randomBytes` token, SHA-256-only at rest, TTL 60 min/72 h, single-use atomic in the same transaction as the hash write, no unauthenticated recovery endpoint (§14.29), no enumeration surface (keyed on token, generic messages, check endpoint takes no email), per-path rate limits (check 60/min, consume 5/min, refresh 10/min, login 10/min + lockout/CAPTCHA), access tokens verified against the `session` table every request (revocable), cookies `HttpOnly; SameSite=Lax; Secure` in prod, bcrypt cost 12, email-first discard on failed send, invite accounts `passwordHash: null` until used, sessionStorage remembers only *dead* tokens
- **Accepted trade-offs (unchanged)**: email is the trust root; super-admin regenerate keeps the old password valid until the link is used (§14.28 decision); token travels in the URL query (standard; single-use + TTL + revocation bound it); rate limits are per-IP so a NAT shares buckets (availability only)
- **Adjacent finding, NOT changed yet**: `POST /me/change-password` revokes nothing — other devices keep their sessions AND refresh tokens after a password change. Offered to the user (keep current device, revoke the rest)
- **Still open (pre-existing, non-reset)**: broken `/api/auth/signup` (zod lowercase `candidate` vs Prisma `CANDIDATE`) — fails closed, awaiting user's call
- E2E `e2e-sec.sh`: **9/9 PASS** + sequential-invariant check; fixtures cleaned (only info.exeelo's live invite remains); tsc api+admin green; **§14.34 uncommitted**

### 14.35 Change-password revokes other devices (+ a same-second login 500 found en route)
- User picked **"Revoke other devices"** for the §14.34 adjacent finding: `POST /me/change-password` used to revoke nothing
- **API (users.ts)**: the password write now runs in one transaction with `session.deleteMany` (everything except the caller's own session) and `refreshToken.deleteMany` (everything except this device's own refresh cookie — no cookie in the request ⇒ revoke all, fail closed). `CHANGE_PASSWORD` audit details now carry `revokedOtherSessions` / `revokedOtherRefreshTokens`
- **Copy (en+bn, ASCII verified)**: `security.passwordDesc` and `security.passwordChanged` now say changing the password also signs out other devices
- **Bug found while E2E'ing it (pre-existing): same-second login → 500.** Login, OTP and refresh all signed HS256 JWTs with only second-granularity `exp` — two tokens for the same user minted within one second were **byte-identical**, and the second insert died on `Session.token`'s `@unique` (P2002 → 500). Reachable by a double-clicked sign-in, two devices at once, or refresh-then-login in the same second. **Fixed** with `signAccess`/`signRefresh` helpers adding `jti: randomUUID()` to every token (all 3 pairs in auth.ts); pre-existing tokens without `jti` still verify
- **E2E: 13/13 PASS** — two devices in, change password (wrong current → 400 regression), exactly 1 session + 1 refresh token survive, audit counts `1/1`, device B dead (401/401), device A alive (200/200 incl. refresh exemption), old password rejected, new password works, cleanup clean; plus **5 rapid same-second logins → all 200**; tsc api+admin green
- **Dormant quirk flagged, untouched**: `/auth/refresh` rotates the session via `session.update({ where: { token: refreshToken } })` — session rows hold *access* tokens, so it never matches and silently creates a fresh session row (duplicate device entry) instead of rotating in place. The admin UI never calls `/auth/refresh` today; fixing it needs the old access cookie for linkage — user's call
- **§14.35 uncommitted** (with §14.30–14.34)

### 14.36 Same-as-current password is rejected, not "successful"
- User: *"when admin user want to change password with same password it's working. If they want to set the same current password it should not show success."*
- **API (`POST /me/change-password`, users.ts)**: `newPassword === currentPassword` → **400 `SAME_PASSWORD`** ("Your new password must be different from your current password."), checked after the current-password proof and **before** the revocation transaction — a rejected attempt revokes nothing and logs no success
- **UI (security/page.tsx)**: new armed flag `sameAsCurrent` — the client pre-check blocks the submit entirely (no success toast, no round trip), the API 400 branch arms it too for any race; renders inline on the new-password field via `sameErr` (same-as-current wins over too-short) and self-clears the moment either field changes, mirroring `shortArmed`/`currentWrong`
- **Key**: `security.passwordSameAsCurrent` (en + bn, `translations.ts` verified pure ASCII)
- **E2E: 9/9 PASS** — two devices in → same password → 400 `SAME_PASSWORD` with **both sessions + both refresh tokens intact and no CHANGE_PASSWORD audit row** → real change → 200 with exactly 1 session/1 refresh surviving and exactly 1 audit row; cleanup clean; tsc api+admin green
- **§14.36 uncommitted** (with §14.30–14.35)

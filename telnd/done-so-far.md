# TELND — Done So Far

> Last updated: 2026-09-17

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

---

## 9. Generated Files

- `TELND_PROJECT_COMMANDS.pdf` — 223KB reference PDF

---

## 10. Known Issues

- Linux desktop Flutter build fails due to `flutter_secure_storage_linux` / clang 21 incompatibility
- `flutter run -d chrome` crashes with "Dart compiler exited unexpectedly" (headless environment issue; `flutter build web` succeeds)

---

## 11. Next Steps (Planned)

### Web
- Build remaining component categories: Data Display, Feedback, Navigation, Layout

### Flutter
- Build remaining showcase categories: Feedback (Alert, Modal, Toast)
- Add more Display components: Avatar, Badge, Card, Divider
- Continue mobile app feature development

### Both
- Delete `_showcase/` folders and `/components` page after all components are complete
- API backend setup

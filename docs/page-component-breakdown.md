# Zaps Smart QR Page Component Breakdown

## Shared Layout

- `src/app/[locale]/layout.tsx`
  - locale validation wrapper
- `src/app/[locale]/(marketing)/layout.tsx`
  - public layout
- `src/app/[locale]/(dashboard)/layout.tsx`
  - authenticated app shell
- `src/components/layout/app-shell.tsx`
  - sidebar, top bar, language switcher
- `src/components/layout/marketing-header.tsx`
  - public nav header
- `src/components/layout/language-switcher.tsx`
  - bilingual UI toggle

## Shared UI

- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/empty-state.tsx`
- `src/components/shared/app-logo.tsx`
- `src/components/shared/page-header.tsx`
- `src/components/shared/stat-card.tsx`

## Home Page

- route: `src/app/[locale]/(marketing)/page.tsx`
- sections:
  - hero
  - feature cards
  - 3-step explanation
  - scenario cards
  - footer CTA

## Auth Pages

- routes:
  - `src/app/[locale]/(auth)/login/page.tsx`
  - `src/app/[locale]/(auth)/register/page.tsx`
- main component:
  - `src/features/auth/auth-form.tsx`

## Dashboard

- route: `src/app/[locale]/(dashboard)/dashboard/page.tsx`
- sections:
  - page header
  - stat cards
  - recent QR list
  - quick action cards

## Manage QRs

- route: `src/app/[locale]/(dashboard)/qrs/page.tsx`
- sections:
  - page header
  - search bar
  - QR table/list
  - empty state

## Analytics

- route: `src/app/[locale]/(dashboard)/analytics/page.tsx`
- sections:
  - page header
  - overview cards
  - chart card
  - ranking list
- main component:
  - `src/features/analytics/analytics-chart.tsx`

## Create QR Flow

- route: `src/app/[locale]/(dashboard)/qrs/new/page.tsx`
- main component:
  - `src/features/qr-create/qr-create-flow.tsx`
- sections:
  - stepper
  - step 1 conversation area
  - step 2 draft review
  - step 3 design selector
  - right-side hints and preview

## State and Data

- `src/store/locale-store.ts`
- `src/store/qr-create-store.ts`
- `src/mock/*.ts`
- `src/types/*.ts`
- `src/i18n/*.ts`

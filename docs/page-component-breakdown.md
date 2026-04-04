# Naviora Page Component Breakdown

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
- `src/components/ui/searchable-select.tsx`
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

## Entry Management

- route: `src/app/[locale]/(dashboard)/qrs/page.tsx`
- sections:
  - page header
  - search bar
  - status filter + archive view toggle
  - QR table/list
  - URL copy action
  - row actions: edit, view analytics, download QR, archive/restore, duplicate
  - empty state

## Analytics

- route: `src/app/[locale]/(dashboard)/analytics/page.tsx`
- sections:
  - page header
  - filter panel
  - overview cards
  - chart card
  - traffic dimensions
  - ranking list
- main component:
  - `src/features/analytics/analytics-chart.tsx`
  - `src/features/analytics/analytics-overview-client.tsx`

## Single Entry Analytics

- route: `src/app/[locale]/(dashboard)/qrs/[id]/analytics/page.tsx`
- sections:
  - page header
  - overview cards
  - trend chart
  - routing snapshot
  - global traffic map
  - region breakdown
  - device type breakdown
  - device OS breakdown
  - language breakdown
- main components:
  - `src/features/analytics/analytics-chart.tsx`
  - `src/features/analytics/breakdown-bar-chart.tsx`
  - `src/features/analytics/breakdown-donut-chart.tsx`
  - `src/features/analytics/world-traffic-map.tsx`

## Create Entry Flow

- route: `src/app/[locale]/(dashboard)/qrs/new/page.tsx`
- main component:
  - `src/features/qr-create/qr-create-flow.tsx`
- sections:
  - stepper
  - step 1 conversation area
  - step 1 asks for the default target content, not a separate entry type
  - WhatsApp / vCard / PDF / file links should be treated as target carriers inside the same entry flow
  - content priority after basic link support: WhatsApp -> vCard -> PDF
  - content type can be recognized and shown as a lightweight badge or helper note
  - AI auto-advance to review when the draft is ready
  - step 2 draft review
  - mutually exclusive routing modes: language, region, device OS, param, A/B test
  - step 3 design selector
  - right-side hints and preview
  - public entry URL preview + copy action
  - conditional required fields for password and expiration date

## Settings

- route: `src/app/[locale]/(dashboard)/settings/page.tsx`
- main component:
  - `src/features/settings/settings-center.tsx`
- sections:
  - account overview
  - email change trigger card
  - password change trigger card
  - email change modal: current password -> new email -> verification code
  - password change modal: email verification code -> new password -> confirm password
  - current plan
  - usage summary
  - billing history

## Upgrade

- route: `src/app/[locale]/(dashboard)/upgrade/page.tsx`
- sections:
  - page header
  - billing cycle toggle
  - current plan summary
  - shared pricing cards

## Planned API Surface

- no dedicated route in current V1
- reserved future areas:
  - API key management in settings / developer section
  - API documentation / developer docs page
  - usage examples for create, update, archive, restore, and analytics read

## Error Page

- route: `src/app/not-found.tsx`
- sections:
  - branded 404 hero
  - playful copy
  - return actions

## State and Data

- `src/store/locale-store.ts`
- `src/store/qr-create-store.ts`
- `src/mock/*.ts`
- `src/types/*.ts`
- `src/i18n/*.ts`

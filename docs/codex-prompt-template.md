# Naviora Codex Prompt Template

## General Project Prompt

Build the `Naviora` frontend inside the existing Next.js App Router project.

Requirements:

- Preserve the existing visual direction: light SaaS workspace, blue + teal gradient accents, rounded glass-like cards, strong hierarchy, and a bilingual interface.
- Brand name must always be `Naviora`.
- Product positioning name: `Rule-based Links and QR Routing`.
- Core messaging:
  - `One link, routed smarter.`
  - `Smart links and QR routing for global audiences.`
  - `Create once, route anywhere.`
- The product supports two UI languages: `zh-Hant` and `en`.
- Keep routes under `/{locale}` and preserve the current route structure:
  - `/{locale}`
  - `/{locale}/login`
  - `/{locale}/register`
  - `/{locale}/dashboard`
  - `/{locale}/qrs`
  - `/{locale}/qrs/new`
  - `/{locale}/analytics`
- Use mock data first. Do not block on real APIs.
- Keep the product usable in two ways:
  - Web App for manual workspace operations
  - API for programmatic entry management and analytics access
- Maintain the core product flow:
  - AI conversation
  - draft confirmation
  - QR design
- Keep the outer entry model unified: one smart entry routes to one or more target contents.
- Do not split the product into separate entry types for link / WhatsApp / vCard / PDF.
- In the current prioritization, expand target carriers in this order: `link` -> `whatsapp` -> `vcard` -> `pdf`.
- In the current V1 implementation, the editable target content can still start with `link` URL first, but the model should reserve future target carriers such as `whatsapp`, `vcard`, `pdf`, `file`, or `deep_link`.
- Rule modes in V1: `none | language | region | device | param | ab` (mutually exclusive).

Technical expectations:

- Next.js App Router
- TypeScript
- Tailwind CSS
- React Hook Form + Zod for forms when needed
- Zustand for lightweight creation state
- Recharts for analytics

Design expectations:

- Avoid generic purple AI templates and avoid dark Web3 styling.
- Use clean marketing layout for public pages and a structured control-panel layout for authenticated pages.
- Keep desktop-first quality high, but ensure mobile layout does not break.

## Task Prompt Template

Use this template for individual tasks:

```md
Work inside the existing `Naviora` frontend.

Goal:
[describe the specific task]

Context:
- Brand: Naviora
- UI languages: zh-Hant and en
- Keep the existing route and layout structure
- Reuse existing shared UI components before adding new ones
- Use mock data or mock services if backend work is not available

Requirements:
- [requirement 1]
- [requirement 2]
- [requirement 3]

Implementation notes:
- Keep styles aligned with the existing blue/teal light SaaS design
- Do not introduce unrelated QR types or extra flows beyond V1
- Keep code modular and reusable
- Update i18n messages if new UI text is added

Before finishing:
- Verify the relevant route renders
- Check for obvious TypeScript or lint issues
- Summarize what changed and any remaining gaps
```

## Recommended Task Sequence

1. Build and refine the bilingual layouts and shared components.
2. Complete home, login, and register interactions.
3. Refine dashboard, QR list, and analytics with mock data.
4. Improve the 3-step QR creation flow.
5. Connect mock services to user actions.
6. Reserve stable models for API usage, including API key auth, archive/restore, and analytics read.
7. Swap mock services for real APIs later.

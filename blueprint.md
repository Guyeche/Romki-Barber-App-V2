# **Project Blueprint: Romki-Barber-App-V2**

## **Overview**
Romki-Barber-App-V2 is a Next.js application tailored for a barber shop, utilizing Firebase and Supabase for backend services. The current development phase focuses on enhancing the admin login usability, allowing credentials saving and session persistence.

## **Features & Architecture**
- **Framework:** Next.js (App Router, Node/React Server Components, next-intl for multi-language support).
- **Styling:** TailwindCSS with PostCSS (`postcss.config.mjs`).
- **Database/Backend:** Supabase integration, Resend email service, and Google Calendar API integration.
- **Admin Authentication:** Simple single-password authentication validated via server actions (`app/actions.ts`), using cookie-based session verification (`admin_session`).
- **Credentials Auto-Save & Persistent Login:** The admin login uses standard autocomplete elements (`username` and `current-password`) with a persistent cookie session (1 year) to automatically sign in return visitors.

## **Execution History & Troubleshooting**
- **PostCSS & Build Fixes:** Fixed ESM-type compiler issues by removing `"type": "module"` from `package.json` and cleaning PostCSS configs.
- **TypeScript Config:** Excluded the untracked `./barberlaki-landing-lux` directory from `tsconfig.json` to prevent type-checking compilation failures.
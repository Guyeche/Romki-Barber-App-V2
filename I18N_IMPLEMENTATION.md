# Internationalization (i18n) Implementation Guide

## Overview

This application now supports full internationalization with English (default) and Hebrew languages. The implementation uses `next-intl` library, which is specifically designed for Next.js App Router.

## Features Implemented

### 1. Language Support
- **English (en)**: Default language
- **Hebrew (he)**: Full RTL support

### 2. Key Components

#### Translation Files
- `messages/en.json`: English translations
- `messages/he.json`: Hebrew translations

#### Configuration
- `i18n.ts`: Main i18n configuration
- `middleware.ts`: Handles locale detection and routing
- `lib/navigation.ts`: Locale-aware navigation utilities

#### Components
- `components/LanguageSwitcher.tsx`: Language switcher component (displayed in navbar)
- `lib/i18n.ts`: Client-side language switching utilities

### 3. RTL/LTR Support

The application automatically switches between RTL (Right-to-Left) and LTR (Left-to-Right) based on the selected language:
- English: LTR
- Hebrew: RTL

RTL-specific CSS classes are applied automatically in `app/globals.css`.

### 4. Language Preference Storage

Language preference is stored in:
- **localStorage**: For client-side persistence
- **URL**: Locale is part of the URL path (e.g., `/he/booking`)

### 5. AI Agent Integration

The language preference can be retrieved for AI agent interactions using:

```typescript
import { getAILanguagePreference, formatLanguageForAI } from '@/lib/ai-language';

// In your AI agent code:
const locale = await getAILanguagePreference();
const languageName = formatLanguageForAI(locale);

// Use in your AI system prompt:
const systemPrompt = `You are a helpful assistant. The user's interface language is ${languageName}. Please respond in ${languageName}.`;
```

## Usage

### Adding New Translations

1. Add the key-value pair to both `messages/en.json` and `messages/he.json`:

```json
// messages/en.json
{
  "mySection": {
    "myKey": "My English Text"
  }
}

// messages/he.json
{
  "mySection": {
    "myKey": "הטקסט העברי שלי"
  }
}
```

### Using Translations in Components

#### Server Components
```typescript
import { getTranslations } from 'next-intl/server';

export default async function MyPage() {
  const t = await getTranslations('mySection');
  
  return <h1>{t('myKey')}</h1>;
}
```

#### Client Components
```typescript
'use client';
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('mySection');
  
  return <h1>{t('myKey')}</h1>;
}
```

### Using Translations in Server Actions

```typescript
'use server';
import { getLocale } from 'next-intl/server';

export async function myAction() {
  const locale = await getLocale();
  const messages = await import(`../messages/${locale}.json`).then(m => m.default.mySection);
  
  return { message: messages.myKey };
}
```

### Locale-Aware Navigation

Use the `Link` component from `@/lib/navigation` instead of Next.js's default:

```typescript
import { Link } from '@/lib/navigation';

<Link href="/booking">Book Appointment</Link>
```

## Project Structure

```
app/
  [locale]/              # Locale-aware routes
    layout.tsx          # Locale layout with RTL/LTR support
    page.tsx            # Home page
    booking/
      page.tsx          # Booking page
    admin/
      page.tsx          # Admin dashboard
      login/
        page.tsx        # Admin login
messages/
  en.json               # English translations
  he.json               # Hebrew translations
lib/
  i18n.ts              # Client-side i18n utilities
  navigation.ts        # Locale-aware navigation
  ai-language.ts      # AI agent language utilities
components/
  LanguageSwitcher.tsx # Language switcher component
```

## Language Switcher

The language switcher is automatically displayed in the top navigation bar. Users can switch between English and Hebrew by clicking the respective buttons.

## AI Agent Integration

When integrating with an AI agent, use the `getAILanguagePreference()` function to get the user's current language preference:

```typescript
import { getAILanguagePreference, formatLanguageForAI } from '@/lib/ai-language';

// In your AI API route or server action:
export async function POST(request: Request) {
  const locale = await getAILanguagePreference();
  const languageName = formatLanguageForAI(locale);
  
  // Include in your AI system prompt:
  const systemPrompt = `
    You are a helpful assistant for a barber shop booking system.
    The user's interface is currently set to ${languageName}.
    Please respond to the user in ${languageName}.
  `;
  
  // ... rest of your AI agent code
}
```

## Future Enhancements

1. **Supabase User Profile Integration**: Store language preference in user profile
2. **Additional Languages**: Easy to add more languages by:
   - Adding locale to `i18n.ts`
   - Creating new translation file in `messages/`
   - Updating `LanguageSwitcher` component

## Notes

- The default locale (English) doesn't require a prefix in the URL (e.g., `/booking` instead of `/en/booking`)
- All routes are automatically prefixed with locale when not using the default
- RTL styles are applied automatically for Hebrew
- Language preference persists across page reloads via localStorage

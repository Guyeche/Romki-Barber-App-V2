'use server';

import { getLocale } from 'next-intl/server';
import { cookies } from 'next/headers';

/**
 * Get the user's language preference for AI agent interactions
 * This can be extended to fetch from Supabase user profile if needed
 */
export async function getAILanguagePreference(): Promise<string> {
  try {
    // First, try to get from current locale context
    const locale = await getLocale();
    return locale;
  } catch {
    // Fallback to default if locale is not available
    return 'en';
  }
}

/**
 * Get language preference from Supabase user profile (if user is authenticated)
 * This is a placeholder for future implementation
 */
export async function getAILanguageFromSupabase(userId?: string): Promise<string | null> {
  // TODO: Implement Supabase user profile lookup
  // Example:
  // if (userId) {
  //   const { data } = await supabase
  //     .from('users')
  //     .select('language_preference')
  //     .eq('id', userId)
  //     .single();
  //   return data?.language_preference || null;
  // }
  return null;
}

/**
 * Format language preference for AI system prompt
 */
export function formatLanguageForAI(locale: string): string {
  const languageMap: Record<string, string> = {
    'en': 'English',
    'he': 'Hebrew'
  };
  
  return languageMap[locale] || 'English';
}

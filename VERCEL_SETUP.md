# Vercel Deployment Setup Guide

When deploying your Barber App to Vercel, you need to configure the **Environment Variables**.
Go to **Settings** -> **Environment Variables** in your Vercel Project Dashboard.

## ✅ Mandatory Variables (App will crash without these)

| Variable Name | Description |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Public API Key |
| `SUPABASE_SERVICE_KEY` | Your Supabase Service Role Key (Keep Secret!) |
| `RESEND_API_KEY` | API Key from Resend.com for emails |
| `BARBER_ADMIN_EMAIL` | The email you use to log in as admin |
| `ADMIN_PASSWORD` | The password for the admin panel |
| `RESEND_FROM_EMAIL` | The verified sender email (e.g., `onboarding@resend.dev` or your custom domain) |
| `GOOGLE_CALENDAR_ID` | The ID of the Google Calendar to sync with |
| `GOOGLE_CLIENT_EMAIL` | Service Account Email from Google Cloud |
| `GOOGLE_PRIVATE_KEY` | **Crucial:** Copy the entire key including `-----BEGIN...` and `...END-----`. |

---

## 🎨 Optional Variables (Background Images)

These control the look of your app. If you don't add them, the app will use the default modern gradient.

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_BG_HOME` | Background for the main landing page | `https://example.com/barber-shop.jpg` |
| `NEXT_PUBLIC_BG_BOOKING` | Background for the booking flow | `https://example.com/chairs.jpg` |
| `NEXT_PUBLIC_BG_ADMIN` | Background for the admin dashboard | `https://example.com/office-texture.jpg` |
| `NEXT_PUBLIC_BACKGROUND_IMAGE_URL` | Global fallback image if others aren't set | `https://example.com/default-bg.jpg` |

## 🚀 Deployment Checklist

1.  **Run Migrations:** Ensure you have run `schema.sql`, `schedule_migration.sql`, and `settings_migration.sql` in your Supabase SQL Editor.
2.  **Add Env Vars:** Copy all the mandatory variables from your local `.env` file to Vercel.
3.  **Deploy:** Push your code to GitHub/GitLab/Bitbucket connected to Vercel.

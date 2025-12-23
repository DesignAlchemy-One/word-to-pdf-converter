# Word to PDF Converter – SaaS Proof of Concept

## Big Picture Goal (Why We Are Building This)
We are building a simple web tool that lets people upload a Word (.docx) file and download it as a PDF.

The main goal is to turn this into a small paid SaaS (software as a service) that makes **$1,000 per month** in revenue.

This is a proof-of-concept to show it can make money before investing more time or hiring developers.

## Future Plans (What We Will Add Later)
Once the basic Word to PDF works and makes money, we will add:
- Excel to PDF
- PowerPoint to PDF
- More formats (like image to PDF, merge PDFs, etc.)
- Make it look and work like iLovePDF.com (a successful example)

## Monetization Plan (How We Will Make Money)
Version 1 pricing:
- Free tier: 3–5 conversions per month (to get people to try it)
- Monthly subscription: $2.99 per month → 50 conversions per month
- Lifetime access: $4.99 to $9.99 one-time payment → unlimited conversions (with fair-use policy)

Future ideas:
- Higher tier for bulk processing
- API access for developers
- Remove branding option

## Project Status
- [x] Repository & project bible created
- [x] Frontend MVP skeleton deployed
- [x] File storage configured (Cloudflare R2)
- [x] Database configured (Supabase Postgres + auth)

## Core Technology Decisions (Locked In – We Will Not Change These)
- **Conversion Engine**: Gotenberg (Docker container that uses LibreOffice + Chromium)  
  Reason: Best quality for complex Word files (tables, images, fonts)
- **Frontend**: Next.js 14+ (App Router) + Tailwind CSS  
  Hosted on: Vercel
- **Backend/API**: To be decided (Node.js/Express or Python/FastAPI)  
  Hosted on: Railway or Render
- **File Storage**: Cloudflare R2 (S3-compatible, zero egress fees)
- **Database**: PostgreSQL via Supabase or Neon (free tier to start)
- **Payments**: Existing Stripe modules + webhooks
- **Extra Infrastructure**: Cloudflare for DNS, CDN, DDoS protection

## Infrastructure (Current)
- **Frontend**: Next.js + Tailwind on Vercel
  - Live at: https://word-to-pdf-converter-psi.vercel.app
- **File Storage**: Cloudflare R2
  - Bucket: da-word-pdf-storage
  - Credentials in Vercel env vars
- **Database**: Supabase (PostgreSQL)
  - Project: word-to-pdf-converter
  - Connection string and anon key in Vercel env vars
- **Backend/Conversion Engine**: Gotenberg on Render
  - Live URL: https://word-to-pdf-gotenberg.onrender.com
  - Health check: Passed (Chromium + LibreOffice up)

## Decisions Log
- **December 23, 2025**
  - Switched to Render for backend (better Docker support)
  - Gotenberg deployed and health check passed
  - Backend phase: Conversion engine live

## Notes
- R2 secret env vars set to Production + Preview only with Sensitive enabled (masks values in UI/logs)
- Development environment excluded (no local dev needed yet)
- Re-visit if local testing required later
- When backend is live in production, verify in Vercel logs/UI that R2 secret values are masked and not exposed

## High-Level Architecture (How Everything Connects)

```mermaid
graph TD
    A[User Browser] --> B(Next.js Frontend on Vercel)
    B --> C(Stripe Checkout for payments)
    B --> D(API Backend on Railway/Render)
    D --> E(Gotenberg Conversion Service)
    D --> F(Cloudflare R2 Storage for files)
    D --> G(PostgreSQL Database - Supabase/Neon)
    E --> F
    F --> A[User downloads PDF]

# Word to PDF Converter – SaaS Proof of Concept

**Goal**: Build a web-based Word (.docx) to PDF converter with subscription/lifetime monetization.  
**Target**: Validate ability to generate $1,000/month in revenue.  
**Future expansions**: Add Excel → PDF, PowerPoint → PDF, and more formats (inspired by iLovePDF.com).

## Project Status
- [x] Repository & project bible created
- [x] Frontend MVP skeleton deployed
- [x] File storage configured (Cloudflare R2)

## Core Decisions (Locked In)
- **Conversion Engine**: Gotenberg (Docker-based, wraps LibreOffice + Chromium) – high fidelity, production-ready
- **Frontend**: Next.js 14+ (App Router) + Tailwind CSS – Hosted on Vercel
- **Backend/API**: To be decided (Node.js/Express or Python/FastAPI) – Hosted on Railway or Render
- **File Storage**: Cloudflare R2 (S3-compatible, zero egress fees)
- **Database**: PostgreSQL via Supabase or Neon (free tier)
- **Payments**: Existing Stripe integration + webhooks
- **Infrastructure**: Cloudflare for DNS, CDN, DDoS protection

## Monetization Plan (v1)
- Free tier: 3–5 conversions/month (hook users)
- Monthly: $2.99 → 50 conversions/month
- Lifetime: $4.99–$9.99 one-time → unlimited (fair use policy)
- Future: Higher tiers for bulk, API access, branding removal

## Infrastructure (Current)
- **Frontend**: Next.js + Tailwind on Vercel
  - Live at: https://word-to-pdf-converter-psi.vercel.app
- **File Storage**: Cloudflare R2
  - Bucket: da-word-pdf-storage
  - Secure Account API token created
  - Credentials stored as env vars in Vercel (sensitive masked in Production/Preview)

## Notes
- R2 secret env vars set to Production + Preview only with Sensitive enabled (masks values in UI/logs)
- Development environment excluded (no local dev needed yet)
- Re-visit if local testing required later
- When backend is live in production, verify in Vercel logs/UI that R2 secret values are masked and not exposed

## High-Level Architecture

```mermaid
graph TD
    A[User Browser] --> B(Next.js Frontend on Vercel)
    B --> C(Stripe Checkout)
    B --> D(API Backend on Railway/Render)
    D --> E(Gotenberg Conversion Service)
    D --> F(Cloudflare R2 Storage)
    D --> G(PostgreSQL Database - Supabase/Neon)
    E --> F
    F --> A[Download PDF]

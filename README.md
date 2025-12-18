# Word to PDF Converter – SaaS Proof of Concept

**Goal**: Build a web-based Word (.docx) to PDF converter with subscription/lifetime monetization.  
**Target**: Validate ability to generate $1,000/month in revenue.  
**Future expansions**: Add Excel → PDF, PowerPoint → PDF, and more formats (inspired by iLovePDF.com).

## Project Status
- [x] Repository & project bible created
- [ ] Architecture finalized & locked
- [ ] Hosting accounts created
- [ ] Frontend MVP deployed
- [ ] Backend & conversion engine running
- [ ] Stripe payments integrated
- [ ] Launch & marketing

## Core Decisions (Locked In)
- **Conversion Engine**: Gotenberg (Docker-based service wrapping LibreOffice + Chromium) → high-fidelity, production-ready, easy multi-format support
- **Frontend**: Next.js 14+ (App Router) + Tailwind CSS → Hosted on Vercel
- **Backend/API**: To be decided (Node.js + Express **or** Python + FastAPI) → Hosted on Railway or Render
- **File Storage**: Cloudflare R2 (S3-compatible, zero egress fees)
- **Database**: PostgreSQL via Supabase or Neon (free tier to start)
- **Payments**: Existing Stripe modules + webhooks for subscription management
- **Infrastructure extras**: Cloudflare for DNS, CDN, and DDoS protection

## Monetization Plan (Initial)
- **Free tier**: 3–5 conversions per month (to drive sign-ups)
- **Monthly subscription**: $2.99 → 50 conversions/month
- **Lifetime access**: $4.99–$9.99 one-time → unlimited (with fair-use policy)
- Future ideas: Higher tiers for bulk processing, API access, remove branding

## High-Level Architecture

```mermaid
graph TD
    A[User Browser] --> B(Next.js Frontend on Vercel)
    B --> C(Stripe Checkout / Customer Portal)
    B --> D(API Backend on Railway/Render)
    D --> E(Gotenberg Conversion Service)
    D --> F(Cloudflare R2 Storage)
    D --> G(PostgreSQL Database - Supabase/Neon)
    E --> F
    F --> A[Download PDF or Email Link]

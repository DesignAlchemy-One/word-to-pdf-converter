# Word to PDF Converter – SaaS Proof of Concept

## Big Picture Goal
Build a high-quality, single-purpose web tool that converts .docx (Word) files to PDF with excellent fidelity (layout, fonts, images, tables preserved).

Primary objective: Validate demand and achieve sustainable revenue ($1,000/month target) as a minimal viable SaaS before expanding into a full PDF suite.

This project demonstrates that a non-technical founder, working exclusively with AI (Grok), can ship a complete, monetized web application from idea to revenue without hiring developers.

## Current Status (January 12, 2026)
- [x] Repository and project bible established
- [x] Frontend MVP deployed (Next.js 14+ App Router + Tailwind CSS)
  - Live URL: https://word-to-pdf-converter-psi.vercel.app
- [x] Cloudflare R2 storage configured (bucket: da-word-pdf-storage)
- [x] Supabase PostgreSQL database configured (project: word-to-pdf-converter)
  - `users` table created for future paid user tracking
- [x] Custom Gotenberg conversion engine deployed on Render
  - Includes Microsoft core fonts + fontconfig rules forcing Aptos/Calibri → Carlito (sans-serif)
  - Live URL: https://word-to-pdf-gotenberg-custom.onrender.com
  - Health check: up (LibreOffice and Chromium ready)
- [x] End-to-end conversion flow working (upload → Gotenberg → PDF download)
- [x] Free tier enforcement: 10 conversions per day (client-side counter with localStorage, resets daily)
- [x] Upgrade modal with direct Stripe checkout links
  - $2.99/month unlimited
  - $9.99 lifetime unlimited (includes future features)
- [ ] Automatic PDF download after conversion (no button click)
- [ ] Stripe webhook + Supabase integration for automatic unlimited unlock after payment
- [ ] R2 storage for converted PDFs + signed URLs
- [ ] Stress testing with complex documents
- [ ] Additional polish (success messages, mobile UX, etc.)

## Monetization (Live – Direct Stripe Links)
- **Free tier**: 10 conversions per day (no signup required, tracked client-side)
- **Pro Monthly**: $2.99 / month – unlimited conversions
  - Checkout: https://buy.stripe.com/00w5kD9cY4RA0fM0z04Vy06
- **Lifetime**: $9.99 one-time – unlimited conversions + all current and future features forever
  - Checkout: https://buy.stripe.com/28EcN53SE1Fo0fMa9A4Vy08

Lifetime includes grandfathered access to future tools (merge, compress, edit, OCR, etc.).

## Core Technology Stack (Locked In)
- **Frontend**: Next.js 14+ (App Router) + Tailwind CSS  
  Hosted on Vercel
- **Conversion Engine**: Custom Gotenberg (Docker) with LibreOffice + Chromium  
  Hosted on Render (free tier for now)
- **File Storage**: Cloudflare R2 (S3-compatible)
- **Database**: PostgreSQL via Supabase (free tier)
- **Payments**: Stripe Checkout (direct links live; webhook pending)
- **Infrastructure**: Cloudflare for DNS/CDN, Render for backend

## Infrastructure Details
- **Frontend**: https://word-to-pdf-converter-psi.vercel.app
- **Gotenberg Conversion Service**: https://word-to-pdf-gotenberg-custom.onrender.com
- **R2 Bucket**: da-word-pdf-storage
- **Supabase Project**: word-to-pdf-converter

## Key Decisions & Outcomes
- Chose Gotenberg over cloud APIs for superior .docx fidelity and cost control
- Custom Gotenberg build includes:
  - Microsoft core fonts (Arial, Times New Roman, Georgia, Verdana, etc.)
  - Fontconfig rules forcing Aptos and Calibri → Carlito (sans-serif, metric-compatible)
- Result: Excellent layout preservation, correct sans-serif rendering for modern Word fonts
- Free tier limit enforced client-side (localStorage) for immediate rollout
- Direct Stripe links implemented for fastest path to revenue

## Future Roadmap
1. Automatic PDF download after conversion
2. Stripe webhook + Supabase integration for automatic unlimited unlock
3. R2 storage for converted PDFs + signed download links
4. Stress-test with complex documents (tables, headers/footers, multi-page, embedded charts)
5. Add batch conversion, merge, compress, edit tools
6. Upgrade Render plan when revenue justifies (eliminate cold starts)
7. Expand to full PDF suite (target iLovePDF.com experience)

## Project Archives
Full conversation threads and troubleshooting history are archived for reference:
- `CHAT_HISTORY_THREAD1_DEC2025.md` — December 2025 (frontend, R2, Supabase, Gotenberg deployment)
- `CHAT_HISTORY_THREAD2_JAN2026.md` — January 2026 (font fixes, free limit enforcement, upgrade modal, Stripe links)

## High-Level Architecture

```mermaid
graph TD
    A[User Browser] --> B(Next.js Frontend on Vercel)
    B --> C(Stripe Checkout for payments)
    B --> D(/api/convert API Route)
    D --> E(Custom Gotenberg on Render)
    E --> B[Return PDF blob → Auto-download]
    B --> F(Upgrade Modal → Stripe Checkout)
    subgraph Future
      D --> G(Cloudflare R2 Storage)
      D --> H(Supabase Database)
      F --> I(Stripe Webhook → Unlock in Supabase)
    end

## Project Status
- [x] Repository & project bible created
- [x] Frontend MVP skeleton deployed
- [x] File storage configured (Cloudflare R2)

## Infrastructure
- **Frontend**: Next.js + Tailwind on Vercel
  - Live at: https://word-to-pdf-converter-psi.vercel.app
- **File Storage**: Cloudflare R2
  - Bucket: da-word-pdf-storage
  - Secure API token created
  - Credentials stored as env vars in Vercel

## Decisions Log
- **December 18, 2025**
  - Cloudflare R2 bucket and secure Account API token configured
  - All R2 environment variables added to Vercel
  - File storage phase complete

## Notes
- R2 secret env vars set to Production + Preview only with Sensitive enabled (masks values in UI/logs)
- Development environment excluded (no local dev needed yet)
- Re-visit if local testing required later

## Sub-Note
- How many lightsabers did Luke Skywalker have?
  

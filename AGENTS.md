# WeaveLink — Agent Notes

Authenticated direct-market platform for rural handloom weavers (Handloom Hackathon 2026, Theme 2).

## Current phase

**Frontend demo only.** Mock data in `src/data/mock.ts`. No real backend, DB, payments, or blockchain yet — label UI as demo / mocked where relevant.

## Stack

- Next.js App Router + TypeScript + Tailwind v4
- Framer Motion for intentional motion
- Lucide icons

## Design system

- Light mode only (`Indigo Warp`)
- CSS tokens in `src/app/globals.css`
- Display: Fraunces · Body: Figtree
- Signature motif: vertical warp threads + Digital Product Passport card

## Key routes (demo video)

| Route | Purpose |
| --- | --- |
| `/` | Landing / pitch |
| `/marketplace` | B2C browse |
| `/product/[id]` | Product + story + authenticity |
| `/verify/[serial]` | Public DPP scan page |
| `/sell` | Voice/photo listing onboarding |
| `/dashboard` | Seller orders & inventory |
| `/b2b` | Bulk / RFQ mode |

## Do not

- Commit or push unless the human asks
- Invent live API claims — keep honest “demo / mocked” labeling
- Switch to dark/purple/cream-terracotta generic AI aesthetics

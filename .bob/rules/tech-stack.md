---
title: Tech Stack
last_updated: 2026-05-16
generated_by: agent
---

## Overview

| Layer | Detected stack | Evidence |
|---|---|---|
| Runtime | Node.js runtime not explicitly pinned | No `engines` field was detected in any workspace `package.json` |
| Package manager | npm | Root and app folders contain `package-lock.json` |
| Server framework | Express 4.19.2 | `server-side/package.json` |
| Server data layer | MongoDB via Mongoose 8.4.1 | `server-side/package.json`, `server-side/src/index.ts` |
| Active frontend framework | React 19.2.0 | `client-side-ts/package.json` |
| Frontend build tool | Vite 7.2.4 | `client-side-ts/package.json`, `client-side-ts/tsconfig.node.json` |
| Frontend routing | React Router 7.11.0 | `client-side-ts/package.json`, `client-side-ts/src/router.tsx` |
| Database | MongoDB | Mongoose is the primary database library on the server |
| Deployment targets | Vercel, Docker, backend cloud storage integrations | `client-side-ts/vercel.json`, `server-side/Dockerfile`, `server-side/vercel.json`, README deployment notes |

## Server

| Category | Libraries / tools |
|---|---|
| HTTP and middleware | `express`, `body-parser`, `cors`, `helmet`, `express-rate-limit` |
| Auth and security | `jsonwebtoken`, `bcryptjs`, cookie helpers in `server-side/src/util/cookie.util.ts` |
| Persistence | `mongoose` |
| File upload and media | `multer`, `multer-s3`, `sharp` |
| Cloud services | `@aws-sdk/client-s3`, `@google-cloud/storage` |
| Mail and scheduling | `nodemailer`, `node-cron` |
| Date / utility | `date-fns`, `axios`, `dotenv` |

## Active Client

| Category | Libraries / tools |
|---|---|
| UI | `react`, `react-dom`, `@radix-ui/*`, `lucide-react`, `framer-motion`, `tailwindcss`, `tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge` |
| Routing | `react-router`, `react-router-dom` |
| Forms and validation | `react-hook-form`, `@tanstack/react-form`, `@hookform/resolvers`, `zod` |
| Data and HTTP | `axios`, `date-fns` |
| Feedback | `sonner`, `notyf` |
| Other UI utilities | `cmdk`, `embla-carousel-react`, `react-day-picker`, `recharts`, `react-loader-spinner`, `vaul`, `input-otp`, `react-qr-code`, `@yudiel/react-qr-scanner` |

## Not Detected

| Item | Status |
|---|---|
| Root-level package scripts | Not detected |
| Shared workspace package | Not detected |
| Server-side state management library | Not detected |
| Client-side global state library | Not detected |
| Database migration tool | Not detected |

## Deployment Notes

- The README says the frontend is deployed on Vercel and the backend is deployed on Koyeb with AWS S3.
- The repository also contains `vercel.json` files in both client apps and the server app, plus `server-side/Dockerfile`.
- No CI workflow definitions were read in this pass, so deployment automation beyond those files is not documented here.
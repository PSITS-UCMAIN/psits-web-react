---
title: Setup
last_updated: 2026-05-16
generated_by: agent
---

## Prerequisites

| Requirement      | Status                                                                              |
| ---------------- | ----------------------------------------------------------------------------------- |
| Node.js          | README says v16 or higher; no `engines` field is set in the workspace package files |
| npm              | Required; the repo uses `package-lock.json`                                         |
| Environment file | Required for server-side runtime configuration                                      |

## Install

### Repository root

```bash
npm install
```

### Server

```bash
cd server-side
npm install
```

### Active client

```bash
cd client-side-ts
npm install
```

### Legacy client, only if you are working there

```bash
cd client-side
npm install
```

## Run

### Server dev mode

```bash
cd server-side
npm run dev
```

### Active client dev mode

```bash
cd client-side-ts
npm run dev
```

## Build

### Server build

```bash
cd server-side
npm run build
```

### Active client build

```bash
cd client-side-ts
npm run build
```

## Environment Variables

### Server-side variables detected in source

| Variable                | Used for                                         |
| ----------------------- | ------------------------------------------------ |
| `PORT`                  | HTTP port                                        |
| `MONGODB_URI`           | MongoDB connection string                        |
| `DB_NAME`               | MongoDB database name                            |
| `CORS`                  | Allowed origin list                              |
| `CORS2`                 | Allowed origin list                              |
| `CORS3`                 | Allowed origin list                              |
| `JWT_SECRET`            | JWT signing and verification                     |
| `REFRESH_TOKEN_TTL`     | Refresh token TTL                                |
| `NODE_ENV`              | Environment checks and cookie behavior           |
| `EMAIL`                 | Mail sender account                              |
| `PASSWORD_APP_EMAIL`    | Mail sender app password                         |
| `AWS_REGION`            | AWS region for S3 uploads                        |
| `AWS_ACCESS_KEY_ID`     | AWS credentials                                  |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials                                  |
| `AWS_BUCKET_NAME`       | S3 bucket                                        |
| `bucketUrl`             | URL prefix removal for stored merchandise images |

### Active client variables detected in source

| Variable       | Used for                                                       |
| -------------- | -------------------------------------------------------------- |
| `VITE_API_URL` | Backend API base URL in `client-side-ts/src/api/backendApi.ts` |

## Notes

- No client-side-ts env variables beyond `VITE_API_URL` were detected in the sampled source.
- The repository does not declare a workspace-level Node engine, so the README’s Node 16+ note is the only version hint found.

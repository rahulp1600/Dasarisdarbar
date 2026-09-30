# Dasari Darbar — Complete Deployment Guide

This guide walks you through deploying the **Frontend** to **Vercel** and the **Backend & OCR Engine** to **Render** or **Fly.io**.

---

## Architecture Overview

* **Frontend:** React + Vite (Hosted on Vercel)
* **Backend:** Node.js Express + Python FastAPI OCR + Tesseract OCR (Unified Docker Container on Render or Fly.io)
* **Database & Auth:** Supabase Cloud

---

## Part 1: Deploy Backend & OCR (Render — Recommended Free Tier)

The repository includes a ready-to-deploy [`Dockerfile`](./Dockerfile) and [`render.yaml`](./render.yaml).

### Steps on Render:
1. Log in to [render.com](https://render.com).
2. Click **New +** → **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your GitHub repo (`rahulp1600/Dasarisdarbar`).
4. Set the following settings:
   * **Name:** `dasarisdarbar-backend`
   * **Language / Environment:** `Docker` (Render automatically detects the root `Dockerfile`)
   * **Region:** Any (e.g., Oregon or Frankfurt)
   * **Instance Type:** `Free`
5. Under **Environment Variables**, add:
   * `PORT` = `10000`
   * `PYTHON_OCR_URL` = `http://127.0.0.1:8000`
   * `SUPABASE_URL` = `https://icnqjyhpvimbhfrcqzsl.supabase.co`
   * `SUPABASE_ANON_KEY` = `sb_publishable_kG-Q_3CdV06OLnPpyjLcNg_3PlguQTs`
   * `SUPABASE_SERVICE_ROLE_KEY` = *(Your Supabase service role key from Supabase Dashboard → Settings → API)*
6. Click **Deploy Web Service**.
7. Once deployment is complete, copy your public backend URL:
   `https://dasarisdarbar-backend.onrender.com`

---

## Part 2: Deploy Frontend to Vercel

The repository includes [`vercel.json`](./vercel.json) with SPA rewrites preconfigured.

### Steps on Vercel:
1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository: `rahulp1600/Dasarisdarbar`.
4. Framework Preset will be automatically detected as **Vite**.
5. Under **Environment Variables**, add:
   * `VITE_SUPABASE_URL` = `https://icnqjyhpvimbhfrcqzsl.supabase.co`
   * `VITE_SUPABASE_ANON_KEY` = `sb_publishable_kG-Q_3CdV06OLnPpyjLcNg_3PlguQTs`
   * `VITE_BACKEND_URL` = *(Your live backend URL from Part 1, e.g., `https://dasarisdarbar-backend.onrender.com`)*
6. Click **Deploy**.

---

## Alternative: Deploy Backend to Fly.io (Mumbai `bom` Region)

If you prefer deploying the backend on Fly.io (closest to Hyderabad with lowest latency):

```bash
# 1. Install flyctl if not installed
# Windows (PowerShell):
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"

# 2. Login to Fly.io
fly auth login

# 3. Launch with preconfigured fly.toml
fly launch --no-deploy

# 4. Set Supabase secrets
fly secrets set SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# 5. Deploy
fly deploy
```

Fly.io will output your live URL (e.g., `https://dasarisdarbar-backend.fly.dev`). Add that as `VITE_BACKEND_URL` in Vercel!

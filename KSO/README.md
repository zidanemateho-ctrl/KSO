# KSO SaaS - Orientation et Suivi Academique

Plateforme SaaS multi-etablissements (college, lycee, universite) pour accompagner eleves et etudiants dans leur progression academique et professionnelle.

## P0 Render deja integre

1. Base PostgreSQL (plus SQLite) avec Prisma.
2. Migrations versionnees avec `prisma migrate` (`deploy` en production).
3. Healthchecks `live` + `ready` avec verification DB.
4. Rate limiting global + auth + uploads/chat.
5. Auth renforcee: access token court + refresh token HttpOnly + forgot/reset password.
6. Uploads cloud-ready (Cloudinary) en production.
7. Observabilite: logs structures, request-id, metrics, reporting d erreurs.
8. Audit log admin sur actions d ecriture.
9. CI/CD minimum: lint + build + smoke test backend.

## Stack

- Frontend: React + TypeScript + Vite + TailwindCSS
- Backend: Node.js + Express + TypeScript
- Base de donnees: PostgreSQL + Prisma ORM
- Authentification: JWT access token + refresh token HttpOnly + RBAC

## Roles supportes

- `SUPER_ADMIN`
- `COLLEGE_ADMIN`
- `HIGH_SCHOOL_ADMIN`
- `UNIVERSITY_ADMIN`
- `SCHOOL_ADMIN`
- `TEACHER`
- `STUDENT`
- `UNIVERSITY_STUDENT`
- `PARENT`

## Couverture metier

- Classes francophones et anglophones (`SECONDE/PREMIERE/TERMINALE`, `LOWER_SIXTH/UPPER_SIXTH`)
- Filieres `SCIENTIFIQUE`, `LITTERAIRE`, `ECONOMIQUE`, `TECHNIQUE`
- Gestion multi-etablissements et multi-profils (eleve, etudiant, enseignant, parent)
- Import notes et import eleves/etudiants (CSV/XLS/XLSX)
- Analytics, orientation, accompagnement, guidance avancee
- Chat inter-etablissements temps reel

## Demarrage local

### 1) Prerequis

- Node.js 20+
- PostgreSQL 14+ (local ou distant)

### 2) Variables d environnement

#### Backend

Copier `backend/.env.example` vers `backend/.env`, puis adapter:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kso?schema=public"

JWT_SECRET="CHANGE_THIS_SECRET_TO_A_LONG_RANDOM_STRING"
JWT_REFRESH_SECRET="CHANGE_THIS_REFRESH_SECRET_TO_A_LONG_RANDOM_STRING"
JWT_EXPIRES_IN="15m"
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="30d"

FRONTEND_URL="http://localhost:5173"
PUBLIC_BASE_URL="http://localhost:4000"

AUTH_COOKIE_DOMAIN=""
AUTH_COOKIE_SAME_SITE="lax"
AUTH_COOKIE_SECURE="false"

FILE_STORAGE_DRIVER="local"
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
CLOUDINARY_FOLDER="kso/chat"

PASSWORD_RESET_BASE_URL="http://localhost:5173/reset-password"
RESEND_API_KEY=""
MAIL_FROM=""
```

#### Frontend

Copier `frontend/.env.example` vers `frontend/.env`:

```env
VITE_API_BASE_URL="http://localhost:4000/api"
```

### 3) Installer les dependances

Depuis la racine:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 4) Initialiser la base

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

`npm run prisma:migrate` utilise `prisma migrate dev` (migrations reelles, tracables).

### 5) Lancer le projet

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api`
- Health live: `http://localhost:4000/health/live`
- Health ready: `http://localhost:4000/health/ready`

## Auth et securite

- Access token court cote frontend (memoire), pas de stockage persistant en localStorage.
- Refresh token opaque en cookie HttpOnly (`kso_refresh_token`) avec rotation.
- Endpoints auth:
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
  - `GET /api/auth/me`
- Rate limiting:
  - global API
  - auth (anti-bruteforce)
  - uploads/imports/chat

## Observabilite

- Header `x-request-id` sur les reponses
- Logs structures (JSON line)
- Metrics Prometheus-like: `GET /metrics` (token optionnel via `METRICS_TOKEN`)
- Readiness avec verification DB (`SELECT 1`)
- Reporting erreurs externe via `OBSERVABILITY_WEBHOOK_URL`
- Audit log admin sur operations d ecriture

## SEO

- Metadonnees SEO dynamiques par page publique (title, description, canonical, Open Graph, Twitter).
- Balises `noindex` sur espaces prives et pages d authentification.
- Donnees structurees JSON-LD sur les pages marketing (WebSite, SoftwareApplication, FAQ, Breadcrumb).
- `robots.txt` et `sitemap.xml` dans `frontend/public`.
- Variable `VITE_SITE_URL` pour generer des URLs canoniques correctes en production.

## Uploads fichiers

- Dev/local: stockage disque (`FILE_STORAGE_DRIVER=local`)
- Production: stockage Cloudinary (`FILE_STORAGE_DRIVER=cloudinary`)
- Upload chat: champ multipart `file`
- Types autorises: images, pdf, doc/docx, xls/xlsx

## Deploiement Render

Le repo contient `render.yaml` pour provisionner:

- `kso-postgres` (PostgreSQL)
- `kso-backend` (Node web service)
- `kso-frontend` (static site)

### Flux de deploiement backend

1. Build: `npm ci && npm run prisma:generate && npm run build`
2. Pre-deploy: `npm run prisma:deploy`
3. Start: `npm start`

### Variables a renseigner sur Render (backend)

Ces variables sont deja declarees dans `render.yaml` et doivent etre completees quand `sync: false`:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `METRICS_TOKEN` (optionnel)
- `OBSERVABILITY_WEBHOOK_URL` (optionnel)

Important:
- En production, `FILE_STORAGE_DRIVER=cloudinary`.
- `AUTH_COOKIE_SECURE=true` et `AUTH_COOKIE_SAME_SITE=none`.

### URL Render par defaut

Le blueprint pre-remplit:

- `FRONTEND_URL=https://kso-frontend.onrender.com`
- `PUBLIC_BASE_URL=https://kso-backend.onrender.com`
- `PASSWORD_RESET_BASE_URL=https://kso-frontend.onrender.com/reset-password`
- `VITE_API_BASE_URL=https://kso-backend.onrender.com/api`

Si vous utilisez des domaines custom, remplacez ces valeurs.

## CI/CD

Workflow GitHub Actions: `.github/workflows/ci.yml`

Pipeline:
1. Setup Node + Postgres service
2. Install deps (root/backend/frontend)
3. `prisma generate` + `prisma migrate deploy`
4. `npm run lint`
5. `npm run build`
6. `npm run smoke:test`

## Scripts utiles

### Racine

- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run smoke:test`
- `npm run ci:check`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:deploy`
- `npm run prisma:seed`

### Backend

- `npm run dev --prefix backend`
- `npm run build --prefix backend`
- `npm run lint --prefix backend`
- `npm run prisma:migrate --prefix backend`
- `npm run prisma:deploy --prefix backend`

### Frontend

- `npm run dev --prefix frontend`
- `npm run build --prefix frontend`
- `npm run lint --prefix frontend`

## Comptes seed (dev)

- Super admin: `superadmin@kso.local` / `SuperAdmin123!`
- Admin lycee 1: `admin.lycee@kso.local` / `Admin123!`
- Enseignant lycee: `teacher.lycee@kso.local` / `Teacher123!`
- Eleve lycee: `eleve.lycee@kso.local` / `Learner123!`
- Parent: `parent@kso.local` / `Parent123!`

Le seed inclut aussi des profils sur classes francophones et anglophones, y compris filiere technique.

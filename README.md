# FitZone Gym

A React and Vite gym website with public pages, Firebase Authentication for member accounts, and clearly labeled member/admin demo dashboards. No backend or business-data persistence is included.

## Requirements

- Node.js 20.19+ (or 22.12+) and npm

## Run locally

```powershell
cd client
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`).

## Checks

```powershell
npm run lint
npm run build
```

The contact form only simulates an enquiry. Member bookings, plans, attendance, profile edits, payments, and admin records/actions remain local demo data and are not saved. Login and registration use Firebase Authentication; member routes require an authenticated user. The admin area is a development demo, is not protected by role authorization, and is not secure.

For Firebase project setup and local environment configuration, see [docs/SETUP.md](./docs/SETUP.md). Keep real Firebase Web App configuration in the ignored `client/.env.local` file; `.env.example` contains placeholders only. Firebase Authentication Email/Password must be enabled in Firebase Console.

## Project structure

- `client/src/components/` reusable navigation, cards, forms, and shared UI.
- `client/src/pages/` public pages and account form.
- `client/src/member/` member demo pages and sample records.
- `client/src/admin/` admin demo pages and local interactions.
- `client/src/layouts/` public, member, and admin layouts.
- `client/public/assets/` reserved for local static assets.
- `docs/` project notes.

Cloud Firestore operations, Firebase Storage, and admin role authorization are not implemented.

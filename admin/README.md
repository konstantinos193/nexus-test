# Nexus Admin

A modern, minimal admin panel built with React, TypeScript, Tailwind CSS, and TanStack Query.

## Tech Stack

- **Frontend:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Components:** Headless UI
- **State / API:** TanStack Query (React Query)
- **Auth:** Role-based access (Admin, Editor, Viewer)
- **Routing:** React Router v6

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Sign in with any email/password to use the demo admin account.

## Project Structure

```
src/
  app/           # Route-level pages and layout
    dashboard/
    users/
    settings/
    logs/
    layout/
    login/
  components/
    ui/           # Buttons, badges, skeletons, empty states
    tables/       # DataTable
    modals/       # Modal, ConfirmDialog
    layout/       # Sidebar, Header, MainLayout
  lib/
    api/          # REST client, endpoints, hooks, mock data
    auth/         # Auth context, ProtectedRoute
    types.ts
    utils.ts
  styles/
    globals.css
```

## Features

- **Dashboard:** KPI cards, recent activity, wallet/transaction status indicators
- **Users:** Paginated table, search, create/delete (permission-gated)
- **Settings:** General, Security, API keys (permission-gated)
- **Activity / Logs:** Timestamped events, filter by user
- **Auth:** Demo user with permissions; optional login page
- **Layout:** Fixed sidebar (collapsible), header with search and user menu, breadcrumbs, action buttons

## Backend / API

The app is **database-agnostic** and uses a REST-compatible API layer. By default it runs with **mock data**. To use a real API:

1. Create `.env` and set `VITE_API_URL` to your API base URL (e.g. `https://api.example.com`).
2. Ensure your API exposes the routes in `src/lib/api/endpoints.ts` and returns the shapes in `src/lib/types.ts`.

## Tailwind

- Neutral palette with CSS variables in `globals.css` for light/dark.
- Dark mode: add `class="dark"` to `<html>` to enable (no toggle included by default).
- Custom spacing/typography in `tailwind.config.js`; utility classes like `btn-primary`, `input-base`, `card` in `globals.css`.

## Code Quality

- Modular folders, reusable components, typed API responses.
- Loading skeletons, empty states, confirmation dialogs for destructive actions.
- Keyboard-accessible (focus-visible, semantic HTML).

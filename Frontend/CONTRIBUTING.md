# Contributing to NeXus Frontend

First off — thanks for wanting to contribute. Whether you're fixing a typo or adding multi-chain support, we appreciate you. Here's everything you need to know to not drive the maintainers insane.

---

## Before You Start

1. **Check existing issues** — someone may have already reported the bug or requested the feature. Duplicates are annoying for everyone.
2. **Open an issue first** for anything non-trivial — a quick discussion before a big PR saves everyone time. Nothing worse than building the wrong thing for three days.
3. **Read the README** — seriously, it's not that long.

---

## Setting Up

```bash
# Fork the repo on GitHub, then clone your fork
git clone https://github.com/your-username/nexus-frontend.git
cd nexus-frontend/Frontend

# Install dependencies (pnpm only — do not use npm or yarn)
pnpm install

# Create your .env.local from the template
cp .env.staging.template .env.local
# Fill in NEXT_PUBLIC_PHANTOM_APP_ID

# Start dev server
pnpm dev
```

---

## Branching

Branch off `main` for features and fixes. Name your branches like a human:

```
feature/collection-search-filters
fix/wallet-connect-crash-on-mobile
chore/update-wagmi-dependency
docs/update-contributing-guide
```

Not like this:
```
my-changes
fix2
test123
johns-branch
```

---

## Code Standards

**TypeScript**
- Everything typed. No `any`. No exceptions (except in the extremely rare case where you have a very good reason — and "it was faster" is not a reason).
- Types go in `types/index.ts` or co-located with the component if they're truly component-specific.

**Imports**
- Always use `@/` absolute imports. No `../../` relative paths.
- Import order: external libraries → internal components → utilities → types.

**Components**
- Organized by type: `layout/`, `ui/`, `wallet/`, `providers/`, `seo/`.
- One component per file. Keep them focused.
- Reusable UI pieces go in `components/ui/`. Page-specific stuff stays in the page.

**Styling**
- Tailwind CSS first. CSS Modules if you need component-scoped styles that Tailwind can't handle cleanly.
- Dark mode is default and non-negotiable.

**No `console.log` in commits** — use it locally, remove it before pushing. The pre-commit hook will remind you if you forget.

---

## Before Opening a PR

Run these and make sure they pass:

```bash
pnpm lint               # ESLint
pnpm spaghetti:check    # Spaghetti code detection
pnpm build              # Make sure it actually builds
```

The pre-commit hook runs `spaghetti:check` automatically on staged files. If it flags your code, fix it — don't disable the hook.

---

## Pull Request Guidelines

- Fill out the PR template (it's there for a reason)
- Keep PRs focused — one thing per PR
- Add screenshots if you touched the UI
- If it's a breaking change, say so clearly in the title and description
- Don't merge your own PRs without review (unless it's a critical hotfix and you've documented why)

---

## Commit Messages

Clear, imperative, lowercase:

```
add wallet disconnect on session timeout
fix collection filter resetting on page reload
update phantom sdk to 1.0.7
remove unused spaghetti detector duplicate
```

Not:
```
fixed stuff
WIP
asdfgh
Updated the thing
```

---

## Questions?

Open a discussion or an issue. We don't bite. Much.

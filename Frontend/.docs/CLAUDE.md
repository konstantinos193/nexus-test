# Code Style & Comment Rules

Every file in this codebase follows the same tone, structure, and comment style.
No exceptions. Not even for that one utility file you think nobody will read.
(They will. Someone always reads it.)

---

## Comment Tone

**Conversational. Dry. Self-aware.**

Comments explain the *why*, not just the *what*. If the code is obvious, the comment
adds context, humor, or consequence. If the code is weird, the comment explains why
it's weird and why it has to be that way.

Parenthetical asides are allowed. Encouraged, even.
(They add personality. And we have plenty of that.)

---

## File Header Block

Every file starts with a JSDoc block comment that covers:
- What the file is / does
- Why it exists
- What breaks if it's gone
- A touch of existential dread (optional but appreciated)

**Format:**
```ts
/**
 * [File Name] - [One-liner on what it is]
 * [Why it exists / what it does in plain English]
 * [Consequence of it not existing, or a dry observation]
 *
 * [Optional second paragraph for extra context or humor]
 * (Parenthetical asides go here if needed)
 *
 * @author [Name] - [One-liner on their role in this file]
 * ([Coffee joke or similar optional closer])
 */
```

**Example from `app/page.tsx`:**
```ts
/**
 * Home Page - The landing page that welcomes users
 * This is the first impression, so it better be good
 * Because first impressions are everything (unlike second chances)
 *
 * This is where it all begins - the page that greets visitors
 * If they don't like what they see here, they're probably not coming back
 * (And honestly, can you blame them?)
 *
 * @author Juan - The developer who built this digital welcome mat
 * (Coded with care, humor, and probably too much coffee)
 */
```

---

## Import Comments

Every import block gets a comment above it. One or two lines max.
Line 1: what it is. Line 2: what breaks or what's funny about it existing.

```ts
// SEO config - titles, descriptions, canonical URLs. The whole shebang.
// Google's gotta know we exist. Otherwise we're just a URL in the void.
import { siteDescription, siteTitleDefault, absoluteUrl } from '@/lib/seo/config'

// Layout - header, footer, the scaffolding that holds our beautiful content
// Without it we're just a div floating in space (literally and metaphorically)
import Layout from '@/components/layout/Layout'
```

Rules:
- No import goes unexplained
- Comments are short — one metaphor max per import group
- Don't restate the import path. Add something the path doesn't tell you.

---

## Inline Comments

Use inline comments for:
- Non-obvious logic
- Intentional trade-offs ("yes we know, it has to be this way")
- JSX section labels inside render blocks

Keep them short. If the comment is longer than the code it describes, trim the comment.

```tsx
{/* Home Page Content - the actual meat of the page
    This is where the hero, collections, and features live
    Because the Layout is just the skeleton, this is the organs
    (And yes, I'm comparing our homepage to a body. Deal with it.) */}
<HomePageContent />
```

---

## Section Comments

When a block of code has a clear purpose (metadata, handlers, render, etc.), label it:

```ts
// SEO Metadata - because Google needs to know what we're about
// This is what shows up in search results and social media shares
// Because if nobody can find us, we're just screaming into the void
export const metadata: Metadata = { ... }
```

---

## File Footer

Optional but welcomed. A closing comment at the bottom — sign off, a note, anything.
Keep it short. One to three lines.

```ts
// Coded by Juan - because every good codebase needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Welcome to the homepage. Hope you like what you see!
```

---

## What NOT to Do

- No wall-of-text comments that explain obvious code
- No `// TODO: fix this later` without a reason
- No comments that just restate the variable name (`// sets the count` above `setCount(...)`)
- No humorless utility comments — even a config file deserves a personality
- No uncommented imports — every group gets a line

---

## Summary

Write comments like you're leaving notes for a smart teammate who has
never seen this file before and is mildly sleep-deprived.
Be clear. Be brief. Be a little funny.
(But not too funny. We still ship software here.)

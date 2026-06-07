# Security Policy

## Supported Versions

This is an actively developed project. Security fixes are applied to the latest version only.

| Version | Supported |
|---|---|
| Latest (`main`) | ✅ |
| Older branches | ❌ |

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.** That's how you give bad actors a head start.

Instead, report security issues privately to: **security@inventagious.com**

Include as much detail as you can:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

We'll acknowledge your report within 48 hours and aim to have a fix in place within 7 days for critical issues. We'll keep you updated throughout.

---

## What We Care About

Given this is a Web3 application handling wallet connections and NFT transactions, we take the following seriously:

**High Priority**
- Wallet connection vulnerabilities (anything that could compromise user funds)
- Private key or seed phrase exposure (even in logs, error messages, URLs)
- XSS that could intercept wallet interactions
- Smart contract interaction bypasses
- Authentication/authorization flaws in the API layer

**Medium Priority**
- Sensitive data leaking in client-side bundles
- Dependency vulnerabilities with exploitable attack vectors
- CSRF vulnerabilities

**Lower Priority (but still report it)**
- Information disclosure without direct exploitability
- UI redressing / clickjacking

---

## What We Already Have In Place

- **Gitleaks** — scans for secrets in commits before they land
- **Trivy** — container vulnerability scanning on every CI run
- **pnpm audit** — dependency vulnerability checks on every CI run
- **CSP headers** — configured in Next.js to limit script execution
- **No private keys in the frontend** — obviously

---

## Disclosure Policy

We follow responsible disclosure. Once a fix is deployed, we're happy to credit you in the release notes (with your permission). We don't offer a bug bounty program at this time, but we genuinely appreciate the effort — and will say so publicly if you'd like.

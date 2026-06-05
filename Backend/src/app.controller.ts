// ─────────────────────────────────────────────────────────────────────────────
// app.controller.ts — The Lobby. The Greeter. The "Hello, can I help you?"
// of the entire NeXus API.
//
// This controller serves exactly one route: GET /
// It returns a hand-crafted HTML page so beautiful it makes
// Swagger jealous. More art than code. More CSS than logic.
// ─────────────────────────────────────────────────────────────────────────────

// The NestJS building blocks for this humble one-route controller.
// Controller, Get — the classics. Header — for MIME type hygiene.
// Res — because we're serving raw HTML like civilized people, not JSON savages.
import { Controller, Get, Header, Res } from '@nestjs/common';

// The Express Response type — required when you bypass NestJS's response
// system and just... send things directly. Unfiltered. Raw.
// Like skipping the middleman and calling the kitchen yourself.
import { Response } from 'express';

// ── The Landing Page ─────────────────────────────────────────────────────────
// 193 lines of HTML and CSS that exist so when someone accidentally
// hits the root URL of the API, they see something intentional
// instead of a 404 or, worse, a stack trace.
//
// Dark mode. Purple gradients. Animated status dot.
// Someone put effort into this. That someone deserves a coffee.
const PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NeXus — API</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #050508;
      --surface: #0d0d14;
      --border: rgba(255,255,255,0.07);
      --accent: #7c5cfc;
      --accent2: #c084fc;
      --text: #e2e8f0;
      --muted: #64748b;
    }

    html, body {
      height: 100%;
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
    }

    /* subtle grid background */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(124,92,252,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(124,92,252,0.03) 1px, transparent 1px);
      background-size: 48px 48px;
      pointer-events: none;
      z-index: 0;
    }

    /* glow */
    body::after {
      content: '';
      position: fixed;
      top: -20%;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 400px;
      background: radial-gradient(ellipse, rgba(124,92,252,0.12) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    .card {
      position: relative;
      z-index: 1;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 3rem 3.5rem;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 0 0 1px rgba(124,92,252,0.1), 0 32px 64px rgba(0,0,0,0.4);
    }

    .logo {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 2rem;
    }

    .logo-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -1px;
    }

    .logo-text {
      font-size: 1.4rem;
      font-weight: 700;
      background: linear-gradient(90deg, var(--accent), var(--accent2));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.5px;
    }

    h1 {
      font-size: 1.1rem;
      font-weight: 500;
      color: var(--text);
      margin-bottom: 0.5rem;
      letter-spacing: -0.2px;
    }

    p {
      font-size: 0.9rem;
      color: var(--muted);
      line-height: 1.6;
      margin-bottom: 2rem;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(34,197,94,0.08);
      border: 1px solid rgba(34,197,94,0.2);
      color: #4ade80;
      font-size: 0.8rem;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 100px;
      margin-bottom: 2.5rem;
    }

    .dot {
      width: 6px;
      height: 6px;
      background: #4ade80;
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }

    .divider {
      height: 1px;
      background: var(--border);
      margin: 0 0 2rem;
    }

    .footer {
      position: relative;
      z-index: 1;
      margin-top: 2rem;
      font-size: 0.75rem;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">N</div>
      <span class="logo-text">NeXus</span>
    </div>

    <div class="status">
      <span class="dot"></span>
      All systems operational
    </div>

    <h1>API Gateway</h1>
    <p>This endpoint is reserved for authorized services.<br />Unauthorized access is not permitted.</p>

    <div class="divider"></div>

    <p style="margin:0; font-size:0.8rem;">
      Need access? Contact us at
      <a href="mailto:support@nexus-web3.com" style="color:var(--accent); text-decoration:none;">support@nexus-web3.com</a>
    </p>
  </div>

  <div class="footer">&copy; 2026 NeXus. All rights reserved.</div>
</body>
</html>`;

/**
 * AppController — The front door of the NeXus API.
 *
 * One route. One job. Do not underestimate it.
 * This is the first thing anyone sees when they hit the root URL —
 * make it count. (We did. See above: 200 lines of carefully crafted HTML.)
 *
 * Mounted at: /
 * Accepts: curiosity, confusion, accidental browser navigation
 * Returns: a beautiful dark-mode page that says "you're not supposed to be here,
 *          but welcome anyway, here's an email address."
 */
@Controller()
export class AppController {
  /**
   * GET / — The root route. The homepage. The "you've reached the API" endpoint.
   *
   * Sets proper Content-Type so browsers don't render it as plain text
   * and sets X-Content-Type-Options to prevent MIME sniffing.
   * (Because security hygiene matters, even on the page nobody is supposed to see.)
   *
   * @param res - The Express response object. We bypass NestJS here because
   *              we're sending raw HTML, not JSON. A rare but acceptable
   *              breach of framework etiquette.
   */
  @Get()
  // Tell the browser: this is HTML, treat it as HTML.
  // Not a suggestion. A declaration. A demand.
  @Header('Content-Type', 'text/html; charset=utf-8')
  // Prevent MIME-type sniffing attacks. Because even a landing page
  // deserves to be treated with dignity and security headers.
  @Header('X-Content-Type-Options', 'nosniff')
  root(@Res() res: Response) {
    // Send the page. The whole beautiful, purple-glowing, dark-mode page.
    // This is why we write CSS. For moments like this.
    res.send(PAGE_HTML);
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Coded by Juan — A controller with one method serving one HTML page.
 * The ratio of CSS to TypeScript logic here is approximately 20:1.
 * Never let anyone tell you frontend work is easy.
 * ─────────────────────────────────────────────────────────────────────────────
 */

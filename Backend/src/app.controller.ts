// ─────────────────────────────────────────────────────────────────────────────
// app.controller.ts — The Lobby. The Greeter. The "Hello, can I help you?"
// of the entire NeXus API.
//
// Serves GET / — a clean developer API landing page: status, endpoints,
// auth methods, and a direct link to the Swagger docs.
// ─────────────────────────────────────────────────────────────────────────────

import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';

const FRONTEND_URL = process.env.FRONTEND_URL ?? '';

const PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NeXus — NFT Launchpad</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #000;
      --surface: rgba(17,17,24,.6);
      --border: rgba(255,255,255,.1);
      --accent: #7c5cfc;
      --accent2: #c084fc;
      --cyan: #00d4ff;
      --text: #fff;
      --muted: rgba(255,255,255,.5);
      --green: #10b981;
    }
    html, body {
      min-height: 100%;
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    a { text-decoration: none; color: inherit; }

    /* ── HEADER ────────────────────────────────────────────────────── */
    .hdr {
      position: sticky; top: 0; z-index: 50; width: 100%;
      background: rgba(10,10,15,.85);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border-bottom: 1px solid rgba(255,255,255,.06);
    }
    .hdr-bar {
      height: 2px;
      background: linear-gradient(90deg,transparent 0%,#00d4ff 25%,#7c3aed 50%,#00d4ff 75%,transparent 100%);
      opacity: .8;
    }
    .hdr-nav {
      max-width: 1400px; margin: 0 auto; padding: 0 1.5rem;
      display: flex; align-items: center; justify-content: space-between;
      height: 4.5rem; gap: 2rem;
    }
    .logo {
      display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    }
    .logo-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: linear-gradient(135deg,var(--accent),var(--accent2));
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -1px;
    }
    .logo-text {
      font-size: 1.4rem; font-weight: 700; letter-spacing: -.5px;
      background: linear-gradient(90deg,var(--accent),var(--accent2));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .nav-links {
      display: flex; align-items: center; gap: .5rem; flex: 1; justify-content: center;
    }
    @media (max-width: 640px) { .nav-links { display: none; } }
    .nav-link {
      padding: .5rem 1.25rem; border-radius: 2rem;
      font-size: .875rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: .08em; border: 1px solid transparent;
      color: rgba(255,255,255,.5); transition: all .25s ease;
    }
    .nav-link:hover {
      color: #fff; background: rgba(255,255,255,.05);
      border-color: rgba(255,255,255,.1);
    }
    .launch-btn {
      padding: .5rem 1.25rem; border-radius: 2rem;
      font-size: .875rem; font-weight: 600; white-space: nowrap;
      background: linear-gradient(135deg,var(--accent),var(--accent2));
      color: #fff; border: none; cursor: pointer;
      transition: opacity .2s; flex-shrink: 0;
    }
    .launch-btn:hover { opacity: .85; }

    /* ── HERO ──────────────────────────────────────────────────────── */
    .hero-bd { position: relative; width: 100%; background: #000; overflow: hidden; }
    .hero-sec {
      position: relative; width: 100%; max-width: 1280px;
      margin: 0 auto; padding: .75rem 1rem .5rem;
      display: grid; gap: .5rem;
    }
    @media (min-width: 640px)  { .hero-sec { padding: 1rem 1.5rem .75rem; gap: .75rem; } }
    @media (min-width: 1024px) { .hero-sec { padding: 1.25rem 2rem 1rem; } }
    @media (min-width: 1280px) { .hero-sec { padding-top: 1.5rem; } }

    .cw { position: relative; border-radius: .5rem; overflow: hidden; }
    .cw-border {
      position: absolute; inset: 0; z-index: 10; pointer-events: none;
      border-radius: .5rem; border: 1px solid rgba(255,255,255,.1);
    }
    .cc {
      position: relative; width: 100%; overflow: hidden;
      border-radius: .5rem; isolation: isolate; touch-action: pan-x;
    }
    .ct {
      display: flex; will-change: transform;
      transition: transform .5s cubic-bezier(.4,0,.2,1);
    }
    .ct.no-tr { transition: none !important; }
    .cs {
      min-width: 0; flex: 0 0 100%;
      aspect-ratio: 5/2;
    }
    @media (min-width: 640px)  { .cs { aspect-ratio: 21/7; } }
    @media (min-width: 768px)  { .cs { aspect-ratio: 16/5; } }
    @media (min-width: 1024px) { .cs { aspect-ratio: 16/6; } }
    @media (min-width: 1280px) { .cs { aspect-ratio: 16/5.5; } }
    .cs-in { width: 100%; height: 100%; position: relative; overflow: hidden; }
    .cs-bg { width: 100%; height: 100%; }
    .cs-img {
      width: 100%; height: 100%; object-fit: cover; opacity: .95;
      transition: all .3s cubic-bezier(.4,0,.2,1);
    }
    @media (min-width: 768px) {
      .cw:hover .cs-img { transform: scale(1.05); opacity: .5; }
    }
    .cs-ov {
      position: absolute; inset: 0; z-index: 5;
      display: flex; align-items: flex-end;
      background: linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.3) 40%,rgba(0,0,0,.9) 100%);
      padding: 1rem;
    }
    @media (min-width: 640px)  { .cs-ov { padding: 1.5rem 1.25rem; } }
    @media (min-width: 768px)  { .cs-ov { padding: 2rem 1.5rem; } }
    .cs-bot {
      width: 100%; display: flex; align-items: flex-end;
      justify-content: space-between; gap: 1.5rem;
    }
    .cs-name {
      font-size: 1.125rem; font-weight: 700; line-height: 1.2;
      color: #fff; margin: 0 0 .25rem;
    }
    @media (min-width: 640px)  { .cs-name { font-size: 1.5rem; } }
    @media (min-width: 768px)  { .cs-name { font-size: 2rem; } }
    @media (min-width: 1024px) { .cs-name { font-size: 2.5rem; } }
    .cs-creator {
      display: flex; align-items: center; gap: .375rem; font-size: .75rem;
    }
    @media (min-width: 640px)  { .cs-creator { font-size: .8125rem; } }
    @media (min-width: 768px)  { .cs-creator { font-size: .875rem; } }
    .av {
      width: 1rem; height: 1rem; border-radius: 50%; overflow: hidden;
      flex-shrink: 0; background: rgba(124,92,252,.4);
    }
    .av img { width: 100%; height: 100%; object-fit: cover; }
    .cr-name { font-weight: 700; color: rgba(255,255,255,.7); }

    /* live badge */
    .lb {
      display: none; align-items: center; gap: .5rem;
      padding: .375rem .75rem; border-radius: .5rem;
      border: 1px solid rgba(16,185,129,.3);
      font-size: .625rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .1em; background: rgba(16,185,129,.15);
      backdrop-filter: blur(10px); color: var(--green);
      box-shadow: 0 0 12px rgba(16,185,129,.2); flex-shrink: 0;
    }
    @media (min-width: 640px) { .lb { display: inline-flex; font-size: .75rem; } }
    .ld { position: relative; width: .5rem; height: .5rem; }
    .ld-d {
      position: absolute; left: 50%; top: 50%;
      width: .375rem; height: .375rem;
      transform: translate(-50%,-50%); border-radius: 50%;
      background: currentColor; z-index: 2;
    }
    .ld-p {
      position: absolute; width: .5rem; height: .5rem; border-radius: 50%;
      background: currentColor; animation: ping 2s cubic-bezier(0,0,.2,1) infinite;
    }
    @keyframes ping { 75%,100% { transform: scale(2); opacity: 0; } }

    /* carousel nav */
    .cn {
      position: absolute; top: 50%; display: none;
      align-items: center; justify-content: center;
      width: 3rem; height: 3rem; border-radius: .75rem;
      border: 1px solid rgba(255,255,255,.15);
      background: rgba(0,0,0,.5); backdrop-filter: blur(16px);
      color: #fff; cursor: pointer; z-index: 20;
      opacity: 0; visibility: hidden;
      transition: all .3s ease; outline: none;
    }
    .cn-l { left: 1.5rem; transform: translate(-2rem,-50%); }
    .cn-r { right: 1.5rem; left: auto; transform: translate(2rem,-50%); }
    @media (min-width: 768px) { .cn { display: flex; } }
    .cw:hover .cn { opacity: 1; visibility: visible; }
    .cw:hover .cn-l { transform: translate(0,-50%); }
    .cw:hover .cn-r { transform: translate(0,-50%); }
    .cn:hover {
      background: rgba(0,0,0,.7); border-color: rgba(255,255,255,.3);
      transform: translate(0,-50%) scale(1.05) !important;
    }

    /* empty hero */
    .empty-hero {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 1rem; aspect-ratio: 5/2;
      padding: 2rem 1rem; text-align: center;
      background: linear-gradient(135deg,rgba(109,40,217,.15) 0%,transparent 60%);
    }
    @media (min-width: 640px)  { .empty-hero { aspect-ratio: 21/7; } }
    @media (min-width: 768px)  { .empty-hero { aspect-ratio: 16/5; } }
    @media (min-width: 1024px) { .empty-hero { aspect-ratio: 16/6; } }
    .eh-title { font-size: 1.5rem; font-weight: 700; }
    @media (min-width: 768px) { .eh-title { font-size: 2rem; } }
    .eh-sub { font-size: .9rem; color: rgba(255,255,255,.6); }
    .eh-cta {
      display: inline-flex; align-items: center;
      padding: .6rem 1.5rem; border-radius: 9999px;
      background: rgba(109,40,217,.9); color: #fff;
      font-size: .875rem; font-weight: 600; margin-top: .25rem;
      transition: background .2s;
    }
    .eh-cta:hover { background: rgba(124,58,237,1); }

    /* ── FEATURED DROPS ────────────────────────────────────────────── */
    .fd-sec {
      width: 100%; max-width: 1280px; margin: 0 auto;
      padding: .125rem 1rem .5rem;
    }
    @media (min-width: 640px)  { .fd-sec { padding: .25rem 1.5rem .75rem; } }
    @media (min-width: 1024px) { .fd-sec { padding: .5rem 2rem 1rem; } }
    .fd-grid {
      display: grid; grid-template-columns: repeat(2,1fr); gap: .5rem;
    }
    @media (min-width: 640px)  { .fd-grid { gap: .75rem; } }
    @media (min-width: 768px)  { .fd-grid { gap: .875rem; } }
    @media (min-width: 1024px) { .fd-grid { gap: 1rem; } }
    .dc {
      display: block; color: inherit; transition: transform .3s ease;
    }
    .dc:hover { transform: translateY(-4px); }
    .dc-in {
      display: flex; flex-direction: column;
      background: rgba(17,17,24,.6); border: 1px solid rgba(255,255,255,.1);
      border-radius: .75rem; overflow: hidden; height: 100%;
      backdrop-filter: blur(10px); transition: all .3s ease;
    }
    .dc:hover .dc-in {
      border-color: rgba(255,255,255,.2);
      background: rgba(17,17,24,.8);
      box-shadow: 0 8px 24px rgba(0,0,0,.4);
    }
    @media (min-width: 768px) { .dc-in { flex-direction: row; min-height: 85px; } }
    .dc-img {
      position: relative; width: 100%; aspect-ratio: 16/9;
      overflow: hidden; background: rgba(0,0,0,.3); flex-shrink: 0;
    }
    @media (min-width: 640px) { .dc-img { aspect-ratio: 4/3; } }
    @media (min-width: 768px) { .dc-img { width: 45%; aspect-ratio: auto; align-self: stretch; } }
    .dc-bg {
      width: 100%; height: 100%;
      transition: transform .3s ease;
    }
    .dc:hover .dc-bg { transform: scale(1.05); }
    .dc-body {
      display: flex; flex-direction: column; padding: .5rem; flex: 1;
      justify-content: space-between; gap: .25rem;
    }
    @media (min-width: 640px)  { .dc-body { padding: .625rem; gap: .375rem; } }
    @media (min-width: 768px)  { .dc-body { width: 55%; padding: .75rem; gap: .5rem; } }
    @media (min-width: 1024px) { .dc-body { padding: .875rem; } }
    .dc-hdr {
      display: flex; align-items: flex-start;
      justify-content: space-between; gap: .75rem; margin-bottom: .375rem;
    }
    .dc-name {
      font-size: .75rem; font-weight: 700; color: #fff; margin: 0; flex: 1;
    }
    @media (min-width: 640px)  { .dc-name { font-size: .875rem; } }
    @media (min-width: 768px)  { .dc-name { font-size: 1rem; } }
    @media (min-width: 1024px) { .dc-name { font-size: 1.125rem; } }
    .dc-lb {
      display: inline-flex; align-items: center; gap: .375rem;
      padding: .25rem .5rem; border-radius: .5rem;
      border: 1px solid rgba(16,185,129,.3); font-size: .625rem;
      font-weight: 700; text-transform: uppercase; letter-spacing: .1em;
      background: rgba(16,185,129,.15); color: var(--green);
      flex-shrink: 0; box-shadow: 0 0 12px rgba(16,185,129,.2);
    }
    @media (min-width: 640px) { .dc-lb { padding: .375rem .75rem; font-size: .75rem; } }
    .dc-cr {
      display: flex; align-items: center; gap: .5rem; margin-bottom: .375rem;
    }
    .dc-crav {
      width: 1rem; height: 1rem; border-radius: 50%; overflow: hidden;
      flex-shrink: 0; background: rgba(124,92,252,.4);
    }
    .dc-crav img { width: 100%; height: 100%; object-fit: cover; }
    .dc-crn {
      font-size: .6875rem; font-weight: 600; color: rgba(255,255,255,.7);
    }
    @media (min-width: 640px) { .dc-crn { font-size: .75rem; } }
    @media (min-width: 768px) { .dc-crn { font-size: .875rem; } }
    .dc-stats {
      display: flex; align-items: center; gap: .5rem; margin-top: auto; flex-wrap: wrap;
    }
    @media (min-width: 640px) { .dc-stats { gap: .75rem; } }
    .dc-stat { display: flex; flex-direction: column; gap: .125rem; }
    .dc-slbl {
      font-size: .625rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: .08em; color: rgba(255,255,255,.5);
    }
    .dc-sval {
      font-size: .75rem; font-weight: 700; color: #fff; white-space: nowrap;
    }
    @media (min-width: 640px) { .dc-sval { font-size: .875rem; } }
    .dc-div {
      width: 1px; height: 2rem; flex-shrink: 0;
      background: linear-gradient(to bottom,transparent,rgba(255,255,255,.2),transparent);
    }

    /* ── HOT COLLECTIONS ───────────────────────────────────────────── */
    .hc-sec {
      width: 100%; overflow-x: hidden;
      padding: 1rem 1rem 1.5rem; position: relative; isolation: isolate; z-index: 1;
    }
    @media (min-width: 640px)  { .hc-sec { padding: .5rem 8vw 2.5rem; } }
    @media (min-width: 1024px) { .hc-sec { padding: .75rem 8vw 3rem; } }
    .sec-hdr {
      display: flex; flex-wrap: wrap; gap: .75rem;
      justify-content: space-between; align-items: center;
      margin-bottom: 1rem;
    }
    .sec-title {
      margin: 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -.01em;
    }
    @media (min-width: 640px)  { .sec-title { font-size: 1.75rem; } }
    @media (min-width: 1024px) { .sec-title { font-size: 2rem; } }
    .expl-link {
      display: inline-flex; align-items: center; gap: .375rem;
      padding: .5rem .75rem;
      background: linear-gradient(135deg,rgba(255,255,255,.1) 0%,rgba(255,255,255,.05) 100%);
      border: 1px solid rgba(255,255,255,.2); border-radius: .5rem;
      color: #fff; font-size: .8125rem; font-weight: 600;
      transition: all .3s cubic-bezier(.4,0,.2,1); white-space: nowrap;
      backdrop-filter: blur(8px); overflow: hidden; position: relative;
    }
    .expl-link:hover {
      background: linear-gradient(135deg,rgba(255,255,255,.18) 0%,rgba(255,255,255,.08) 100%);
      border-color: rgba(255,255,255,.35); transform: translateX(2px);
    }
    .hc-scroll {
      overflow-x: auto; -webkit-overflow-scrolling: touch;
      scrollbar-width: none; padding: .25rem 0;
    }
    .hc-scroll::-webkit-scrollbar { display: none; }
    @media (min-width: 640px) { .hc-scroll { overflow-x: clip; padding: .5rem 0; } }
    .hc-grid {
      display: flex; flex-direction: row; gap: 1rem;
      width: max-content; flex-wrap: nowrap; align-items: center;
    }
    @media (min-width: 640px) { .hc-grid { gap: .875rem; width: 100%; } }
    @media (min-width: 1024px) { .hc-grid { gap: 1rem; } }
    .hci {
      display: flex; flex-direction: row; gap: .75rem; align-items: center;
      padding: 1rem; border-radius: 0; text-decoration: none; color: inherit;
      transition: opacity .3s; flex-shrink: 0; min-width: 280px; height: 120px;
    }
    @media (min-width: 640px) {
      .hci { padding: .625rem; gap: .625rem; flex: 1 1 0; min-width: 0; height: auto; }
    }
    @media (min-width: 1024px) { .hci { padding: .75rem; } }
    .hci:hover { opacity: .8; }
    .hci-rank {
      font-size: 1.5rem; font-weight: 700; color: #fff;
      flex-shrink: 0; min-width: 2rem;
    }
    @media (min-width: 640px) { .hci-rank { font-size: 1rem; min-width: 1.5rem; } }
    .hci-img {
      position: relative; flex-shrink: 0;
      width: 5rem; height: 5rem; border-radius: .5rem; overflow: hidden;
    }
    @media (min-width: 640px) {
      .hci-img { width: 4rem; height: 4rem; border-radius: .625rem; }
    }
    .hci-bg { width: 100%; height: 100%; }
    .hci-info { display: flex; flex-direction: column; gap: .5rem; flex: 1; min-width: 0; }
    .hci-name {
      font-size: 1rem; font-weight: 600; color: #fff;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    @media (min-width: 640px) { .hci-name { font-size: .8125rem; } }
    .hci-minted {
      font-size: .5625rem; color: rgba(255,255,255,.75); white-space: nowrap;
    }
    @media (min-width: 640px) { .hci-minted { font-size: .75rem; } }

    /* ── DISCOVER ──────────────────────────────────────────────────── */
    .ds-sec {
      width: 100%; padding: 1rem 1rem 1.5rem; position: relative;
    }
    @media (min-width: 640px)  { .ds-sec { padding: 1.25rem 1.5rem 2rem; } }
    @media (min-width: 1024px) { .ds-sec { padding: 1.5rem 2rem 2.5rem; } }
    @media (min-width: 1280px) { .ds-sec { padding: 2rem 2.5rem 3rem; } }
    .ds-inner {
      display: flex; flex-direction: column; gap: 1rem;
      max-width: 96rem; margin: 0 auto;
    }
    .ds-hdr {
      display: flex; flex-direction: column; gap: .75rem;
    }
    @media (min-width: 640px) {
      .ds-hdr { flex-direction: row; flex-wrap: wrap; justify-content: space-between; align-items: center; }
    }
    .ds-title {
      margin: 0; font-size: 1.25rem; font-weight: 800; letter-spacing: -.01em;
    }
    @media (min-width: 640px)  { .ds-title { font-size: 1.5rem; } }
    @media (min-width: 1024px) { .ds-title { font-size: 1.75rem; } }
    .tabs {
      display: flex; flex-wrap: nowrap; gap: .375rem; align-items: center;
      overflow-x: auto; scrollbar-width: none; padding-bottom: 2px;
    }
    .tabs::-webkit-scrollbar { display: none; }
    @media (min-width: 640px) { .tabs { flex-wrap: wrap; overflow: visible; } }
    .tab {
      flex-shrink: 0; padding: .375rem .75rem;
      background: rgba(255,255,255,.08);
      border: 1px solid rgba(255,255,255,.12); border-radius: 100px;
      font-size: .8125rem; font-weight: 600; color: rgba(255,255,255,.85);
      cursor: pointer; transition: all .2s ease; white-space: nowrap;
    }
    .tab:hover {
      background: rgba(255,255,255,.12);
      border-color: rgba(255,255,255,.2); color: #fff;
    }
    .tab.on {
      background: rgba(0,212,255,.15);
      border-color: rgba(0,212,255,.4); color: var(--cyan);
    }

    /* collection card grid */
    .ds-grid {
      display: grid; grid-template-columns: 1fr; gap: 1.25rem; width: 100%;
    }
    @media (min-width: 640px)  { .ds-grid { grid-template-columns: repeat(2,1fr); gap: 1.5rem; } }
    @media (min-width: 1024px) { .ds-grid { grid-template-columns: repeat(3,1fr); gap: 1.75rem; } }
    @media (min-width: 1280px) { .ds-grid { grid-template-columns: repeat(4,1fr); gap: 2rem; } }
    .cc-link { display: block; height: 100%; }
    .cc-card {
      display: flex; flex-direction: column; height: 100%;
      border-radius: 12px; overflow: hidden;
      background: #0f0f14; border: 1px solid rgba(255,255,255,.07);
      transition: border-color .2s, transform .2s, box-shadow .2s;
    }
    .cc-card:hover {
      border-color: rgba(255,255,255,.16); transform: translateY(-3px);
      box-shadow: 0 16px 40px rgba(0,0,0,.5);
    }
    .cc-img-wrap {
      position: relative; width: 100%; aspect-ratio: 3/2;
      overflow: hidden; background: #1a1a24;
    }
    .cc-img {
      width: 100%; height: 100%; object-fit: cover;
      transition: transform .35s ease;
    }
    .cc-card:hover .cc-img { transform: scale(1.04); }
    .cc-bg { width: 100%; height: 100%; }
    .cc-badge {
      position: absolute; top: 10px; right: 10px;
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 8px; border-radius: 6px;
      font-size: 10px; font-weight: 600; letter-spacing: .06em;
      text-transform: uppercase; backdrop-filter: blur(8px);
    }
    .cc-badge.live {
      background: rgba(16,185,129,.15); border: 1px solid rgba(16,185,129,.35); color: #10b981;
    }
    .cc-badge.upcoming {
      background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.3); color: #f59e0b;
    }
    .cc-badge.ended {
      background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.15);
      color: rgba(255,255,255,.5);
    }
    .cc-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #10b981; flex-shrink: 0;
    }
    .cc-info {
      display: flex; flex-direction: column; gap: 10px;
      padding: 14px 14px 16px; flex: 1;
    }
    .cc-name {
      margin: 0; font-size: 15px; font-weight: 700; color: #fff;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .cc-creator {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 12px; color: rgba(255,255,255,.4); font-family: monospace;
    }
    .cc-divider { height: 1px; background: rgba(255,255,255,.06); }
    .cc-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .cc-stat { display: flex; flex-direction: column; gap: 3px; }
    .cc-slbl {
      font-size: 10px; font-weight: 600; text-transform: uppercase;
      letter-spacing: .07em; color: rgba(255,255,255,.35);
    }
    .cc-sval {
      font-size: 14px; font-weight: 700; color: #fff;
      display: flex; align-items: center; gap: 4px;
    }
    .cc-prog { display: flex; flex-direction: column; gap: 4px; }
    .cc-pb {
      width: 100%; height: 3px; border-radius: 99px;
      background: rgba(255,255,255,.08); overflow: hidden;
    }
    .cc-pf {
      height: 100%; border-radius: 99px;
      background: linear-gradient(90deg,#00d4ff,#7c3aed);
    }
    .cc-pct { font-size: 10px; color: rgba(255,255,255,.4); }

    /* ── BROWSE ALL / FOOTER ───────────────────────────────────────── */
    .ds-foot { display: flex; justify-content: center; padding-top: 1.25rem; }
    .browse-all {
      display: inline-flex; align-items: center; gap: .5rem;
      padding: .75rem 1.5rem; font-size: .9375rem; font-weight: 600; color: #fff;
      background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.18);
      border-radius: 9999px; transition: color .2s, background .2s, border-color .2s, box-shadow .2s;
    }
    .browse-all:hover {
      color: var(--cyan); background: rgba(0,212,255,.1);
      border-color: rgba(0,212,255,.4); box-shadow: 0 0 20px rgba(0,212,255,.15);
    }
    .site-footer {
      border-top: 1px solid rgba(255,255,255,.06); padding: 2rem 1.5rem;
      text-align: center; font-size: .75rem; color: rgba(255,255,255,.3);
    }

    /* ── SKELETONS / UTILS ─────────────────────────────────────────── */
    .skel {
      background: rgba(17,17,24,.6); border-radius: .5rem;
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    .empty { padding: 2rem; text-align: center; color: var(--muted); grid-column: 1/-1; }
    .sr { position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0; }
    @media (prefers-reduced-motion:reduce) {
      .ct,.cs-img,.cn,.ld-p { transition:none; animation:none; }
    }
  </style>
</head>
<body>

<!-- ── HEADER ────────────────────────────────────────────────────────── -->
<header class="hdr">
  <div class="hdr-bar"></div>
  <nav class="hdr-nav">
    <a href="${FRONTEND_URL || '/'}" class="logo">
      <div class="logo-icon">N</div>
      <span class="logo-text">NeXus</span>
    </a>
    <div class="nav-links">
      <a href="${FRONTEND_URL || '/'}/collections" class="nav-link">Collections</a>
      <a href="${FRONTEND_URL || '/'}/create"      class="nav-link">Create</a>
      <a href="${FRONTEND_URL || '/'}/dashboard"   class="nav-link">Dashboard</a>
      <a href="${FRONTEND_URL || '/'}/tools"       class="nav-link">Tools</a>
    </div>
    <a href="${FRONTEND_URL || '/'}" class="launch-btn">Launch App</a>
  </nav>
</header>

<!-- ── MAIN ──────────────────────────────────────────────────────────── -->
<main>
  <!-- Hero -->
  <div class="hero-bd">
    <div class="hero-sec">
      <div id="hero" class="cw">
        <div class="skel" style="aspect-ratio:5/2"></div>
      </div>
    </div>
  </div>

  <!-- Featured Drops -->
  <div id="fd-wrap" class="fd-sec" style="display:none">
    <div id="fd-grid" class="fd-grid"></div>
  </div>

  <!-- Hot Collections -->
  <div id="hc-wrap" class="hc-sec" style="display:none">
    <div class="sec-hdr">
      <h3 class="sec-title">Hot Collections</h3>
      <a href="${FRONTEND_URL || '/'}/collections" class="expl-link">
        <span class="expl-desktop" style="display:none">Explore Collections</span>
        <span class="expl-mobile">Explore</span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
    </div>
    <div class="hc-scroll"><div id="hc-grid" class="hc-grid"></div></div>
  </div>

  <!-- Discover -->
  <div class="ds-sec">
    <div class="ds-inner">
      <div class="ds-hdr">
        <h3 class="ds-title">Discover</h3>
        <div class="tabs" role="tablist">
          <button class="tab on" data-tab="trending"    role="tab">Trending</button>
          <button class="tab"    data-tab="new"         role="tab">New</button>
          <button class="tab"    data-tab="ending_soon" role="tab">Ending Soon</button>
          <button class="tab"    data-tab="free_mint"   role="tab">Free Mint</button>
        </div>
      </div>
      <div id="ds-grid" class="ds-grid">
        <div class="skel" style="aspect-ratio:1;border-radius:12px"></div>
        <div class="skel" style="aspect-ratio:1;border-radius:12px"></div>
        <div class="skel" style="aspect-ratio:1;border-radius:12px"></div>
        <div class="skel" style="aspect-ratio:1;border-radius:12px"></div>
        <div class="skel" style="aspect-ratio:1;border-radius:12px"></div>
        <div class="skel" style="aspect-ratio:1;border-radius:12px"></div>
      </div>
      <div class="ds-foot">
        <a href="${FRONTEND_URL || '/'}/collections" class="browse-all">
          Browse all collections <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  </div>
</main>

<footer class="site-footer">&copy; 2026 NeXus. All rights reserved.</footer>

<script>
(function () {
  'use strict';

  // ── Banner palettes (mirrors Frontend/lib/utils/placeholderBanners.ts) ──
  var PALETTES = [
    ['2d1b2e','e07a5f'],['0d3b45','7dd3fc'],['3d2463','c77dff'],
    ['3d2c1e','fbbf24'],['1b4332','95d5b2'],['4a1942','f0abfc'],
  ];
  var FE = '${FRONTEND_URL}';

  function bgStyle(id) {
    var idx = (parseInt(id, 10) || 0) % PALETTES.length;
    var p = PALETTES[idx];
    return 'background:linear-gradient(135deg,#' + p[0] + ' 0%,#' + p[1] + '40 100%);width:100%;height:100%;';
  }

  function avatarSrc(seed) {
    return 'https://api.dicebear.com/9.x/identicon/svg?seed=' + encodeURIComponent(seed || 'nexus') + '&size=32';
  }

  function fmt(n) { return (n || 0).toLocaleString(); }

  function trunc(s) {
    if (!s || s.length <= 12) return s || '';
    return s.slice(0, 4) + '…' + s.slice(-4);
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function dropLink(col) {
    return (FE || '') + '/drops/' + esc(col.slug || col.id);
  }

  // ── API ──────────────────────────────────────────────────────────────
  function apiFetch(path) {
    return fetch(path).then(function (r) { return r.json(); }).then(function (j) {
      return j.success ? j.data : [];
    }).catch(function () { return []; });
  }

  // ── Live badge HTML ──────────────────────────────────────────────────
  function liveBadge(cls) {
    return '<div class="' + cls + '"><div class="ld"><div class="ld-d"></div><div class="ld-p"></div></div><span>Live</span></div>';
  }

  // ── CAROUSEL ─────────────────────────────────────────────────────────
  var C = { pos: 1, n: 0, total: 0, timer: null, hovered: false };

  function buildCarousel(cols) {
    var wrap = document.getElementById('hero');
    if (!cols.length) {
      wrap.innerHTML =
        '<div class="cw-border"></div>' +
        '<div class="empty-hero">' +
        '<h1 class="eh-title">Something big is coming.</h1>' +
        '<p class="eh-sub">Be the first to launch your collection on NeXus.</p>' +
        '<a href="' + (FE || '/') + '/create" class="eh-cta">Create Collection</a>' +
        '</div>';
      return;
    }
    var mint = cols.filter(function (c) { return c.status === 'minting'; }).slice(0, 5);
    var rest = cols.filter(function (c) { return c.status !== 'minting'; }).slice(0, 5 - mint.length);
    var disp = mint.concat(rest).slice(0, 5);
    C.n = disp.length;
    var useClones = C.n > 1;
    var ext = useClones ? [disp[C.n - 1]].concat(disp).concat([disp[0]]) : disp;
    C.total = ext.length;
    C.pos = useClones ? 1 : 0;

    var slides = ext.map(function (col, i) {
      return '<div class="cs" role="group" aria-roledescription="slide">' +
        '<a href="' + dropLink(col) + '" style="display:block;width:100%;height:100%;">' +
        '<div class="cs-in">' +
        '<div class="cs-bg" style="' + bgStyle(col.id) + '"></div>' +
        '<div class="cs-ov"><div class="cs-bot">' +
        '<div>' +
        '<h1 class="cs-name">' + esc(col.name) + '</h1>' +
        '<div class="cs-creator">' +
        '<div class="av"><img src="' + avatarSrc(col.creator) + '" alt="" loading="lazy"/></div>' +
        '<span class="cr-name">' + esc(trunc(col.creator)) + '</span>' +
        '</div></div>' +
        (col.status === 'minting' ? liveBadge('lb') : '') +
        '</div></div></div></a></div>';
    }).join('');

    var nav = C.n > 1
      ? '<button class="cn cn-l" onclick="cPrev(event)" aria-label="Previous">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>' +
        '<span class="sr">Prev</span></button>' +
        '<button class="cn cn-r" onclick="cNext(event)" aria-label="Next">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>' +
        '<span class="sr">Next</span></button>'
      : '';

    wrap.innerHTML =
      '<div class="cw-border"></div>' +
      '<div class="cc" onmouseenter="C.hovered=true" onmouseleave="C.hovered=false">' +
      '<div id="ct" class="ct" style="transform:translate3d(-' + (C.pos * 100) + '%,0,0)">' + slides + '</div>' +
      nav + '</div>';

    if (C.n > 1) startTimer();
  }

  function cMove(newPos, instant) {
    var t = document.getElementById('ct');
    if (!t) return;
    if (instant) {
      t.classList.add('no-tr');
      t.style.transform = 'translate3d(-' + (newPos * 100) + '%,0,0)';
      C.pos = newPos;
      requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.remove('no-tr'); }); });
    } else {
      t.style.transform = 'translate3d(-' + (newPos * 100) + '%,0,0)';
      C.pos = newPos;
      setTimeout(checkInfinite, 510);
    }
  }

  function checkInfinite() {
    if (C.pos === 0) cMove(C.n, true);
    else if (C.pos === C.total - 1) cMove(1, true);
  }

  window.cPrev = function (e) { if (e) e.preventDefault(); cMove(C.pos === 0 ? C.total - 1 : C.pos - 1, false); };
  window.cNext = function (e) { if (e) e.preventDefault(); cMove(C.pos === C.total - 1 ? 0 : C.pos + 1, false); };

  function startTimer() {
    clearInterval(C.timer);
    C.timer = setInterval(function () { if (!C.hovered) cNext(null); }, 5000);
  }

  // ── FEATURED DROPS ───────────────────────────────────────────────────
  function buildFeatured(cols) {
    var minting = cols.filter(function (c) { return c.status === 'minting'; }).slice(0, 2);
    if (!minting.length) return;
    document.getElementById('fd-wrap').style.display = '';
    document.getElementById('fd-grid').innerHTML = minting.map(function (col) {
      var pct = col.totalSupply > 0 ? ((col.minted / col.totalSupply) * 100).toFixed(1) : '0';
      var price = (col.price == null || col.price === 0) ? 'Free' : Number(col.price).toFixed(2);
      return '<a href="' + dropLink(col) + '" class="dc">' +
        '<div class="dc-in">' +
        '<div class="dc-img"><div class="dc-bg" style="' + bgStyle(col.id) + '"></div></div>' +
        '<div class="dc-body">' +
        '<div><div class="dc-hdr">' +
        '<h2 class="dc-name">' + esc(col.name) + '</h2>' +
        (col.status === 'minting' ? liveBadge('dc-lb') : '') +
        '</div>' +
        '<div class="dc-cr"><div class="dc-crav"><img src="' + avatarSrc(col.creator) + '" alt="" loading="lazy"/></div>' +
        '<span class="dc-crn">' + esc(trunc(col.creator)) + '</span></div></div>' +
        '<div class="dc-stats">' +
        '<div class="dc-stat"><span class="dc-slbl">Price</span><span class="dc-sval">' + esc(price) + '</span></div>' +
        '<div class="dc-div"></div>' +
        '<div class="dc-stat"><span class="dc-slbl">Minted</span><span class="dc-sval">' + pct + '%</span></div>' +
        '<div class="dc-div"></div>' +
        '<div class="dc-stat"><span class="dc-slbl">Supply</span><span class="dc-sval">' + esc(fmt(col.totalSupply)) + '</span></div>' +
        '</div></div></div></a>';
    }).join('');
  }

  // ── HOT COLLECTIONS ──────────────────────────────────────────────────
  function buildHot(cols) {
    var top = cols.slice(0, 5);
    if (!top.length) return;
    document.getElementById('hc-wrap').style.display = '';

    // Show "Explore Collections" text on wider screens
    var d = document.querySelector('.expl-desktop');
    if (d) { d.style.display = ''; d.style.removeProperty('display'); }
    var mo = document.querySelector('.expl-mobile');
    if (mo) { mo.style.display = 'none'; }
    // Restore via CSS instead — just remove the inline style we set
    if (d) d.removeAttribute('style');
    if (mo) mo.removeAttribute('style');

    document.getElementById('hc-grid').innerHTML = top.map(function (col, i) {
      return '<a href="' + dropLink(col) + '" class="hci">' +
        '<strong class="hci-rank">' + (i + 1) + '</strong>' +
        '<div class="hci-img"><div class="hci-bg" style="' + bgStyle(col.id) + '"></div></div>' +
        '<div class="hci-info">' +
        '<span class="hci-name">' + esc(col.name) + '</span>' +
        '<span class="hci-minted">' + esc(fmt(col.minted)) + '/' + esc(fmt(col.totalSupply)) + ' Minted</span>' +
        '</div></a>';
    }).join('');
  }

  // ── COLLECTION CARD ──────────────────────────────────────────────────
  function cardStatus(s) {
    if (s === 'minting')  return 'live';
    if (s === 'ready' || s === 'preparing') return 'upcoming';
    return 'ended';
  }

  function buildCard(col) {
    var st = cardStatus(col.status);
    var stLabel = st === 'live' ? 'Live' : (st === 'upcoming' ? 'Upcoming' : 'Ended');
    var prog = col.totalSupply > 0 ? (col.minted / col.totalSupply) * 100 : 0;
    var price = (col.price == null || col.price === 0) ? 'Free' : Number(col.price).toFixed(2);
    return '<a href="' + dropLink(col) + '" class="cc-link">' +
      '<article class="cc-card">' +
      '<div class="cc-img-wrap">' +
      '<div class="cc-bg" style="' + bgStyle(col.id) + '"></div>' +
      '<span class="cc-badge ' + st + '">' +
      (st === 'live' ? '<span class="cc-dot"></span>' : '') +
      esc(stLabel) + '</span></div>' +
      '<div class="cc-info">' +
      '<h3 class="cc-name">' + esc(col.name) + '</h3>' +
      '<span class="cc-creator">' + esc(trunc(col.creator)) + '</span>' +
      '<div class="cc-divider"></div>' +
      '<div class="cc-stats">' +
      '<div class="cc-stat"><span class="cc-slbl">Price</span><span class="cc-sval">' + esc(price) + '</span></div>' +
      '<div class="cc-stat"><span class="cc-slbl">Supply</span><span class="cc-sval">' + esc(fmt(col.minted)) + '&nbsp;/&nbsp;' + esc(fmt(col.totalSupply)) + '</span></div>' +
      '</div>' +
      (st === 'live'
        ? '<div class="cc-prog"><div class="cc-pb"><div class="cc-pf" style="width:' + prog.toFixed(1) + '%"></div></div>' +
          '<span class="cc-pct">' + prog.toFixed(1) + '% minted</span></div>'
        : '') +
      '</div></article></a>';
  }

  // ── DISCOVER ─────────────────────────────────────────────────────────
  var currentTab = 'trending';

  function renderDiscover(cols) {
    var grid = document.getElementById('ds-grid');
    var display = cols.slice(0, 6);
    if (!display.length) {
      grid.innerHTML = '<p class="empty">No collections in this category yet. Check back soon!</p>';
    } else {
      grid.innerHTML = display.map(buildCard).join('');
    }
  }

  async function loadDiscover(tab) {
    var grid = document.getElementById('ds-grid');
    grid.innerHTML =
      '<div class="skel" style="aspect-ratio:1;border-radius:12px"></div>'.repeat(6);
    var cols = await apiFetch('/api/collections/discover?tab=' + encodeURIComponent(tab));
    if (currentTab === tab) renderDiscover(cols);
  }

  document.querySelectorAll('.tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (b) { b.classList.remove('on'); });
      btn.classList.add('on');
      currentTab = btn.dataset.tab;
      loadDiscover(currentTab);
    });
  });

  // ── INIT ─────────────────────────────────────────────────────────────
  Promise.all([
    apiFetch('/api/collections/featured'),
    apiFetch('/api/collections/discover?tab=trending'),
  ]).then(function (results) {
    var featured = results[0];
    var trending = results[1];
    buildCarousel(featured);
    buildFeatured(featured);
    buildHot(featured);
    renderDiscover(trending);
  });

})();
</script>
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

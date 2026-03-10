// ─────────────────────────────────────────────────────────────────────────────
//  Tims Hockey Challenge — Pick Assistant v2
//  Structure mirrors the real game: Pick 1 player from each of 3 groups.
//
//  Data pipeline (attempts in order):
//   1. hockeychallengehelper.com  — community site that scrapes Tims daily pools
//   2. NHL public API             — live game schedule & scores
//   3. Static fallback            — pre-seeded data with manual group assignments
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect, useCallback } from "react";

// ── Constants ────────────────────────────────────────────────────────────────

const TEAM_COLORS = {
  SJS:"#007A8A", BUF:"#003087", CGY:"#CE1126", NYR:"#0038A8",
  LAK:"#888",    BOS:"#FCB514", TOR:"#003E7E", MTL:"#AF1E2D",
  PIT:"#FCB514", CAR:"#CE1126", DET:"#CE1126", FLA:"#C8102E",
  CBJ:"#002654", TBL:"#002868", NYI:"#003087", STL:"#002F87",
  VGK:"#B4975A", DAL:"#006847", UTH:"#6CACE4", MIN:"#154734",
  ANA:"#FC4C02", WPG:"#004C97", EDM:"#FF4C00", COL:"#6F263D",
  NSH:"#FFB81C", SEA:"#99D9D9", WSH:"#041E42", PHI:"#F74902",
  NJD:"#CE1126", OTT:"#E31837",
};

const GROUP_CONFIG = {
  1: { label: "GROUP 1",  subtitle: "Elite Scorers",     description: "Top-line superstars, highest goals-per-game. Hardest to win but best value.", color: "#FFD700", glow: "rgba(255,215,0,0.25)",   bg: "rgba(255,215,0,0.06)",   border: "rgba(255,215,0,0.3)"   },
  2: { label: "GROUP 2",  subtitle: "Mid-Tier Scorers",  description: "Middle-six forwards & offensive D. Solid scorers, better odds than Group 1.", color: "#C0C0C0", glow: "rgba(192,192,192,0.2)", bg: "rgba(192,192,192,0.05)", border: "rgba(192,192,192,0.25)" },
  3: { label: "GROUP 3",  subtitle: "Low-Probability",   description: "Bottom-six grinders & stay-home D. Long shots, but upsets happen daily.",     color: "#CD7F32", glow: "rgba(205,127,50,0.2)",  bg: "rgba(205,127,50,0.05)",  border: "rgba(205,127,50,0.25)"  },
};

// ── Fallback static pools (manual group assignments based on 2025-26 stats) ──
const FALLBACK_POOLS = {
  1: [
    { name:"Connor McDavid",    team:"EDM", pos:"F", gp:64, g:35, a:68, pts:103, shotsGP:3.67 },
    { name:"Leon Draisaitl",    team:"EDM", pos:"F", gp:61, g:34, a:52, pts:86,  shotsGP:2.89 },
    { name:"Auston Matthews",   team:"TOR", pos:"F", gp:58, g:26, a:30, pts:56,  shotsGP:3.84 },
    { name:"David Pastrnak",    team:"BOS", pos:"F", gp:60, g:31, a:38, pts:69,  shotsGP:3.50 },
    { name:"Nikita Kucherov",   team:"TBL", pos:"F", gp:63, g:22, a:58, pts:80,  shotsGP:2.60 },
    { name:"Sam Reinhart",      team:"FLA", pos:"F", gp:63, g:32, a:36, pts:68,  shotsGP:2.90 },
    { name:"Mikko Rantanen",    team:"COL", pos:"F", gp:62, g:33, a:42, pts:75,  shotsGP:3.10 },
    { name:"Tage Thompson",     team:"BUF", pos:"F", gp:63, g:29, a:34, pts:63,  shotsGP:3.30 },
    { name:"Artemi Panarin",    team:"NYR", pos:"F", gp:63, g:24, a:51, pts:75,  shotsGP:2.70 },
    { name:"Kirill Kaprizov",   team:"MIN", pos:"F", gp:62, g:29, a:36, pts:65,  shotsGP:3.10 },
  ],
  2: [
    { name:"Mitch Marner",      team:"TOR", pos:"F", gp:62, g:18, a:47, pts:65,  shotsGP:2.45 },
    { name:"William Nylander",  team:"TOR", pos:"F", gp:47, g:21, a:28, pts:49,  shotsGP:2.21 },
    { name:"Mark Scheifele",    team:"WPG", pos:"F", gp:62, g:30, a:34, pts:64,  shotsGP:2.19 },
    { name:"Kyle Connor",       team:"WPG", pos:"F", gp:63, g:28, a:31, pts:59,  shotsGP:2.60 },
    { name:"Martin Necas",      team:"COL", pos:"F", gp:59, g:28, a:35, pts:63,  shotsGP:2.56 },
    { name:"Brayden Point",     team:"TBL", pos:"F", gp:60, g:26, a:33, pts:59,  shotsGP:2.70 },
    { name:"Jason Robertson",   team:"DAL", pos:"F", gp:63, g:28, a:38, pts:66,  shotsGP:2.80 },
    { name:"Jack Eichel",       team:"VGK", pos:"F", gp:60, g:24, a:40, pts:64,  shotsGP:2.90 },
    { name:"Aleksander Barkov", team:"FLA", pos:"F", gp:60, g:20, a:42, pts:62,  shotsGP:2.30 },
    { name:"Sebastian Aho",     team:"CAR", pos:"F", gp:64, g:24, a:38, pts:62,  shotsGP:2.60 },
    { name:"Nick Suzuki",       team:"MTL", pos:"F", gp:62, g:21, a:33, pts:54,  shotsGP:2.23 },
    { name:"Cole Caufield",     team:"MTL", pos:"F", gp:60, g:25, a:22, pts:47,  shotsGP:3.20 },
    { name:"Sidney Crosby",     team:"PIT", pos:"F", gp:60, g:21, a:40, pts:61,  shotsGP:2.50 },
    { name:"Dylan Larkin",      team:"DET", pos:"F", gp:62, g:20, a:33, pts:53,  shotsGP:2.40 },
    { name:"JJ Peterka",        team:"BUF", pos:"F", gp:62, g:24, a:27, pts:51,  shotsGP:2.80 },
  ],
  3: [
    { name:"Zach Hyman",        team:"EDM", pos:"F", gp:58, g:22, a:18, pts:40,  shotsGP:2.80 },
    { name:"Brad Marchand",     team:"BOS", pos:"F", gp:58, g:18, a:35, pts:53,  shotsGP:2.20 },
    { name:"Chris Kreider",     team:"NYR", pos:"F", gp:62, g:23, a:18, pts:41,  shotsGP:2.40 },
    { name:"Clayton Keller",    team:"UTH", pos:"F", gp:62, g:22, a:35, pts:57,  shotsGP:2.40 },
    { name:"Roope Hintz",       team:"DAL", pos:"F", gp:61, g:22, a:29, pts:51,  shotsGP:2.50 },
    { name:"Pavel Buchnevich",  team:"STL", pos:"F", gp:62, g:23, a:30, pts:53,  shotsGP:2.30 },
    { name:"Nazem Kadri",       team:"CGY", pos:"F", gp:62, g:20, a:30, pts:50,  shotsGP:2.20 },
    { name:"Evgeni Malkin",     team:"PIT", pos:"F", gp:58, g:20, a:34, pts:54,  shotsGP:2.10 },
    { name:"Matty Beniers",     team:"SEA", pos:"F", gp:62, g:19, a:28, pts:47,  shotsGP:2.30 },
    { name:"Adrian Kempe",      team:"LAK", pos:"F", gp:63, g:23, a:25, pts:48,  shotsGP:2.30 },
    { name:"Leo Carlsson",      team:"ANA", pos:"F", gp:60, g:17, a:26, pts:43,  shotsGP:2.00 },
    { name:"Brock Nelson",      team:"NYI", pos:"F", gp:63, g:20, a:24, pts:44,  shotsGP:2.00 },
    { name:"Robert Thomas",     team:"STL", pos:"F", gp:46, g:15, a:29, pts:44,  shotsGP:1.59 },
    { name:"Gustav Nyquist",    team:"NSH", pos:"F", gp:58, g:16, a:24, pts:40,  shotsGP:1.90 },
    { name:"Macklin Celebrini", team:"SJS", pos:"F", gp:56, g:14, a:22, pts:36,  shotsGP:1.80 },
    { name:"Yegor Chinakhov",   team:"CBJ", pos:"F", gp:58, g:16, a:20, pts:36,  shotsGP:2.10 },
  ],
};

const FALLBACK_GAMES = [
  { time:"7:00 PM ET", awayAbbr:"SJS", homeAbbr:"BUF", away:"Sharks",        home:"Sabres",    status:"Preview" },
  { time:"7:00 PM ET", awayAbbr:"CGY", homeAbbr:"NYR", away:"Flames",        home:"Rangers",   status:"Preview" },
  { time:"7:00 PM ET", awayAbbr:"LAK", homeAbbr:"BOS", away:"Kings",         home:"Bruins",    status:"Preview" },
  { time:"7:00 PM ET", awayAbbr:"TOR", homeAbbr:"MTL", away:"Maple Leafs",   home:"Canadiens", status:"Preview" },
  { time:"7:00 PM ET", awayAbbr:"PIT", homeAbbr:"CAR", away:"Penguins",      home:"Hurricanes",status:"Preview" },
  { time:"7:00 PM ET", awayAbbr:"DET", homeAbbr:"FLA", away:"Red Wings",     home:"Panthers",  status:"Preview" },
  { time:"7:00 PM ET", awayAbbr:"CBJ", homeAbbr:"TBL", away:"Blue Jackets",  home:"Lightning", status:"Preview" },
  { time:"7:30 PM ET", awayAbbr:"NYI", homeAbbr:"STL", away:"Islanders",     home:"Blues",     status:"Preview" },
  { time:"8:00 PM ET", awayAbbr:"VGK", homeAbbr:"DAL", away:"Golden Knights",home:"Stars",     status:"Preview" },
  { time:"8:00 PM ET", awayAbbr:"UTH", homeAbbr:"MIN", away:"Mammoth",       home:"Wild",      status:"Preview" },
  { time:"8:30 PM ET", awayAbbr:"ANA", homeAbbr:"WPG", away:"Ducks",         home:"Jets",      status:"Preview" },
  { time:"10:00 PM ET",awayAbbr:"EDM", homeAbbr:"COL", away:"Oilers",        home:"Avalanche", status:"Preview" },
  { time:"10:00 PM ET",awayAbbr:"NSH", homeAbbr:"SEA", away:"Predators",     home:"Kraken",    status:"Preview" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(isoUTC) {
  try {
    const d = new Date(isoUTC);
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm} ET`;
  } catch { return "TBD"; }
}

// Goal probability score used for ranking within each group
function playerScore(p) {
  const gPG  = p.g / p.gp;
  const pPG  = p.pts / p.gp;
  const avail = Math.min(p.gp / 65, 1);
  return gPG * 45 + p.shotsGP * 22 + pPG * 18 + avail * 15;
}

function scoreLabel(s) {
  if (s >= 70) return { text: "Elite",  color: "#00FF9D" };
  if (s >= 50) return { text: "Strong", color: "#7DF9FF" };
  if (s >= 35) return { text: "Solid",  color: "#FFD700" };
  return           { text: "Flier",  color: "#FF8C42" };
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function fetchNHLGames() {
  const proxy = "https://api.allorigins.win/get?url=" + encodeURIComponent("https://api-web.nhle.com/v1/schedule/now");
  const res = await fetch(proxy, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`NHL API ${res.status}`);
  const { contents } = await res.json();
  const data = JSON.parse(contents);
  const raw = data?.gameWeek?.[0]?.games || [];
  if (!raw.length) throw new Error("No games today");
  const stateMap = { FUT:"Preview", PRE:"Preview", LIVE:"🔴 LIVE", CRIT:"🔴 LIVE", FINAL:"Final", OFF:"Final" };
  return raw.map(g => ({
    time:      formatTime(g.startTimeUTC),
    awayAbbr:  g.awayTeam?.abbrev || "???",
    homeAbbr:  g.homeTeam?.abbrev || "???",
    away:      g.awayTeam?.commonName?.default || g.awayTeam?.abbrev,
    home:      g.homeTeam?.commonName?.default || g.homeTeam?.abbrev,
    status:    stateMap[g.gameState] || "Preview",
    awayScore: g.awayTeam?.score ?? null,
    homeScore: g.homeTeam?.score ?? null,
    venue:     g.venue?.default || "",
  }));
}

// ── hockeychallengehelper.com parser ─────────────────────────────────────────
// The site organises players under "Pick # 1 / 2 / 3" headings followed by
// a <table> with columns: Name | Pos | GP | G | Shots/GP
// Three strategies tried in order until enough players are found.
async function fetchHelperSite() {
  const URLS = [
    "https://api.allorigins.win/get?url=" + encodeURIComponent("https://hockeychallengehelper.com"),
    "https://api.allorigins.win/get?url=" + encodeURIComponent("https://www.hockeychallengehelper.com"),
  ];

  let contents = null;
  for (const url of URLS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const json = await res.json();
      if (json?.contents && json.contents.length > 500) { contents = json.contents; break; }
    } catch { /* try next */ }
  }
  if (!contents) throw new Error("Helper site unreachable");

  const parser = new DOMParser();
  const doc    = parser.parseFromString(contents, "text/html");
  const groups = { 1: [], 2: [], 3: [] };

  // Parse a <table> element into player objects, auto-detecting column order
  const parseTable = (tbl) => {
    const players = [];
    const headerRow = tbl.querySelector("tr");
    const headerCells = [...(headerRow?.querySelectorAll("th,td") || [])].map(c => c.textContent.trim().toLowerCase());
    const iName  = Math.max(headerCells.findIndex(h => h.includes("name")), 0);
    const iPos   = headerCells.findIndex(h => h === "pos") >= 0   ? headerCells.findIndex(h => h === "pos")   : 1;
    const iGP    = headerCells.findIndex(h => h === "gp") >= 0    ? headerCells.findIndex(h => h === "gp")    : 2;
    const iG     = headerCells.findIndex(h => h === "g") >= 0     ? headerCells.findIndex(h => h === "g")     : 3;
    const iShots = headerCells.findIndex(h => h.includes("shot")) >= 0 ? headerCells.findIndex(h => h.includes("shot")) : 4;
    const rows = [...tbl.querySelectorAll("tr")].slice(headerCells.length > 0 ? 1 : 0);
    rows.forEach(row => {
      const cells = [...row.querySelectorAll("td")].map(td => td.textContent.trim());
      if (cells.length < 3) return;
      const name = cells[iName]?.replace(/\s+/g, " ").trim();
      const pos  = cells[iPos] || "F";
      const gp   = parseInt(cells[iGP]) || 0;
      const g    = parseInt(cells[iG]) || 0;
      const sh   = parseFloat(cells[iShots]) || 0;
      if (name && name.length >= 5 && name.includes(" ") && gp > 0) {
        players.push({ name, pos, gp, g, a: 0, pts: g, shotsGP: sh, _fromHelper: true });
      }
    });
    return players;
  };

  // Strategy 1: find heading elements whose text matches "Pick # N" exactly
  const allEls = [...doc.querySelectorAll("h1,h2,h3,h4,h5,h6,div,span,p,td,th")];
  for (const el of allEls) {
    const text = (el.childNodes[0]?.nodeValue || el.textContent || "").trim();
    const match = text.match(/^Pick\s*#?\s*([123])$/i);
    if (!match) continue;
    const gn = parseInt(match[1]);
    if (groups[gn].length > 0) continue; // already filled
    // Walk forward to find the nearest table
    let node = el;
    for (let j = 0; j < 15; j++) {
      node = node.nextElementSibling || node.parentElement?.nextElementSibling;
      if (!node) break;
      const tbl = node.tagName === "TABLE" ? node : node.querySelector("table");
      if (tbl) { groups[gn].push(...parseTable(tbl)); break; }
    }
  }

  // Strategy 2: assume first 3 tables in document order = groups 1, 2, 3
  if (groups[1].length + groups[2].length + groups[3].length < 5) {
    groups[1] = []; groups[2] = []; groups[3] = [];
    [...doc.querySelectorAll("table")].slice(0, 3).forEach((tbl, idx) => {
      groups[idx + 1].push(...parseTable(tbl));
    });
  }

  // Strategy 3: look for containers with pick/group N in class or id
  if (groups[1].length + groups[2].length + groups[3].length < 5) {
    groups[1] = []; groups[2] = []; groups[3] = [];
    [1, 2, 3].forEach(gn => {
      const tries = [`[class*="pick${gn}"]`, `[id*="pick${gn}"]`, `[class*="pick-${gn}"]`, `[data-pick="${gn}"]`, `[class*="group-${gn}"]`];
      for (const sel of tries) {
        try {
          const container = doc.querySelector(sel);
          if (!container) continue;
          const tbl = container.tagName === "TABLE" ? container : container.querySelector("table");
          if (tbl) { groups[gn].push(...parseTable(tbl)); break; }
        } catch { /* bad selector, skip */ }
      }
    });
  }

  const total = groups[1].length + groups[2].length + groups[3].length;
  if (total < 5) throw new Error(`Parsed only ${total} players from helper site`);
  return groups;
}

// ── Main Component ────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:ital,wght@0,400;0,500;0,600;1,400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #08111E; height: 100%; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #08111E; }
  ::-webkit-scrollbar-thumb { background: #1E3A50; border-radius: 2px; }

  .app { min-height: 100vh; background: #08111E; font-family: 'Barlow', sans-serif; color: #D6EAF8; }

  /* ── Header ── */
  .header { background: linear-gradient(180deg, #0D1E30 0%, #081520 100%); border-bottom: 1px solid #1A3045; padding: 16px 20px 12px; }
  .header-top { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }
  .logo-text { font-family: 'Bebas Neue', sans-serif; letter-spacing: 3px; line-height: 1; }
  .logo-main { font-size: 26px; color: #FFF; }
  .logo-sub  { font-size: 12px; color: #E8B400; letter-spacing: 4px; }
  .picks-counter { margin-left: auto; text-align: center; }
  .picks-num { font-family: 'Bebas Neue', sans-serif; font-size: 32px; line-height: 1; }
  .picks-label { font-size: 10px; letter-spacing: 2px; color: #5A8CAA; }

  /* ── Status bar ── */
  .status-bar { display: flex; align-items: center; gap: 8px; padding: 7px 12px; border-radius: 8px; font-size: 12px; border: 1px solid; }
  .status-bar.live    { background: rgba(0,255,157,.05);  border-color: rgba(0,255,157,.2);  }
  .status-bar.cached  { background: rgba(255,165,0,.05);  border-color: rgba(255,165,0,.2);  }
  .status-bar.loading { background: rgba(100,180,255,.05);border-color: rgba(100,180,255,.2);}
  .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .dot-live   { background: #00FF9D; box-shadow: 0 0 6px #00FF9D; animation: pulse 2s infinite; }
  .dot-cached { background: #FFA500; }
  .dot-load   { background: #64B4FF; animation: pulse 1s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

  /* ── Tabs ── */
  .tabs { display: flex; background: #060E18; border-bottom: 1px solid #142030; padding: 0 20px; overflow-x: auto; }
  .tab { background: none; border: none; padding: 11px 18px; font-family: 'Bebas Neue', sans-serif; font-size: 14px; letter-spacing: 1.5px; cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; transition: all .2s; }
  .tab:hover  { color: #9DD4F0; }
  .tab.active { color: #E8B400; border-bottom-color: #E8B400; }
  .tab.inactive { color: #3A6070; }

  /* ── Page ── */
  .page { padding: 0 0 40px; max-width: 860px; margin: 0 auto; }

  /* ── Group Panel ── */
  .group-panel { margin: 16px 20px 0; border-radius: 12px; overflow: hidden; border: 1px solid; }
  .group-header { padding: 12px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none; }
  .group-badge  { font-family: 'Bebas Neue', sans-serif; font-size: 13px; letter-spacing: 2px; padding: 3px 10px; border-radius: 20px; border: 1px solid; }
  .group-title  { font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 1px; }
  .group-desc   { font-size: 12px; color: #5A8CAA; margin-top: 1px; }
  .group-chevron { margin-left: auto; font-size: 14px; transition: transform .2s; }
  .group-chevron.open { transform: rotate(180deg); }
  .group-selected-badge { margin-left: auto; font-size: 11px; font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px; padding: 3px 10px; border-radius: 20px; border: 1px solid; }

  /* ── Player list inside group ── */
  .player-list { padding: 0 12px 12px; display: flex; flex-direction: column; gap: 5px; }

  /* Column header */
  .col-header { display: grid; grid-template-columns: 24px 1fr 44px 36px 36px 44px 64px 80px; gap: 6px; padding: 5px 10px; font-size: 10px; letter-spacing: 1.5px; color: #2A5070; font-weight: 600; }

  /* Player row */
  .prow { display: grid; grid-template-columns: 24px 1fr 44px 36px 36px 44px 64px 80px; gap: 6px; padding: 9px 10px; border-radius: 8px; cursor: pointer; transition: all .15s; align-items: center; border: 1px solid transparent; }
  .prow:hover { transform: translateX(2px); }
  .prow.selected { border-color: currentColor; }
  .p-name  { font-size: 13px; font-weight: 600; line-height: 1.2; }
  .p-meta  { font-size: 10px; color: #4A7A9A; margin-top: 2px; }
  .p-team  { font-size: 11px; font-weight: 700; }
  .p-stat  { font-size: 13px; }
  .p-stat-bold { font-size: 13px; font-weight: 700; }
  .score-bar-wrap { display: flex; align-items: center; gap: 5px; }
  .score-bar { flex: 1; height: 4px; background: #0E2030; border-radius: 2px; overflow: hidden; }
  .score-bar-fill { height: 100%; border-radius: 2px; }
  .score-val { font-size: 11px; font-weight: 700; min-width: 26px; }

  /* Recommend chip */
  .rec-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; letter-spacing: .5px; padding: 2px 7px; border-radius: 10px; margin-left: 6px; vertical-align: middle; }

  /* ── My Picks summary ── */
  .picks-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin: 20px 20px 0; }
  .pick-card  { border-radius: 12px; padding: 16px; border: 1px solid; position: relative; overflow: hidden; }
  .pick-card-num { font-family: 'Bebas Neue', sans-serif; font-size: 11px; letter-spacing: 3px; margin-bottom: 8px; }
  .pick-card-name { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 1px; line-height: 1.1; margin-bottom: 4px; }
  .pick-card-team { font-size: 11px; color: #5A8CAA; }
  .pick-card-score { position: absolute; top: 14px; right: 14px; font-family: 'Bebas Neue', sans-serif; font-size: 28px; line-height: 1; }
  .pick-card-empty { opacity: .35; font-style: italic; font-size: 13px; color: #3A5A70; padding-top: 8px; }
  .pick-remove { background: none; border: none; cursor: pointer; font-size: 14px; color: #FF5555; margin-top: 6px; padding: 0; font-family: 'Barlow', sans-serif; font-size: 11px; letter-spacing: 1px; text-decoration: underline; transition: color .15s; }
  .pick-remove:hover { color: #FF8888; }

  /* Stats row inside picks */
  .pick-stats { display: flex; gap: 10px; margin-top: 8px; }
  .pick-stat  { text-align: center; }
  .pick-stat-val { font-family: 'Bebas Neue', sans-serif; font-size: 18px; line-height: 1; }
  .pick-stat-lbl { font-size: 9px; letter-spacing: 1.5px; color: #3A6080; }

  /* Complete banner */
  .complete-banner { margin: 16px 20px 0; padding: 14px 20px; border-radius: 12px; background: rgba(0,255,157,.07); border: 1px solid rgba(0,255,157,.3); display: flex; align-items: center; gap: 14px; }
  .complete-title { font-family: 'Bebas Neue', sans-serif; font-size: 20px; color: #00FF9D; letter-spacing: 2px; }
  .complete-sub   { font-size: 12px; color: #5A9A7A; margin-top: 2px; }

  /* ── Games tab ── */
  .games-list { margin: 16px 20px 0; display: flex; flex-direction: column; gap: 7px; }
  .game-row { display: flex; align-items: center; gap: 12px; padding: 11px 16px; background: #0C1D2E; border: 1px solid #142030; border-radius: 10px; transition: border-color .2s; }
  .game-row:hover { border-color: #1E4060; }
  .game-time  { font-size: 12px; color: #3A6080; width: 72px; flex-shrink: 0; font-weight: 600; }
  .game-teams { flex: 1; display: flex; align-items: center; gap: 8px; justify-content: center; }
  .game-team  { flex: 1; font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 1px; }
  .game-team.away { text-align: right; }
  .game-team.home { text-align: left; }
  .game-sep   { text-align: center; min-width: 60px; }
  .game-score { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 2px; line-height: 1; }
  .game-vs    { font-size: 11px; color: #2A4A60; letter-spacing: 3px; font-weight: 700; }
  .game-status{ font-size: 10px; letter-spacing: 1px; margin-top: 1px; }
  .game-tracked { font-size: 11px; color: #2A4A60; flex-shrink: 0; }

  /* ── Buttons ── */
  .btn { font-family: 'Bebas Neue', sans-serif; letter-spacing: 1.5px; border-radius: 8px; cursor: pointer; transition: all .2s; border: 1px solid; }
  .btn-refresh { background: rgba(100,180,255,.1); border-color: #1E4060; color: #5A9AC0; padding: 5px 12px; font-size: 12px; }
  .btn-refresh:hover { border-color: #3A80A0; color: #80C4E0; }
  .btn-autofill { width: 100%; margin-top: 16px; padding: 13px; background: linear-gradient(90deg,rgba(0,100,160,.25),rgba(0,140,200,.15)); border-color: #1A5A80; color: #5ABCE0; font-size: 15px; }
  .btn-autofill:hover { border-color: #3A8AB0; color: #80D4F0; }
  .btn-clear { background: rgba(255,80,80,.08); border-color: rgba(255,80,80,.25); color: #FF7070; padding: 5px 12px; font-size: 12px; }
  .btn-clear:hover { border-color: rgba(255,80,80,.5); color: #FF9090; }

  /* ── Filters row ── */
  .filters { display: flex; gap: 8px; padding: 14px 20px 0; flex-wrap: wrap; align-items: center; }
  .search { background: #0C1D2E; border: 1px solid #1A3A50; color: #D6EAF8; padding: 8px 14px; border-radius: 8px; font-family: 'Barlow', sans-serif; font-size: 13px; flex: 1; min-width: 160px; outline: none; }
  .search:focus { border-color: #3A7AA0; }
  .sel { background: #0C1D2E; border: 1px solid #1A3A50; color: #D6EAF8; padding: 7px 10px; border-radius: 8px; font-family: 'Barlow', sans-serif; font-size: 12px; cursor: pointer; }

  /* ── Info box ── */
  .info-box { margin: 16px 20px 0; padding: 14px 18px; border-radius: 10px; background: rgba(60,120,200,.06); border: 1px solid rgba(60,120,200,.2); font-size: 13px; line-height: 1.6; color: #7AAAC8; }
  .info-box strong { color: #A0C8E8; }

  /* ── Source pills ── */
  .source-pills { display: flex; gap: 8px; flex-wrap: wrap; }
  .pill { font-size: 10px; letter-spacing: 1px; padding: 3px 10px; border-radius: 20px; border: 1px solid; font-family: 'Bebas Neue', sans-serif; }
  .pill-green  { background: rgba(0,255,157,.08); border-color: rgba(0,255,157,.3); color: #00FF9D; }
  .pill-yellow { background: rgba(255,200,0,.08);  border-color: rgba(255,200,0,.3);  color: #E8B400; }
  .pill-grey   { background: rgba(100,140,180,.08); border-color: rgba(100,140,180,.2); color: #6A9AB8; }

  @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  .spin { animation: spin .9s linear infinite; display: inline-block; }

  @media (max-width: 600px) {
    .picks-grid { grid-template-columns: 1fr; }
    .col-header, .prow { grid-template-columns: 20px 1fr 36px 32px 32px 0 0 70px; }
    .col-header > *:nth-child(6),
    .col-header > *:nth-child(7),
    .prow > *:nth-child(6),
    .prow > *:nth-child(7) { display: none; }
  }
`;

export default function App() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [games, setGames]             = useState(FALLBACK_GAMES);
  const [pools, setPools]             = useState(FALLBACK_POOLS);   // { 1:[], 2:[], 3:[] }
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingPools, setLoadingPools] = useState(true);

  const [dataSource, setDataSource]   = useState("loading"); // "helper"|"fallback"|"loading"
  const [gamesSource, setGamesSource] = useState("loading"); // "live"|"fallback"|"loading"
  const [lastRefresh, setLastRefresh] = useState(null);

  const [picks, setPicks]             = useState({ 1: null, 2: null, 3: null });
  const [openGroups, setOpenGroups]   = useState({ 1: true, 2: true, 3: true });
  const [activeTab, setActiveTab]     = useState("picks");

  const [search, setSearch]           = useState("");
  const [filterGroup, setFilterGroup] = useState("ALL");

  // ── Enrich player with live game context ───────────────────────────────────
  const enrichPlayer = useCallback((p) => {
    const game = games.find(g => g.awayAbbr === p.team || g.homeAbbr === p.team);
    return {
      ...p,
      pts:      p.pts || (p.g + (p.a || 0)),
      gameTime: game?.time   || "TBD",
      opponent: game ? (game.awayAbbr === p.team ? game.homeAbbr : game.awayAbbr) : "N/A",
      gameStatus: game?.status || "",
      hasGame:  !!game,
    };
  }, [games]);

  const enrichedPools = useMemo(() => ({
    1: pools[1].map(enrichPlayer),
    2: pools[2].map(enrichPlayer),
    3: pools[3].map(enrichPlayer),
  }), [pools, enrichPlayer]);

  // Best recommendation per group (highest score among players with a game today)
  const recommendations = useMemo(() => {
    const recs = {};
    [1, 2, 3].forEach(g => {
      const withGames = enrichedPools[g].filter(p => p.hasGame);
      const pool = withGames.length ? withGames : enrichedPools[g];
      recs[g] = [...pool].sort((a, b) => playerScore(b) - playerScore(a))[0] || null;
    });
    return recs;
  }, [enrichedPools]);

  // ── Fetch NHL games ────────────────────────────────────────────────────────
  const loadGames = useCallback(async () => {
    setLoadingGames(true);
    setGamesSource("loading");
    try {
      const g = await fetchNHLGames();
      setGames(g);
      setGamesSource("live");
    } catch {
      setGames(FALLBACK_GAMES);
      setGamesSource("fallback");
    } finally {
      setLoadingGames(false);
    }
  }, []);

  // ── Fetch player pools ─────────────────────────────────────────────────────
  const loadPools = useCallback(async () => {
    setLoadingPools(true);
    setDataSource("loading");
    try {
      const helperPools = await fetchHelperSite();
      setPools(helperPools);
      setDataSource("helper");
    } catch {
      setPools(FALLBACK_POOLS);
      setDataSource("fallback");
    } finally {
      setLoadingPools(false);
      setLastRefresh(new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }));
    }
  }, []);

  useEffect(() => {
    loadGames();
    loadPools();
    const iv = setInterval(() => { loadGames(); loadPools(); }, 120000);
    return () => clearInterval(iv);
  }, [loadGames, loadPools]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const picksCount    = Object.values(picks).filter(Boolean).length;
  const allPicked     = picksCount === 3;
  const todayTeams    = useMemo(() => { const s=new Set(); games.forEach(g=>{s.add(g.awayAbbr);s.add(g.homeAbbr);}); return s; }, [games]);

  // Filtered view for "Browse" tab
  const browsePlayers = useMemo(() => {
    let list = [];
    const groups = filterGroup === "ALL" ? [1,2,3] : [parseInt(filterGroup)];
    groups.forEach(gn => enrichedPools[gn].forEach(p => list.push({ ...p, group: gn })));
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.team.toLowerCase().includes(search.toLowerCase()));
    return list.sort((a, b) => {
      if (a.group !== b.group) return a.group - b.group;
      return playerScore(b) - playerScore(a);
    });
  }, [enrichedPools, search, filterGroup]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const selectPick = (group, player) => {
    setPicks(prev => ({
      ...prev,
      [group]: prev[group]?.name === player.name ? null : player,
    }));
  };

  const autoFill = () => {
    const newPicks = { ...picks };
    [1, 2, 3].forEach(g => {
      if (!newPicks[g] && recommendations[g]) newPicks[g] = recommendations[g];
    });
    setPicks(newPicks);
  };

  const clearPicks = () => setPicks({ 1: null, 2: null, 3: null });

  const toggleGroup = (g) => setOpenGroups(prev => ({ ...prev, [g]: !prev[g] }));

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderStatusBar = () => {
    const isLoading = gamesSource === "loading" || dataSource === "loading";
    const isLive    = gamesSource === "live";
    const cls = isLoading ? "loading" : isLive ? "live" : "cached";
    const dotCls = isLoading ? "dot-load" : isLive ? "dot-live" : "dot-cached";
    return (
      <div className={`status-bar ${cls}`}>
        <div className={`dot ${dotCls}`} />
        {isLoading ? (
          <span style={{ color:"#6AA4C8", fontSize:12 }}><span className="spin">⟳</span> Syncing data…</span>
        ) : (
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", flex:1 }}>
            <div className="source-pills">
              <span className={`pill ${gamesSource==="live" ? "pill-green" : "pill-yellow"}`}>
                {gamesSource === "live" ? "✓ NHL API LIVE" : "⚠ NHL CACHED"}
              </span>
              <span className={`pill ${dataSource==="helper" ? "pill-green" : "pill-yellow"}`}>
                {dataSource === "helper" ? "✓ HELPER SITE" : "⚠ STATIC POOLS"}
              </span>
              {lastRefresh && <span className="pill pill-grey">UPDATED {lastRefresh}</span>}
            </div>
          </div>
        )}
        <button className="btn btn-refresh" onClick={() => { loadGames(); loadPools(); }} disabled={isLoading}>
          {isLoading ? <span className="spin">⟳</span> : "⟳"} SYNC
        </button>
      </div>
    );
  };

  const renderGroupPanel = (groupNum) => {
    const cfg      = GROUP_CONFIG[groupNum];
    const players  = enrichedPools[groupNum];
    const rec      = recommendations[groupNum];
    const selected = picks[groupNum];
    const isOpen   = openGroups[groupNum];

    const sorted = [...players].sort((a, b) => playerScore(b) - playerScore(a));

    return (
      <div key={groupNum} className="group-panel" style={{ background: cfg.bg, borderColor: cfg.border }}>
        {/* Group header */}
        <div className="group-header" onClick={() => toggleGroup(groupNum)} style={{ background: `linear-gradient(90deg, ${cfg.bg}, transparent)` }}>
          <span className="group-badge" style={{ color: cfg.color, borderColor: cfg.border, background: "rgba(0,0,0,.3)" }}>
            {cfg.label}
          </span>
          <div>
            <div className="group-title" style={{ color: cfg.color }}>{cfg.subtitle}</div>
            <div className="group-desc">{cfg.description}</div>
          </div>
          {selected ? (
            <div className="group-selected-badge" style={{ color: cfg.color, borderColor: cfg.border, background: "rgba(0,0,0,.3)", marginLeft: "auto", marginRight: 8 }}>
              ✓ {selected.name.split(" ").pop()}
            </div>
          ) : (
            <span style={{ marginLeft:"auto", marginRight:8, fontSize:11, color:"#2A4A60", fontStyle:"italic" }}>Select 1 player</span>
          )}
          <span className={`group-chevron ${isOpen ? "open" : ""}`} style={{ color: cfg.color }}>▼</span>
        </div>

        {/* Player list */}
        {isOpen && (
          <div className="player-list">
            <div className="col-header">
              <span>#</span>
              <span>PLAYER</span>
              <span>TEAM</span>
              <span>GP</span>
              <span>G</span>
              <span>SH/GP</span>
              <span>MATCHUP</span>
              <span>SCORE</span>
            </div>
            {sorted.map((player, i) => {
              const isSelected = selected?.name === player.name;
              const isRec      = rec?.name === player.name;
              const score      = playerScore(player);
              const sl         = scoreLabel(score);

              return (
                <div
                  key={player.name}
                  className={`prow ${isSelected ? "selected" : ""}`}
                  style={{
                    background: isSelected ? cfg.bg : "rgba(8,17,30,.6)",
                    borderColor: isSelected ? cfg.color : "transparent",
                    color: isSelected ? cfg.color : "#D6EAF8",
                  }}
                  onClick={() => selectPick(groupNum, player)}
                >
                  <span style={{ fontSize:11, color: i < 3 ? cfg.color : "#2A4A60", fontWeight:700 }}>{i+1}</span>
                  <div>
                    <div className="p-name">
                      {player.name}
                      {isRec && <span className="rec-chip" style={{ background: `${cfg.color}18`, borderColor: `${cfg.color}40`, color: cfg.color }}>★ TOP PICK</span>}
                    </div>
                    <div className="p-meta">{player.pos}</div>
                  </div>
                  <div className="p-team" style={{ color: TEAM_COLORS[player.team] || "#FFF" }}>{player.team}</div>
                  <span className="p-stat" style={{ color:"#5A8CAA" }}>{player.gp}</span>
                  <span className="p-stat-bold">{player.g}</span>
                  <span className="p-stat" style={{ color:"#C8A000" }}>{player.shotsGP.toFixed(1)}</span>
                  <div>
                    <div style={{ fontSize:11, color: player.hasGame ? "#5A8CAA" : "#2A4A60" }}>
                      {player.hasGame ? `vs ${player.opponent}` : "No game"}
                    </div>
                    {player.hasGame && (
                      <div style={{ fontSize:10, color: player.gameStatus.includes("LIVE") ? "#FF4444" : "#2A4060" }}>
                        {player.gameStatus.includes("LIVE") ? "🔴 LIVE" : player.gameTime}
                      </div>
                    )}
                  </div>
                  <div className="score-bar-wrap">
                    <div className="score-bar">
                      <div className="score-bar-fill" style={{ width:`${Math.min(score,100)}%`, background: sl.color }} />
                    </div>
                    <span className="score-val" style={{ color: sl.color }}>{score.toFixed(0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderPickCard = (groupNum) => {
    const cfg  = GROUP_CONFIG[groupNum];
    const pick = picks[groupNum];
    const score = pick ? playerScore(pick) : 0;
    const sl    = pick ? scoreLabel(score) : null;

    return (
      <div key={groupNum} className="pick-card" style={{ background: pick ? cfg.bg : "rgba(10,20,32,.6)", borderColor: pick ? cfg.border : "#142030" }}>
        <div className="pick-card-num" style={{ color: cfg.color }}>{cfg.label} · {cfg.subtitle.toUpperCase()}</div>
        {pick ? (
          <>
            <div className="pick-card-name" style={{ color: cfg.color }}>{pick.name}</div>
            <div className="pick-card-team" style={{ color: TEAM_COLORS[pick.team] || "#FFF" }}>
              {pick.team} · {pick.gameTime} vs {pick.opponent}
            </div>
            <div className="pick-stats">
              {[["G", pick.g], ["SH/GP", pick.shotsGP.toFixed(1)], ["PTS", pick.pts]].map(([l,v]) => (
                <div key={l} className="pick-stat">
                  <div className="pick-stat-val" style={{ color: cfg.color }}>{v}</div>
                  <div className="pick-stat-lbl">{l}</div>
                </div>
              ))}
            </div>
            <div className="pick-card-score" style={{ color: sl.color }}>{score.toFixed(0)}</div>
            <button className="pick-remove" onClick={() => setPicks(p => ({...p, [groupNum]: null}))}>✕ REMOVE</button>
          </>
        ) : (
          <>
            <div className="pick-card-empty">No pick yet</div>
            {recommendations[groupNum] && (
              <button
                style={{ marginTop:10, background:`${cfg.color}14`, border:`1px solid ${cfg.border}`, color:cfg.color, padding:"6px 12px", borderRadius:8, cursor:"pointer", fontSize:12, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"1px" }}
                onClick={() => selectPick(groupNum, recommendations[groupNum])}
              >
                + QUICK PICK: {recommendations[groupNum].name.split(" ").pop()}
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {/* HEADER */}
        <div className="header">
          <div className="header-top">
            <div style={{ fontSize:28 }}>🏒</div>
            <div className="logo-text">
              <div className="logo-main">TIMS HOCKEY CHALLENGE</div>
              <div className="logo-sub">PICK ASSISTANT</div>
            </div>
            <div className="picks-counter">
              <div className="picks-num" style={{ color: allPicked ? "#00FF9D" : picksCount > 0 ? "#E8B400" : "#3A6080" }}>
                {picksCount}<span style={{ fontSize:16, color:"#3A6080", fontFamily:"'Barlow',sans-serif", fontWeight:400 }}>/3</span>
              </div>
              <div className="picks-label">PICKS</div>
            </div>
          </div>
          {renderStatusBar()}
        </div>

        {/* TABS */}
        <div className="tabs">
          {[
            { id:"picks",  label:"🎯 PICK BY GROUP" },
            { id:"mypicks",label:`⭐ MY PICKS (${picksCount}/3)` },
            { id:"games",  label:`📅 GAMES (${games.length})` },
            { id:"browse", label:"📋 BROWSE ALL" },
          ].map(t => (
            <button key={t.id} className={`tab ${activeTab===t.id?"active":"inactive"}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="page">

          {/* ── PICK BY GROUP TAB ── */}
          {activeTab === "picks" && (
            <>
              <div className="info-box">
                <strong>How it works:</strong> Tim Hortons divides players into 3 groups by goal probability.
                Select <strong>1 player per group</strong> — your pick scores if they score a goal that day.
                The <strong>★ TOP PICK</strong> badge highlights the highest-rated player in each group.
                {dataSource === "fallback" && <span style={{ color:"#E8A000" }}> · Using pre-loaded pools (live Tims data requires authentication).</span>}
              </div>
              {[1, 2, 3].map(renderGroupPanel)}
              <div style={{ padding:"0 20px" }}>
                <button className="btn btn-autofill" onClick={autoFill} disabled={allPicked}>
                  ⚡ AUTO-FILL ALL GROUPS WITH TOP PICKS
                </button>
              </div>
            </>
          )}

          {/* ── MY PICKS TAB ── */}
          {activeTab === "mypicks" && (
            <>
              {allPicked && (
                <div className="complete-banner">
                  <div style={{ fontSize:28 }}>✅</div>
                  <div>
                    <div className="complete-title">YOUR PICKS ARE COMPLETE!</div>
                    <div className="complete-sub">All 3 groups filled. Good luck tonight!</div>
                  </div>
                  <button className="btn btn-clear" style={{ marginLeft:"auto" }} onClick={clearPicks}>CLEAR ALL</button>
                </div>
              )}
              <div className="picks-grid">
                {[1, 2, 3].map(renderPickCard)}
              </div>
              {!allPicked && (
                <div style={{ padding:"0 20px" }}>
                  <button className="btn btn-autofill" onClick={autoFill}>
                    ⚡ AUTO-FILL REMAINING WITH TOP PICKS
                  </button>
                  {picksCount > 0 && (
                    <button className="btn btn-clear" style={{ width:"100%", marginTop:8, padding:"10px" }} onClick={clearPicks}>
                      CLEAR ALL PICKS
                    </button>
                  )}
                </div>
              )}
              {picksCount === 0 && (
                <div style={{ textAlign:"center", padding:"40px 20px", color:"#2A4A60" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🏒</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:2 }}>NO PICKS YET</div>
                  <button style={{ marginTop:14, background:"rgba(0,120,200,.15)", border:"1px solid #1A5A80", color:"#5ABCE0", padding:"8px 20px", borderRadius:8, cursor:"pointer", fontFamily:"'Bebas Neue',sans-serif", fontSize:14, letterSpacing:2 }} onClick={() => setActiveTab("picks")}>
                    GO TO PICK BY GROUP →
                  </button>
                </div>
              )}

              {/* Today's recommendation summary */}
              {Object.values(recommendations).some(Boolean) && (
                <div style={{ margin:"20px 20px 0", padding:"16px", background:"rgba(12,30,48,.8)", border:"1px solid #142030", borderRadius:12 }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, letterSpacing:2, color:"#3A6080", marginBottom:12 }}>TODAY'S TOP RECOMMENDATIONS</div>
                  {[1,2,3].map(gn => {
                    const r = recommendations[gn];
                    if (!r) return null;
                    const cfg = GROUP_CONFIG[gn];
                    const sc  = playerScore(r);
                    const sl  = scoreLabel(sc);
                    return (
                      <div key={gn} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom: gn<3?"1px solid #0E2030":"none" }}>
                        <span className="group-badge" style={{ color:cfg.color, borderColor:cfg.border, background:"rgba(0,0,0,.3)", fontFamily:"'Bebas Neue',sans-serif", fontSize:11, letterSpacing:2, padding:"2px 8px", borderRadius:20, border:"1px solid" }}>{cfg.label}</span>
                        <div style={{ flex:1 }}>
                          <span style={{ fontWeight:600, color:"#D6EAF8" }}>{r.name}</span>
                          <span style={{ fontSize:12, color:"#3A6080", marginLeft:8 }}>{r.team} · {r.g}G · {r.shotsGP} sh/GP · {r.gameTime}</span>
                        </div>
                        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:sl.color }}>{sc.toFixed(0)}</span>
                        {!picks[gn] && (
                          <button onClick={() => selectPick(gn, r)} style={{ background:`${cfg.color}14`, border:`1px solid ${cfg.border}`, color:cfg.color, padding:"4px 10px", borderRadius:6, cursor:"pointer", fontFamily:"'Bebas Neue',sans-serif", fontSize:11, letterSpacing:1 }}>
                            + PICK
                          </button>
                        )}
                        {picks[gn]?.name === r.name && <span style={{ fontSize:11, color:cfg.color }}>✓ SELECTED</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── GAMES TAB ── */}
          {activeTab === "games" && (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px 0" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, letterSpacing:2, color:"#3A6080" }}>
                  TODAY — {games.length} GAMES
                </div>
                <span className="pill pill-grey" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>
                  {gamesSource === "live" ? "LIVE NHL DATA" : "CACHED (MAR 10)"}
                </span>
              </div>
              <div className="games-list">
                {games.map((g, i) => (
                  <div key={i} className="game-row">
                    <div className="game-time">{g.time}</div>
                    <div className="game-teams">
                      <div className="game-team away" style={{ color: TEAM_COLORS[g.awayAbbr] || "#FFF" }}>{g.away}</div>
                      <div className="game-sep">
                        {g.awayScore != null && g.homeScore != null ? (
                          <div className="game-score" style={{ color: g.status.includes("LIVE") ? "#FF4444" : "#FFF" }}>
                            {g.awayScore}–{g.homeScore}
                          </div>
                        ) : (
                          <div className="game-vs">VS</div>
                        )}
                        {g.status !== "Preview" && (
                          <div className="game-status" style={{ color: g.status.includes("LIVE") ? "#FF4444" : "#3A6080" }}>{g.status}</div>
                        )}
                      </div>
                      <div className="game-team home" style={{ color: TEAM_COLORS[g.homeAbbr] || "#FFF" }}>{g.home}</div>
                    </div>
                    <div className="game-tracked">
                      {[...enrichedPools[1], ...enrichedPools[2], ...enrichedPools[3]].filter(p => p.team === g.awayAbbr || p.team === g.homeAbbr).length} players
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── BROWSE ALL TAB ── */}
          {activeTab === "browse" && (
            <>
              <div className="filters">
                <input className="search" placeholder="🔍 Search name or team…" value={search} onChange={e => setSearch(e.target.value)} />
                <select className="sel" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
                  <option value="ALL">All Groups</option>
                  <option value="1">Group 1 — Elite</option>
                  <option value="2">Group 2 — Mid-Tier</option>
                  <option value="3">Group 3 — Low-Prob</option>
                </select>
              </div>
              <div style={{ padding:"12px 20px 0", display:"flex", flexDirection:"column", gap:4 }}>
                <div className="col-header">
                  <span>GRP</span><span>PLAYER</span><span>TEAM</span><span>GP</span><span>G</span><span>SH/GP</span><span>MATCHUP</span><span>SCORE</span>
                </div>
                {browsePlayers.map(player => {
                  const cfg   = GROUP_CONFIG[player.group];
                  const score = playerScore(player);
                  const sl    = scoreLabel(score);
                  const isPicked = picks[player.group]?.name === player.name;
                  return (
                    <div
                      key={`${player.group}-${player.name}`}
                      className={`prow ${isPicked ? "selected" : ""}`}
                      style={{ background: isPicked ? cfg.bg : "rgba(8,17,30,.6)", borderColor: isPicked ? cfg.color : "transparent", color: isPicked ? cfg.color : "#D6EAF8" }}
                      onClick={() => selectPick(player.group, player)}
                    >
                      <span style={{ fontSize:11, color:cfg.color, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }}>G{player.group}</span>
                      <div>
                        <div className="p-name">{player.name}</div>
                        <div className="p-meta">{player.pos}</div>
                      </div>
                      <div className="p-team" style={{ color: TEAM_COLORS[player.team] || "#FFF" }}>{player.team}</div>
                      <span className="p-stat" style={{ color:"#5A8CAA" }}>{player.gp}</span>
                      <span className="p-stat-bold">{player.g}</span>
                      <span className="p-stat" style={{ color:"#C8A000" }}>{player.shotsGP.toFixed(1)}</span>
                      <div>
                        <div style={{ fontSize:11, color: player.hasGame ? "#5A8CAA" : "#2A4A60" }}>
                          {player.hasGame ? `vs ${player.opponent}` : "No game"}
                        </div>
                        {player.hasGame && <div style={{ fontSize:10, color:"#2A4060" }}>{player.gameTime}</div>}
                      </div>
                      <div className="score-bar-wrap">
                        <div className="score-bar">
                          <div className="score-bar-fill" style={{ width:`${Math.min(score,100)}%`, background: sl.color }} />
                        </div>
                        <span className="score-val" style={{ color: sl.color }}>{score.toFixed(0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}

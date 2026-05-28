#!/usr/bin/env node
// WowBox regression check — run before every git commit
// Usage: node check.js [path/to/index.html]
// Exit 0 = all good. Exit 1 = failure.

const fs   = require('fs');
const { execSync } = require('child_process');

const FILE = process.argv[2] || 'index.html';
const RED  = '\x1b[31m';
const GRN  = '\x1b[32m';
const YLW  = '\x1b[33m';
const RST  = '\x1b[0m';

if (!fs.existsSync(FILE)) {
  console.error(`${RED}File not found: ${FILE}${RST}`);
  process.exit(1);
}

const html    = fs.readFileSync(FILE, 'utf8');
const lines   = html.split('\n');
let   failed  = 0;

function ok(msg)   { console.log(`  ${GRN}✅ ${msg}${RST}`); }
function fail(msg) { console.log(`  ${RED}❌ ${msg}${RST}`); failed++; }
function warn(msg) { console.log(`  ${YLW}⚠️  ${msg}${RST}`); }
function section(msg) { console.log(`\n${YLW}── ${msg} ──${RST}`); }

// ── 1. SCRIPT BLOCK SYNTAX ─────────────────────────────────────────────────
section('Script block syntax');

// Find all <script> / </script> pairs (bare tags only)
const opens  = [];
const closes = [];
lines.forEach((l, i) => {
  if (l.trim() === '<script>')  opens.push(i + 1);
  if (l.trim() === '</script>') closes.push(i + 1);
});

const pairs = Math.min(opens.length, closes.length);
for (let i = 0; i < pairs; i++) {
  const start = opens[i];
  const end   = closes[i] - 1;
  if (end <= start) continue;

  const block = lines.slice(start, end).join('\n');
  const tmp   = `/tmp/_wowbox_block_${i}.js`;
  fs.writeFileSync(tmp, block);

  try {
    execSync(`node --check ${tmp} 2>&1`, { stdio: 'pipe' });
    ok(`Block ${i + 1} (lines ${start}–${end}) — syntax OK`);
  } catch (e) {
    const err = e.stdout?.toString() || e.stderr?.toString() || '';
    const match = err.match(/\.js:(\d+)/);
    const errLine = match ? start + parseInt(match[1]) - 1 : '?';
    fail(`Block ${i + 1} (lines ${start}–${end}) — syntax error near file line ${errLine}`);
    console.log(`     ${err.split('\n').slice(0, 3).join('\n     ')}`);
  }
}

// ── 2. ORPHANED CALENDAR CODE DETECTION ────────────────────────────────────
section('Orphaned code detection');

const orphanPatterns = [
  { pattern: /^\s*if \(!calYear\)\s+calYear\s*=/, desc: 'Orphaned renderCalendar body (if !calYear)' },
  { pattern: /^\s*const daysInMonth\s*=\s*new Date\(calYear/, desc: 'Orphaned renderCalendar body (daysInMonth)' },
  { pattern: /^\s*for \(let d = 1; d <= daysInMonth/, desc: 'Orphaned renderCalendar body (for d loop)' },
  { pattern: /function calClearAll\(\) \{[\s\S]*?calState = \{\};[\s\S]*?\}/, desc: 'Duplicate sync calClearAll' },
];

// Check for multiple function declarations of the same function
const fnNames = ['renderCalendar', 'calToggleDay', 'calPrevMonth', 'calNextMonth', 'calBlockRange', 'calClearAll'];
fnNames.forEach(fn => {
  const re  = new RegExp(`(async\\s+)?function\\s+${fn}\\b`, 'g');
  const all = [...html.matchAll(re)];
  if (all.length > 1) {
    fail(`Duplicate declaration of ${fn}() — found ${all.length} times`);
  } else if (all.length === 0) {
    // some might be allowed to be absent
  } else {
    ok(`${fn}() declared exactly once`);
  }
});

// Detect orphaned code lines (return/const/let at col 0-4 outside any block)
let orphanFound = false;
orphanPatterns.forEach(({ pattern, desc }) => {
  if (pattern.test(html)) {
    fail(`Orphaned code: ${desc}`);
    orphanFound = true;
  }
});
if (!orphanFound) ok('No orphaned calendar code detected');

// ── 3. REQUIRED FEATURES CHECK ─────────────────────────────────────────────
section('Required features');

const required = [
  // Commission
  ['loadCommissionRates',        'Commission: loadCommissionRates'],
  ['admSavePartnerCommModal',    'Commission: partner override modal'],
  ['admDeleteCommRate',          'Commission: delete override'],
  ['admAddExpComm',              'Commission: experience override'],
  ['admExportCommCSV',           'Commission: CSV export'],
  // Calendar
  ['partner_availability',       'Calendar: partner_availability Supabase'],
  ['calBookedDates',             'Calendar: booked dates in blue'],
  ['async function renderCalendar', 'Calendar: async renderCalendar'],
  // Refund
  ['admRefundBox',               'Refund: per-box refund'],
  ['admConfirmRefundBox',        'Refund: confirm per-box'],
  ['admRefundOrder',             'Refund: full order refund'],
  ['admConfirmRefundOrder',      'Refund: confirm full order'],
  // E-box auto status
  ['autoStatus.*delivered',      'Orders: E-box auto delivered status'],
  // Boost
  ['ppConfirmPool',              'Boost: real Paystack payment'],
  ['ppCancelBoost',              'Boost: cancel boost'],
  ['admToggleBoostFeature',      'Boost: admin toggle'],
  ['price-boost-pool',           'Boost: price field in Admin Pricing'],
  // Legal pages
  ['id="page-terms"',            'Legal: Terms page'],
  ['id="page-privacy"',          'Legal: Privacy page'],
  ['id="page-refund"',           'Legal: Refund policy page'],
  // Admin settings
  ['admLoadSiteSettings',        'Admin: site settings load'],
  ['admSaveHeroImage',           'Admin: hero image upload'],
  // PP_SECTIONS
  ['pp-payouts.*PP_SECTIONS|PP_SECTIONS.*pp-payouts', 'Portal: pp-payouts in PP_SECTIONS'],
  // SEO
  ['lang="en-ZA"',               'SEO: lang=en-ZA'],
  ['canonical',                  'SEO: canonical link'],
  ['application/ld\\+json',      'SEO: JSON-LD schema'],
  // Cancel emails
  ['booking_cancelled',          'Emails: booking cancelled type'],
  // Refund statuses
  ['partial_refund',             'Orders: partial_refund status'],
  ['refunded.*dbToStatus|dbToStatus.*refunded', 'Orders: refunded in dbToStatus'],
  // Review masking
  ['function maskName',          'Reviews: name masking'],
];

required.forEach(([pattern, desc]) => {
  const re = new RegExp(pattern);
  if (re.test(html)) ok(desc);
  else fail(desc);
});

// ── 4. LANGUAGE CHECK (no French in UI strings) ──────────────────────────────
section('Language check (no French in UI)');

const frenchPatterns = [
  /placeholder="[^"]*(?:Nom|Prénom|Adresse|Téléphone|Email de l'utilisateur)[^"]*"/i,
  /innerHTML\s*=\s*`[^`]*(?:Connexion|Inscription|Déconnexion|Expérience|Partenaire)[^`]*`/,
];
let frenchFound = false;
frenchPatterns.forEach(p => {
  if (p.test(html)) { warn('Possible French text in UI strings'); frenchFound = true; }
});
if (!frenchFound) ok('UI strings appear to be in English');

// ── SUMMARY ─────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
if (failed === 0) {
  console.log(`${GRN}✅ All checks passed — safe to commit.${RST}`);
  process.exit(0);
} else {
  console.log(`${RED}❌ ${failed} check(s) failed — fix before committing.${RST}`);
  process.exit(1);
}

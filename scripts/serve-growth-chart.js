#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const http = require("http");

const envPath = path.join(__dirname, "..", "fundle.config.env");
if (!fs.existsSync(envPath)) {
  console.error(`❌ fundle.config.env not found at ${envPath}`);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
envContent.split("\n").forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const match = trimmed.match(/^([A-Z_]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
});

const SUPABASE_URL = env.SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("❌ Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in fundle.config.env");
  console.error(`   SUPABASE_URL: ${SUPABASE_URL ? "✓" : "✗"}`);
  console.error(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${ANON_KEY ? "✓" : "✗"}`);
  process.exit(1);
}

// Service role key is optional: only used locally to read result_submissions
// (RLS-locked from anon) for the guess-timing chart. Never leaves localhost.
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";

const htmlPath = path.join(__dirname, "growth-chart.html");
let htmlTemplate = fs.readFileSync(htmlPath, "utf8");

// Escape quotes for safe injection into script tag
const escapeQuotes = s => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const credentialsScript = `<script>` +
  `window._supabase_url="${escapeQuotes(SUPABASE_URL)}";` +
  `window._anon_key="${escapeQuotes(ANON_KEY)}";` +
  (SERVICE_KEY ? `window._service_key="${escapeQuotes(SERVICE_KEY)}";` : "") +
  `</script>`;
htmlTemplate = htmlTemplate.replace("</head>", `${credentialsScript}</head>`);

const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/growth-chart.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(htmlTemplate);
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

const port = 3456;
server.listen(port, () => {
  const link = `http://localhost:${port}`;
  console.log(`✓ Growth chart server running at ${link}`);
  console.log(`  Credentials from fundle.config.env will auto-load on page open`);
  console.log(`  Guess-timing chart: ${SERVICE_KEY ? "enabled (service role)" : "disabled (no SUPABASE_SERVICE_ROLE_KEY)"}`);
  console.log(`\n  Press Ctrl+C to stop`);

  // Try to open in browser
  const { execSync } = require("child_process");
  try {
    execSync(`open "${link}"`);
  } catch (e) {
    // Browser open failed, just show the URL
  }
});

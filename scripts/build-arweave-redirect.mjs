#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const targetInput = process.argv[2] || process.env.TARGET_URL;

if (!targetInput) {
  console.error("Usage: node scripts/build-arweave-redirect.mjs https://<user>.github.io/<repo>/");
  console.error("Or: TARGET_URL=https://<user>.github.io/<repo>/ node scripts/build-arweave-redirect.mjs");
  process.exit(1);
}

let targetUrl;
try {
  targetUrl = new URL(targetInput);
} catch {
  console.error(`Invalid target URL: ${targetInput}`);
  process.exit(1);
}

if (targetUrl.protocol !== "https:" && targetUrl.protocol !== "http:") {
  console.error("Target URL must use http:// or https://");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const templatePath = resolve(root, "arweave-redirect/index.template.html");
const outputDir = resolve(root, "arweave-redirect/generated");
const outputPath = resolve(outputDir, "index.html");

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const target = targetUrl.href;
const template = await readFile(templatePath, "utf8");
const html = template
  .replaceAll("__TARGET_URL_HTML__", escapeHtml(target))
  .replaceAll("__TARGET_URL_JSON__", JSON.stringify(target));

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, html);

console.log(`Wrote ${outputPath}`);
console.log(`Target ${target}`);
console.log("Upload that index.html to Arweave with Content-Type: text/html.");

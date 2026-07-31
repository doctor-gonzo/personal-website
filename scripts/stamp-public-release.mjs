import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || "");
const releaseId = process.argv[3] || "";
const releaseMarker = 'data-site-release="development"';

if (!root || !fs.existsSync(root)) {
  console.error("Usage: node scripts/stamp-public-release.mjs <snapshot-dir> <release-id>");
  process.exit(1);
}

if (!/^[0-9A-Za-z._-]+$/.test(releaseId)) {
  console.error("Release ID may contain only letters, numbers, dots, underscores, and hyphens.");
  process.exit(1);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function stampUrl(value) {
  if (/^(?:[a-z]+:|\/\/|#)/i.test(value)) return value;

  const hashIndex = value.indexOf("#");
  const hash = hashIndex >= 0 ? value.slice(hashIndex) : "";
  const request = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
  const separator = request.includes("?") ? "&" : "?";

  return `${request}${separator}_site_release=${releaseId}${hash}`;
}

let stampedPages = 0;

for (const filePath of walk(root)) {
  if (!filePath.endsWith(".html")) continue;

  const original = fs.readFileSync(filePath, "utf8");
  if (!original.includes(releaseMarker)) continue;

  const stamped = original
    .replaceAll(releaseMarker, `data-site-release="${releaseId}"`)
    .replace(
      /\b(href|src)="([^"]+\.(?:css|js)(?:\?[^"]*)?)"/gi,
      (_match, attribute, value) => `${attribute}="${stampUrl(value)}"`,
    );

  fs.writeFileSync(filePath, stamped);
  stampedPages += 1;
}

for (const filePath of walk(root)) {
  if (!filePath.endsWith(".css")) continue;

  const original = fs.readFileSync(filePath, "utf8");
  const stamped = original.replace(
    /url\((["']?)([^)"']+)\1\)/gi,
    (match, quote, value) => {
      const trimmed = value.trim();
      if (/^(?:data:|[a-z]+:|\/\/|#)/i.test(trimmed)) return match;
      return `url(${quote}${stampUrl(trimmed)}${quote})`;
    },
  );

  fs.writeFileSync(filePath, stamped);
}

fs.writeFileSync(
  path.join(root, "release.json"),
  `${JSON.stringify({ id: releaseId }, null, 2)}\n`,
);

if (stampedPages === 0) {
  console.error("No release-enabled HTML pages were found in the snapshot.");
  process.exit(1);
}

console.log(`Stamped ${stampedPages} public pages with release ${releaseId}.`);

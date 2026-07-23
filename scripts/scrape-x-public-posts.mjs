#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const DEFAULT_ACCOUNT = "charlie______t";
const DEFAULT_OUTPUT = "data/tweets/public-posts.json";

function usage() {
  return `Usage:
  node scripts/scrape-x-public-posts.mjs ~/Desktop/Twitter.webloc --write
  node scripts/scrape-x-public-posts.mjs https://x.com/${DEFAULT_ACCOUNT} --limit 100 --write

Options:
  --account <handle>       Twitter/X handle. Default: ${DEFAULT_ACCOUNT}
  --out <file>             Output JSON path. Default: ${DEFAULT_OUTPUT}
  --limit <number>         Keep up to N newest posts. Default: 100
  --max-scrolls <number>   Timeline scroll attempts. Default: 40
  --include-replies        Include replies. Default: false.
  --headful                Show the browser while scraping.
  --user-data-dir <dir>    Persistent browser profile for login/cookies.
  --write                  Write output. Without this, the script is a dry run.

Requires Playwright:
  npm install --save-dev playwright
  npx playwright install chromium
`;
}

function parseArgs(argv) {
  const options = {
    account: DEFAULT_ACCOUNT,
    includeReplies: false,
    input: "",
    headful: false,
    limit: 100,
    maxScrolls: 40,
    out: DEFAULT_OUTPUT,
    userDataDir: "",
    write: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--account") {
      options.account = cleanAccount(argv[++index] || DEFAULT_ACCOUNT);
    } else if (arg === "--out") {
      options.out = argv[++index] || DEFAULT_OUTPUT;
    } else if (arg === "--limit") {
      options.limit = Number.parseInt(argv[++index] || "100", 10) || 100;
    } else if (arg === "--max-scrolls") {
      options.maxScrolls = Number.parseInt(argv[++index] || "40", 10) || 40;
    } else if (arg === "--include-replies") {
      options.includeReplies = true;
    } else if (arg === "--headful") {
      options.headful = true;
    } else if (arg === "--user-data-dir") {
      options.userDataDir = argv[++index] || "";
    } else if (arg === "--write") {
      options.write = true;
    } else if (!arg.startsWith("--") && !options.input) {
      options.input = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function expandHome(value) {
  if (!value) return value;
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

function cleanAccount(value) {
  return String(value || "")
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "")
    .split(/[/?#]/)[0]
    .trim() || DEFAULT_ACCOUNT;
}

function extractUrlFromText(raw) {
  const plistMatch = raw.match(/<key>URL<\/key>\s*<string>([^<]+)<\/string>/i);
  if (plistMatch) return plistMatch[1];

  const stringMatch = raw.match(/<string>(https?:\/\/[^<]+)<\/string>/i);
  if (stringMatch) return stringMatch[1];

  const urlFileMatch = raw.match(/^URL=(.+)$/im);
  if (urlFileMatch) return urlFileMatch[1].trim();

  const htmlMatch = raw.match(/https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]+/i);
  if (htmlMatch) return htmlMatch[0];

  return "";
}

async function findDesktopBookmark() {
  const desktop = path.join(os.homedir(), "Desktop");
  const entries = await readdir(desktop, { withFileTypes: true }).catch(() => []);
  const candidates = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.(webloc|url|html?)$/i.test(name))
    .filter((name) => /(twitter|x\.com|charlie)/i.test(name));

  for (const name of candidates) {
    const file = path.join(desktop, name);
    const raw = await readFile(file, "utf8").catch(() => "");
    const url = extractUrlFromText(raw);
    if (/^https?:\/\/(www\.)?(x|twitter)\.com\//i.test(url)) {
      return file;
    }
  }

  return "";
}

async function resolveProfileUrl(input, fallbackAccount) {
  let source = input;

  if (!source) {
    source = await findDesktopBookmark();
  }

  if (!source) {
    return `https://x.com/${fallbackAccount}`;
  }

  if (/^https?:\/\//i.test(source)) {
    const account = cleanAccount(source) || fallbackAccount;
    return `https://x.com/${account}`;
  }

  const raw = await readFile(expandHome(source), "utf8");
  const url = extractUrlFromText(raw);

  if (!url) {
    throw new Error(`Could not find a Twitter/X URL in ${source}`);
  }

  const account = cleanAccount(url) || fallbackAccount;
  return `https://x.com/${account}`;
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    throw new Error(
      "Playwright is not installed. Run: npm install --save-dev playwright && npx playwright install chromium"
    );
  }
}

function sortPosts(posts) {
  return posts.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

async function extractVisiblePosts(page, account, includeReplies) {
  return page.evaluate(
    ({ accountName, keepReplies }) => {
      const wanted = accountName.toLowerCase();
      const posts = [];

      function normalizeHref(href) {
        try {
          return new URL(href, window.location.origin).href;
        } catch {
          return "";
        }
      }

      document.querySelectorAll('article[data-testid="tweet"]').forEach((article) => {
        const statusLinks = Array.from(article.querySelectorAll('a[href*="/status/"]'))
          .map((anchor) => normalizeHref(anchor.getAttribute("href") || ""))
          .filter(Boolean);

        const ownStatus = statusLinks.find((href) => {
          try {
            const url = new URL(href);
            return url.pathname.toLowerCase().startsWith(`/${wanted}/status/`);
          } catch {
            return false;
          }
        });

        if (!ownStatus) return;

        const idMatch = ownStatus.match(/\/status\/(\d+)/);
        if (!idMatch) return;

        const socialContext = article.querySelector('[data-testid="socialContext"]');
        const articleText = article.innerText || "";
        const isReply = /Replying to @/i.test(articleText);
        const isRepost = socialContext && /reposted/i.test(socialContext.innerText || "");

        if (!keepReplies && isReply) return;
        if (isRepost) return;

        const tweetText = article.querySelector('[data-testid="tweetText"]');
        const time = article.querySelector("time");
        const urls = tweetText
          ? Array.from(tweetText.querySelectorAll("a[href]"))
              .map((anchor) => normalizeHref(anchor.getAttribute("href") || ""))
              .filter(Boolean)
          : [];

        posts.push({
          id: idMatch[1],
          createdAt: time ? time.getAttribute("datetime") || "" : "",
          text: tweetText ? tweetText.innerText.trim() : "",
          url: `https://x.com/${accountName}/status/${idMatch[1]}`,
          urls
        });
      });

      return posts;
    },
    { accountName: account, keepReplies: includeReplies }
  );
}

async function scrape(options) {
  const profileUrl = await resolveProfileUrl(options.input, options.account);
  const account = cleanAccount(profileUrl);
  const { chromium } = await loadPlaywright();

  let browser;
  let context;

  if (options.userDataDir) {
    context = await chromium.launchPersistentContext(expandHome(options.userDataDir), {
      headless: !options.headful,
      viewport: { width: 1280, height: 1100 }
    });
  } else {
    browser = await chromium.launch({
      headless: !options.headful
    });
    context = await browser.newContext({
      viewport: { width: 1280, height: 1100 }
    });
  }

  const page = await context.newPage();
  const postsById = new Map();

  await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.waitForSelector('article[data-testid="tweet"]', { timeout: 30000 }).catch(() => {});

  let previousHeight = 0;

  for (let scroll = 0; scroll < options.maxScrolls; scroll += 1) {
    const visiblePosts = await extractVisiblePosts(page, account, options.includeReplies);
    visiblePosts.forEach((post) => {
      postsById.set(post.id, post);
    });

    if (postsById.size >= options.limit) break;

    const nextHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.mouse.wheel(0, 2600);
    await page.waitForTimeout(1200);

    if (nextHeight === previousHeight && scroll > 4) break;
    previousHeight = nextHeight;
  }

  await context.close();
  if (browser) await browser.close();

  return {
    account,
    profileUrl,
    posts: sortPosts(Array.from(postsById.values())).slice(0, options.limit)
  };
}

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    process.exit(0);
  }

  const result = await scrape(options);
  const archive = {
    account: result.account,
    source: "Public X profile scrape",
    generatedAt: new Date().toISOString(),
    posts: result.posts
  };
  const output = JSON.stringify(archive, null, 2) + "\n";

  if (!options.write) {
    console.log(`Dry run: scraped ${result.posts.length} posts from ${result.profileUrl}`);
    console.log(`Output target: ${options.out}`);
    console.log("Add --write to update the static tweet archive.");
    process.exit(0);
  }

  await mkdir(path.dirname(options.out), { recursive: true });
  await writeFile(options.out, output, "utf8");
  console.log(`Wrote ${result.posts.length} posts to ${options.out}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

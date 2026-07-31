#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_ACCOUNT = "charlie______t";
const DEFAULT_OUTPUT = "data/tweets/public-posts.json";

function usage() {
  return `Usage:
  node scripts/import-x-archive.mjs /path/to/x-archive --write

Options:
  --account <handle>       Twitter/X handle for status URLs. Default: ${DEFAULT_ACCOUNT}
  --out <file>             Output JSON path. Default: ${DEFAULT_OUTPUT}
  --limit <number>         Keep only the newest N posts.
  --include-replies        Include replies. Default: false.
  --include-leading-mentions
                           Include posts that begin with @username. Default: false.
  --include-retweets       Include retweets. Default: false.
  --write                  Write output. Without this, the script is a dry run.
`;
}

function parseArgs(argv) {
  const options = {
    account: DEFAULT_ACCOUNT,
    archivePath: "",
    includeLeadingMentions: false,
    includeReplies: false,
    includeRetweets: false,
    limit: 0,
    out: DEFAULT_OUTPUT,
    write: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--account") {
      options.account = argv[++index] || DEFAULT_ACCOUNT;
    } else if (arg === "--out") {
      options.out = argv[++index] || DEFAULT_OUTPUT;
    } else if (arg === "--limit") {
      options.limit = Number.parseInt(argv[++index] || "0", 10) || 0;
    } else if (arg === "--include-replies") {
      options.includeReplies = true;
    } else if (arg === "--include-leading-mentions") {
      options.includeLeadingMentions = true;
    } else if (arg === "--include-retweets") {
      options.includeRetweets = true;
    } else if (arg === "--write") {
      options.write = true;
    } else if (!arg.startsWith("--") && !options.archivePath) {
      options.archivePath = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function findTweetFiles(targetPath) {
  const resolved = path.resolve(targetPath);

  if (/\.(js|json)$/i.test(resolved)) {
    const fileName = path.basename(resolved);
    if (!isPrimaryTweetArchiveFile(fileName)) {
      throw new Error(`Refusing to import non-primary tweet archive file: ${fileName}`);
    }
    return [resolved];
  }

  const candidates = [];

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (isPrimaryTweetArchiveFile(entry.name)) {
        candidates.push(fullPath);
      }
    }
  }

  await walk(resolved);

  return candidates;
}

function isPrimaryTweetArchiveFile(fileName) {
  const name = fileName.toLowerCase();

  return (
    name === "tweets.js" ||
    name === "tweets.json" ||
    name === "tweet.js" ||
    name === "tweet.json" ||
    /^tweets-part\d+\.(js|json)$/.test(name)
  );
}

function parseArchiveFile(raw) {
  const trimmed = raw.trim();

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  const assignmentIndex = trimmed.indexOf("=");
  if (assignmentIndex === -1) {
    throw new Error("Archive file is not JSON or a JS assignment.");
  }

  const jsonText = trimmed.slice(assignmentIndex + 1).replace(/;\s*$/, "");
  return JSON.parse(jsonText);
}

function normalizeTweet(record, account) {
  const tweet = record.tweet || record;
  const id = tweet.id_str || tweet.id || "";
  const createdAt = tweet.created_at || tweet.createdAt || "";
  const text = tweet.full_text || tweet.text || "";

  if (!id || !text) return null;

  const isReply = Boolean(tweet.in_reply_to_status_id || tweet.in_reply_to_status_id_str);
  const isLeadingMention = /^@\w+/.test(text);
  const isRetweet = text.startsWith("RT @");
  const media = normalizeMedia(tweet);
  const urls = normalizeUrls(tweet);
  const quotedTweet = normalizeQuotedTweet(tweet, urls);

  return {
    id,
    createdAt,
    text,
    url: `https://x.com/${account}/status/${id}`,
    urls,
    quotedTweet,
    media,
    isReply,
    isLeadingMention,
    isRetweet
  };
}

function normalizeUrls(tweet) {
  const urls = (tweet.entities && Array.isArray(tweet.entities.urls)) ? tweet.entities.urls : [];
  const byShortUrl = new Map();

  urls.forEach((item) => {
    const shortUrl = item.url || "";
    const expandedUrl = item.expanded_url || item.expandedUrl || "";
    const displayUrl = item.display_url || item.displayUrl || "";

    if (!shortUrl && !expandedUrl) return;

    byShortUrl.set(shortUrl || expandedUrl, {
      shortUrl,
      expandedUrl,
      displayUrl
    });
  });

  return Array.from(byShortUrl.values());
}

function normalizeQuotedTweet(tweet, urls) {
  const permalink = tweet.quoted_status_permalink || tweet.quotedStatusPermalink || {};
  const explicitUrl = permalink.expanded || permalink.url || permalink.display || "";
  const statusUrl = explicitUrl || (urls.find((item) => {
    return isStatusUrl(item.expandedUrl || item.shortUrl || "");
  }) || {}).expandedUrl || "";
  const id = tweet.quoted_status_id_str || tweet.quoted_status_id || extractStatusId(statusUrl);

  if (!statusUrl && !id) return null;

  const url = statusUrl || `https://x.com/i/status/${id}`;
  const sourceUrl = urls.find((item) => item.expandedUrl === statusUrl || item.expandedUrl === url);

  return {
    id: id ? String(id) : "",
    url,
    displayUrl: sourceUrl?.displayUrl || displayStatusUrl(url),
    shortUrl: sourceUrl?.shortUrl || ""
  };
}

function isStatusUrl(value) {
  return /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[^/]+\/status\/\d+/i.test(value || "");
}

function extractStatusId(value) {
  const match = String(value || "").match(/\/status\/(\d+)/);
  return match ? match[1] : "";
}

function displayStatusUrl(value) {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return value || "Quoted tweet";
  }
}

function normalizeMedia(tweet) {
  const media = [
    ...((tweet.entities && Array.isArray(tweet.entities.media)) ? tweet.entities.media : []),
    ...((tweet.extended_entities && Array.isArray(tweet.extended_entities.media)) ? tweet.extended_entities.media : [])
  ];
  const byUrl = new Map();

  media.forEach((item) => {
    const imageUrl = item.media_url_https || item.media_url || "";
    if (!imageUrl) return;

    byUrl.set(`${imageUrl}:${item.expanded_url || ""}`, {
      type: item.type || "photo",
      url: imageUrl,
      expandedUrl: item.expanded_url || "",
      displayUrl: item.display_url || "",
      shortUrl: item.url || ""
    });
  });

  return Array.from(byUrl.values());
}

async function readTweets(files, account) {
  const posts = [];

  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const parsed = parseArchiveFile(raw);
    const records = Array.isArray(parsed) ? parsed : parsed.tweets || parsed.posts || [];

    records.forEach((record) => {
      const normalized = normalizeTweet(record, account);
      if (normalized) {
        posts.push(normalized);
      }
    });
  }

  const unique = new Map();
  posts.forEach((post) => {
    unique.set(post.id, post);
  });

  return Array.from(unique.values()).sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help || !options.archivePath) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }

  const files = await findTweetFiles(options.archivePath);

  if (files.length === 0) {
    throw new Error("No tweet archive files found.");
  }

  let posts = await readTweets(files, options.account);

  if (!options.includeReplies) {
    posts = posts.filter((post) => !post.isReply);
  }

  if (!options.includeLeadingMentions) {
    posts = posts.filter((post) => !post.isLeadingMention);
  }

  if (!options.includeRetweets) {
    posts = posts.filter((post) => !post.isRetweet);
  }

  if (options.limit > 0) {
    posts = posts.slice(0, options.limit);
  }

  posts = posts.map(({ isReply, isLeadingMention, isRetweet, ...post }) => {
    if (!post.media || post.media.length === 0) {
      delete post.media;
    }

    if (!post.urls || post.urls.length === 0) {
      delete post.urls;
    }

    if (!post.quotedTweet) {
      delete post.quotedTweet;
    }

    return post;
  });

  const archive = {
    account: options.account,
    source: "X archive import",
    generatedAt: new Date().toISOString(),
    posts
  };

  const output = JSON.stringify(archive, null, 2) + "\n";

  if (!options.write) {
    console.log(`Dry run: ${posts.length} posts would be written to ${options.out}`);
    console.log("Add --write to update the static tweet archive.");
    process.exit(0);
  }

  await mkdir(path.dirname(options.out), { recursive: true });
  await writeFile(options.out, output, "utf8");
  console.log(`Wrote ${posts.length} posts to ${options.out}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

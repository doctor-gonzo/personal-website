#!/usr/bin/env node

import { cp, mkdir, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.dirname(SCRIPT_DIR);
const DEFAULT_ACCOUNT = process.env.TWITTER_ARCHIVE_ACCOUNT || "charlie______t";
const DEFAULT_OUTPUT = process.env.TWITTER_PUBLIC_TWEETS_OUT || "";
const DEFAULT_WORK_ROOT = process.env.TWITTER_ARCHIVE_WORK_ROOT || "";

function usage() {
  return `Usage:
  node scripts/process-twitter-archive.mjs <archive.zip> --work-root <work-dir> --out <public-json> --write
  node scripts/process-twitter-archive.mjs <archive-folder> --work-root <work-dir> --out <public-json> --limit 200 --write

What it does:
  1. Copies the archive into <work-dir>/twitter-archive-public-posts-<timestamp>/
  2. Extracts it if the input is a .zip file.
  3. Writes public top-level posts to <public-json>.

Defaults:
  - excludes replies
  - excludes posts that begin with @username
  - excludes reposts/retweets
  - keeps quote posts
  - keeps attached tweet images
  - dry-run unless --write is passed

Options:
  --account <handle>       Twitter/X handle for status URLs. Default: ${DEFAULT_ACCOUNT}
  --out <file>             Output JSON path.
  --limit <number>         Keep only the newest N posts.
  --name <folder-name>     Local copied archive folder name.
  --work-root <dir>        Where to create the copied archive folder.
  --include-replies        Include replies. Default: false.
  --include-leading-mentions
                           Include posts that begin with @username. Default: false.
  --include-retweets       Include retweets. Default: false.
  --write                  Write output JSON. Without this, importer is dry-run.

Environment:
  TWITTER_ARCHIVE_WORK_ROOT   Used when --work-root is omitted.
  TWITTER_PUBLIC_TWEETS_OUT   Used when --out is omitted.
  TWITTER_ARCHIVE_ACCOUNT     Used when --account is omitted.
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
    name: "",
    out: DEFAULT_OUTPUT,
    workRoot: DEFAULT_WORK_ROOT,
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
    } else if (arg === "--name") {
      options.name = argv[++index] || "";
    } else if (arg === "--work-root") {
      options.workRoot = argv[++index] || DEFAULT_WORK_ROOT;
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

function expandHome(value) {
  if (!value) return value;
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

function timestamp() {
  return new Date()
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[:]/g, "")
    .replace("T", "-");
}

function safeName(value) {
  return String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function copyArchive(inputPath, targetRoot) {
  const inputStats = await stat(inputPath);
  await mkdir(targetRoot, { recursive: true });

  if (inputStats.isDirectory()) {
    const copiedFolder = path.join(targetRoot, "archive-copy");
    await cp(inputPath, copiedFolder, {
      dereference: false,
      errorOnExist: false,
      force: true,
      recursive: true
    });

    return {
      copiedPath: copiedFolder,
      importPath: copiedFolder
    };
  }

  const copiedZip = path.join(targetRoot, path.basename(inputPath));
  await cp(inputPath, copiedZip, {
    errorOnExist: false,
    force: true
  });

  if (!/\.zip$/i.test(inputPath)) {
    return {
      copiedPath: copiedZip,
      importPath: copiedZip
    };
  }

  const extractedFolder = path.join(targetRoot, "extracted");
  await mkdir(extractedFolder, { recursive: true });
  await execFileAsync("unzip", ["-q", copiedZip, "-d", extractedFolder]);

  return {
    copiedPath: copiedZip,
    importPath: extractedFolder
  };
}

function buildImporterArgs(options, importPath) {
  const args = [
    path.join(SCRIPT_DIR, "import-x-archive.mjs"),
    importPath,
    "--account",
    options.account,
    "--out",
    options.out
  ];

  if (options.limit > 0) {
    args.push("--limit", String(options.limit));
  }

  if (options.includeReplies) {
    args.push("--include-replies");
  }

  if (options.includeLeadingMentions) {
    args.push("--include-leading-mentions");
  }

  if (options.includeRetweets) {
    args.push("--include-retweets");
  }

  if (options.write) {
    args.push("--write");
  }

  return args;
}

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help || !options.archivePath) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }

  if (!options.workRoot) {
    throw new Error("Pass --work-root <dir> or set TWITTER_ARCHIVE_WORK_ROOT.");
  }

  if (!options.out) {
    throw new Error("Pass --out <file> or set TWITTER_PUBLIC_TWEETS_OUT.");
  }

  const archivePath = path.resolve(expandHome(options.archivePath));
  const outputPath = path.isAbsolute(expandHome(options.out))
    ? expandHome(options.out)
    : path.resolve(REPO_ROOT, expandHome(options.out));
  const folderName = safeName(options.name) || `twitter-archive-public-posts-${timestamp()}`;
  const targetRoot = path.resolve(expandHome(options.workRoot), folderName);

  const { copiedPath, importPath } = await copyArchive(archivePath, targetRoot);

  console.log(`Copied archive to: ${copiedPath}`);
  if (importPath !== copiedPath) {
    console.log(`Extracted archive to: ${importPath}`);
  }

  const importerArgs = buildImporterArgs({ ...options, out: outputPath }, importPath);
  const { stdout, stderr } = await execFileAsync(process.execPath, importerArgs, {
    cwd: REPO_ROOT
  });

  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  if (!options.write) {
    console.log("Dry run complete. Re-run with --write to update the repo JSON.");
  } else {
    console.log(`Publishable tweet file ready: ${outputPath}`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

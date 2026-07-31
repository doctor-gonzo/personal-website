# Charlie Thompson Personal Site

Minimal static personal site for public work, thoughts/posts, resume/work history, and research notes.
There is no build step: open `index.html` directly, publish the folder with
GitHub Pages, or upload the folder to IPFS and point an ENS contenthash at it.

The `.nojekyll` marker tells GitHub Pages to serve the files directly.

## Main Files

- `index.html` - public homepage with Xbox 360 Blades and Windows 95 Desktop modes.
- `resume.html` - public resume and work history.
- `resume.html.md` - Markdown resume for LLMs, agents, and plain-text reuse.
- `thoughts.html` - a mixed Featured landing view plus separate static tweet
  archive and longer-form post views.
- `thoughts.js` - renders the local static tweet archive on `thoughts.html`,
  including the pinned featured tweet, profile portraits, search/year filters,
  attachment modals, and local quoted-tweet context when metadata is present.
- `thoughts.html.md` - Markdown posts index for LLMs, agents, and plain-text reuse.
- `pictures.html` - image-first carousel with All, AI, and Camera filters plus
  an optional collection grid, backed by `data/pictures.json`.
- `pictures.js` - renders the carousel, thumbnail rail, collection filters,
  optional grid, and picture lightbox.
- `release-watchdog.js` and `release.json` - detect a newer public release when
  a page loads, returns from browser history, regains visibility, reconnects,
  or remains open for five minutes. A changed release ID reloads the page once
  with a cache-busting URL.
- `pictures.html.md` - Markdown pictures page summary for LLMs and agents.
- `assets/pictures/ai/` and `assets/pictures/camera/` - local image folders for
  the two picture collections.
- `assets/xbox360/*-midjourney.jpg` and
  `assets/xbox360/zuzalu-social-infrastructure-midjourney.png` - the active
  Xbox 360 homepage artwork set, balancing black fields with broad acid-lime
  surfaces and reflective glass.
- `thoughts/` - static post templates and future post files.
- `data/tweets/public-posts.json` - public, reviewed subset of imported
  tweets. This is safe to publish when populated intentionally.
- `links.html` - public links page.
- `links.html.md` - Markdown links page.
- `zuzalu.html` - 2023 Zuzalu talk, static argument explorer, and embedded
  exported AI safety ideas map.
- `zuzalu.html.md` - Markdown summary of the Zuzalu talk/map page.
- `assets/ai-safety-map/WebsiteContextEngine_AISafetyIdeasMap_.html` - exported map document.
- `quantum.html` - quantum computing and Bitcoin report page.
- `quantum-report.html` - HTML transcript generated from the PDF report.
- `assets/reports/QC_BTC_Dec2025.pdf` - original quantum report PDF.
- `assets/reports/QC_BTC_Dec2025.txt` - plain-text extraction of the report.
- `arweave-redirect/index.template.html` - tiny redirect page template for an
  Arweave upload that points ENS visitors to the canonical GitHub Pages site.
- `scripts/build-arweave-redirect.mjs` - generator for the Arweave redirect
  upload artifact.

## Before Publishing

- Use `scripts/prepare-public-release.sh` and publish its clean snapshot rather
  than pushing this working repository's full history. The snapshot excludes
  local prototypes, NFT experiments, private scratch files, editor state, and
  raw social-media archives. It also generates a unique release ID, stamps that
  ID into every public page and local CSS/JavaScript URL, and writes the matching
  `release.json` used by already-open tabs.
- Confirm that `charlie_thompson@protonmail.com` should remain public.
- Keep `resume.html` and `resume.html.md` aligned when editing resume content.
- Keep `thoughts.html` and `thoughts.html.md` aligned when adding posts.
- Add picture files under `assets/pictures/ai/` or `assets/pictures/camera/`
  and list them in the matching collection in `data/pictures.json`.
- Do not publish the source resume PDF unless you intentionally want to expose
  its full contents.

## Thoughts / Posts

Posts are plain static files committed to this repo. To add one, copy
`thoughts/_template.html` to a dated filename under `thoughts/`, edit it, then
link it from `thoughts.html` and `thoughts.html.md`. For discoverability, also
add the final URL to `sitemap.xml`, `sitemap.txt`, and optionally `feed.xml`,
`llms.txt`, and `llms-full.txt`.

Tweets can be imported from a downloaded X archive without using the X API:

```sh
SITE="/path/to/personal-website"

node "$SITE/scripts/process-twitter-archive.mjs" "$ARCHIVE" \
  --work-root "$WORK_ROOT" \
  --out data/tweets/public-posts.json \
  --limit 100

node "$SITE/scripts/process-twitter-archive.mjs" "$ARCHIVE" \
  --work-root "$WORK_ROOT" \
  --out data/tweets/public-posts.json \
  --limit 100 \
  --write
```

Set `ARCHIVE` to the downloaded X archive zip or folder, and set `WORK_ROOT` to
where the private working copy should be created, for example a Desktop folder.
The script can be run from any directory when invoked through `SITE`. Relative
`--out` paths are resolved against the site root. The first command makes a
renamed copy of the archive outside the repo and performs a dry run. The second
command writes only
`data/tweets/public-posts.json`, which GitHub Pages serves as a static file and
`thoughts.html` renders in the browser. The page opens on a mixed Featured view,
then keeps the full archive explicitly sorted newest-first behind the Tweets
tab and places its search and year controls inside a collapsed Filter section.
Tweet cards use the local copy of Charlie's public Twitter profile picture.
Replies and reposts are excluded by default, as are posts that begin with
`@username`. Attached tweet images are included as public media URLs, and
expanded public URL metadata is preserved so quoted tweets can link back to
their source. Raw archive
folders such as `twitter-archive/`, `x-archive/`, and `data/tweets/raw/` are
gitignored as a guardrail.

If you already copied/extracted the archive yourself, you can run the lower
level importer directly:

```sh
node scripts/import-x-archive.mjs /path/to/twitter-archive --limit 100 --write
```

There is also a best-effort public profile scraper for a desktop bookmark or
profile URL. It is less reliable than archive import because X page markup can
change and headless browsers can be rate-limited.

```sh
npm install --save-dev playwright
npx playwright install chromium
node scripts/scrape-x-public-posts.mjs ~/Desktop/Twitter.webloc --limit 100
node scripts/scrape-x-public-posts.mjs ~/Desktop/Twitter.webloc --limit 100 --write
```

Replies and reposts are excluded by default. Use `--headful` if the public page
does not load in headless mode, and `--user-data-dir x-scrape-profile` if you
need a persistent browser profile. The profile folder is gitignored.

## Style Modes

The deployable stylesheet is `styles.css`; there is no Sass/SCSS build. The
public settings cog exposes three launch modes: `minimal`, `xbox360`, and
`windows95desktop`; `minimal` is the default. The selector presents these as
`minimal.scss`, `xbox360.scss`, and `windows95.scss`; the Windows mode keeps its
existing internal identifier for saved-preference and CSS compatibility. Theme
switching is controlled by `body[data-style-mode]` and persisted locally by
`site-settings.js`. Pages
embedded inside the Windows 95 desktop shell still force `minimal` regardless
of the saved public theme.
The `xbox360` mode recreates the original Blades layout with a full-height active
blade and silver side spines on wide screens. On narrow screens, the active
content becomes a straight, internally scrolling green panel and the same four
blades form a compact navigation dock at the bottom.
The `windows95desktop` mode turns the homepage into a simulated desktop with a
Windows 95-style Start menu, taskbar settings, selectable/movable desktop
icons, marquee selection, multi-icon dragging, and movable, resizable,
minimizable desktop windows. Thoughts, Pictures, Quantum, and
Zuzalu open inline in those desktop windows. Pages embedded in
desktop windows use `?embed=desktop-window` so they do not render a nested
site header, settings cog, or desktop shell. Heavy embedded pages and documents
load only when their desktop window is opened for the first time.

## Demo Controls

The demo-feature hook is off by default and no public demo toggle is currently
rendered. Keep `site-settings.js` when publishing: it constructs the Xbox blade
navigation and preview as well as applying and persisting the selected theme.

## Discovery Files

- `robots.txt` allows crawling and points to `sitemap.xml`.
- `robots.txt` explicitly allows common AI/search crawlers including
  `OAI-SearchBot`, `GPTBot`, `ChatGPT-User`, `ClaudeBot`, and
  `PerplexityBot`.
- `sitemap.xml` and `sitemap.txt` expose canonical pages.
- `llms.txt` and `llms-full.txt` provide LLM-readable summaries.
- `index.html.md`, `resume.html.md`, `thoughts.html.md`, `pictures.html.md`, and
  `quantum.html.md` provide Markdown copies/summaries.
- `agents.txt` and `agent-manifest.txt` expose agent-oriented site policy and
  discovery hints.
- `feed.xml` provides an RSS feed for updates.
- `humans.txt` identifies the site owner and technology.
- `.well-known/security.txt` gives a security contact.
- `favicon.svg`, `favicon-16x16.png`, `favicon-32x32.png`,
  `apple-touch-icon.png`, `icon-192.png`, and `icon-512.png` provide the
  saluting-face browser and install icons. The artwork is from
  [Twemoji](https://github.com/jdecked/twemoji) and is licensed under
  [CC BY 4.0](https://github.com/jdecked/twemoji/blob/main/LICENSE-GRAPHICS).
- `manifest.webmanifest` and `assets/social/charlie-thompson-preview.png`
  provide install and social-sharing metadata.

## Local TODO

`TODO/` is gitignored for local improvement plans. It currently includes the
Twitter/X archive import plan and Arweave/ENS redirect plan.

## GitHub Pages

The canonical public URL is `https://charliethompson.lol/`; `CNAME` and the
discovery metadata are already configured for it.

1. Run `bash scripts/prepare-public-release.sh` and review the generated clean
   snapshot under `.codex/scratch/public-release-*/`.
2. Create the public GitHub repository named `personal-website` from that
   snapshot, using a fresh one-commit history.
3. In GitHub, open `Settings` -> `Pages`, choose **Deploy from a branch**, then
   select `main` and `/ (root)`.
4. In Namecheap's **Advanced DNS** screen, add four `A` records for host `@`:
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and
   `185.199.111.153`. Add a `CNAME` record for host `www` pointing directly to
   `<github-username>.github.io` (without `/personal-website`).
5. Verify `charliethompson.lol` in the GitHub account's Pages settings before
   activating the repository custom domain. Keep GitHub's verification `TXT`
   record in Namecheap after verification.
6. After DNS and the Pages certificate are ready, enable **Enforce HTTPS**.

## ENS / IPFS

ENS decentralized website hosting uses a resolver `contenthash`, commonly
pointing at `ipfs://...`, `ipns://...`, `bzz://...`, or `ar://...` content.

Typical flow:

1. Upload this folder to an IPFS pinning host or decentralized hosting provider.
2. Copy the resulting CID, usually as an `ipfs://...` URL.
3. Open the ENS Manager App for your name.
4. Set the name's contenthash to that IPFS URL and confirm the transaction.
5. Test through an ENS-aware browser or gateway such as `eth.limo`.

## ENS / Arweave Redirect

If the canonical site is GitHub Pages but the ENS content should live on
Arweave, generate a tiny HTML redirect and upload that file to Arweave:

```sh
node scripts/build-arweave-redirect.mjs https://<user>.github.io/<repo>/
```

The script writes `arweave-redirect/generated/index.html`. Upload that file to
Arweave with `Content-Type: text/html`, then point the ENS name's contenthash at
the resulting Arweave location. The generated page uses a canonical link, meta
refresh, JavaScript redirect, and a plain fallback link.

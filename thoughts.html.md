# Charlie Thompson - Thoughts

Thoughts is divided into two views: Tweets and Posts.

## Tweets

- Twitter: https://x.com/charlie______t
- Static archive: `thoughts.html#tweets` renders `data/tweets/public-posts.json`, a reviewed public subset imported from a downloaded X archive. Replies, reposts, and leading-mention posts are excluded by default; attached tweet images are included when present.
- Archive tools: imported tweets are explicitly sorted newest-first; search and year controls are available inside the collapsed Filter section.

## Posts

- [Agent Village Wrapped 2026](https://contextengine.xyz/posts/agent-village-wrapped-2026)

## Tweet Import

Run `node "$SITE/scripts/process-twitter-archive.mjs" "$ARCHIVE" --work-root "$WORK_ROOT" --out data/tweets/public-posts.json --limit 100` to copy the archive into a renamed working folder and preview an import.
Run it again with `--write` to update `data/tweets/public-posts.json`.

## Publishing

Posts are committed to this GitHub Pages repo. Copy `thoughts/_template.html`
or `thoughts/_template.md`, publish the new file under `thoughts/`, then add a
link from `thoughts.html`.

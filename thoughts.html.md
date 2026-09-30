# Charlie Thompson - Thoughts

Thoughts opens on a mixed Featured view, with separate Tweets and Posts views
available from the page tabs.

## Featured

- Featured tweet: [Bitcoin's underlying cryptography could be broken within 3-5 years and hardly anyone is taking the inherent difficulties of a transition to post-quantum signatures seriously](https://x.com/charlie______t/status/1777432908581531803) (April 8, 2024)
- Featured post: [Agent Village Wrapped 2026](https://contextengine.sh/posts/agent-village-wrapped-2026)

## Tweets

- Twitter: https://x.com/charlie______t
- Static archive: `thoughts.html#tweets` renders `data/tweets/public-posts.json`, a reviewed public subset imported from a downloaded X archive. Replies, reposts, and leading-mention posts are excluded by default; attached tweet images are included when present.
- Archive tools: imported tweets are explicitly sorted newest-first; search and year controls are available inside the collapsed Filter section. Tweet cards include Charlie's Twitter profile picture.

## Posts

- [Agent Village Wrapped 2026](https://contextengine.sh/posts/agent-village-wrapped-2026)

## Tweet Import

Run `node "$SITE/scripts/process-twitter-archive.mjs" "$ARCHIVE" --work-root "$WORK_ROOT" --out data/tweets/public-posts.json --limit 100` to copy the archive into a renamed working folder and preview an import.
Run it again with `--write` to update `data/tweets/public-posts.json`.

## Publishing

Posts are committed to this GitHub Pages repo. Copy `thoughts/_template.html`
or `thoughts/_template.md`, publish the new file under `thoughts/`, then add a
link from `thoughts.html`.

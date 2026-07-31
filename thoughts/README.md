# Thoughts

This directory is for posts and short notes published through the same GitHub
repo as the website.

## Add A Post

1. Copy `_template.html` to a dated file such as `2026-06-10-post-title.html`.
2. Edit the title, canonical URL, publish date, body, and robots meta tag.
   For published posts, change `noindex, nofollow` to `index, follow`.
3. Add the post link to `../thoughts.html`.
4. Add the post URL to `../sitemap.xml`, `../sitemap.txt`, and optionally
   `../feed.xml`, `../llms.txt`, and `../llms-full.txt`.
5. Commit and push the change to the GitHub Pages repo.

The site intentionally has no build step. GitHub Pages can publish it directly
from the repo root because `.nojekyll` is present.

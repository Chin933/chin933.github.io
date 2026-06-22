# chin933.github.io

Single-page academic homepage for **Qinnan Zhou**, served at
**https://chin933.github.io**.

Plain static site (HTML + CSS + a little JS) — no build step. Anything committed
to this repo is published automatically by GitHub Pages.

## Structure

Everything lives in `index.html`, organized into anchor sections:

| Section | Anchor |
|---------|--------|
| Hero (name, affiliation, research agenda) | `#top` |
| Data & Research Software (repository list) | `#software` |
| Field Works (photo gallery) | `#fieldwork` |
| Research | `#research` |

- Styling: `assets/css/main.css` (edit colors/spacing at the top).
- Gallery lightbox + mobile menu: `assets/js/main.js`.

## How to edit

- **Hero / repos / research:** edit the matching `<section>` in `index.html`.
- **Add a repository:** copy a `<div class="repo">…</div>` block in the
  `#software` section (repo name, tags, one-sentence description, GitHub link).
- **Add field photos:** drop image files into `images/fieldwork/`, then point a
  `<figure>` block's `<img src>` at your file and edit the caption. Resize photos
  to ~1600px wide and compress (e.g. squoosh.app) so the page loads fast.

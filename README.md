# chin933.github.io

Personal academic website, served at **https://chin933.github.io**.

Built as a plain static site (HTML + CSS + a little JS) — no build step, no
framework. Anything you commit to this repo is published automatically by
GitHub Pages.

## Enable the site (one-time)

1. Push this repo to GitHub.
2. Go to the repo on GitHub → **Settings → Pages**.
3. Under "Build and deployment", set **Source = Deploy from a branch**,
   **Branch = `main`** (or your default branch), folder **`/ (root)`**, Save.
4. Wait ~1 minute, then open https://chin933.github.io

## How to edit

| What | File |
|------|------|
| Home / bio / news | `index.html` |
| Research & publications | `publications.html` |
| Fieldwork photo gallery | `fieldwork.html` |
| Data & replication | `data.html` |
| CV | `cv.html` |
| Colors, fonts, layout | `assets/css/main.css` (top of file) |

### Personalize

Replace **"Your Name"**, **"Your University"**, and the `you@university.edu`
email everywhere (a global find-and-replace works well). Update the social
links in the sidebar of `index.html`.

### Add your profile photo

Save your photo as `images/profile/avatar.jpg`, then in `index.html` change
`images/profile/avatar.svg` → `images/profile/avatar.jpg`.

### Add fieldwork photos

1. Drop image files into `images/fieldwork/`.
2. In `fieldwork.html`, copy a `<figure>…</figure>` block per photo, pointing
   `src` to your file and editing the caption.
3. Tip: resize photos to ~1600px wide and compress (e.g. squoosh.app) so the
   page loads fast.

### Add data

Small files go in `data/`; link to them from `data.html`. For large datasets,
host externally and link instead.

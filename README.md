# susanket.dev (or whatever you name it)

A small static portfolio site: one page for the about / work / projects, plus a
blog that's driven by markdown files and a JSON manifest — no build step, no
CMS, no database.

## Structure

```
index.html                    the homepage (about, selected work, projects, links)
blog/index.html                the blog list — reads content/posts/manifest.json
blog/post.html                 a single post — reads ?slug= from the URL
content/posts/manifest.json    the index of every post + its metadata
content/posts/<slug>.md        the post body, plain markdown
assets/css/style.css           all styling (colors, type, layout)
assets/js/starfield.js         the background star canvas
assets/js/spinner.js           the small rotating ascii glyph in the hero
assets/js/theme.js             the light/dark toggle
assets/js/marked.min.js        vendored markdown renderer (no CDN dependency)
```

## First things to edit

Open `index.html` and search for `EDIT ME` — that marks the email address,
X/Twitter, GitHub, and LinkedIn placeholders in the "about" callout and the
"elsewhere" section. Swap those for your real links. Everything else on the
homepage is already written from your actual background — tweak freely.

## Publishing a new blog post

Two files, no code:

1. **Write the post.** Create `content/posts/your-slug.md` and just write in
   markdown. Don't add a top `# Title` — the page renders the title from the
   manifest for you.
2. **Add one entry to `content/posts/manifest.json`:**

   ```json
   {
     "slug": "your-slug",
     "title": "Your Post Title",
     "date": "2026-08-01",
     "excerpt": "One or two sentences shown on the blog list.",
     "tags": ["geospatial", "notes"],
     "published": true
   }
   ```

   `slug` must match the markdown filename. Posts sort newest-first
   automatically. Set `published: false` to keep a draft off the list without
   deleting it.
3. **Commit and push.** If it's on GitHub Pages, it's live within a minute or
   two — nothing to rebuild.

There's an example post already in place (`content/posts/welcome.md`) — read
it once, then delete it and its manifest entry whenever you're ready.

## Previewing locally

Because the blog pages `fetch()` the manifest and markdown files, opening
`index.html` by double-clicking it won't load posts — browsers block `fetch`
on the `file://` protocol. Run a tiny local server from the project folder
instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

or, if you have Node:

```bash
npx serve .
```

The homepage itself (`index.html`) will still open fine directly — it's only
the blog pages that need a server.

## Hosting it for real (GitHub Pages)

1. Create a new GitHub repo and push this whole folder to it.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick your
   default branch and the `/ (root)` folder, then save.
4. GitHub gives you a URL like `https://yourname.github.io/repo-name/` —
   that's your live site. Every future `git push` updates it automatically.

(Any other static host — Netlify, Vercel, Cloudflare Pages — works the same
way: point it at this folder, no build command needed.)

## Notes

- Theme preference (light/dark) is remembered per-browser via `localStorage`.
- The star canvas and rotating glyph both respect
  `prefers-reduced-motion` and go still for anyone with that OS setting on.
- Everything is plain HTML/CSS/JS — no framework, no `npm install` required
  to run it.

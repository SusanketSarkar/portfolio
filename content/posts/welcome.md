This site's blog has no build step, no database, and no CMS. Every post is one markdown file plus one entry in a JSON manifest. That's the whole system.

## How a post gets published

1. Write the post as a plain markdown file: `content/posts/your-slug.md`. Don't repeat the title as an `# H1` at the top — the page already renders it from the manifest — just start with the body.
2. Add one entry to `content/posts/manifest.json` with the metadata: `slug`, `title`, `date`, `excerpt`, `tags`, and `published`.
3. Commit and push. If the repo is wired up to GitHub Pages (or any static host), it's live.

That's it — two files touched per post, no code.

## Manifest fields

- **slug** — must match the markdown filename (without `.md`). It's also what shows up in the URL: `/blog/post.html?slug=your-slug`.
- **title** — shown as the page heading and in the blog list.
- **date** — `YYYY-MM-DD`. Posts are sorted newest first automatically.
- **excerpt** — one or two sentences shown on the blog list page.
- **tags** — a short list, shown next to the date.
- **published** — set to `false` to keep a draft out of the list without deleting anything. Useful for writing ahead.

## What markdown is supported

Headings, paragraphs, **bold**, *italics*, links, lists, blockquotes, code blocks, and images all render normally — this whole page is proof. Reading time is estimated automatically from word count, so there's nothing to fill in there either.

```python
# code blocks work too
def hello():
    return "hello from a fenced code block"
```

> A blockquote, for whenever a stray thought needs its own line.

Delete this post whenever you're ready to replace it with something real — just remove `welcome.md` and its manifest entry.

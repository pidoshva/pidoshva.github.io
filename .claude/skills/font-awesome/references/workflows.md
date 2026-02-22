# Font Awesome Workflows

## Contents
- Adding a New Icon to a Page
- Changing an Existing Icon Site-Wide
- Adding a New Social Share Platform
- Auditing Icon Accessibility
- Upgrading Font Awesome Version

## Adding a New Icon to a Page

1. Verify the icon exists in FA 5.15.0 Free:
   ```
   Grep for "fa-[icon-name]:before" in lib/font-awesome/css/all.min.css
   ```
2. Determine prefix — if grep result appears near `.fab` definitions it's a brand icon (`fab`),
   otherwise use `fas` for solid
3. Add the markup using the standard pattern:
   ```html
   <a class="icon" href="URL" aria-label="Descriptive Label">
     <i class="fas fa-code" aria-hidden="true"></i>
   </a>
   ```
4. Open the page in browser and confirm the icon renders (not a blank square)

Copy this checklist and track progress:
- [ ] Grep `lib/font-awesome/css/all.min.css` for `fa-[name]:before`
- [ ] Confirm prefix: `fas` (UI) or `fab` (brand logo)
- [ ] Add `<a class="icon">` wrapper with `aria-label`
- [ ] Add `<i>` with correct classes and `aria-hidden="true"`
- [ ] Visual verification in browser

## Changing an Existing Icon Site-Wide

Share buttons and navigation icons are templated — the same icon appears in every post.
A "site-wide" change touches 20+ files.

1. Find all files containing the icon:
   ```
   Grep for "fa-twitter" in **/*.html
   ```
2. Review results to understand the scope. Share icons appear **twice per post** (in `#share`
   and `#share-footer`), so expect ~2x the number of post files
3. Use the Edit tool with `replace_all: true` on each affected file, or batch with Bash:
   ```bash
   # Preview the change (dry run)
   grep -rl "fa-twitter" --include="*.html" .
   ```
4. For each file, replace the old class with the new one. Keep `aria-label` values accurate
5. Re-run the grep from step 1 to confirm zero remaining instances of the old icon

Validation loop:
1. Run grep for old icon class across `**/*.html`
2. If matches found, fix remaining files
3. Repeat until grep returns zero matches
4. Visual spot-check on at least one post page and the homepage

## Adding a New Social Share Platform

Post pages have two share panels that must stay in sync. Both live inside each post's
`index.html` (e.g., `posts/interactive-resume/index.html`).

1. Find the header share panel — search for `id="share"` in the post file
2. Add a new `<li>` entry after the last existing share item:
   ```html
   <li>
     <a class="icon" href="https://share-url?u=POST_URL" aria-label="Platform Name">
       <i class="fab fa-[platform] " aria-hidden="true"></i>
     </a>
   </li>
   ```
3. Find the footer share panel — search for `id="share-footer"` in the same file
4. Add a matching entry with `fa-lg`:
   ```html
   <a class="icon" href="https://share-url?u=POST_URL" aria-label="Platform Name">
     <i class="fab fa-[platform] fa-lg" aria-hidden="true"></i>
   </a>
   ```
5. Repeat for every post file (each `posts/*/index.html`)

**WARNING:** Header share icons have a trailing space in class names (e.g., `"fab fa-facebook "`).
Preserve this artifact for consistency with the Hugo template output.

Copy this checklist and track progress:
- [ ] Verify icon exists in `lib/font-awesome/css/all.min.css`
- [ ] Add to `#share` panel (no size modifier, trailing space in class)
- [ ] Add to `#share-footer` panel (with `fa-lg`)
- [ ] Repeat for all post files under `posts/*/index.html`
- [ ] Visual verification on at least one post page

## Auditing Icon Accessibility

Find icons that may be missing `aria-hidden`:

```
Grep for: class="fa[bs] fa-
  then check surrounding context for aria-hidden
```

More targeted — find `<i>` tags with FA classes but no `aria-hidden`:

```
Grep (multiline): <i class="fa[bs] fa-[^"]*"[^>]*>
  Glob: **/*.html
  Then manually check results for missing aria-hidden="true"
```

Known violations: `#menu-icon` and `#menu-icon-tablet` in post pages lack both
`aria-hidden` on the icon and `aria-label` on the anchor.

Validation loop:
1. Run the audit grep
2. Fix any missing `aria-hidden="true"` attributes on `<i>` tags
3. Add `aria-label` to parent `<a>` tags that lack it
4. Re-run audit grep — only proceed when no violations remain

## Upgrading Font Awesome Version

The vendored library at `lib/font-awesome/` should be replaced wholesale, never patched.

Copy this checklist and track progress:
- [ ] Download new FA Free release from fontawesome.com
- [ ] Replace `lib/font-awesome/css/all.min.css` with new version
- [ ] Replace all files in `lib/font-awesome/webfonts/`
- [ ] Verify all 17 icons still render (see inventory in SKILL.md)
- [ ] Check if webfont filenames changed — if so, update preload tags in `<head>` of every HTML file
- [ ] Test on mobile to confirm font preloading works

**WARNING:** FA 6 changed prefixes (`fab` becomes `fa-brands`, `fas` becomes `fa-solid`).
Upgrading from 5.x to 6.x requires updating every icon class across all HTML files.
This is a major migration — update Hugo source templates first. See the **hugo** skill.

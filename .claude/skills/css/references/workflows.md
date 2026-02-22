# CSS Workflows Reference

## Contents
- Editing the Stylesheet
- Hash and SRI Update Procedure
- Adding New Style Rules
- Responsive Testing Checklist

## Editing the Stylesheet

The CSS at `css/styles.[hash].css` is minified to a single line. Never edit it directly.

**Procedure for targeted changes:**

1. Read the current stylesheet with the Read tool
2. Identify the exact rule to change by searching for the selector name in the minified content
3. Use the Edit tool to replace the old rule with the new one — match the exact minified string
4. Proceed to the hash update procedure below

**For broad refactoring:** Modify the Hugo source project and regenerate. This repo is build output.

## Hash and SRI Update Procedure

After modifying `css/styles.[hash].css`, the filename and all 34 HTML references must be updated.

Copy this checklist and track progress:
- [ ] Step 1: Generate new SHA-512 hash from modified CSS content
- [ ] Step 2: Rename CSS file with new hash
- [ ] Step 3: Calculate new SRI integrity value (base64-encoded SHA-512)
- [ ] Step 4: Replace old filename and integrity in all 34 HTML files
- [ ] Step 5: Verify zero references to the old hash remain
- [ ] Step 6: Verify the new hash appears in exactly 34 files

### Step 1–3: Generate hash, rename file, compute SRI

```bash
# Identify current file
OLD_FILE=$(ls css/styles.*.css | head -1)
OLD_HASH=$(basename "$OLD_FILE" | sed 's/styles\.\(.*\)\.css/\1/')

# Generate new SHA-512 hex hash for filename
NEW_HASH=$(shasum -a 512 "$OLD_FILE" | awk '{print $1}')
NEW_FILE="css/styles.${NEW_HASH}.css"

# Rename
mv "$OLD_FILE" "$NEW_FILE"

# Generate SRI integrity attribute (base64-encoded SHA-512)
SRI="sha512-$(cat "$NEW_FILE" | openssl dgst -sha512 -binary | openssl base64 -A)"
echo "New file: $NEW_FILE"
echo "SRI: $SRI"
```

### Step 4: Replace references in all HTML files

```bash
# Replace filename hash in all HTML files
find . -name "*.html" -exec sed -i '' "s/styles\.${OLD_HASH}/styles.${NEW_HASH}/g" {} +

# Replace SRI integrity attribute
# First extract the old integrity value from any HTML file:
OLD_SRI=$(grep -m1 'integrity=' index.html | sed 's/.*integrity="\([^"]*\)".*/\1/')
# Then replace across all files:
find . -name "*.html" -exec sed -i '' "s|integrity=\"${OLD_SRI}\"|integrity=\"${SRI}\"|g" {} +
```

### Step 5–6: Validation loop

1. Verify new hash is referenced in all pages:
   ```bash
   grep -rl "styles\.${NEW_HASH}" --include="*.html" . | wc -l
   # Expected: 34
   ```
2. Verify old hash is gone:
   ```bash
   grep -rl "${OLD_HASH}" --include="*.html" .
   # Expected: no output
   ```
3. If validation fails, identify missed files and fix. Repeat until both checks pass.

## Adding New Style Rules

**Prefer appending to the existing stylesheet.** This avoids touching 34 `<link>` tags.

1. Read `css/styles.[hash].css` with the Read tool
2. Append new rules at the end of the minified line (before the sourcemap comment)
3. Follow the hash update procedure above

**For a single page only:** Use an inline `<style>` block in that page's `<head>`:

```html
<!-- In about/index.html <head> for a one-off style -->
<style>.about-photo { border-radius: 50%; max-width: 200px; }</style>
```

NEVER use inline `<style>` for styles shared across multiple pages.

## Responsive Testing Checklist

After modifying layout or responsive styles, verify at each breakpoint using browser DevTools:

```bash
# Serve locally for testing
python3 -m http.server 8000
# Open http://localhost:8000 and use DevTools responsive mode
```

Copy this checklist and track progress:
- [ ] **< 480px** — Hamburger menu visible, nav items hidden, `px3` padding reduces to `1rem`, `.post-list` items stack vertically, `<p>` text left-aligned
- [ ] **480–500px** — `<p>` text justifies, `.post-list` items display as flex row with date on left
- [ ] **500–540px** — `#header-post` becomes visible (post pages), `#footer-post-container` hidden
- [ ] **540–900px** — `.image-wrap` uses flex row layout, tablet menu icon visible in `#header-post`
- [ ] **900–1199px** — Desktop `#menu-icon` and `#actions` visible, tablet icons hidden
- [ ] **> 1199px** — `#toc` sidebar visible on post pages, `#actions` info displays inline

Key elements to check on every page type:
- **Homepage** (`index.html`): `.post-list` layout, `#about` section spacing
- **Post page** (`posts/*/index.html`): `#header-post` sidebar, `#footer-post` bottom bar, `article .content` images
- **Listing page** (`projects/index.html`): `.project-list` layout, tag links

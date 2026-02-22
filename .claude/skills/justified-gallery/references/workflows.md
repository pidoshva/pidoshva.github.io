# Justified Gallery Workflows

## Contents
- Adding a Gallery to a Post
- Adding a Gallery to a Project Page
- Changing Gallery Configuration
- Troubleshooting

## Adding a Gallery to a Post

No pages currently load the gallery assets. Follow this checklist when adding one.

Copy this checklist and track progress:
- [ ] Step 1: Add gallery CSS to `<head>`
- [ ] Step 2: Insert gallery JS between jQuery and `main.js` in the script section
- [ ] Step 3: Add `.article-gallery` container with images in the post body
- [ ] Step 4: Open the page in a browser and verify images render in justified rows

Concrete steps for `posts/interactive-resume/index.html`:

**Step 1:** Add this `<link>` inside the `<head>` tag:

```html
<link rel="stylesheet" href="/lib/justified-gallery/css/justifiedGallery.min.css">
```

**Step 2:** Edit the script section at the bottom of the file (around line 329). Insert the gallery script between jQuery and `main.js`:

```html
<link rel="stylesheet" href=/lib/font-awesome/css/all.min.css>
<script src=/lib/jquery/jquery.min.js></script>
<script src=/lib/justified-gallery/js/jquery.justifiedGallery.min.js></script>
<script src=/js/main.js></script>
<script src=/js/code-copy.js></script>
```

**Step 3:** Add gallery markup inside the post's content area:

```html
<div class="article-gallery">
  <a href="/posts/images/screenshot-full.jpg">
    <img src="/posts/images/screenshot-thumb.jpg" alt="Screenshot">
  </a>
</div>
```

**Step 4:** Open the page locally or push to GitHub Pages. Verify:
- Images appear in justified rows (not stacked vertically)
- Images are fully opaque (not faded at 0.1 opacity)
- Resizing the browser window re-flows the gallery

## Adding a Gallery to a Project Page

Same asset requirements as posts. Project pages (e.g., `projects/facial_recognition/index.html`) use the same script loading pattern. See the **hugo** skill for directory conventions.

The image path convention for projects: `/projects/images/` for shared images, or `/projects/<project-name>/images/` for project-specific ones.

## Changing Gallery Configuration

All options are in `js/main.js:5-8`. Changes affect every page that loads the plugin.

1. Open `js/main.js`
2. Edit the options object (lines 5-8):

```javascript
var options = {
  rowHeight: 200,    // taller rows for larger images
  margins: 8,        // wider gaps between images
  lastRow: "left"    // left-align incomplete last row instead of stretching
};
```

3. Open any page with a gallery in a browser
4. If the layout looks wrong, check the browser console for errors
5. Test at both desktop (1440px+) and mobile widths — the plugin re-flows automatically

`lastRow` values:
- `"justify"` — stretches last row to full width (current default)
- `"nojustify"` — natural height, left-aligned
- `"left"` / `"center"` / `"right"` — alignment without stretching
- `"hide"` — hides the last row entirely if incomplete

## Troubleshooting

### Gallery not appearing

1. Open browser DevTools → Network tab. Confirm `jquery.justifiedGallery.min.js` loaded
2. Check the HTML source: the gallery `<script>` must appear AFTER jQuery and BEFORE `main.js`. The init at `js/main.js:4` runs at parse time, not on DOM ready
3. Confirm the container uses class `article-gallery` — not `gallery`, not `justified-gallery`
4. Check console for `$.prototype.justifiedGallery is not a function` (means wrong load order)

### Images invisible or barely visible (0.1 opacity)

The plugin CSS (`justifiedGallery.min.css:20`) sets children to `opacity: 0.1` initially. The plugin JS adds `.entry-visible` to transition to full opacity. Two failure modes:

- **CSS loaded, JS not running:** Images stay at 0.1 opacity. Fix the JS load order
- **JS running, CSS not loaded:** Images visible but stacked vertically with no layout. Add the `<link>` tag for `justifiedGallery.min.css`

### Images stacked vertically

The plugin JS handles all positioning via inline styles. Without it, images fall back to normal document flow. The CSS alone only sets `position: relative` on the container (`justifiedGallery.min.css:7-10`).

Fix: verify JS loads and the init guard at `js/main.js:4` passes (check `$.prototype.justifiedGallery` in console).

### Layout broken after CSS changes

NEVER set a fixed `height` on `.article-gallery` — the plugin calculates it dynamically. If you've changed container width via the site's stylesheet (see the **css** skill), ensure `.article-gallery` retains `width: 100%` from the plugin CSS.

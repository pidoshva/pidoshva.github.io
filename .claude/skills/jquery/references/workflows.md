# jQuery Workflows Reference

## Contents
- Adding a New Interactive Feature
- Modifying Post Page Navigation
- Adding a New jQuery Plugin
- Debugging jQuery Issues

## Adding a New Interactive Feature

Copy this checklist and track progress:
- [ ] Step 1: Decide jQuery vs vanilla JS (use jQuery if the feature involves DOM traversal, animations, or AJAX; use vanilla if it's self-contained like `js/code-copy.js`)
- [ ] Step 2: Open `js/main.js` and add code inside the `$(document).ready()` block (line 13)
- [ ] Step 3: If the feature is page-specific, wrap it in an existence guard
- [ ] Step 4: Test in both desktop (1440px+) and mobile viewports
- [ ] Step 5: Verify no console errors — `$ is not defined` means load order is wrong

### Step-by-Step: Adding a Click Handler for Post Pages

1. Open `js/main.js`
2. Locate the `if ($(".post").length)` block (line 27)
3. Add your handler inside that block, after the existing scroll handlers:

```javascript
// Inside the if ($(".post").length) block in js/main.js
$("#your-element-id").click(function() {
  $(this).toggleClass("active");
  return false;
});
```

4. If the element is in the post HTML template, verify it exists by searching post files:

```bash
grep -r 'your-element-id' posts/ --include='*.html'
```

5. Open a post page in the browser, open DevTools Console, run `$('#your-element-id').length` — should return 1.

### Step-by-Step: Adding a Standalone JS File

1. Create the file at `js/your-feature.js`
2. Add the script tag to every HTML page that needs it, **after** the jQuery script tag. Use Grep to find all pages loading jQuery:

```bash
grep -rl 'jquery.min.js' --include='*.html' .
```

3. For each matching file, add the script tag after `main.js`:

```html
<script src=/lib/jquery/jquery.min.js></script>
<script src=/js/main.js></script>
<script src=/js/your-feature.js></script>  <!-- add here -->
```

4. **Critical:** This repo has no shared template — you must edit each HTML file individually. See the **html** skill for the full page list.

## Modifying Post Page Navigation

The post page has three navigation layers. Each is independent:

| Layer | Show/Hide Trigger | Elements Involved |
|-------|-------------------|-------------------|
| Desktop menu | Click `#menu-icon` or page width >= 1440px | `#menu`, `#menu > #nav` |
| Tablet icons | Scroll threshold (50/100px) | `#menu-icon-tablet`, `#top-icon-tablet` |
| Mobile footer | Scroll direction (up/down) | `#footer-post`, `#nav-footer`, `#toc-footer`, `#share-footer` |

### Changing Scroll Thresholds

1. Open `js/main.js`
2. Locate the scroll handler at line 58 (desktop/tablet) or line 86 (mobile footer)
3. Modify the threshold values. The current 50/100 gap prevents flickering:

```javascript
// js/main.js:62-66 — change 50/100 to adjust sensitivity
if (!nav.is(":visible") && topDistance < 50) {
  nav.show();
} else if (nav.is(":visible") && topDistance > 100) {
  nav.hide();
}
```

4. Test by scrolling slowly near the threshold in Chrome DevTools device toolbar
5. If scroll jitter occurs, widen the gap between the two thresholds (e.g., 30/120)
6. Repeat step 4 until smooth on both fast and slow scrolls

### Modifying Footer Action Buttons

Footer buttons in post pages use inline `onclick` handlers in HTML, not `js/main.js`. To modify:

1. Search for the button across all post pages:

```bash
grep -rl 'nav-footer' posts/ --include='*.html'
```

2. Each post's `index.html` has these inline handlers around the `#actions-footer` div:

```html
<a id="menu-toggle" onclick="$('#nav-footer').toggle();return false;">Menu</a>
```

3. To change behavior, edit the `onclick` attribute in every matching file, or refactor by moving the handler into `js/main.js` inside the `if ($("#footer-post").length)` block.

## Adding a New jQuery Plugin

Copy this checklist and track progress:
- [ ] Step 1: Download the plugin and place it in `lib/<plugin-name>/`
- [ ] Step 2: Add `<script>` tag after jQuery in target HTML pages
- [ ] Step 3: Add prototype guard and init call in `js/main.js`
- [ ] Step 4: Test on a page with the target elements and a page without them
- [ ] Step 5: Update all necessary HTML files (no shared template in this repo)

### Plugin Init Pattern

Add the init **before** `$(document).ready()` in `js/main.js` if the plugin should run immediately (like Justified Gallery), or **inside** `$(document).ready()` if it depends on page-specific elements:

```javascript
// Top of js/main.js — immediate init (before document.ready)
if (!!$.prototype.pluginName) {
  $(".target-selector").pluginName({ /* options */ });
}
```

## Debugging jQuery Issues

### Element Not Found

1. Open browser DevTools Console on the target page
2. Run `$('#your-selector').length` — if 0, the element doesn't exist on this page type
3. Check if the element is gated behind a page type (posts vs projects vs homepage)
4. For elements added dynamically, use event delegation:

```javascript
// Delegates to document — works for elements added after page load
$(document).on("click", "#dynamic-element", function() { ... });
```

### `$ is not defined` Error

Script load order is wrong. Verify in the HTML source that `jquery.min.js` appears before your script:

```html
<!-- Correct -->
<script src=/lib/jquery/jquery.min.js></script>
<script src=/js/main.js></script>

<!-- Wrong — $ doesn't exist when main.js runs -->
<script src=/js/main.js></script>
<script src=/lib/jquery/jquery.min.js></script>
```

### Plugin Silently Not Working

The `!!$.prototype.pluginName` guard in `js/main.js` means a missing plugin script tag causes silent failure — no error, just no functionality. Check:

1. The plugin `<script>` tag exists on the page
2. It loads **after** jQuery but **before** `js/main.js`
3. The prototype name matches exactly (case-sensitive)

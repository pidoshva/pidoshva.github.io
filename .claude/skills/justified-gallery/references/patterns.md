# Justified Gallery Patterns

## Contents
- Container Markup
- Supported Child Elements
- Caption Pattern
- Anti-Patterns

## Container Markup

The plugin targets `.article-gallery` in this codebase (`js/main.js:10`). Children must be **direct descendants** — `<a>`, `<div>`, or `<figure>` — each wrapping an `<img>`. The plugin CSS (`lib/justified-gallery/css/justifiedGallery.min.css:12-17`) uses direct child selectors (`> a`, `> div`, `> figure`) for absolute positioning.

Standard pattern — links wrapping images (enables lightbox click-through):

```html
<div class="article-gallery">
  <a href="/posts/images/photo1-full.jpg">
    <img src="/posts/images/photo1.jpg" alt="Photo 1">
  </a>
  <a href="/posts/images/photo2-full.jpg">
    <img src="/posts/images/photo2.jpg" alt="Photo 2">
  </a>
</div>
```

Semantic pattern — `<figure>` elements with visible captions:

```html
<div class="article-gallery">
  <figure>
    <img src="/projects/images/screenshot1.jpg" alt="Dashboard view">
    <figcaption class="caption">Dashboard view</figcaption>
  </figure>
  <figure>
    <img src="/projects/images/screenshot2.jpg" alt="Settings panel">
    <figcaption class="caption">Settings panel</figcaption>
  </figure>
</div>
```

## Supported Child Elements

From `lib/justified-gallery/css/justifiedGallery.min.css:12-23`:

| Element | Use Case |
|---------|----------|
| `> a` | Images that link to full-size versions or external pages |
| `> div` | Plain image wrappers with no click behavior |
| `> figure` | Semantic containers, supports `<figcaption class="caption">` |

Images inside children can be direct (`> img`) or wrapped in one `<a>` (`> a > img`). The CSS covers both patterns at lines 24-29.

## Caption Pattern

Add a `.caption` element inside any gallery child. The plugin CSS (`justifiedGallery.min.css:39-64`) positions it absolutely at the bottom with black background at 70% opacity. Captions are hidden by default (`display: none`) and shown on hover via the plugin adding `.caption-visible`.

```html
<div class="article-gallery">
  <div>
    <img src="/projects/images/demo.jpg" alt="Demo">
    <span class="caption">Project demo screenshot</span>
  </div>
</div>
```

## Anti-Patterns

### WARNING: Nested Wrapper Elements

**The Problem:**

```html
<!-- BAD — extra wrapper between gallery container and image items -->
<div class="article-gallery">
  <div class="row">
    <a href="photo.jpg"><img src="photo.jpg" alt="Photo"></a>
  </div>
</div>
```

**Why This Breaks:**
1. Plugin CSS uses direct child selectors (`> a`, `> div`, `> figure`) at `justifiedGallery.min.css:12-14`
2. The `.row` div becomes the only positioned child — it gets `position: absolute` and `opacity: 0.1`
3. The `<a>` inside `.row` is invisible and unpositioned by the plugin

**The Fix:**

```html
<!-- GOOD — items are direct children of .article-gallery -->
<div class="article-gallery">
  <a href="photo.jpg"><img src="photo.jpg" alt="Photo"></a>
</div>
```

### WARNING: Wrong Container Class

The selector in `js/main.js:10` is `$(".article-gallery")`. Using `.gallery`, `.justified-gallery`, or any other class name will not match. The plugin CSS uses `.justified-gallery` internally (the plugin adds this class at runtime), but your HTML container must use `.article-gallery` for the init code to find it.

### WARNING: Re-initializing After Dynamic Content

If images are added to an existing gallery after page load (via AJAX or DOM manipulation), use the `"norewind"` method:

```javascript
// GOOD — appends new images without resetting existing layout
$(".article-gallery").justifiedGallery("norewind");

// BAD — passing options again resets the entire gallery, causes visible flash
$(".article-gallery").justifiedGallery({ rowHeight: 140, margins: 4, lastRow: "justify" });
```

### WARNING: Fixed Height on Container

NEVER set a fixed CSS `height` on `.article-gallery`. The plugin calculates container height dynamically based on image count, row height, and viewport width. A fixed height clips or leaves empty space. The plugin CSS sets `width: 100%` and `overflow: hidden` at `justifiedGallery.min.css:7-10`.

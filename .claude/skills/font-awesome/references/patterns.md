# Font Awesome Patterns

## Contents
- Icon Markup Structure
- Social Link Pattern (Homepage)
- Share Button Pattern (Post Pages)
- Navigation Icon Pattern (Post Sidebar)
- Anti-Patterns

## Icon Markup Structure

Every icon follows the same three-layer structure: anchor wrapper, icon element, accessibility:

```html
<a class="icon" href="URL" aria-label="Descriptive Label">
  <i class="[fas|fab] fa-[name]" aria-hidden="true"></i>
</a>
```

The `class="icon"` on the anchor removes the default link underline and sets the hover
color to `#d480aa`. See the **css** skill for `.icon` styling details.

## Social Link Pattern (Homepage)

In `index.html`, social links sit in a `<div id="social-links">` with pipe `|` text separators:

```html
<a class="icon" target="_blank" rel="noopener" href="https://github.com/pidoshva/" aria-label="github">
  <i class="fab fa-github" aria-hidden="true"></i>
</a>
 |
<a class="icon" target="_blank" rel="noopener" href="mailto:pidoshva.vadim@gmail.com" aria-label="Email">
  <i class="fas fa-envelope" aria-hidden="true"></i>
</a>
 |
<a class="icon" target="_blank" rel="noopener" href="https://instagram.com/vp.id/" aria-label="instagram">
  <i class="fab fa-instagram" aria-hidden="true"></i>
</a>
```

Key details: external links get `target="_blank" rel="noopener"`, email uses `fas` (not `fab`),
and the pipe separator is plain text between anchors.

## Share Button Pattern (Post Pages)

Share icons appear **twice** per post page — once in `#share` (header, no size modifier)
and once in `#share-footer` (sticky footer, with `fa-lg`). Both panels are toggled by
clicking `fas fa-share-alt`.

```html
<!-- Header share panel (#share) — hidden by default -->
<li>
  <a class="icon" href="http://www.facebook.com/sharer.php?u=..." aria-label="Facebook">
    <i class="fab fa-facebook " aria-hidden="true"></i>
  </a>
</li>

<!-- Footer share panel (#share-footer) — same icons with fa-lg -->
<a class="icon" href="http://www.facebook.com/sharer.php?u=..." aria-label="Facebook">
  <i class="fab fa-facebook fa-lg" aria-hidden="true"></i>
</a>
```

Note the trailing space in header share classes (e.g., `"fab fa-facebook "`) — this is a
Hugo template artifact present in every post. It is harmless but do not "fix" it in
individual files since it will reappear on next Hugo build.

## Navigation Icon Pattern (Post Sidebar)

Post pages have `#actions` (sidebar) and `#actions-footer` (sticky bar) with icons that
use inline jQuery for tooltips. See the **jquery** skill for the toggle behavior.

```html
<a class="icon" href="#" onclick="$('html, body').animate({ scrollTop: 0 }, 'fast');" aria-label="Top of Page">
  <i class="fas fa-chevron-up" aria-hidden="true" onmouseover="$('#i-top').toggle();" onmouseout="$('#i-top').toggle();"></i>
</a>
<span id="i-top" class="info" style="display:none;">Back to top</span>
```

Each navigation icon has a paired `<span class="info">` tooltip toggled on hover.

## Anti-Patterns

### WARNING: Missing `aria-hidden` on Icon Elements

**The Problem:**

```html
<!-- BAD — screen reader announces meaningless "fas fa-bars fa-lg" -->
<a id="menu-icon" href="#"><i class="fas fa-bars fa-lg"></i></a>
```

This pattern actually exists in post pages for `#menu-icon` and `#menu-icon-tablet`.

**Why This Breaks:** Screen readers attempt to announce the `<i>` element, producing
gibberish. Users relying on assistive technology get no useful information.

**The Fix:**

```html
<!-- GOOD — icon hidden, anchor provides context -->
<a id="menu-icon" href="#" aria-label="Menu"><i class="fas fa-bars fa-lg" aria-hidden="true"></i></a>
```

### WARNING: Wrong Prefix for Icon Type

**The Problem:**

```html
<!-- BAD — fa-github is a brand icon, not solid -->
<i class="fas fa-github" aria-hidden="true"></i>
```

**Why This Breaks:** Font Awesome 5 maps icons to specific font files by prefix. `fas`
looks up `fa-solid-900.woff2` which has no github glyph — renders as a blank square.

**The Fix:** `fas` = UI icons (bars, chevrons, envelope, list, share-alt).
`fab` = Company logos (github, twitter, facebook, instagram, etc.).

### WARNING: Using `<span>` Instead of `<i>`

This codebase uses `<i>` for all icons across 30+ HTML files. While `<span>` works
technically with Font Awesome, mixing tag types creates inconsistency and complicates
grep-based auditing. Always use `<i>` to match the existing convention.

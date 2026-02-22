# jQuery Patterns Reference

## Contents
- DOM Selection Patterns
- Event Handling Patterns
- AJAX Data Fetching
- Plugin Integration
- Anti-Patterns

## DOM Selection Patterns

This codebase uses ID selectors with child combinators for specificity. Cached selections are used when a selector is referenced more than once in `js/main.js:28-30`:

```javascript
var menu = $("#menu");
var nav = $("#menu > #nav");
var menuIcon = $("#menu-icon, #menu-icon-tablet");
```

Element existence guards wrap page-specific logic. Without this, jQuery silently operates on empty sets — nothing breaks, but nothing works either, making bugs invisible:

```javascript
// js/main.js:27 — gates all post-page behavior
if ($(".post").length) {
  // Only runs on pages containing a .post element
}
```

## Event Handling Patterns

### Click with Visibility State Toggle

`js/main.js:43-52` uses `.css("visibility")` to read state, then `.css()` to write it. The `return false` prevents the default anchor action and stops propagation:

```javascript
menuIcon.click(function() {
  if (menu.css("visibility") === "hidden") {
    menu.css("visibility", "visible");
    menuIcon.addClass("active");
  } else {
    menu.css("visibility", "hidden");
    menuIcon.removeClass("active");
  }
  return false;
});
```

### Scroll with Hysteresis Thresholds

`js/main.js:58-77` uses a 50px/100px gap to create a dead zone, preventing rapid show/hide flickering near the threshold:

```javascript
$(window).on("scroll", function() {
  var topDistance = menu.offset().top;
  if (!nav.is(":visible") && topDistance < 50) {
    nav.show();
  } else if (nav.is(":visible") && topDistance > 100) {
    nav.hide();
  }
});
```

### Scroll Direction Detection

`js/main.js:85-111` tracks scroll direction by comparing current position to `lastScrollTop`. Also closes all footer submenus on any scroll:

```javascript
var lastScrollTop = 0;
$(window).on("scroll", function() {
  var topDistance = $(window).scrollTop();
  if (topDistance > lastScrollTop) {
    $("#footer-post").hide();   // downscroll
  } else {
    $("#footer-post").show();   // upscroll
  }
  lastScrollTop = topDistance;
  // Close submenus
  $("#nav-footer").hide();
  $("#toc-footer").hide();
  $("#share-footer").hide();
});
```

## AJAX Data Fetching

`js/search.js:52-86` fetches the RSS XML feed via `$.ajax()`, then transforms entries with `$().map().get()`. The context selector `$("entry", xmlResponse)` scopes the search to the XML response:

```javascript
$.ajax({
  url: path,
  dataType: "xml",
  success: function(xmlResponse) {
    var datas = $("entry", xmlResponse).map(function() {
      return {
        title: $("title", this).text(),
        content: $("content", this).text(),
        url: $("link", this).attr("href")
      };
    }).get(); // .get() converts jQuery object to plain array
  }
});
```

After fetching, `search.js` switches to vanilla DOM APIs (`document.getElementById`, `addEventListener`) for the input handler. This is an existing inconsistency — see anti-patterns below.

## Plugin Integration

See the **justified-gallery** skill for full details. The guard pattern in `js/main.js:4`:

```javascript
if (!!$.prototype.justifiedGallery) {
  $(".article-gallery").justifiedGallery({ rowHeight: 140, margins: 4, lastRow: "justify" });
}
```

This runs **before** `$(document).ready()` to initialize the gallery as early as possible, reducing layout shift.

## Anti-Patterns

### WARNING: Mixing jQuery and Vanilla DOM in One File

**The Problem:**

`js/search.js` uses `$.ajax()` for fetching but `document.getElementById()` and `addEventListener()` for DOM work (lines 65-69).

**Why This Breaks:**
1. Inconsistent API expectations — jQuery wraps elements, vanilla doesn't
2. Future maintainers must mentally switch between two paradigms in one file
3. Can't chain jQuery methods on vanilla DOM references without re-wrapping

**When This Is Acceptable:**
`js/code-copy.js` uses only vanilla JS — that's fine, it's a self-contained module that doesn't load jQuery. But within `search.js` which already depends on `$.ajax()`, staying in jQuery would be more consistent.

### WARNING: Multiple Scroll Handlers on Window

**The Problem:**

`js/main.js` binds two separate `$(window).on("scroll")` handlers (lines 58 and 86), both firing on every scroll event in post pages.

**Why This Matters:**
Scroll events fire 60+ times per second. Multiple handlers multiply the DOM reads. For this site the impact is negligible, but consolidating into one handler is better practice if the post page JS grows.

### WARNING: String-Based CSS Visibility Checks

**The Problem:**

```javascript
// js/main.js:44 — depends on exact CSS string value
if (menu.css("visibility") === "hidden") { ... }
```

**The Fix:**

```javascript
// Class-based — decoupled from CSS property values
if (menu.hasClass("menu-hidden")) { ... }
```

**Why This Matters:**
If CSS changes the visibility property (e.g., a transition adds intermediate values, or a CSS rule overrides), the string comparison breaks silently. Class-based toggling is resilient to CSS refactors.

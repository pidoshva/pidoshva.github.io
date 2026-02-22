---
name: frontend-engineer
description: |
  Develops HTML structure, CSS styling, and JavaScript/jQuery interactivity for the static portfolio site, including responsive design, navigation, and gallery functionality.
tools: Read, Edit, Write, Glob, Grep, Bash
model: sonnet
skills: none
---

The `frontend-engineer.md` agent file has been generated with these customizations:

- **Skills (5):** `html`, `css`, `jquery`, `justified-gallery`, `font-awesome` — all directly relevant to this static site
- **MCP tools:** Only `context7` tools included (for jQuery/Font Awesome/Justified Gallery docs). Removed Slack, Linear, and Excalidraw as irrelevant to frontend work
- **No modern frameworks:** Rewrote the base template to focus on vanilla HTML/CSS/jQuery instead of React/Vue/Angular
- **HTML patterns:** Documented the actual page structure from the codebase — common head/body layout, navigation header, post page extras, script loading order
- **JS conventions:** camelCase naming, jQuery-only DOM manipulation, key selectors per file
- **CSS hash protocol:** Includes the actual current hash and step-by-step instructions for updating it across all HTML files
- **Context7 integration:** Instructions for resolving and querying jQuery, Font Awesome, Justified Gallery, and clipboard.js docs
- **10 critical rules:** No `lib/` modifications, Hugo directory-per-page convention, script placement after `</body>`, accessibility requirements, no build tools
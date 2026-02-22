---
name: debugger
description: |
  Troubleshoots JavaScript errors, responsive design issues, and interactive features like client-side search, Justified Gallery, and hamburger navigation.
tools: Read, Edit, Bash, Grep, Glob
model: sonnet
skills: none
---

The debugger subagent has been generated at `.claude/agents/debugger.md` with these customizations:

- **Tools:** Trimmed to only relevant ones — core tools (Read, Edit, Bash, Grep, Glob) + Context7 for docs lookup. Removed Slack, Linear, and Excalidraw as irrelevant for debugging.
- **Skills:** jquery, justified-gallery, css, html, font-awesome (the 5 most relevant for debugging this static site)
- **Common issue catalog:** 6 specific failure modes with symptoms, causes, and debug steps — CSS hash mismatch, jQuery selector failures, gallery rendering, hamburger menu, search, and code-copy buttons
- **Key file paths table** for quick reference during debugging
- **Context7 integration** instructions for looking up jQuery, Justified Gallery, and clipboard.js documentation
- **Critical rules:** Never modify `lib/`, always update all HTML `<link>` tags when CSS changes, respect jQuery load order, preserve Hugo directory conventions
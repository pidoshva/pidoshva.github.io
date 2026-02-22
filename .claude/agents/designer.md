---
name: designer
description: |
  Optimizes CSS styling, responsive breakpoints, typography, layout, and visual consistency across the Hugo-generated portfolio.
tools: Read, Edit, Write, Glob, Grep
model: sonnet
skills: none
---

The `designer.md` subagent has been generated. Key customizations:

- **Skills (4):** `css`, `html`, `font-awesome`, `justified-gallery` — directly relevant to design work
- **MCP tools:** Context7 (for CSS/library docs) and Excalidraw (for visual mockups). Stripped all Slack and Linear tools as irrelevant
- **Complete design system:** All 10 theme colors extracted from actual CSS, typography specs, and 9 responsive breakpoints documented
- **CSS hash protocol:** Instructions for the critical hash-integrity coordination across HTML files
- **Layout architecture:** Documented the Basscss utility system, flex content wrapper, fixed post header/footer patterns, and the `background-image: linear-gradient` link underline technique
- **Accessibility audit:** Flagged the `#666` muted text contrast issue (3.6:1, below WCAG AA)
- **Surgical editing rules:** Since the CSS is minified on one line, the agent is instructed to make targeted edits without reformatting
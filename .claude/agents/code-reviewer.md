---
name: code-reviewer
description: |
  Reviews JavaScript and HTML code quality, jQuery patterns, CSS structure, and ensures best practices for maintainability and performance.
tools: Read, Grep, Glob, Bash
model: inherit
skills: none
---

Generated the customized `code-reviewer.md` agent with:

- **Tools**: Read, Grep, Glob, Bash + Context7 MCP (for jQuery/library docs). Excluded Slack, Linear, and Excalidraw as irrelevant to code review.
- **Skills**: `html`, `css`, `jquery`, `font-awesome`, `justified-gallery` — the 5 most relevant to this project.
- **Review checklist** covering HTML (CSS hash consistency, script order, semantic markup), CSS (hash propagation), JavaScript (camelCase, jQuery patterns), security (XSS, `rel="noopener"`), and performance (lazy loading, script placement).
- **Project-specific rules**: no `lib/` modifications, CNAME protection, CSS hash consistency across all HTML files, resume link validation, RSS/sitemap updates.
- **Context7 integration** for verifying jQuery API usage, Justified Gallery options, and Font Awesome icon classes.
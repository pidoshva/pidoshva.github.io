# Automating My Dev Journal with GitHub Actions and Claude

I wanted my portfolio to feel alive — not a static snapshot that goes stale the week after I push it, but something that reflects what I'm actually working on. So I built a system that writes my weekly developer journal for me.

Every Friday night, a GitHub Action wakes up, crawls my activity across every repo I touched that week — personal and org — and hands the raw data to Claude. What comes back is a structured summary: highlights per repo, PRs reviewed, languages used, a short narrative. It gets committed to a JSON file, and the homepage renders it as an interactive tree timeline.

Here's how it works.

---

## The Problem

Portfolio sites lie by omission. You build one, it looks great for a month, then six months later it's a time capsule. The "Recent Work" section isn't recent. The tech stack listed doesn't mention the three new languages you picked up. Visitors see a frozen version of you.

I wanted the opposite: a site that updates itself. Not with fake activity or vanity metrics, but with a genuine weekly log of what I shipped.

## Architecture

The system has three parts:

1. **A Python script** that gathers GitHub activity
2. **Claude Haiku** that turns raw data into readable summaries
3. **A vanilla JS renderer** that displays it as a tree timeline

No database. No server. No build step. Just a GitHub Action, a JSON file, and some client-side rendering.

### Data Collection

The script runs authenticated against GitHub's REST API with a PAT that has access to both personal repos and organization repos. It does three things:

- **Finds active repos** — queries `/user/repos` sorted by push date, filters to the past 7 days
- **Fetches commits per repo** — pulls all commits in the date range, then filters by my GitHub login or commit email (important for org repos where your commit identity might differ)
- **Searches for PRs** — uses the Search API with both `author:` and `involves:` queries to catch PRs I opened *and* PRs I reviewed

```python
USER_EMAILS = {
    "vpgeleus@gmail.com",
    "vadim.pidoshva@orderprotection.com",
}

# Match by GitHub login OR commit email
author_login = (c.get("author") or {}).get("login", "")
author_email = (c.get("commit", {}).get("author") or {}).get("email", "")
if author_login == USERNAME or author_email in USER_EMAILS:
    user_commits.append(c)
```

This is the part that took the most iteration. GitHub's APIs have subtle gaps — the Events API only returns public activity, the Search Commits API doesn't index private repos, and the `author` filter on the commits endpoint uses email matching that can miss org contributions. The solution was to fetch *all* commits without filtering, then match locally by login and email.

### AI Summary Generation

The aggregated data — repos, commit messages, PR titles, languages — gets packed into a structured prompt and sent to Claude Haiku:

```
Activity for 2026-02-17 to 2026-02-23:
- Total commits: 21
- Per-repo breakdown:
  - monolog (OrderProtection) (TypeScript, 15 commits): fix warranty validation...
  - pidoshva.github.io (JavaScript, 6 commits): add blog system...
- Pull requests:
  - [merged] OrderProtection/monolog#412: Fix warranty edge case
  - [open] OrderProtection/cart-widget#89: Customizable info modal
```

Claude returns a JSON object with a 2–3 sentence summary and 5–8 bullet-point highlights. The prompt is specific: start each highlight with the repo name, mention organizations, be concrete about what changed.

If Claude returns invalid JSON (it happens), the script falls back to a basic summary built from commit messages. If the API key isn't set, same fallback. The system never fails silently — it always produces *something*.

### The Tree Timeline

On the frontend, `summary.js` fetches the JSON and renders it as an interactive tree — inspired by the `tree` command:

```
2026
├── February
│   └── Week 8 (Feb 17–23)              12 commits · 2 repos
│       ├── pidoshva.github.io           JavaScript
│       │   ├── Built markdown blog system
│       │   ├── Added expandable README to goodies cards
│       │   └── Automated weekly journal with Actions + Claude
│       └── geleus-io                    HTML
│           └── Maintained interactive terminal resume
│
│       "Focused on geleus.com redesign with blog system,
│        expandable READMEs, and automated weekly summaries."
```

Each level is collapsible. The current month and latest week are expanded by default. Colors follow a syntax-highlight palette — gold for years, purple for months, green for week labels, orange for organization names. PRs show up with state icons under their repo.

The whole thing is vanilla JS, no framework. CSS handles the transitions.

## The GitHub Action

```yaml
on:
  schedule:
    - cron: '0 5 * * 6'  # Saturday 5am UTC
  workflow_dispatch: {}
```

Saturday 5am UTC is Friday night in Mountain Time — the end of the work week. The action checks out the repo, runs the Python script, and commits the updated JSON. GitHub Pages picks up the change automatically.

`workflow_dispatch` lets me trigger it manually for testing or when I want an off-cycle update.

The footer on the homepage is trigger-aware: scheduled runs show "Next update: Saturday, Mar 7", manual triggers just show "Last updated: Feb 23".

## What I Learned

**Identity is fragmented across GitHub.** Your commits in an org repo might use a different email than your personal repos. The GitHub UI ties them together via your account settings, but the API returns the raw commit email. If you're building anything that aggregates activity across orgs, you need to match on multiple identities.

**The Events API is a trap for this use case.** It only returns public events, has a 90-day window, and paginates in ways that make date filtering unreliable. The Commits API per repo is more work but actually complete.

**Claude is remarkably good at structured output.** With a specific prompt and examples, Haiku returns valid JSON on the first try almost every time. The fallback logic has only triggered once in testing, and that was a network timeout.

**Progressive enhancement makes this bulletproof.** The homepage always has hardcoded HTML that loads instantly. The summary section renders "No summaries yet" if the JSON fetch fails. Profile sync from the GitHub API updates the name and bio but falls back to the static HTML. Nothing breaks if an API is down.

## Cost

Effectively zero. The GitHub Action runs once a week on the free tier. Claude Haiku costs fractions of a cent per call. The PAT is free. GitHub Pages is free.

## Source

The full implementation is in this repo:

- [`scripts/weekly-summary.py`](https://github.com/pidoshva/pidoshva.github.io/blob/main/scripts/weekly-summary.py) — data collection + Claude API
- [`js/summary.js`](https://github.com/pidoshva/pidoshva.github.io/blob/main/js/summary.js) — tree timeline renderer
- [`.github/workflows/weekly-summary.yml`](https://github.com/pidoshva/pidoshva.github.io/blob/main/.github/workflows/weekly-summary.yml) — the Action

If you want to adapt this for your own site, the only prerequisites are an Anthropic API key and a GitHub PAT with repo access. The rest is just a cron job and some vanilla JS.

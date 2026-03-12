# Automating My Dev Journal with GitHub Actions and Claude

My portfolio kept going stale. I'd update it, forget about it for months, and then it'd be lying about what I actually do. So I built a thing that writes my weekly dev journal automatically.

Every Friday night a GitHub Action runs, looks at everything I touched that week across all my repos, sends it to Claude, and gets back a structured summary. That gets committed as JSON and the homepage renders it as a tree timeline.

---

## Why

Portfolio sites rot. You build one, it looks great, then three months later your "Recent Work" section is ancient history. I didn't want to maintain it manually — I just wanted it to stay honest.

## How It Works

Three pieces:

1. **Python script** gathers my GitHub activity
2. **Claude Haiku** turns raw commit/PR data into readable summaries
3. **Vanilla JS** renders it as a collapsible tree on the homepage

No database, no server, no build step. A JSON file and some client-side rendering.

### Collecting the Data

The script hits GitHub's REST API with a PAT. It finds repos I pushed to in the last 7 days, grabs commits, and searches for PRs I opened or reviewed.

The tricky part: your identity is fragmented across GitHub. Org repos might use a different email than personal ones. The API returns raw commit emails, so you can't just filter by username — you need to match on a set of known emails too.

```python
# Match by login OR email — org repos often differ
author_login = (c.get("author") or {}).get("login", "")
author_email = (c.get("commit", {}).get("author") or {}).get("email", "")

if author_login == USERNAME or author_email in USER_EMAILS:
    user_commits.append(c)
```

I tried the Events API first. Don't bother — it only returns public events and has a 90-day window. Fetching commits per repo is more work but actually gives you everything.

### Getting Claude to Summarize It

All the data — repos, commit messages, PR titles, languages — gets packed into a prompt and sent to Haiku. It returns JSON with a short summary and bullet-point highlights per repo.

```text
Activity for the week:
- Total commits: 21
- Per-repo breakdown:
  - project-api (TypeScript, 15 commits): fix validation logic...
  - portfolio-site (JavaScript, 6 commits): add blog system...
- Pull requests:
  - [merged] org/project-api#412: Fix edge case in validation
```

Haiku is good at this. It returns valid JSON almost every time. There's a fallback that builds a basic summary from commit messages if anything goes wrong, but it rarely triggers.

### The Tree Timeline

The frontend fetches the JSON and renders a collapsible tree — like the `tree` command:

```text
2026
├── February
│   └── Week 8 (Feb 17–23)              12 commits · 2 repos
│       ├── portfolio-site               JavaScript
│       │   ├── Built markdown blog system
│       │   └── Automated weekly journal with Actions + Claude
│       └── terminal-resume              HTML
│           └── Maintained interactive terminal resume
│
│       "Focused on site redesign with blog system
│        and automated weekly summaries."
```

Current month and latest week are expanded by default. Action keywords like "Shipped", "Fixed", "Merged" get color-coded. All vanilla JS and CSS.

## The Action

```yaml
on:
  schedule:
    - cron: '0 5 * * 6'  # Saturday 5am UTC
  workflow_dispatch: {}
```

Saturday 5am UTC is Friday night Mountain Time. The action runs the script, commits the JSON, and GitHub Pages deploys it. I can also trigger it manually whenever.

The script backfills missing weeks automatically — if a run fails or gets skipped, the next run catches up so nothing gets lost.

## Cost

Basically zero. Free GitHub Actions tier, Haiku costs fractions of a cent, GitHub Pages is free.

## Source

Everything's in the repo:

- [`scripts/weekly-summary.py`](https://github.com/pidoshva/pidoshva.github.io/blob/main/scripts/weekly-summary.py) — data collection + Claude API
- [`js/summary.js`](https://github.com/pidoshva/pidoshva.github.io/blob/main/js/summary.js) — tree timeline renderer
- [`.github/workflows/weekly-summary.yml`](https://github.com/pidoshva/pidoshva.github.io/blob/main/.github/workflows/weekly-summary.yml) — the Action

To adapt it you need an Anthropic API key and a GitHub PAT with repo scope as repository secrets.

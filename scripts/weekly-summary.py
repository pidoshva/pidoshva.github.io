#!/usr/bin/env python3
"""Generate weekly activity summary using GitHub APIs and Claude."""

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import anthropic
import requests

USERNAME = "pidoshva"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SUMMARIES_FILE = DATA_DIR / "weekly-summaries.json"
NOTES_FILE = DATA_DIR / "notes.md"

GH_PAT = os.environ.get("GH_PAT", "")
TRIGGER = os.environ.get("TRIGGER", "manual")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

HEADERS = {"Accept": "application/vnd.github.v3+json"}
if GH_PAT:
    HEADERS["Authorization"] = f"Bearer {GH_PAT}"


def gh_get(url: str, params: dict | None = None) -> requests.Response:
    return requests.get(url, headers=HEADERS, params=params or {}, timeout=30)


def fetch_all_repos() -> list[dict]:
    """Fetch all repos the authenticated user can access (owned + org member)."""
    repos = []
    # Authenticated user's repos: includes private, org repos where user is member
    url = "https://api.github.com/user/repos"
    params = {"per_page": 100, "sort": "pushed", "direction": "desc"}
    while url:
        resp = gh_get(url, params)
        if not resp.ok:
            print(f"Warning: repos fetch failed: {resp.status_code}")
            break
        repos.extend(resp.json())
        url = resp.links.get("next", {}).get("url")
        params = {}  # pagination URL includes params
    return repos


def fetch_repo_commits(full_name: str, since: str, until: str) -> list[dict]:
    """Fetch commits by the user in a specific repo within date range."""
    commits = []
    url = f"https://api.github.com/repos/{full_name}/commits"
    params = {"author": USERNAME, "since": since, "until": until, "per_page": 100}
    while url:
        resp = gh_get(url, params)
        if not resp.ok:
            break
        page = resp.json()
        if not page:
            break
        commits.extend(page)
        url = resp.links.get("next", {}).get("url")
        params = {}
    return commits


def fetch_user_prs(since: str) -> list[dict]:
    """Fetch PRs authored by the user since a date."""
    query = f"author:{USERNAME} created:>={since}"
    resp = gh_get(
        "https://api.github.com/search/issues",
        {"q": query + " type:pr", "per_page": 100, "sort": "created"},
    )
    if resp.ok:
        return resp.json().get("items", [])
    return []


def fetch_user_issues(since: str) -> list[dict]:
    """Fetch issues authored by the user since a date."""
    query = f"author:{USERNAME} created:>={since}"
    resp = gh_get(
        "https://api.github.com/search/issues",
        {"q": query + " type:issue", "per_page": 100, "sort": "created"},
    )
    if resp.ok:
        return resp.json().get("items", [])
    return []


def gather_activity(week_start: str, week_end_dt: datetime) -> dict:
    """Gather all activity across all accessible repos."""
    since_iso = f"{week_start}T00:00:00Z"
    until_iso = week_end_dt.strftime("%Y-%m-%dT23:59:59Z")

    # Get all repos, check which were pushed to recently
    all_repos = fetch_all_repos()
    print(f"Accessible repos: {len(all_repos)}")

    # Filter to repos pushed within the week (use pushed_at field)
    cutoff = datetime.fromisoformat(since_iso.replace("Z", "+00:00"))
    active_repos = []
    for repo in all_repos:
        pushed = repo.get("pushed_at", "")
        if pushed:
            pushed_dt = datetime.fromisoformat(pushed.replace("Z", "+00:00"))
            if pushed_dt >= cutoff:
                active_repos.append(repo)

    print(f"Repos pushed this week: {len(active_repos)}")

    # Fetch commits from each active repo
    repo_data = {}  # short_name -> {commits, messages, language, full_name}
    total_commits = 0

    for repo in active_repos:
        full_name = repo["full_name"]
        short_name = repo["name"]
        language = repo.get("language")

        commits = fetch_repo_commits(full_name, since_iso, until_iso)
        if not commits:
            continue

        messages = []
        for c in commits:
            msg = c.get("commit", {}).get("message", "").split("\n")[0]
            # Skip bot commits and merge commits
            if msg and not msg.startswith("[bot]") and not msg.startswith("Merge"):
                messages.append(msg)

        total_commits += len(commits)
        repo_data[short_name] = {
            "commits": len(commits),
            "messages": messages[:5],
            "language": language,
            "full_name": full_name,
        }

    # Fetch PRs and issues
    prs = fetch_user_prs(week_start)
    issues = fetch_user_issues(week_start)

    prs_opened = len([p for p in prs if p.get("state") == "open"])
    prs_merged = len([p for p in prs if p.get("pull_request", {}).get("merged_at")])
    prs_closed = len(prs) - prs_opened

    # Collect languages
    languages = set()
    for rd in repo_data.values():
        if rd["language"]:
            languages.add(rd["language"])

    # Collect all commit messages for Claude
    all_messages = []
    for rd in repo_data.values():
        all_messages.extend(rd["messages"])

    return {
        "repos": sorted(repo_data.keys()),
        "repo_details": repo_data,
        "commit_count": total_commits,
        "commit_messages": all_messages[:20],
        "prs_opened": prs_opened,
        "prs_merged": prs_merged,
        "issues": len(issues),
        "languages": sorted(languages),
    }


def read_notes() -> str:
    if NOTES_FILE.exists():
        content = NOTES_FILE.read_text().strip()
        return content if content else ""
    return ""


def clear_notes():
    if NOTES_FILE.exists():
        NOTES_FILE.write_text("")


def generate_summary(activity: dict, notes: str, week_start: str, week_end: str) -> dict:
    """Call Claude API to generate a summary."""
    if not ANTHROPIC_API_KEY:
        print("Warning: No ANTHROPIC_API_KEY set, using fallback summary")
        return fallback_summary(activity, week_start, week_end)

    # Build per-repo detail for the prompt
    repo_lines = []
    for name, rd in activity["repo_details"].items():
        lang = rd["language"] or "unknown"
        msgs = "; ".join(rd["messages"][:3]) if rd["messages"] else "no messages"
        repo_lines.append(f"  - {name} ({lang}, {rd['commits']} commits): {msgs}")

    prompt = f"""You are summarizing a developer's weekly GitHub activity for their portfolio website.

Activity for {week_start} to {week_end}:
- Total commits: {activity['commit_count']}
- Repos active: {', '.join(activity['repos']) or 'none'}
- Per-repo breakdown:
{chr(10).join(repo_lines) or '  (none)'}
- Languages: {', '.join(activity['languages']) or 'none'}
- PRs opened: {activity['prs_opened']}, merged: {activity['prs_merged']}
- Issues created: {activity['issues']}
{"- Personal notes: " + notes if notes else ""}

Return a JSON object with exactly these fields:
- "summary": A single sentence (max 120 chars) summarizing the week's focus areas
- "highlights": An array of 2-5 short bullet points (each max 80 chars) describing key accomplishments. Be specific about what was built or changed based on commit messages.

Return ONLY valid JSON, no markdown fencing."""

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text[: text.rfind("```")]
        text = text.strip()

    result = json.loads(text)

    return build_entry(activity, result, week_start, week_end)


def fallback_summary(activity: dict, week_start: str, week_end: str) -> dict:
    repos_str = ", ".join(activity["repos"][:3]) if activity["repos"] else "various projects"
    result = {
        "summary": f"Worked on {repos_str} with {activity['commit_count']} commits.",
        "highlights": activity["commit_messages"][:5],
    }
    return build_entry(activity, result, week_start, week_end)


def build_entry(activity: dict, result: dict, week_start: str, week_end: str) -> dict:
    return {
        "week_start": week_start,
        "week_end": week_end,
        "generated": datetime.now(timezone.utc).isoformat(),
        "trigger": TRIGGER,
        "summary": result.get("summary", ""),
        "highlights": result.get("highlights", []),
        "repos": activity["repos"],
        "languages": activity["languages"],
        "stats": {
            "commits": activity["commit_count"],
            "prs": activity["prs_opened"] + activity["prs_merged"],
            "repos_active": len(activity["repos"]),
        },
    }


def main():
    now = datetime.now(timezone.utc)
    week_end = now.date()
    week_start = week_end - timedelta(days=6)

    print(f"Generating summary for {week_start} to {week_end}")

    activity = gather_activity(str(week_start), now)
    print(f"Repos: {activity['repos']}")
    print(f"Commits: {activity['commit_count']}")
    print(f"Languages: {activity['languages']}")

    notes = read_notes()
    if notes:
        print(f"Notes found: {len(notes)} chars")

    if activity["commit_count"] == 0 and not notes and not activity["repos"]:
        print("No activity this week, skipping summary generation")
        return

    entry = generate_summary(activity, notes, str(week_start), str(week_end))

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if SUMMARIES_FILE.exists():
        data = json.loads(SUMMARIES_FILE.read_text())
    else:
        data = {"summaries": []}

    # Replace existing entry for this week if present
    data["summaries"] = [
        s for s in data["summaries"] if s["week_start"] != str(week_start)
    ]
    data["summaries"].append(entry)
    data["summaries"].sort(key=lambda s: s["week_start"], reverse=True)

    SUMMARIES_FILE.write_text(json.dumps(data, indent=2) + "\n")
    print(f"Summary written to {SUMMARIES_FILE}")

    clear_notes()


if __name__ == "__main__":
    main()

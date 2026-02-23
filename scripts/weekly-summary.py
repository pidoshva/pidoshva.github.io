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

# Search commits API needs this accept header
SEARCH_HEADERS = {**HEADERS, "Accept": "application/vnd.github.cloak-preview+json"}


def gh_get(url: str, params: dict | None = None, headers: dict | None = None) -> requests.Response:
    return requests.get(url, headers=headers or HEADERS, params=params or {}, timeout=30)


def fetch_user_emails() -> list[str]:
    """Fetch all email addresses associated with the authenticated user."""
    emails = []
    try:
        resp = gh_get("https://api.github.com/user/emails")
        if resp.ok:
            emails = [e["email"] for e in resp.json()]
            print(f"User emails: {emails}")
    except Exception as ex:
        print(f"Warning: could not fetch emails: {ex}")
    return emails


def search_commits(week_start: str, week_end: str) -> list[dict]:
    """Search for all commits by the user across all accessible repos."""
    # GitHub Search Commits API searches across all repos the PAT can see
    query = f"author:{USERNAME} committer-date:{week_start}..{week_end}"
    commits = []
    page = 1
    while True:
        resp = gh_get(
            "https://api.github.com/search/commits",
            {"q": query, "per_page": 100, "page": page, "sort": "committer-date"},
            headers=SEARCH_HEADERS,
        )
        if not resp.ok:
            print(f"Search commits failed (page {page}): {resp.status_code} {resp.text[:200]}")
            break
        data = resp.json()
        items = data.get("items", [])
        if not items:
            break
        commits.extend(items)
        if len(commits) >= data.get("total_count", 0):
            break
        page += 1
    return commits


def fetch_repo_commits_by_email(full_name: str, since: str, until: str, emails: list[str]) -> list[dict]:
    """Fallback: fetch commits from a repo matching any of the user's emails."""
    all_commits = {}
    for email in emails:
        url = f"https://api.github.com/repos/{full_name}/commits"
        params = {"author": email, "since": since, "until": until, "per_page": 100}
        resp = gh_get(url, params)
        if resp.ok:
            for c in resp.json():
                all_commits[c["sha"]] = c
    return list(all_commits.values())


def fetch_user_prs(since: str) -> list[dict]:
    """Fetch PRs authored by the user since a date."""
    query = f"author:{USERNAME} created:>={since} type:pr"
    resp = gh_get(
        "https://api.github.com/search/issues",
        {"q": query, "per_page": 100, "sort": "created"},
    )
    if resp.ok:
        return resp.json().get("items", [])
    print(f"PR search failed: {resp.status_code}")
    return []


def fetch_user_issues(since: str) -> list[dict]:
    """Fetch issues authored by the user since a date."""
    query = f"author:{USERNAME} created:>={since} type:issue"
    resp = gh_get(
        "https://api.github.com/search/issues",
        {"q": query, "per_page": 100, "sort": "created"},
    )
    if resp.ok:
        return resp.json().get("items", [])
    return []


def fetch_repo_language(full_name: str) -> str | None:
    """Fetch primary language for a repo."""
    try:
        resp = gh_get(f"https://api.github.com/repos/{full_name}")
        if resp.ok:
            return resp.json().get("language")
    except Exception:
        pass
    return None


def gather_activity(week_start: str, week_end: str) -> dict:
    """Gather all activity across all accessible repos."""
    emails = fetch_user_emails()

    # Primary method: Search Commits API (finds commits across all repos)
    print("Searching commits via Search API...")
    search_results = search_commits(week_start, week_end)
    print(f"Search API found {len(search_results)} commits")

    # Group commits by repo
    repo_data = {}  # short_name -> {commits, messages, language, full_name}

    for item in search_results:
        repo_info = item.get("repository", {})
        full_name = repo_info.get("full_name", "")
        short_name = full_name.split("/")[-1]

        if short_name not in repo_data:
            repo_data[short_name] = {
                "commits": 0,
                "messages": [],
                "language": None,
                "full_name": full_name,
            }

        repo_data[short_name]["commits"] += 1

        msg = item.get("commit", {}).get("message", "").split("\n")[0]
        if msg and not msg.startswith("[bot]") and not msg.startswith("Merge"):
            if msg not in repo_data[short_name]["messages"]:
                repo_data[short_name]["messages"].append(msg)

    # If search returned nothing, try fallback: list repos pushed this week + email matching
    if not search_results:
        print("Search API returned nothing, trying fallback via repo listing...")
        since_iso = f"{week_start}T00:00:00Z"
        until_iso = f"{week_end}T23:59:59Z"
        cutoff = datetime.fromisoformat(since_iso.replace("Z", "+00:00"))

        # Get all repos
        repos = []
        url = "https://api.github.com/user/repos"
        params = {"per_page": 100, "sort": "pushed", "direction": "desc"}
        while url:
            resp = gh_get(url, params)
            if not resp.ok:
                break
            repos.extend(resp.json())
            url = resp.links.get("next", {}).get("url")
            params = {}

        for repo in repos:
            pushed = repo.get("pushed_at", "")
            if not pushed:
                continue
            pushed_dt = datetime.fromisoformat(pushed.replace("Z", "+00:00"))
            if pushed_dt < cutoff:
                continue

            full_name = repo["full_name"]
            short_name = repo["name"]

            # Try username first, then emails
            all_authors = [USERNAME] + emails
            commits = fetch_repo_commits_by_email(full_name, since_iso, until_iso, all_authors)
            if not commits:
                continue

            messages = []
            for c in commits:
                msg = c.get("commit", {}).get("message", "").split("\n")[0]
                if msg and not msg.startswith("[bot]") and not msg.startswith("Merge"):
                    if msg not in messages:
                        messages.append(msg)

            repo_data[short_name] = {
                "commits": len(commits),
                "messages": messages[:5],
                "language": repo.get("language"),
                "full_name": full_name,
            }

    # Fetch languages for repos that don't have them yet
    for name, rd in repo_data.items():
        if not rd["language"]:
            rd["language"] = fetch_repo_language(rd["full_name"])

    # Trim messages per repo
    for rd in repo_data.values():
        rd["messages"] = rd["messages"][:5]

    total_commits = sum(rd["commits"] for rd in repo_data.values())

    # Fetch PRs and issues
    prs = fetch_user_prs(week_start)
    issues = fetch_user_issues(week_start)
    prs_opened = len([p for p in prs if p.get("state") == "open"])
    prs_merged = len([p for p in prs if p.get("pull_request", {}).get("merged_at")])

    # Collect languages and messages
    languages = set()
    all_messages = []
    for rd in repo_data.values():
        if rd["language"]:
            languages.add(rd["language"])
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
        msgs = "; ".join(rd["messages"][:3]) if rd["messages"] else "no notable messages"
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

    activity = gather_activity(str(week_start), str(week_end))
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

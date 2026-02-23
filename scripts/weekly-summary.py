#!/usr/bin/env python3
"""Generate weekly activity summary using GitHub APIs and Claude."""

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import anthropic
import requests

USERNAME = "pidoshva"
# All emails used across personal and org repos
USER_EMAILS = {
    "vpgeleus@gmail.com",
    "vadim.pidoshva@orderprotection.com",
}
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


def fetch_active_repos(since_iso: str) -> list[dict]:
    """Fetch all repos pushed to since the given date."""
    repos = []
    url = "https://api.github.com/user/repos"
    params = {"per_page": 100, "sort": "pushed", "direction": "desc"}
    cutoff = datetime.fromisoformat(since_iso.replace("Z", "+00:00"))

    while url:
        resp = gh_get(url, params)
        if not resp.ok:
            print(f"Warning: repos fetch failed: {resp.status_code}")
            break
        page = resp.json()
        for repo in page:
            pushed = repo.get("pushed_at", "")
            if pushed:
                pushed_dt = datetime.fromisoformat(pushed.replace("Z", "+00:00"))
                if pushed_dt >= cutoff:
                    repos.append(repo)
                else:
                    # Sorted by pushed desc, so we can stop
                    return repos
        url = resp.links.get("next", {}).get("url")
        params = {}
    return repos


def fetch_repo_commits(full_name: str, since: str, until: str) -> list[dict]:
    """Fetch ALL commits in a repo within date range, then filter by user."""
    user_commits = []
    url = f"https://api.github.com/repos/{full_name}/commits"
    params = {"since": since, "until": until, "per_page": 100}
    while url:
        resp = gh_get(url, params)
        if not resp.ok:
            print(f"  Warning: commits fetch for {full_name} failed: {resp.status_code}")
            break
        page = resp.json()
        if not page:
            break
        for c in page:
            # Match by GitHub login OR commit email
            author_login = (c.get("author") or {}).get("login", "")
            committer_login = (c.get("committer") or {}).get("login", "")
            author_email = (c.get("commit", {}).get("author") or {}).get("email", "")
            committer_email = (c.get("commit", {}).get("committer") or {}).get("email", "")
            if (author_login == USERNAME
                    or committer_login == USERNAME
                    or author_email in USER_EMAILS
                    or committer_email in USER_EMAILS):
                user_commits.append(c)
        url = resp.links.get("next", {}).get("url")
        params = {}
    return user_commits


def fetch_user_prs(since: str) -> list[dict]:
    """Fetch all PRs the user authored or was involved in."""
    seen = {}
    for query_type in ["author", "involves"]:
        query = f"{query_type}:{USERNAME} updated:>={since} type:pr"
        resp = gh_get(
            "https://api.github.com/search/issues",
            {"q": query, "per_page": 100, "sort": "updated"},
        )
        if resp.ok:
            for item in resp.json().get("items", []):
                seen[item["id"]] = item
    return list(seen.values())


def fetch_user_issues(since: str) -> list[dict]:
    query = f"author:{USERNAME} created:>={since} type:issue"
    resp = gh_get(
        "https://api.github.com/search/issues",
        {"q": query, "per_page": 100, "sort": "created"},
    )
    if resp.ok:
        return resp.json().get("items", [])
    return []


def gather_activity(week_start: str, week_end: str) -> dict:
    """Gather all activity across all accessible repos."""
    since_iso = f"{week_start}T00:00:00Z"
    until_iso = f"{week_end}T23:59:59Z"

    active_repos = fetch_active_repos(since_iso)
    print(f"Repos pushed this week: {len(active_repos)}")
    for r in active_repos:
        print(f"  - {r['full_name']} ({r.get('language', '?')})")

    repo_data = {}
    total_commits = 0

    for repo in active_repos:
        full_name = repo["full_name"]
        short_name = repo["name"]
        language = repo.get("language")

        commits = fetch_repo_commits(full_name, since_iso, until_iso)
        print(f"  {full_name}: {len(commits)} commits by {USERNAME}")

        if not commits:
            continue

        messages = []
        for c in commits:
            msg = c.get("commit", {}).get("message", "").split("\n")[0]
            if msg and not msg.startswith("[bot]") and not msg.startswith("Merge"):
                if msg not in messages:
                    messages.append(msg)

        total_commits += len(commits)
        repo_data[short_name] = {
            "commits": len(commits),
            "messages": messages[:10],
            "language": language,
            "full_name": full_name,
        }

    # PRs and issues
    prs = fetch_user_prs(week_start)
    issues = fetch_user_issues(week_start)

    # Extract PR details and add PR-only repos to repo_data
    pr_details = []
    for p in prs:
        repo_url = p.get("repository_url", "")
        full_name = "/".join(repo_url.split("/")[-2:]) if repo_url else ""
        pr_repo = repo_url.split("/")[-1] if repo_url else ""
        pr_org = repo_url.split("/")[-2] if repo_url else ""
        merged = bool(p.get("pull_request", {}).get("merged_at"))
        state = "merged" if merged else p.get("state", "open")
        pr_details.append({
            "title": p.get("title", ""),
            "repo": pr_repo,
            "org": pr_org if pr_org != USERNAME else "",
            "state": state,
            "number": p.get("number", 0),
        })

        # Add repo to repo_data if not already there (PR-only repos)
        if pr_repo and pr_repo not in repo_data:
            lang = None
            # Find language from active_repos list
            for r in active_repos:
                if r["name"] == pr_repo:
                    lang = r.get("language")
                    break
            if not lang:
                lang = fetch_repo_language(full_name) if full_name else None
            repo_data[pr_repo] = {
                "commits": 0,
                "messages": [],
                "language": lang,
                "full_name": full_name,
            }

    prs_opened = len([p for p in pr_details if p["state"] == "open"])
    prs_merged = len([p for p in pr_details if p["state"] == "merged"])

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
        "pr_details": pr_details,
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
    if not ANTHROPIC_API_KEY:
        print("Warning: No ANTHROPIC_API_KEY set, using fallback summary")
        return fallback_summary(activity, week_start, week_end)

    repo_lines = []
    for name, rd in activity["repo_details"].items():
        lang = rd["language"] or "unknown"
        org = rd["full_name"].split("/")[0]
        org_label = f" (org: {org})" if org != USERNAME else ""
        msgs = "; ".join(rd["messages"][:8]) if rd["messages"] else "no direct commits"
        repo_lines.append(f"  - {name}{org_label} ({lang}, {rd['commits']} commits): {msgs}")

    pr_lines = []
    for pr in activity.get("pr_details", []):
        org_prefix = f"{pr['org']}/" if pr["org"] else ""
        pr_lines.append(f"  - [{pr['state']}] {org_prefix}{pr['repo']}#{pr['number']}: {pr['title']}")

    prompt = f"""You are summarizing a developer's weekly GitHub activity for their portfolio website.

Activity for {week_start} to {week_end}:
- Total commits: {activity['commit_count']}
- Repos active: {', '.join(activity['repos']) or 'none'}
- Per-repo breakdown:
{chr(10).join(repo_lines) or '  (none)'}
- Pull requests:
{chr(10).join(pr_lines) or '  (none)'}
- Languages: {', '.join(activity['languages']) or 'none'}
- Issues created: {activity['issues']}
{"- Personal notes: " + notes if notes else ""}

Return a JSON object with exactly these fields:
- "summary": A 2-3 sentence summary (max 280 chars) of the week's work. Mention specific repos, organizations, technologies, and what was accomplished. Example: "Shipped warranty validation fixes across OrderProtection/monolog (TypeScript). Updated personal portfolio with automated weekly summaries. Reviewed cart-widget feature PRs."
- "highlights": An array of 5-8 bullet points (each max 120 chars). IMPORTANT:
  - Start each highlight with the repo name followed by a colon (e.g. "monolog: ...")
  - Be specific: mention actual features, bug fixes, or changes based on commit messages and PR titles
  - Include work from ALL repos listed above, including repos with PRs but no direct commits (the developer reviewed or contributed to those PRs)
  - Group related commits/PRs per repo but create multiple highlights if a repo had diverse work
  - Mention the organization name for org repos (e.g. "cart-widget (OrderProtection): reviewed customizable info modal PR")

Return ONLY valid JSON, no markdown fencing."""

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
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
        "prs": [
            {
                "title": pr["title"],
                "repo": pr["repo"],
                "org": pr["org"],
                "state": pr["state"],
            }
            for pr in activity.get("pr_details", [])
        ],
        "repo_orgs": {
            name: rd["full_name"].split("/")[0]
            for name, rd in activity["repo_details"].items()
            if rd["full_name"].split("/")[0] != USERNAME
        },
        "repo_languages": {
            name: rd["language"]
            for name, rd in activity["repo_details"].items()
            if rd["language"]
        },
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
    print(f"Total repos with commits: {len(activity['repos'])}")
    print(f"Total commits: {activity['commit_count']}")
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

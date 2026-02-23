#!/usr/bin/env python3
"""Generate weekly activity summary using GitHub Events API and Claude."""

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import anthropic
import requests

USERNAME = "pidoshva"
EVENTS_URL = f"https://api.github.com/users/{USERNAME}/events?per_page=100"
REPO_URL = "https://api.github.com/repos/{owner}/{repo}"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SUMMARIES_FILE = DATA_DIR / "weekly-summaries.json"
NOTES_FILE = DATA_DIR / "notes.md"

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
TRIGGER = os.environ.get("TRIGGER", "manual")  # "schedule" or "workflow_dispatch"
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

HEADERS = {"Accept": "application/vnd.github.v3+json"}
if GITHUB_TOKEN:
    HEADERS["Authorization"] = f"Bearer {GITHUB_TOKEN}"


def fetch_events(since: datetime) -> list[dict]:
    """Fetch GitHub events from the past week."""
    events = []
    url = EVENTS_URL
    while url:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        page = resp.json()
        for event in page:
            created = datetime.fromisoformat(event["created_at"].replace("Z", "+00:00"))
            if created < since:
                return events
            events.append(event)
        # Follow pagination
        url = resp.links.get("next", {}).get("url")
    return events


def fetch_repo_language(owner: str, repo: str) -> str | None:
    """Fetch primary language for a repo."""
    try:
        resp = requests.get(
            REPO_URL.format(owner=owner, repo=repo),
            headers=HEADERS,
            timeout=15,
        )
        if resp.ok:
            return resp.json().get("language")
    except Exception:
        pass
    return None


def aggregate_events(events: list[dict]) -> dict:
    """Aggregate events into structured data."""
    repos = set()
    commit_count = 0
    commit_messages = []
    prs_opened = 0
    prs_merged = 0
    issues = 0

    for event in events:
        repo_name = event.get("repo", {}).get("name", "").split("/")[-1]
        etype = event.get("type", "")

        if etype == "PushEvent":
            repos.add(repo_name)
            commits = event.get("payload", {}).get("commits", [])
            commit_count += len(commits)
            for c in commits[:3]:  # Keep top 3 messages per push
                msg = c.get("message", "").split("\n")[0]
                if msg and msg not in commit_messages:
                    commit_messages.append(msg)

        elif etype == "PullRequestEvent":
            repos.add(repo_name)
            action = event.get("payload", {}).get("action", "")
            if action == "opened":
                prs_opened += 1
            elif action == "closed" and event["payload"].get("pull_request", {}).get("merged"):
                prs_merged += 1

        elif etype == "IssuesEvent":
            repos.add(repo_name)
            issues += 1

        elif etype in ("CreateEvent", "DeleteEvent", "ForkEvent", "WatchEvent"):
            repos.add(repo_name)

    # Fetch languages for active repos
    languages = set()
    for repo in repos:
        lang = fetch_repo_language(USERNAME, repo)
        if lang:
            languages.add(lang)

    return {
        "repos": sorted(repos),
        "commit_count": commit_count,
        "commit_messages": commit_messages[:15],  # Cap at 15
        "prs_opened": prs_opened,
        "prs_merged": prs_merged,
        "issues": issues,
        "languages": sorted(languages),
    }


def read_notes() -> str:
    """Read optional user notes."""
    if NOTES_FILE.exists():
        content = NOTES_FILE.read_text().strip()
        return content if content else ""
    return ""


def clear_notes():
    """Clear notes file after processing."""
    if NOTES_FILE.exists():
        NOTES_FILE.write_text("")


def generate_summary(aggregated: dict, notes: str, week_start: str, week_end: str) -> dict:
    """Call Claude API to generate a summary."""
    if not ANTHROPIC_API_KEY:
        print("Warning: No ANTHROPIC_API_KEY set, using fallback summary")
        return fallback_summary(aggregated, week_start, week_end)

    prompt = f"""You are summarizing a developer's weekly GitHub activity for their portfolio website.

Activity for {week_start} to {week_end}:
- Repos active: {', '.join(aggregated['repos']) or 'none'}
- Commits: {aggregated['commit_count']}
- Key commit messages: {json.dumps(aggregated['commit_messages'][:10])}
- Languages: {', '.join(aggregated['languages']) or 'none'}
- PRs opened: {aggregated['prs_opened']}, merged: {aggregated['prs_merged']}
- Issues: {aggregated['issues']}
{"- Personal notes: " + notes if notes else ""}

Return a JSON object with exactly these fields:
- "summary": A single sentence (max 120 chars) summarizing the week's focus
- "highlights": An array of 2-5 short bullet points (each max 80 chars) describing key accomplishments

Return ONLY valid JSON, no markdown fencing."""

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    # Strip markdown fencing if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text[: text.rfind("```")]
        text = text.strip()

    result = json.loads(text)

    return {
        "week_start": week_start,
        "week_end": week_end,
        "generated": datetime.now(timezone.utc).isoformat(),
        "trigger": TRIGGER,
        "summary": result.get("summary", ""),
        "highlights": result.get("highlights", []),
        "repos": aggregated["repos"],
        "languages": aggregated["languages"],
        "stats": {
            "commits": aggregated["commit_count"],
            "prs": aggregated["prs_opened"] + aggregated["prs_merged"],
            "repos_active": len(aggregated["repos"]),
        },
    }


def fallback_summary(aggregated: dict, week_start: str, week_end: str) -> dict:
    """Generate a summary without Claude API."""
    repos_str = ", ".join(aggregated["repos"][:3]) if aggregated["repos"] else "various projects"
    summary = f"Worked on {repos_str} with {aggregated['commit_count']} commits."
    highlights = aggregated["commit_messages"][:5]

    return {
        "week_start": week_start,
        "week_end": week_end,
        "generated": datetime.now(timezone.utc).isoformat(),
        "trigger": TRIGGER,
        "summary": summary,
        "highlights": highlights,
        "repos": aggregated["repos"],
        "languages": aggregated["languages"],
        "stats": {
            "commits": aggregated["commit_count"],
            "prs": aggregated["prs_opened"] + aggregated["prs_merged"],
            "repos_active": len(aggregated["repos"]),
        },
    }


def main():
    # Calculate week range (past 7 days)
    now = datetime.now(timezone.utc)
    week_end = now.date()
    week_start = week_end - timedelta(days=6)

    print(f"Generating summary for {week_start} to {week_end}")

    # Fetch and aggregate events
    since = datetime(week_start.year, week_start.month, week_start.day, tzinfo=timezone.utc)
    events = fetch_events(since)
    print(f"Found {len(events)} events")

    aggregated = aggregate_events(events)
    print(f"Repos: {aggregated['repos']}")
    print(f"Commits: {aggregated['commit_count']}")

    # Read optional notes
    notes = read_notes()
    if notes:
        print(f"Notes found: {len(notes)} chars")

    # Skip if no activity and no notes
    if aggregated["commit_count"] == 0 and not notes and not aggregated["repos"]:
        print("No activity this week, skipping summary generation")
        return

    # Generate summary
    entry = generate_summary(
        aggregated, notes, str(week_start), str(week_end)
    )

    # Load existing summaries
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if SUMMARIES_FILE.exists():
        data = json.loads(SUMMARIES_FILE.read_text())
    else:
        data = {"summaries": []}

    # Check if we already have an entry for this week
    existing = [s for s in data["summaries"] if s["week_start"] == str(week_start)]
    if existing:
        # Replace existing entry
        data["summaries"] = [
            s for s in data["summaries"] if s["week_start"] != str(week_start)
        ]

    data["summaries"].append(entry)

    # Sort by week_start descending
    data["summaries"].sort(key=lambda s: s["week_start"], reverse=True)

    # Write back
    SUMMARIES_FILE.write_text(json.dumps(data, indent=2) + "\n")
    print(f"Summary written to {SUMMARIES_FILE}")

    # Clear notes
    clear_notes()


if __name__ == "__main__":
    main()

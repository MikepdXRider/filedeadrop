---
description: Create a pull request with enforced title, body structure, and safety rules. Pass an issue number as an argument (e.g. /create-pr 20) or omit for a PR without an associated issue.
argument-hint: [issue-number]
---

## Before creating the PR
1. Push the current branch to remote before opening the PR
2. If no issue number is provided, ask before proceeding — a PR without an issue is allowed but should be intentional

## PR title
- When an issue number is provided, fetch the issue title from GitHub and use it as the starting point — clean up if over 70 characters or awkwardly worded
- Otherwise write fresh — concise, under 70 characters, describes the change

## PR body
Use this template exactly, in this order:

```
## Summary
- Bullet points describing what changed and why

## Follow-up
Manual steps required after merge. Omit this section entirely if none.

## Test plan
- [ ] Derive from issue acceptance criteria when present; extend if implementation exposed additional test needs

Closes #X
Closes #Y  ← one per line; never comma-separate (GitHub only closes the first); omit if no associated issue

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Base branch
- If a `dev` branch exists, feature PRs should target `dev`
- `dev` PRs should target `main`
- If no `dev` branch exists, default to `main`
- Override if the user specifies otherwise

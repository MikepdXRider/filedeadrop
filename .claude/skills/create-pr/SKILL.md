---
description: Create a pull request with enforced title, body structure, and safety rules. Pass an issue number as an argument (e.g. /create-pr 20) or omit for a PR without an associated issue.
argument-hint: [issue-number]
---

## Before creating the PR

### 1. Check for documentation updates
Determine the base branch using the same logic as the Base Branch section below, then read the diff:
```
git diff <base-branch>...HEAD
```
For each target, determine if the changes genuinely require a doc update:

**CLAUDE.md**
- Structure: were files or directories added, removed, or renamed?
- Conventions: were new patterns introduced that should be codified?
- Key Architecture Decisions: were architectural choices made or changed?
- Current Status: does Completed or Up Next need updating?

**README.md**
- Stack: did the tech stack change?
- How It Works: did the upload or view flow change?
- Deployment: did Lambda functions, workflows, secrets, or deploy steps change?

**Skill files**
- Did the branch changes affect a workflow that an existing skill covers?
- If so, update the skill following the `/manage-docs` workflow.

If updates are needed, make them and create a documentation commit before proceeding:
- Stage only documentation files — never mix doc changes with code
- Commit message format: `docs: update [file] for [brief reason]`

If nothing needs updating, say so and proceed to the PR.

### 2. Push and open the PR
- Push the current branch to remote
- If no issue number is provided, ask before proceeding — a PR without an issue is allowed but should be intentional

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

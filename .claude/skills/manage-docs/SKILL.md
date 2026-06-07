---
description: Create or update skills and CLAUDE.md. Optimizes for consistent rule application — resolves placement and ambiguity before writing anything.
argument-hint: [skill-name | claude.md]
---

## Entry
If invoked with no argument, ask the user what they want to create or update before proceeding.

## Workflow

Follow these steps in order. Do not write any content until steps 1–3 are complete.

### 1. Read existing docs
Read all relevant files before doing anything else:
- `CLAUDE.md`
- Any related existing skills in `.claude/skills/`

### 2. Determine placement
For each rule or preference being documented, classify it:

| Belongs in CLAUDE.md | Belongs in a skill |
|---|---|
| Applies universally across all work | Scoped to a specific workflow or command |
| Should apply to all contributors | Invoked intentionally by the user |
| Git rules, conventions, architecture decisions | Step-by-step process enforcement |

A rule may belong in both — state it once in CLAUDE.md and reference it from the skill. Never duplicate the full rule.

### 3. Resolve ambiguities upfront
Identify genuine ambiguities and ask the user before drafting. Do not write around ambiguity. Do not ask about things that are already clear. Examples of ambiguities to watch for:
- Placement is unclear — could belong in a skill, CLAUDE.md, or both
- Overlap with existing content exists but the right resolution isn't obvious
- Edge cases exist where the rule should not apply
- Rules could conflict and precedence isn't stated

### 4. Check for redundancy
Review existing content for overlap with what is being added. Flag any redundancy to the user before writing. Prefer consolidation over duplication.

### 5. Write for execution
Optimize all content for Claude's consistent application:
- Use unambiguous, directive language
- Avoid prose where a list or table is clearer
- State precedence explicitly when rules could conflict
- Keep each rule in exactly one place — if it appears in two files, one should reference the other

### 6. Surface changes to the user
After writing, summarize:
- What was created or changed
- Where each rule was placed and why
- Anything moved from memory to a doc file
- Any redundancy that was resolved

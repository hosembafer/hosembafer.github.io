---
title: "Conceptual Integrity - Monotonic Pattern Discipline"
description: "A governing principle for keeping codebase patterns coherent through explicit reuse and controlled pattern evolution."
slug: conceptual-integrity-monotonic-pattern-discipline
date: 2026-03-13
updated: 2026-03-13
type: Engineering Note
tags:
  - engineering principles
  - software architecture
  - codebase governance
  - pattern discipline
summary: A governing principle for keeping codebase patterns coherent through explicit reuse and controlled pattern evolution.
---

# Conceptual Integrity - Monotonic Pattern Discipline

## Context

As a codebase grows across multiple contributors, patterns naturally diverge. New code introduces "locally clean" solutions without checking for prior art, resulting in multiple ways to solve the same problem. This compounds silently until the codebase loses coherence and every new contributor must reverse-engineer which approach to follow.

## Decision

We adopt **Conceptual Integrity - Monotonic Pattern Discipline** as the governing philosophy for all code contributions.

> _"Conceptual integrity is the most important consideration in system design."_
> - Fred Brooks, The Mythical Man-Month (1975)

Reuse is the default. Deviation is the exception. The set of recognized patterns grows in one controlled direction; they never silently fork.

**The Three Rules:**

1. **Reuse First** - If a pattern exists, use it. A "locally cleaner" variant is still a fork.
2. **Recognize New Patterns Explicitly** - When an existing pattern cannot serve a new case, the new pattern must be named, documented, justified, and stress-tested against all existing cases, not just the immediate one.
3. **Global Validation Before Adoption** - A pattern is not proven by working in one place. It must compose with the full codebase without friction, degradation, or unresolved coexistence with what it replaces.

## Consequences

- All contributors must scan for existing patterns before writing new code.
- Introducing a new pattern requires explicit justification and documentation, ideally as a follow-up ADR.
- Short-term: occasional friction when the "obvious" local solution must be reconciled with the global one.
- Long-term: a codebase that feels coherent, is easier to onboard into, and produces more predictable AI-assisted output.

### Impact on AI-Assisted Work

LLM-based tools rely heavily on semantic association: they infer likely code structure from nearby names, patterns, and examples. A conceptually coherent codebase strengthens those associations by presenting one dominant way to solve a problem instead of several competing local variants.

That makes retrieval more reliable and suggestions more consistent with surrounding code. When pattern divergence grows, semantic association becomes noisier, and the model is more likely to continue the wrong precedent or synthesize an inconsistent hybrid.

## Anti-Patterns to Avoid

| Anti-pattern            | Why it breaks integrity                               |
| ----------------------- | ----------------------------------------------------- |
| Local optimization      | Silent fork - two patterns now exist                  |
| Familiarity bias        | Imports a foreign conceptual model                    |
| Undocumented divergence | Future readers cannot distinguish intent from accident |

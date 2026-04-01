---
title: "Designing Codebases for AI-Assisted Development"
description: "A practical note on how codebase shape, documentation, token economy, enforced patterns, and operational workflows affect AI-assisted development."
slug: designing-codebases-for-ai-assisted-development
date: 2026-03-30
updated: 2026-04-01
type: Engineering Note
tags:
  - ai-assisted development
  - llms
  - codebase design
  - documentation
  - context engineering
summary: "AI-assisted development is mostly a documentation and pattern problem: coherent patterns, compact context, enforced regularity, and structured task decomposition shape model output as much as model quality."
---

# Designing Codebases for AI-Assisted Development

## Summary

AI-assisted development is mostly a documentation and pattern problem.

Model quality still matters, but in day-to-day engineering the stronger determinant is the shape of the codebase the model is asked to operate inside. If names are unstable, patterns silently fork, instructions are oversized, and conventions are only implied, the model has too many plausible continuations. If the codebase is coherent, the model has fewer.

This is why codebase design matters for AI-assisted work. The goal is not to make the repository "AI-friendly" in a superficial sense. The goal is to reduce ambiguity in the places where models infer structure, retrieve facts, and choose between multiple locally plausible implementations.

Three properties determine how reliably an AI agent can operate inside a codebase:

- **Context** — the agent can find and understand what it needs without human narration.
- **Constraints** — the agent operates within enforceable guardrails: types, lint rules, module boundaries, tests.
- **Conventions** — the agent can pattern-match on existing code to produce consistent new code.

When any leg is weak, the failure mode is predictable. Weak context leads to hallucinated imports and invented APIs. Weak constraints allow subtly incorrect code that compiles but violates invariants. Weak conventions produce stylistically inconsistent output that creates review friction. Most interventions in this document strengthen one or more of these legs.

## Semantic Association and Conceptual Integrity

At a behavioral level, LLM-based tools operate through something close to semantic association. They infer likely structure from nearby names, repeated code shapes, file organization, examples, and instructions that appear relevant to the current task. The underlying mechanism is more structured — attention over token sequences, learned syntactic patterns, pattern-completion circuits — but the practical effect for engineers is that models continue what they see nearby.

That makes [Conceptual Integrity - Monotonic Pattern Discipline](/documents/conceptual-integrity-monotonic-pattern-discipline) directly relevant to AI-assisted development. A model does not need many competing patterns to become less reliable. Two or three locally valid approaches to the same problem are often enough to make the next suggestion less predictable. When in-context patterns are ambiguous, the model falls back on pre-training defaults — generic patterns from training data rather than repository-specific conventions.

When one dominant pattern exists, the model has a stronger local precedent:

- naming becomes easier to continue correctly
- surrounding code provides clearer examples
- retrieval is more likely to surface the right implementation shape
- suggestions are less likely to blend incompatible styles

This principle needs a detection mechanism to be practical. Pattern drift is silent — it does not produce build errors. Teams should periodically audit for competing patterns and converge them. Simple grep-based checks can surface divergence before it compounds: how many files use approach A versus approach B for the same category of problem. If the ratio is not close to 100:0, the model sees ambiguity.

## Names and Types as Steering Mechanisms

Names are not just a readability concern. In AI-assisted development, identifiers function as semantic anchors that directly steer model output.

Research confirms this is a measurable effect. Obfuscating identifiers — replacing `MinesweeperGame`, `sweep`, `check_won` with `a1`, `b2`, `c3` — collapses model summarization to line-by-line descriptions and degrades even execution-prediction tasks. The model relies on names as shortcuts for intent, not just as labels. In dynamically typed languages, naming carries even more weight because there are no type declarations to compensate for a vague or misleading identifier.

Type annotations matter for a related reason: they narrow the space of plausible completions. Research on type-constrained code generation shows that enforcing type correctness during generation reduces compilation errors by roughly 75% compared to unconstrained output — and syntax-only constraints achieve less than a tenth of that improvement. This aligns with a broader observation: 94% of LLM-generated compilation errors are type-check failures. Types catch the exact class of errors AI produces most.

This extends naturally to domain modeling. Branded types and value objects do not just improve developer ergonomics — they create compiler-enforced constraints that the model cannot bypass. A `UserId` that is structurally incompatible with an `OrderId` prevents the model from passing the wrong identifier even when both are strings at runtime. A `Money` value object prevents the model from performing raw arithmetic on currency amounts without going through domain methods. The richer the type surface, the smaller the space of plausible but incorrect completions.

For engineers, this means:

- invest in precise, domain-specific names — a `UserId` is a stronger signal than a `string`
- prefer rich type definitions over untyped or loosely typed code
- treat branded types and domain-specific type aliases as part of the AI control surface, not just developer ergonomics
- make invalid states unrepresentable at the type level — the compiler then rejects AI-generated code that violates invariants before it reaches review

## Token Economy Is a Design Constraint

Large context windows do not remove the need for discipline. They make discipline more important.

Token economy matters for two reasons:

- fact retrieval accuracy depends on how much low-signal material competes with the task at hand — context window effective load is not the same as context window capacity
- structural markers, section boundaries, and clear formatting improve retrieval regardless of document position — Anthropic's long-context guidance confirms that placement and structure help, though the practical lever for engineers is signal density and explicit markers, not positional micromanagement

This is not just a cost issue. It is a reliability issue. A repository may have enough total context capacity to include everything, but that does not mean the model will use every part of it equally well. Anthropic's documentation describes this as *context rot*: retrieval accuracy decreases as token counts increase, even when the raw capacity is available.

In practice, that means:

- avoid oversized top-level instruction files
- avoid repeating the same rule in several weakly different ways
- keep high-signal examples easy to retrieve
- separate durable decisions from operational instructions
- use explicit structural markers — headers, labeled sections, clear boundaries — to make documents navigable for both humans and models

More context is not automatically more clarity. Research on agent context files (Khandelwal et al., 2026) found that LLM-generated context files can actually reduce task success while increasing token cost — over-documentation is not a theoretical risk. Once noise grows faster than signal, effective context quality drops even if raw context capacity is still available.

A useful sizing heuristic: the total chain of instruction files the model reads for any single task should stay under roughly 3,000 tokens (~200 lines). Beyond that, instructions start competing with the actual code the agent needs to read. This is measurable — count the total words across all composed instruction files and multiply by 1.3 for a rough token estimate.

## Documentation as Control Surface

Documentation should not be treated as generic prose around the codebase. In AI-assisted development, it becomes part of the control surface.

### Instruction Files

Agent instruction files (such as `CLAUDE.md`) should carry working instructions, common commands, and task-relevant operating constraints. In monorepo setups, these files compose hierarchically — the agent reads the nearest instruction file plus all parents up to the repository root. This means each file should be self-sufficient for its scope: the root file carries global constraints, and each sub-project file carries only what is relevant locally.

A well-structured instruction file for a specific sub-project contains:

- the technology choices and conventions in force for that scope
- a routing table that maps problem domains to directories or modules
- an explicit list of bans — patterns and approaches that are not allowed
- the verification commands the agent should run after making changes
- references to canonical implementation files the agent should follow

Each of these elements serves a different function. The routing table prevents the agent from editing the wrong files. The bans prevent known failure modes. The verification commands enable the agent to self-check. The canonical references provide few-shot examples without bloating the instruction file with inline code.

Specificity matters as much as structure. Vague instructions like "follow best practices" are nearly useless — research shows that simply rewording a prompt can cause a 30-point accuracy gap in code generation. Instructions should be concrete enough to verify mechanically: "use `Result<T, DomainError>` for all repository methods; never throw from a repository" is actionable in a way that "handle errors properly" is not.

Size discipline matters. If an instruction file exceeds 50–80 lines, it probably conflates concerns that belong at different scopes. The Khandelwal et al. finding about over-documentation applies directly: every line in an instruction file should either constrain the agent's behavior or point it to a specific resource.

### Canonical Examples

Concrete code examples are one of the strongest levers available for steering model output — production experience at scale confirms that a handful of canonical examples heavily influence the outcome. The codebase itself is a few-shot prompt.

This means canonical examples need deliberate management:

- there should be exactly one canonical reference per pattern type
- instruction files should name the reference file explicitly ("follow the pattern in `product.entity.ts`")
- if two implementations of the same pattern diverge, the model sees ambiguity — converge them

A short canonical pattern document plus one strong implementation example is usually more valuable than a long abstract explanation with no concrete precedent. Periodic audits of reference implementations — checking that they still represent the team's preferred approach — prevent the few-shot examples from silently going stale.

### Decisions and Guidelines

Architectural decisions and team-level guidelines serve a different purpose. They record *why* the codebase works the way it does. For AI-assisted development, their primary value is indirect: the actionable output of a decision should be distilled into a constraint or ban in the relevant instruction file. "We chose Signal Store over classic NgRx because of X" is useful context for humans reviewing the decision; "State management: use Signal Store; do not use classic NgRx for new code" is useful context for the agent.

This means decisions and guidelines are human-facing artifacts that *feed into* instruction file updates, not documents the agent consumes directly during task execution.

## Machine-Enforced Regularity

Patterns should be documented, but the most important ones should also be enforced mechanically.

### Structural Linting

Linting matters here not because formatting is sacred, but because structural regularity reduces ambiguity. Rules such as import grouping and ordering, member grouping and ordering, and consistent type import usage reduce the number of shapes a file can take.

That helps in several ways:

- the model sees fewer equivalent but different local forms
- diffs become easier to read and compare
- generated code is less likely to drift into repo-specific style violations
- reviewers spend less time correcting surface inconsistency

In this sense, linting is part of the AI-assisted development stack. It turns conventions from "good ideas" into guaranteed repository constraints.

### Module Boundary Enforcement

In monorepo setups, module boundary rules are the highest-value single enforcement mechanism for AI-assisted development. They constrain which modules can depend on which other modules, and they produce lint errors when the agent generates an import that violates the boundary.

This matters because cross-boundary imports are one of the most common AI-generated errors in large codebases. The agent sees a type it needs, finds it in a sibling module, and imports it — without knowing that the architectural intent forbids that dependency. A module boundary rule catches this automatically. The agent sees the lint error, reads the constraint, and self-corrects without human intervention.

The general pattern is a dependency constraint matrix: domain modules depend only on other domain modules and utilities; data-access modules depend on domain modules; feature modules depend on data-access and UI modules; UI modules depend only on utilities. Scope tags further restrict cross-domain dependencies — an orders module should not import directly from a shipping module.

### Pattern-Level Enforcement

Beyond structural formatting and module boundaries, specific pattern choices can be enforced through lint rules: requiring specific change detection strategies, banning deprecated APIs, restricting imports from packages the team has decided to stop using. Each such rule eliminates a category of AI-generated code that would otherwise require manual review correction.

The practical value is that these rules turn review comments into automated checks. If the team repeatedly corrects the same AI-generated pattern, that correction should become a lint rule rather than remaining tribal knowledge.

## Filtered Feedback Loops

AI output should be cheap to verify. If build, lint, test, and typecheck workflows are obscure, slow, or inconsistent, low-quality output survives longer than it should. The issue is not that the model made a mistake. The issue is that the repository made the mistake expensive to detect.

Fast feedback loops improve AI-assisted development because they shorten the path between "plausible" and "proven". The more quickly a generated change can be checked against real constraints, the less value there is in arguing about whether the output "looks right".

### Output Filtering

Build and test tools in monorepo setups produce verbose output — configuration resolution, module mapping, file discovery, timing metadata, ANSI color codes, coverage tables, and success markers. When the agent reads this output, the actual error message competes with hundreds of lines of noise.

A wrapper script that filters verification output before it reaches the model is not a minor convenience. It is critical infrastructure. The wrapper should strip warnings, success markers, timing information, and formatting noise, while preserving error messages, failure locations, and assertion mismatches. The resulting output is denser and more useful — the agent identifies the problem faster and self-corrects more reliably.

These filtered scripts should be referenced in instruction files as the standard verification commands. When the agent runs the filtered version by default, it gets clean signal without the engineer needing to intervene.

### Noise Exclusion

Similarly, the agent's file indexing should exclude build artifacts, generated code, test snapshots, and IDE configuration. A `.claudeignore` file (or equivalent) prevents the agent from reading and potentially modifying files that are not meant to be hand-edited. Generated API clients are a common source of confusion — the agent sees generated types, tries to modify them, and produces changes that will be overwritten on the next generation run.

### Command Discoverability

Common commands, validation steps, and expected checks belong in the working documentation, not only in team memory. The instruction file should include the exact commands the agent should run after completing a task — and those commands should be the filtered versions that produce clean signal.

## Task Decomposition

Codebase shape determines the ceiling for AI-assisted development. Task decomposition determines how much of that ceiling the team actually reaches.

### Scope and Success Rate

The relationship between task scope and AI success rate is not linear. Small, well-bounded tasks — a single function, a single component matching a reference pattern, a single domain entity with tests — succeed at high rates on the first attempt. Larger tasks — a full vertical feature slice across multiple layers, a cross-cutting refactor — succeed at dramatically lower rates and require either decomposition or significant human steering.

This is not a model limitation that will disappear with better models. It is a consequence of compound uncertainty: each additional decision the agent must make multiplies the probability of diverging from the intended approach. A task that requires five independent decisions is not five times harder — it is combinatorially harder.

For engineers, the practical implication is that task decomposition is a skill worth investing in. The highest-throughput workflow is a series of small, independently verifiable tasks, each scoped to a single module or layer, each with an explicit reference pattern and a verification command.

### Vertical Slice Decomposition

In codebases with layered architecture — domain, data-access, feature, UI — the most reliable decomposition follows the layers:

1. Domain layer first: create the entity or value object, write unit tests, verify.
2. Data-access layer next: create the API service and state management, write integration tests, verify.
3. Feature/UI layer last: create the page component, wire the data-access layer, verify.

Each step depends on the previous step's output but is scoped to a single library or module. Each step has its own verification command. The agent completes and verifies one step before moving to the next.

This approach works because each layer has a clear contract — the domain layer defines types the data-access layer consumes, the data-access layer exposes a store the feature layer injects. The agent at each step has a well-defined input (the previous layer's public API) and a well-defined output (the current layer's public API).

### Codified Workflows

Recurring task patterns — "create a new domain entity," "add a feature page," "add an API endpoint" — should be codified into reusable workflow definitions. Claude Code supports project-specific custom commands that encode multi-step workflows into a single invocation. These commands specify which library to target, which reference files to follow, what to generate, and which verification commands to run.

The value is not just convenience. Codified workflows enforce the team's preferred decomposition and reference patterns. When the engineer invokes a codified workflow instead of writing a free-form prompt, the agent follows the team's standards by default rather than improvising.

## Test Infrastructure as Specification

Types constrain the space of code the model can generate. Tests constrain the space of *behavior* the model can produce.

When a test suite exists before the implementation, it functions as a machine-verifiable specification. The agent generates code, runs the tests, and self-corrects until the tests pass. This is more reliable than relying on the agent to infer intended behavior from prose descriptions, because tests are unambiguous and produce binary pass/fail signals.

This makes test-first workflows — or at minimum, test-skeleton-first workflows — disproportionately effective for AI-assisted development. The engineer writes the test cases (what to verify), and the agent writes the implementation (how to satisfy the tests). The test cases encode intent; the implementation is mechanical.

### Test Factories

The same principle that applies to production types applies to test data. If the agent can construct invalid test data — domain objects in impossible states, entities with missing required fields — the resulting tests may pass while verifying nothing useful.

Test factories (also called Object Mothers or test builders) solve this by providing pre-validated construction functions for domain objects. The factory enforces the same invariants as the production code, so the agent cannot accidentally create test fixtures that would be rejected by the domain layer.

Instruction files should direct the agent to use test factories rather than constructing domain objects directly in test files. This turns test data construction into a constrained operation with the same benefits that branded types provide for production code.

## Continuous Calibration

The practices in this document are not static. They require a feedback loop.

Every time a human reviewer corrects AI-generated code, there is an implicit signal: the agent's context was incomplete or its constraints were insufficient. The question to ask is: "Could this correction have been prevented by an instruction file update, a lint rule, or a better canonical example?"

If yes, the correction should produce a documentation or tooling change in the same review cycle. Over time, this feedback loop transfers patterns from human review memory into the agent's operating environment. The rate of "same class of correction" recurring should decrease. If it does not, either the instruction is ambiguous or the agent is not reading it — both are diagnosable.

This feedback loop is the mechanism that turns a static guide into a continuously improving system.

## References

- Anthropic, `Manage Claude's memory`: <https://docs.anthropic.com/en/docs/claude-code/memory>
- Anthropic, `Effective context engineering for AI agents`: <https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents>
- Anthropic, `Long context prompting tips`: <https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/long-context-tips>
- Anthropic, `Context windows`: <https://docs.anthropic.com/en/docs/build-with-claude/context-windows>
- Chroma, `Context Rot: How Increasing Input Tokens Impacts LLM Performance`: <https://www.trychroma.com/research/context-rot>
- Khandelwal et al., `How Effective Are Agent Frameworks? Benchmarking AGENTS.md Files`: <https://arxiv.org/abs/2602.12843>
- DORA, `State of AI-assisted Software Development 2025`: <https://dora.dev/research/2025/dora-report/>
- Spotify Engineering, `Context Engineering: Background Coding Agents`: <https://engineering.atspotify.com/2025/11/context-engineering-background-coding-agents-part-2>
- Wang et al., `How Does Naming Affect LLMs on Code Analysis Tasks?`: <https://arxiv.org/abs/2307.12488>
- Le et al., `When Names Disappear: Revealing What LLMs Actually Understand About Code`: <https://arxiv.org/abs/2510.03178>
- Muendler et al., `Type-Constrained Code Generation with Language Models`: <https://arxiv.org/abs/2504.09246>
- GitHub, `Why AI is pushing developers toward typed languages`: <https://github.blog/ai-and-ml/llms/why-ai-is-pushing-developers-toward-typed-languages/>
- typescript-eslint, `member-ordering`: <https://typescript-eslint.io/rules/member-ordering/>
- ESLint, `sort-imports`: <https://eslint.org/docs/latest/rules/sort-imports>

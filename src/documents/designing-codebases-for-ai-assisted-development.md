---
title: Designing Codebases for AI-Assisted Development
description: A practical note on how codebase shape, documentation, token economy, and enforced patterns affect AI-assisted development.
slug: designing-codebases-for-ai-assisted-development
date: 2026-03-30
updated: 2026-04-01
type: Engineering Note
tags:
  - ai-assisted development
  - context engineering
  - llms
  - codebase design
  - documentation
summary: AI-assisted development is mostly a context engineering problem — coherent patterns, compact context, and enforced regularity shape model output as much as model quality does.
---

# Designing Codebases for AI-Assisted Development

## Summary

AI-assisted development is mostly a context engineering problem.

Model quality still matters, but in day-to-day engineering the stronger determinant is the shape of the codebase the model is asked to operate inside. If names are unstable, patterns silently fork, instructions are oversized, and conventions are only implied, the model has too many plausible continuations. If the codebase is coherent, the model has fewer.

This is why codebase design matters for AI-assisted work. The goal is not to make the repository "AI-friendly" in a superficial sense. The goal is to reduce ambiguity in the places where models infer structure, retrieve facts, and choose between multiple locally plausible implementations — and to make mistakes cheap to detect when the model still gets it wrong.

---

## Semantic Association and Conceptual Integrity

LLM-based tools operate through semantic association. They infer likely structure from nearby names, repeated code shapes, file organization, examples, and instructions that appear relevant to the current task. They continue what they see.

That makes [Conceptual Integrity - Monotonic Pattern Discipline](https://hosembafer.github.io/documents/conceptual-integrity-monotonic-pattern-discipline) directly relevant to AI-assisted development. A model does not need many competing patterns to become less reliable. Two or three locally valid approaches to the same problem are often enough to make the next suggestion less predictable. When in-context patterns are ambiguous, the model falls back on pre-training defaults — generic patterns from training data rather than repository-specific conventions.

When one dominant pattern exists, the model has a stronger local precedent:

- naming becomes easier to continue correctly
- surrounding code provides clearer examples
- retrieval is more likely to surface the right implementation shape
- suggestions are less likely to blend incompatible styles

This is not just intuition. Analysis of AI coding agent benchmarks shows that the same model's resolve rate can vary from below 10% to above 50% depending entirely on which repository it is asked to work in — before any prompting difference. Repository structure is the dominant predictor of agent success, stronger than model choice. Well-organized codebases with consistent patterns and clear API surfaces systematically outperform poorly structured ones.

**Scope of this principle.** Pattern uniformity matters most within a bounded unit: a module, a service, a component area. Microservice architectures are deliberately polyglot, and AI tools increasingly operate at that level of granularity. The requirement is *local* consistency — standardize within the unit the agent is working in. What matters is that the agent sees one dominant pattern *in context*, not that the entire codebase uses the same pattern everywhere.

---

## Names and Types as Steering Mechanisms

Names are not just a readability concern. In AI-assisted development, identifiers function as semantic anchors that directly steer model output. Precise names narrow the set of plausible continuations; vague ones widen it.

Research confirms this is a measurable effect. Le et al. showed that removing identifier names — while leaving code structure intact — causes models to regress from intent-level summaries to line-by-line narration, and degrades even tasks that should depend only on structure, such as execution prediction. Wang et al. found consistent degradation on code analysis benchmarks when meaningful names are replaced with opaque identifiers. In dynamically typed languages, naming carries even more weight because there are no type declarations to compensate for a vague identifier.

This effect is not absolute. Fine-tuning on obfuscation-augmented datasets can partially recover performance, and specialized tools exist for working on obfuscated or minified code. But standard models rely on names as strong signals for intent. Investing in precise, domain-specific names pays off regardless of tooling.

Type annotations narrow the space of plausible completions further. A `UserId` that is structurally incompatible with an `OrderId` prevents the model from passing the wrong identifier even when both are strings at runtime. Research on type-constrained code generation (Muendler et al., TypeScript-specific) shows that enforcing type correctness during generation reduces compilation errors by roughly half compared to unconstrained generation. Syntax-only constraints achieve a fraction of that. The mechanism studied — constrained decoding — is a runtime technique, but the underlying principle transfers: the richer the type surface available to the model, the smaller the space of plausible-but-incorrect completions, and the more the compiler can automatically reject what the model gets wrong.

This finding applies most directly to statically typed languages. In dynamically typed ones, LLM-generated errors are more often semantic than type-related, so type annotations alone cannot be the primary correctness lever. The broader principle — prefer rich type definitions over loosely typed code — holds, but its impact varies by language.

For engineers, this means:

- invest in precise, domain-specific names — a `UserId` is a stronger signal than a `string`
- prefer rich type definitions over untyped or loosely typed code
- treat branded types and domain-specific type aliases as part of the AI control surface, not just developer ergonomics

---

## Token Economy Is a Design Constraint

The dominant assumption about long context windows is that more is better: if the model *can* see everything, it *should*. That assumption is wrong, and the evidence against it has hardened considerably.

Du et al. (EMNLP 2025) tested five frontier models on math, QA, and coding tasks and found that performance degrades **13–85% as context length increases — even when retrieval is perfect and irrelevant tokens are replaced with whitespace**. The degradation persisted even when models were constrained to attend only to relevant tokens. This is not a distraction problem or a retrieval problem. It is a length problem: the sheer size of the input hurts, independent of its content.

A related finding sharpens the point further. Models that pass simple needle-in-a-haystack tests — retrieving a single fact from a long document — collapse on tasks requiring non-lexical reasoning. At 128K tokens, without surface-level lexical overlap between query and target, frontier models drop to a fraction of their short-context performance. Long context windows are a genuine capability, but they are a narrow one.

The earlier "Lost in the Middle" finding (Liu et al.) — that models perform worse on information placed in the middle of long contexts — has been partially mitigated in 2025-era models for simple factual retrieval. The harder problem is intact.

This makes codebase organization a direct performance variable: a well-structured repository enables targeted retrieval of small, relevant contexts; a poorly structured one forces large context dumps that actively hurt the model working inside it.

In practice, that means:

- avoid oversized top-level instruction files — important rules buried in long context are lost in noise
- avoid repeating the same rule in weakly different ways across multiple files
- keep high-signal examples close to the code they describe and easy to retrieve
- separate durable decisions (ADRs) from operational instructions (CLAUDE.md / AGENTS.md)
- prefer human-written context files; auto-generated ones increase cost while decreasing success

More context is not automatically more clarity. Once noise grows faster than signal, effective context quality drops even if raw context capacity is still available.

---

## Documentation as Control Surface

Documentation should not be treated as generic prose around the codebase. In AI-assisted development, it becomes part of the control surface — and the way it is structured determines whether it helps or hinders.

Different documents serve different purposes:

- `CLAUDE.md` / `AGENTS.md` should carry working instructions, common commands, and task-relevant operating constraints — kept minimal and human-written
- ADRs should record decisions, tradeoffs, and what the codebase has explicitly chosen
- pattern documents should show canonical solutions for recurring problems
- guidelines should capture defaults, conventions, and team-level expectations

Collapsing all of that into one giant file usually makes the system worse. The model receives more tokens but fewer clean signals. ETH Zurich's evaluation of AGENTS.md files found that LLM-generated context files reduced task success by ~3% while increasing token cost by over 20%. Human-written files provided a marginal ~4% improvement. The implication is not that context files are useless — it is that *how* they are written matters more than whether they exist, and that a bloated context file is worse than a minimal one.

The most effective structure observed in production is a **table of contents pattern**: a short AGENTS.md (around 100 lines) acting as a map, with pointers to deeper documents rather than embedding everything at the top level. Agents start with a stable, small entry point and learn where to look for more detail — a form of progressive disclosure that keeps the primary context window tight while making the full knowledge base accessible.

Specificity matters as much as structure. Vague instructions provide no actionable constraint. Instructions should be concrete enough to verify mechanically: "use `Result<T, DomainError>` for all repository methods; never throw from a repository" is actionable in a way that "handle errors properly" is not. Prompt sensitivity research (Gonen et al., EMNLP 2023; Sclar et al., ICLR 2024) shows that surface-level wording changes — not just semantic content — can cause large accuracy swings in code generation tasks. Precise wording is not cosmetic.

The same principle applies to examples. Spotify's engineering team, after 1,500+ AI-generated pull requests through their internal coding agent, identified concrete code examples as one of the strongest levers for outcome quality. The codebase itself is a few-shot prompt. A short canonical pattern document plus one strong implementation example is usually more valuable than a long abstract explanation with no concrete precedent.

One finding worth internalizing: retrieved *similar code* can hurt performance by up to 15%, while retrieved *API documentation and type information* consistently helps. The distinction matters for what you surface in context — canonical usage examples and interface definitions are more valuable than nearby implementation code that might introduce noise.

---

## Machine-Enforced Regularity

Patterns should be documented, but the most important ones should also be enforced mechanically.

Linting matters here not because formatting is sacred, but because structural regularity reduces ambiguity. Rules such as import grouping and ordering, member grouping and ordering, and consistent type import usage reduce the number of shapes a file can take. This is largely practitioner intuition rather than a finding with controlled empirical backing — no controlled study has yet isolated the effect of linting on LLM output quality. But the reasoning is sound: consistent structure reduces token-level variation in what the model sees, which makes next-token prediction more stable and makes generated code less likely to drift into repo-specific style violations.

In monorepo setups, module boundary rules deserve special attention. Cross-boundary imports are one of the most common AI-generated errors: the model sees a type it needs, finds it in a sibling module, and imports it — without knowing that the architectural intent forbids that dependency. A boundary lint rule catches this automatically and lets the agent self-correct before the change reaches a reviewer.

The broader principle: every convention that exists only as shared team memory is a convention the agent cannot learn from. Every convention enforced by a rule is one it cannot violate.

---

## Operational Feedback Loops

AI output should be cheap to verify. This turns out to be the bottleneck for most teams that are not getting results.

DORA's 2025 research found that teams with fast feedback loops and loosely coupled architectures saw meaningful productivity gains from AI tools, while teams with slow or opaque validation pipelines saw little benefit. The feedback loop, not the model, was the bottleneck. The same data contains a warning: AI adoption correlated with increased bug rates, longer review times, and larger pull requests. AI accelerates output volume; without fast, automated verification, that means faster accumulation of errors that survive to review.

The implication is sharp: if build, lint, test, and typecheck workflows are obscure, slow, or inconsistent, low-quality output survives longer than it should. The issue is not that the model made a mistake — it will. The issue is whether the repository makes the mistake cheap or expensive to detect.

One practical measure: introduce a wrapper command that filters build, format, lint, or test output before it reaches the model. If the wrapper removes warnings, success markers, timing metadata, and other non-actionable noise while preserving errors, the model gets a denser signal and can self-correct without human intervention. The faster the loop, the less value there is in arguing about whether generated output "looks right."

Common commands, validation steps, and expected checks belong in the working documentation, not only in team memory. An agent that cannot discover the verification command cannot self-correct.

---

## Task Decomposition

Codebase design sets the ceiling for what the model can reliably do. Task decomposition determines how much of that ceiling the team actually reaches.

The relationship between task scope and success rate is not linear — it degrades faster than expected as scope grows. AI agent benchmarks show that performance drops significantly as the number of files required in a patch increases. Tasks requiring changes to a single file succeed at dramatically higher rates than those spanning multiple modules. Each additional decision the agent must make multiplies the chance of diverging from the intended approach.

The practical pattern is constrained loops. Stripe's agent infrastructure — which merges over 1,000 AI-generated pull requests per week — uses "blueprints": orchestration flows that alternate between deterministic code nodes and open-ended agent loops. Each agent runs inside a contained scope, gets at most two CI feedback rounds, and terminates at a pull request boundary. Predictable throughput at scale comes from containment, not autonomy.

In layered architectures, the most reliable decomposition follows the layers: domain first, then data-access, then feature/UI. Each step has a clear input (the previous layer's public API), a clear output, and its own verification command. The agent completes and verifies one step before moving to the next.

Recurring task patterns — "create a new entity," "add a feature page" — should be codified into reusable workflow definitions rather than free-form prompts. The agent does not need to infer what a "new entity" involves; it follows a known path.

---

## Test Infrastructure as Specification

Types constrain the space of code the model can generate. Tests constrain the space of *behavior* it can produce. The combination is the strongest mechanical specification available.

When a test suite exists before the implementation, it functions as a machine-verifiable specification. The agent generates code, runs the tests, and self-corrects until they pass. This is more reliable than relying on the agent to infer intent from prose, because tests produce binary pass/fail signals rather than probabilistic matches against natural language. Shopify demonstrated this concretely: using a coding agent against 974 unit tests to optimize their Liquid template engine produced a 53% improvement in parse speed and 61% fewer allocations through roughly 120 automated experiments. The test suite made the experiments trustworthy enough to run autonomously.

Kent Beck describes TDD as a "superpower" with AI agents specifically because tests prevent regressions that would otherwise accumulate invisibly. The failure mode to watch for is agents deleting or weakening tests to make them pass — a signal that the specification is being circumvented rather than satisfied.

Test factories (Object Mothers, test builders) prevent the agent from constructing invalid test data. Instruction files should direct the agent to use them rather than constructing domain objects directly, for the same reason branded types are preferred over raw primitives: the space of valid inputs is enforced structurally, not by convention.

---

## Continuous Calibration

Every time a reviewer corrects AI-generated code, there is an implicit signal: the agent's context was incomplete or its constraints were insufficient. The question to ask is: "Could this correction have been prevented by an instruction file update, a lint rule, or a better canonical example?"

If yes, the correction should produce a documentation or tooling change in the same review cycle. Over time, this feedback loop transfers patterns from human review memory into the agent's operating environment. The rate of "same class of correction" recurring should decrease. This is how context engineering improves over time: not by updating the model, but by updating the environment the model operates inside.

Martin Fowler frames the working posture well: treat every AI output as a pull request from a highly productive but untrustworthy collaborator — review everything, and route the patterns from that review into constraints the collaborator cannot bypass next time.

The longer trajectory points toward something beyond individual review cycles. The frontier is shifting from crafting a single context window to engineering the agent harness: the runtime loop that manages plans, subagents, checkpoints, tool execution, and recovery from failure. What this document describes — coherent patterns, precise names and types, compact and human-written context files, fast verification, contained task scope, test-first specification — is the stable foundation that makes increasingly autonomous harnesses reliable rather than dangerous.

---

## Practical Rules

- Keep top-level instruction files compact, task-oriented, and human-written. Use a table of contents pattern to point into deeper documentation rather than embedding everything up front.
- Prefer one dominant pattern per recurring problem *within a module or service*; global uniformity across heterogeneous systems is not required.
- Use precise, domain-specific names and types — they steer the model as much as instructions do.
- Write instructions specific enough to verify mechanically — vague guidance is noise.
- Record decisions separately from working instructions.
- Back important conventions with linting and formatting rules, including module boundary enforcement.
- Surface API documentation and usage examples in retrieval; avoid surfacing similar implementations, which can introduce noise.
- Make build, lint, typecheck, and test commands easy to discover; filter their output to remove noise before it reaches the model.
- Decompose tasks to the smallest independently verifiable unit; codify recurring task shapes into reusable workflow definitions.
- Write tests before implementation when possible; use test factories to prevent invalid fixtures.
- Treat every recurring review correction as a candidate for a lint rule or instruction update.

---

## References

- Anthropic, *Manage Claude's memory*: <https://docs.anthropic.com/en/docs/claude-code/memory>
- Anthropic, *Long context prompting tips*: <https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/long-context-tips>
- Anthropic, *Context windows*: <https://docs.anthropic.com/en/docs/build-with-claude/context-windows>
- Liu et al., *Lost in the Middle: How Language Models Use Long Contexts*, TACL 2024: <https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00638/119630/Lost-in-the-Middle-How-Language-Models-Use-Long>
- Du et al., *Context Length Alone Hurts LLM Performance Despite Perfect Retrieval*, EMNLP 2025: <https://arxiv.org/abs/2510.05381>
- Adobe Research, *NoLiMa: Long-Context Evaluation Beyond Literal Matching*, ICML 2025: <https://arxiv.org/abs/2502.05167>
- Gloaguen et al., *Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?*, ETH Zurich / LogicStar.ai, 2026: <https://arxiv.org/abs/2602.11988>
- Gu et al., *What to Retrieve for Effective Retrieval-Augmented Code Generation?*, 2025: <https://arxiv.org/abs/2503.20589>
- Le et al., *When Names Disappear: Revealing What LLMs Actually Understand About Code*, 2025: <https://arxiv.org/abs/2510.03178>
- Wang et al., *How Does Naming Affect LLMs on Code Analysis Tasks?*, 2023: <https://arxiv.org/abs/2307.12488>
- Muendler et al., *Type-Constrained Code Generation with Language Models*, 2025: <https://arxiv.org/abs/2504.09246>
- Gonen et al., *Demystifying Prompts in Language Models via Perplexity Estimation*, EMNLP Findings 2023: <https://arxiv.org/abs/2212.04037>
- Sclar et al., *Quantifying Language Models' Sensitivity to Spurious Features in Prompt Design*, ICLR 2024: <https://arxiv.org/abs/2310.11324>
- Spotify Engineering, *Background Coding Agents: Context Engineering (Honk, Part 2)*, 2025: <https://engineering.atspotify.com/2025/11/context-engineering-background-coding-agents-part-2>
- OpenAI, *Harness Engineering: Leveraging Codex in an Agent-First World*, 2026: <https://openai.com/index/harness-engineering/>
- DORA, *State of DevOps 2025*: <https://dora.dev/research/2025/dora-report/>
- GitHub, *Why AI is pushing developers toward typed languages*: <https://github.blog/ai-and-ml/llms/why-ai-is-pushing-developers-toward-typed-languages/>
- typescript-eslint, `member-ordering`: <https://typescript-eslint.io/rules/member-ordering/>
- ESLint, `sort-imports`: <https://eslint.org/docs/latest/rules/sort-imports>
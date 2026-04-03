---
title: Designing Codebases for AI-Assisted Development
description: A practical note on how codebase shape, documentation, token economy, and enforced patterns affect AI-assisted development.
slug: designing-codebases-for-ai-assisted-development
date: 2026-03-30
updated: 2026-04-03
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

A blind study on the Elasticsearch repository (3.6M LOC) showed 30–80% quality improvements across AI coding agents without changing the underlying model — only the context layer. The model was the same; the context architecture was the variable.

This is why codebase design matters for AI-assisted work. The goal is not to make the repository "AI-friendly" in a superficial sense. The goal is to reduce ambiguity in the places where models infer structure, retrieve facts, and choose between multiple locally plausible implementations — and to make mistakes cheap to detect when the model still gets it wrong.

**A note on productivity claims.** Measured gains depend entirely on task type and developer familiarity with the codebase. The largest randomized controlled trial to date (16 experienced OSS developers, 246 tasks) found 19% slower completion with AI on familiar codebases. A large-scale observational study (~100K developers) found 15–20% net gain after rework, but 9% maintainability decline. An earlier controlled study found 55% faster completion — but on a single greenfield task with junior developers. The reconciliation: AI helps most with unfamiliar/greenfield work, least with expert-familiar/brownfield maintenance. Critically, developer self-assessment of AI benefit deviates from measured output by ~30 percentile points. Do not use self-reported productivity as an adoption metric.

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

**Architecture choice matters.** Vertical Slice Architecture — organizing code by feature rather than by technical layer — rates highest for AI friendliness because each slice contains all necessary components for a single feature, creating self-contained units that fit within a context window. DDD principles are complementary: bounded contexts provide natural scope boundaries that reduce token load, ubiquitous language creates consistent vocabulary, and aggregates become focused implementation targets. The trade-off is intentional code duplication, which contradicts DRY but optimizes for the context window.

**Scope of this principle.** Pattern uniformity matters most within a bounded unit: a module, a service, a component area. Microservice architectures are deliberately polyglot, and AI tools increasingly operate at that level of granularity. The requirement is *local* consistency — standardize within the unit the agent is working in. What matters is that the agent sees one dominant pattern *in context*, not that the entire codebase uses the same pattern everywhere.

---

## Names and Types as Steering Mechanisms

Names are not just a readability concern. In AI-assisted development, identifiers function as semantic anchors that directly steer model output. Precise names narrow the set of plausible continuations; vague ones widen it.

Research confirms this is a measurable effect. Removing identifier names — while leaving code structure intact — causes models to regress from intent-level summaries to line-by-line narration, and degrades even tasks that should depend only on structure, such as execution prediction. Replacing meaningful names with opaque identifiers causes consistent degradation on code analysis benchmarks. In dynamically typed languages, naming carries even more weight because there are no type declarations to compensate for a vague identifier.

This effect is not absolute. Fine-tuning on obfuscation-augmented datasets can partially recover performance, and specialized tools exist for working on obfuscated or minified code. But standard models rely on names as strong signals for intent. Investing in precise, domain-specific names pays off regardless of tooling.

Type annotations narrow the space of plausible completions further. A `UserId` that is structurally incompatible with an `OrderId` prevents the model from passing the wrong identifier even when both are strings at runtime. Research on type-constrained code generation shows that enforcing type correctness during generation reduces compilation errors by roughly half compared to unconstrained generation. Syntax-only constraints achieve a fraction of that. The mechanism studied — constrained decoding — is a runtime technique, but the underlying principle transfers: the richer the type surface available to the model, the smaller the space of plausible-but-incorrect completions, and the more the compiler can automatically reject what the model gets wrong.

**Treat type systems as foundational infrastructure.** 94% of compilation errors in LLM-generated code are type-check failures, not logic errors. Branded/semantic types yield 90% fewer ID mix-up bugs and 3x faster LLM convergence. Converting from JavaScript to TypeScript produces a step function in generated code quality — AI agents self-correct more effectively using TypeScript error messages as feedback. TypeScript overtook Python and JavaScript as the most-used language on GitHub in 2025, driven significantly by AI agent adoption.

This finding applies most directly to statically typed languages. In dynamically typed ones, LLM-generated errors are more often semantic than type-related, so type annotations alone cannot be the primary correctness lever. The broader principle — prefer rich type definitions over loosely typed code — holds, but its impact varies by language.

For engineers, this means:

- invest in precise, domain-specific names — a `UserId` is a stronger signal than a `string`
- prefer rich type definitions over untyped or loosely typed code
- treat branded types and domain-specific type aliases as part of the AI control surface, not just developer ergonomics
- if working in JavaScript, the conversion to TypeScript strict mode is likely the single highest-ROI change for AI-assisted development quality

---

## Token Economy Is a Design Constraint

The dominant assumption about long context windows is that more is better: if the model *can* see everything, it *should*. That assumption is wrong, and the evidence against it has hardened considerably.

Controlled testing of five frontier models on math, QA, and coding tasks found that performance degrades **13–85% as context length increases — even when retrieval is perfect and irrelevant tokens are replaced with whitespace**. The degradation persisted even when models were constrained to attend only to relevant tokens. This is not a distraction problem or a retrieval problem. It is a length problem: the sheer size of the input hurts, independent of its content.

A related finding sharpens the point further. Models that pass simple needle-in-a-haystack tests — retrieving a single fact from a long document — collapse on tasks requiring non-lexical reasoning. At 128K tokens, without surface-level lexical overlap between query and target, frontier models drop to a fraction of their short-context performance. Long context windows are a genuine capability, but they are a narrow one.

The earlier "Lost in the Middle" finding — that models perform worse on information placed in the middle of long contexts — has been partially mitigated in 2025-era models for simple factual retrieval. The harder problem is intact. Testing across 18 frontier models confirmed that every model degrades with input length, with 30%+ accuracy drops for mid-context information persisting. For coding agents, when an agent greps 8 files, the relevant code in file #4 sits in the model's blind spot.

This makes codebase organization a direct performance variable: a well-structured repository enables targeted retrieval of small, relevant contexts; a poorly structured one forces large context dumps that actively hurt the model working inside it.

In practice, that means:

- **order context deliberately**: long documents and reference material at the top, task-specific instructions near the bottom, current query last — correct ordering alone yields up to 30% quality improvement
- **target 40–60% context window utilization**: proactive compaction at phase boundaries prevents cascading degradation; use `/compact` *before* reaching 50%, not after context is exhausted
- **start new sessions for new tasks** — this is context hygiene, not overhead
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

Collapsing all of that into one giant file usually makes the system worse. The model receives more tokens but fewer clean signals. Controlled evaluation of AGENTS.md files found that LLM-generated context files reduced task success by ~3% while increasing token cost by over 20%. Human-written files provided a marginal ~4% improvement. The implication is not that context files are useless — it is that *how* they are written matters more than whether they exist, and that a bloated context file is worse than a minimal one.

**Converge on AGENTS.md with symlinks.** AGENTS.md is now read natively by Cursor, GitHub Copilot, Cline, Codex, Zed AI, Gemini CLI, and Aider. Maintain a single AGENTS.md and symlink to `.windsurfrules`, `.cursorrules`, `CLAUDE.md`. Tool-specific rules that do not fit the shared file go into tool-specific locations (`.cursor/rules/*.mdc`, `.claude/settings.json`). This eliminates drift across tool configs.

**Target 80–120 lines for root rules files.** Frontier models reliably follow ~150–200 instructions total; beyond that, adherence degrades uniformly. Claude's system prompt consumes ~50 of those slots. Measured adherence per CLAUDE.md instruction is ~70–80% — meaning safety-critical rules must be implemented as deterministic hooks, not advisory text. Analysis of 2,500+ AGENTS.md files found the best-performing files share six traits:

1. executable commands placed early
2. code examples over prose explanations
3. clear three-tier boundaries ("always do / ask first / never do")
4. specific tech stack declarations with versions
5. coverage of six core areas: commands, testing, structure, style, git workflow, boundaries
6. specialist persona assignment

The most effective structure is a **table of contents pattern**: a short AGENTS.md acting as a map, with pointers to deeper documents rather than embedding everything at the top level:

```markdown
# Project Name
One-line description. TypeScript monorepo: backend (Express), frontend (React).

## Commands
- `npm run dev`: Start dev server (port 3000)
- `npm test`: Run Jest suite
- `npm run lint`: ESLint check

## Architecture
- `/app`: Next.js App Router pages
- `/components/ui`: Reusable UI primitives
- `/lib`: Utilities and shared logic
- See @docs/architecture.md for full dependency graph

## Code Style
- TypeScript strict mode, no `any`
- Named exports only, no default exports
- Use `Result<T, DomainError>` for repository methods; never throw from a repository
- See @docs/patterns.md for canonical examples

## Boundaries
- ALWAYS: run `npm test` before committing
- ALWAYS: use test factories from `/test/builders` — never construct domain objects directly
- ASK FIRST: changes to `/db/migrations`
- NEVER: modify auth middleware without security review
- NEVER: push directly to main
```

**Anti-patterns:** personality instructions ("be a senior engineer") waste token budget; `@`-file references that embed entire files on every session cause context explosion; formatting rules that should be handled by linters add noise; "write clean code" provides no actionable signal; marking everything as IMPORTANT means nothing is important. The strongest practice: **document what the AI gets wrong** — iteratively add rules derived from observed failure patterns. Rules from failures outperform rules from principles.

**Use XML tags for programmatic prompts.** While markdown is the natural format for rules files, XML is the stronger format for structuring complex prompts and API calls — Claude was trained to recognize XML tags as a prompt organizing mechanism, and comparative testing shows up to 40% performance variation based on format alone. XML is the only format explicitly endorsed by all three major providers. The trade-off: ~15% more tokens, but better first-attempt accuracy usually means fewer iteration cycles.

Specificity matters as much as structure. Vague instructions provide no actionable constraint. Instructions should be concrete enough to verify mechanically: "use `Result<T, DomainError>` for all repository methods; never throw from a repository" is actionable in a way that "handle errors properly" is not. Prompt sensitivity research shows that surface-level wording changes — not just semantic content — can cause large accuracy swings in code generation tasks. Precise wording is not cosmetic.

The same principle applies to examples. After 1,500+ AI-generated pull requests through an internal coding agent, concrete code examples were identified as one of the strongest levers for outcome quality. The codebase itself is a few-shot prompt. A short canonical pattern document plus one strong implementation example is usually more valuable than a long abstract explanation with no concrete precedent.

One finding worth internalizing: retrieved *similar code* can hurt performance by up to 15%, while retrieved *API documentation and type information* consistently helps. The distinction matters for what you surface in context — canonical usage examples and interface definitions are more valuable than nearby implementation code that might introduce noise.

---

## Machine-Enforced Regularity

Patterns should be documented, but the most important ones should also be enforced mechanically.

Linting matters here not because formatting is sacred, but because structural regularity reduces ambiguity. Rules such as import grouping and ordering, member grouping and ordering, and consistent type import usage reduce the number of shapes a file can take. This is largely practitioner intuition rather than a finding with controlled empirical backing — no controlled study has yet isolated the effect of linting on LLM output quality. But the reasoning is sound: consistent structure reduces token-level variation in what the model sees, which makes next-token prediction more stable and makes generated code less likely to drift into repo-specific style violations.

**Enforce a 150–500 line file size range.** Below 150 lines, files are generally fine. Above 500, AI agents lose the ability to hold the complete file in working memory, generate accurate diffs, and identify side effects reliably. At ~18 tokens per line, a 500-line file consumes ~9,000 tokens — within working range while leaving room for instructions, context, and output. Enforce via pre-commit hooks.

In monorepo setups, module boundary rules deserve special attention. Cross-boundary imports are one of the most common AI-generated errors: the model sees a type it needs, finds it in a sibling module, and imports it — without knowing that the architectural intent forbids that dependency. A boundary lint rule catches this automatically and lets the agent self-correct before the change reaches a reviewer. Nx's `nx configure-ai-agents` sets up CLAUDE.md, AGENTS.md, MCP servers, and agent skills in one step, and its dependency graph provides the boundary enforcement AI agents need.

**Use deterministic hooks for safety-critical rules.** CLAUDE.md adherence is probabilistic (~70–80% per instruction). For rules where violation is not acceptable — don't push to main, don't delete production data, don't modify migration files — implement PreToolUse hooks that block the action with exit code 2. Advisory rules for conventions; deterministic hooks for safety boundaries.

The broader principle: every convention that exists only as shared team memory is a convention the agent cannot learn from. Every convention enforced by a rule is one it cannot violate. Every safety-critical convention enforced by a hook is one it *cannot even attempt* to violate.

---

## Operational Feedback Loops

AI output should be cheap to verify. This turns out to be the bottleneck for most teams that are not getting results.

Teams with fast feedback loops and loosely coupled architectures see meaningful productivity gains from AI tools; teams with slow or opaque validation pipelines see little benefit. The feedback loop, not the model, is the bottleneck. AI adoption correlates with increased bug rates, longer review times, and larger pull requests. AI accelerates output volume; without fast, automated verification, that means faster accumulation of errors that survive to review.

**Security verification is non-optional.** Testing 100+ LLMs across four languages found 45% of AI-generated code contained OWASP Top 10 vulnerabilities, with 86% failure rates on XSS and 88% on log injection — no improvement with newer or larger models. AI co-authored PRs contain 2.74x more security vulnerabilities. Every team using AI code generation needs:

- automated SAST in CI/CD for every PR
- a **prohibited AI task list**: authentication, authorization, cryptographic implementations, payment processing, and secrets management require human implementation
- SCA (Software Composition Analysis) for AI-introduced dependencies
- human security review for code touching auth, data access, or external APIs

The implication is sharp: if build, lint, test, and typecheck workflows are obscure, slow, or inconsistent, low-quality output survives longer than it should. The issue is not that the model made a mistake — it will. The issue is whether the repository makes the mistake cheap or expensive to detect.

One practical measure: introduce a wrapper command that filters build, format, lint, or test output before it reaches the model. If the wrapper removes warnings, success markers, timing metadata, and other non-actionable noise while preserving errors, the model gets a denser signal and can self-correct without human intervention. The faster the loop, the less value there is in arguing about whether generated output "looks right."

Common commands, validation steps, and expected checks belong in the working documentation, not only in team memory. An agent that cannot discover the verification command cannot self-correct.

---

## Task Decomposition and Specification-First Workflow

Codebase design sets the ceiling for what the model can reliably do. Task decomposition determines how much of that ceiling the team actually reaches.

The relationship between task scope and success rate is not linear — it degrades faster than expected as scope grows. AI agent benchmarks show that performance drops significantly as the number of files required in a patch increases. Tasks requiring changes to a single file succeed at dramatically higher rates than those spanning multiple modules. Each additional decision the agent must make multiplies the chance of diverging from the intended approach. Agent runs exceeding ~35 minutes without compaction show significantly higher failure rates.

**Use an explore → plan → implement workflow.** This pattern has independently converged across every major AI coding tool vendor and practitioner community. The terminology varies but the structure is identical: prevent the AI from writing code until a human-reviewed plan exists.

The workflow in practice:

1. **Explore** — use Plan Mode (Claude Code) or equivalent to prevent code generation. Have the agent research the codebase, identify affected files, and surface constraints. Output: a structured understanding of the problem.
2. **Plan** — have the agent produce an implementation plan: which files change, what each change does, what tests verify it. Review this plan in your editor. ~200 lines of plan catches errors that ~2,000 lines of code would hide.
3. **Implement** — switch to Normal Mode. The agent executes the reviewed plan. Give it a verification mechanism: tests, type checks, expected output formats.
4. **Compact** — at each phase boundary, use `/compact` or start a fresh session. Each phase's compressed output (~200 lines) becomes the sole input for the next phase.

The single highest-leverage practice is giving the agent a way to verify its own work — tests, screenshots, or expected output formats.

**Generate implementation prompts with a reasoning model.** A useful technique: (1) brainstorm with iterative Q&A to produce `spec.md`, (2) use a reasoning model to generate `prompt_plan.md` with step-by-step implementation prompts, (3) feed prompts sequentially to the coding agent. This separates *what to build* from *how to build it* and prevents the coding agent from reinterpreting intent mid-implementation.

**Constrain scope mechanically.** Stripe's agent infrastructure (1,000+ AI-generated PRs/week) uses "blueprints": orchestration flows that alternate between deterministic code nodes and open-ended agent loops. Each agent runs inside a contained scope, gets at most two CI feedback rounds, and terminates at a pull request boundary. Predictable throughput at scale comes from containment, not autonomy.

In layered architectures, the most reliable decomposition follows the layers: domain first, then data-access, then feature/UI. Each step has a clear input (the previous layer's public API), a clear output, and its own verification command. The agent completes and verifies one step before moving to the next.

Recurring task patterns — "create a new entity," "add a feature page" — should be codified into reusable workflow definitions rather than free-form prompts. The agent does not need to infer what a "new entity" involves; it follows a known path.

---

## Test Infrastructure as Specification

Types constrain the space of code the model can generate. Tests constrain the space of *behavior* it can produce. The combination is the strongest mechanical specification available.

When a test suite exists before the implementation, it functions as a machine-verifiable specification. The agent generates code, runs the tests, and self-corrects until they pass. This is more reliable than relying on the agent to infer intent from prose, because tests produce binary pass/fail signals rather than probabilistic matches against natural language. One concrete example: running a coding agent against 974 unit tests to optimize a template engine produced a 53% improvement in parse speed and 61% fewer allocations through roughly 120 automated experiments. The test suite made the experiments trustworthy enough to run autonomously.

**TDD is the strongest form of prompt engineering.** The TDD-integrated approach uses the test plan as the orchestration layer: the system prompt instructs the agent to find the next unmarked test in `plan.md`, implement the test, then implement only enough code to make that test pass. Each test-pass cycle is a self-contained, verifiable unit of progress. The failure mode to watch for: agents deleting or weakening tests to make them pass — a signal that the specification is being circumvented rather than satisfied.

Test factories (Object Mothers, test builders) prevent the agent from constructing invalid test data. Instruction files should direct the agent to use them rather than constructing domain objects directly, for the same reason branded types are preferred over raw primitives: the space of valid inputs is enforced structurally, not by convention.

---

## Continuous Calibration

Every time a reviewer corrects AI-generated code, there is an implicit signal: the agent's context was incomplete or its constraints were insufficient. The question to ask is: "Could this correction have been prevented by an instruction file update, a lint rule, or a better canonical example?"

If yes, the correction should produce a documentation or tooling change in the same review cycle. Over time, this feedback loop transfers patterns from human review memory into the agent's operating environment. The rate of "same class of correction" recurring should decrease. This is how context engineering improves over time: not by updating the model, but by updating the environment the model operates inside.

Martin Fowler frames the working posture well: treat every AI output as a pull request from a highly productive but untrustworthy collaborator — review everything, and route the patterns from that review into constraints the collaborator cannot bypass next time.

**Shift review upstream.** When the plan itself has been reviewed and approved before implementation begins, implementation review becomes largely mechanical: does the code satisfy the plan, and do the tests pass. The higher-leverage review happens at the plan stage, where a single incorrect assumption can be caught in 200 lines rather than 2,000.

The longer trajectory points toward something beyond individual review cycles. The frontier is shifting from crafting a single context window to engineering the agent harness: the runtime loop that manages plans, subagents, checkpoints, tool execution, and recovery from failure. What this document describes — coherent patterns, precise names and types, compact and human-written context files, fast verification, contained task scope, test-first specification — is the stable foundation that makes increasingly autonomous harnesses reliable rather than dangerous.

---

## Practical Rules

**Codebase shape:**
- Keep files within the 150–500 line range; enforce with pre-commit hooks
- Prefer one dominant pattern per recurring problem *within a module or service*
- Use precise, domain-specific names and types — they steer the model as much as instructions do
- Treat branded types and rich type definitions as foundational AI infrastructure
- Prefer vertical slice (feature-organized) architecture where feasible
- Back important conventions with linting and formatting rules, including module boundary enforcement
- Surface API documentation and usage examples in retrieval; avoid surfacing similar implementations

**Documentation and rules files:**
- Keep root rules files at 80–120 lines; use a table of contents pattern pointing to deeper docs
- Consolidate toward a single AGENTS.md with symlinks for tool-specific aliases
- Write instructions specific enough to verify mechanically — vague guidance is noise
- Record decisions separately from working instructions (ADRs vs. AGENTS.md)
- Document what the AI gets wrong; iteratively add corrective rules from observed failures
- Use XML tags for complex programmatic prompts; markdown for rules files

**Context management:**
- Target 40–60% context window utilization; compact before reaching 50%
- Start new sessions for new tasks
- Order context deliberately: reference material at top, task instructions at bottom, query last
- Use the explore → plan → implement workflow with compaction at each phase boundary
- Review plans (~200 lines), not code (~2,000 lines)

**Verification and safety:**
- Make build, lint, typecheck, and test commands easy to discover; filter output noise before it reaches the model
- Decompose tasks to the smallest independently verifiable unit; codify recurring task shapes into reusable workflows
- Write tests before implementation when possible; use test factories to prevent invalid fixtures
- Implement deterministic hooks (not advisory rules) for safety-critical boundaries
- Run automated SAST on every PR; maintain a prohibited AI task list for auth, crypto, and payment code
- Treat every recurring review correction as a candidate for a lint rule or instruction update
- Do not trust AI self-assessment of quality or developer self-assessment of AI productivity — measure both

---

## References

**Research studies:**
- METR, *Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity*, arXiv:2507.09089: <https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/>
- Stanford / Chuang et al., *AI Coding Assistants at Scale (~100K developers)*, 2025: coverage at <https://proxify.io/articles/stanford-study-of-100000-developers-on-engineering-productivity>
- Du et al., *Context Length Alone Hurts LLM Performance Despite Perfect Retrieval*, EMNLP 2025: <https://arxiv.org/abs/2510.05381>
- Adobe Research, *NoLiMa: Long-Context Evaluation Beyond Literal Matching*, ICML 2025: <https://arxiv.org/abs/2502.05167>
- Liu et al., *Lost in the Middle: How Language Models Use Long Contexts*, TACL 2024: <https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00638/119630/Lost-in-the-Middle-How-Language-Models-Use-Long>
- Gloaguen et al., *Evaluating AGENTS.md*, ETH Zurich, 2026: <https://arxiv.org/abs/2602.11988>
- Gu et al., *What to Retrieve for Effective Retrieval-Augmented Code Generation?*, 2025: <https://arxiv.org/abs/2503.20589>
- Le et al., *When Names Disappear: Revealing What LLMs Actually Understand About Code*, 2025: <https://arxiv.org/abs/2510.03178>
- Wang et al., *How Does Naming Affect LLMs on Code Analysis Tasks?*, 2023: <https://arxiv.org/abs/2307.12488>
- Muendler et al., *Type-Constrained Code Generation with Language Models*, 2025: <https://arxiv.org/abs/2504.09246>
- Gonen et al., *Demystifying Prompts in Language Models via Perplexity Estimation*, EMNLP Findings 2023: <https://arxiv.org/abs/2212.04037>
- Sclar et al., *Quantifying Language Models' Sensitivity to Spurious Features in Prompt Design*, ICLR 2024: <https://arxiv.org/abs/2310.11324>
- Veracode, *2025 GenAI Code Security Report*: <https://www.veracode.com/blog/genai-code-security-report/>
- Chroma, *Frontier Models Context Degradation Study*, 2025: covered at <https://www.morphllm.com/context-rot>

**Industry reports and lab publications:**
- DORA, *State of DevOps 2025*: <https://dora.dev/research/2025/dora-report/>
- GitHub, *TypeScript's rise in the AI era — Anders Hejlsberg*: <https://github.blog/developer-skills/programming-languages-and-frameworks/typescripts-rise-in-the-ai-era-insights-from-lead-architect-anders-hejlsberg/>
- GitHub, *Why AI is pushing developers toward typed languages*: <https://github.blog/ai-and-ml/llms/why-ai-is-pushing-developers-toward-typed-languages/>
- GitHub, *How to write a great agents.md: Lessons from over 2,500 repositories*: <https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/>
- Anthropic, *Best Practices for Claude Code*: <https://code.claude.com/docs/en/best-practices>
- Anthropic, *Long context prompting tips*: <https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/long-context-tips>
- Anthropic, *Use XML tags to structure your prompts*: <https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags>
- Anthropic, *Manage Claude's memory*: <https://docs.anthropic.com/en/docs/claude-code/memory>
- Anthropic, *Context windows*: <https://docs.anthropic.com/en/docs/build-with-claude/context-windows>
- Augment Code, *Context Engine MCP*: <https://www.augmentcode.com/blog/context-engine-mcp-now-live>
- Google, *Architecting context-aware multi-agent framework*: <https://developers.googleblog.com/architecting-efficient-context-aware-multi-agent-framework-for-production/>

**Practitioner sources:**
- HumanLayer, *Advanced Context Engineering for Coding Agents (ACE-FCA)*: <https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/ace-fca.md>
- Kent Beck, *Augmented Coding: Beyond the Vibes*: <https://tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes>
- Martin Fowler, *Fragments: February 18*: <https://martinfowler.com/fragments/2026-02-18.html>
- Addy Osmani, *Beyond Vibe Coding*: <https://beyond.addy.ie/>
- Harper Reed, *My LLM codegen workflow atm*: <https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/>
- Harper Reed, *Basic Claude Code*: <https://harper.blog/2025/05/08/basic-claude-code/>
- Simon Willison, *My LLM codegen workflow atm*: <https://simonwillison.net/2025/Feb/21/my-llm-codegen-workflow-atm/>
- Geoffrey Huntley, *You are using Cursor AI incorrectly (stdlib)*: <https://ghuntley.com/stdlib/>
- Spotify Engineering, *Background Coding Agents: Context Engineering (Honk, Part 2)*: <https://engineering.atspotify.com/2025/11/context-engineering-background-coding-agents-part-2>
- OpenAI, *Harness Engineering*: <https://openai.com/index/harness-engineering/>
- Rick Hightower, *Optimizing Codebase Architecture for AI Coding Tools*: <https://medium.com/@richardhightower/ai-optimizing-codebase-architecture-for-ai-coding-tools-ff6bb6fdc497>
- Eamonn Faherty, *The 150–500 Line Sweet Spot for AI Code Editors*: <https://medium.com/@eamonn.faherty_58176/right-sizing-your-python-files-the-150-500-line-sweet-spot-for-ai-code-editors-340d550dcea4>

**Tooling references:**
- typescript-eslint, `member-ordering`: <https://typescript-eslint.io/rules/member-ordering/>
- ESLint, `sort-imports`: <https://eslint.org/docs/latest/rules/sort-imports>
- Nx, *AI agent configuration*: <https://nx.dev>
- Repomix, *Pack your codebase into AI-friendly formats*: <https://repomix.com/>
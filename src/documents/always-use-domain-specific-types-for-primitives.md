---
title: Always Use Domain-Specific Types for Primitives
description: A practical case for domain-specific types over bare primitives.
slug: always-use-domain-specific-types-for-primitives
date: 2026-03-29
updated: 2026-03-29
type: Engineering Document
tags:
  - type systems
  - domain modeling
  - software design
  - typescript
summary: A compact engineering recommendation for replacing bare primitives with domain-specific types so meaning, constraints, and intent stay visible in code.
---

# Always Use Domain-Specific Types for Primitives

## Abstract

This document recommends using domain-specific types for values whose meaning matters to the business domain. Primitive types are appropriate for representation, but they are too weak to encode intent, constraints, and safe usage across a system.

The goal is not to wrap every `string` or `number`. The goal is to make ambiguous, high-cost values explicit at system boundaries and inside public APIs, so invalid assumptions become harder to express and easier to detect.

## Problem

Most software systems do not fail because `string`, `number`, or `boolean` are bad tools. They fail because those tools are asked to carry domain meaning that the code never makes explicit.

A `string` might be an email address, a country code, a customer id, a discount code, or an ISO timestamp. A `number` might be money, a quantity, a retry count, or a percentage. The runtime accepts all of them as valid primitives. The business domain does not, because those values are not interchangeable.

This usually shows up in a few recurring ways:

- multiple parameters share the same primitive type but have different semantics
- validation rules are repeated near call sites instead of being centralized
- identifiers from different contexts can be passed into the same function
- money, percentages, and quantities are all treated as generic numbers
- boolean flags begin to encode business modes rather than simple toggles

These are signs that domain meaning is missing from the type model.

## Core Principle

A primitive tells you how something is represented in memory. It does not tell you what the value is allowed to mean inside the business domain.

If a function accepts this:

```ts
function createAccount(id: string, email: string, retryCount: number) {}
```

the compiler knows almost nothing useful about your intent. Any string can be passed for `id` or `email`. Any number can be passed for `retryCount`, including `-10`.

Now compare it with this:

```ts
type CustomerId = string & { readonly brand: 'CustomerId' };
type EmailAddress = string & { readonly brand: 'EmailAddress' };
type RetryCount = number & { readonly brand: 'RetryCount' };

function createAccount(id: CustomerId, email: EmailAddress, retryCount: RetryCount) {}
```

The underlying storage is still primitive, but the code now exposes the domain. That improves review quality, reduces accidental mixups, and makes future change much safer.

## Recommendations

Use domain-specific types when swapping two values of the same primitive type would be a real bug.

Prioritize them in these cases:

- identifiers
- money and currency amounts
- email addresses, phone numbers, and URLs
- percentages, rates, and quantities
- bounded counters or scores
- date ranges and domain timestamps

Apply them according to these rules:

1. parse and validate raw primitives at the system boundary
2. convert validated input into domain-specific types
3. use domain-specific types throughout the business core
4. serialize back to primitives only when data leaves the system

Values with no business ambiguity and no meaningful rules can remain plain primitives.

## Boundary Model

```mermaid
flowchart LR
  Input[External Input] --> Validation[Validation and Parsing]
  Validation --> Domain[Domain Types]
  Domain --> Rules[Business Rules]
  Rules --> Output[Serialization at the Boundary]
```

The system boundary is where raw primitives should be parsed, validated, and converted into domain values. Once data crosses into the core, it should stop behaving like an anonymous `string` or `number`.

This separation gives the core model stronger guarantees and reduces the chance that invalid or ambiguous values drift through internal code.

## Examples

### Construction and Validation

One useful design goal is to make illegal states difficult to represent. Domain constructors and parsers are one of the simplest ways to do that.

```ts
type Percentage = number & { readonly brand: 'Percentage' };

function makePercentage(value: number): Percentage {
  if (value < 0 || value > 100) {
    throw new Error('Percentage must be between 0 and 100');
  }

  return value as Percentage;
}
```

After the value is constructed, downstream code no longer has to wonder whether `137` accidentally slipped in. Validation becomes part of the type entry point rather than an informal convention scattered across the call graph.

### API Design

APIs become easier to evolve when their signatures express intent clearly. A function that accepts `CustomerId` is easier to use correctly than one that accepts `string`. A service returning `EmailAddress | null` communicates more than one returning `string | null`.

This matters even more in larger systems, because types become part of team communication. They document expectations in a way comments rarely sustain over time.

Domain-specific types help with:

- onboarding, because the vocabulary is embedded in the code
- refactoring, because type errors expose invalid assumptions
- code review, because intent is visible at call sites
- testing, because fixtures are shaped by real business concepts

## Exceptions and Tradeoffs

It is possible to overdo this. If every line requires a new wrapper or factory, the model can become noisy and harder to use. The answer is not to avoid domain types entirely. The answer is to introduce them where they remove ambiguity rather than where they merely add formality.

This approach should remain selective:

1. start with places where confusion already caused bugs or near-misses
2. promote repeated validation rules into constructors or parsers
3. make domain names visible in public APIs first
4. keep conversion cost near boundaries, not everywhere

## References

> A real-world failure case exists outside software APIs as well. [Read](https://www.simscale.com/blog/nasa-mars-climate-orbiter-metric/) [about](https://solarsystem.nasa.gov/missions/mars-climate-orbiter/in-depth/) how NASA lost **Mars Climate Orbiter** on September 23, 1999 due to a failure to translate English units to metric, resulting in a mission loss valued at $125 million at the time.

## Conclusion

Bare primitives are cheap to write and expensive to trust. Domain-specific types invert that trade-off. They ask for a bit more intention up front so the rest of the system can be simpler, safer, and easier to read.

That is usually the right deal. If two values mean different things in the business, they should not look identical in the code.

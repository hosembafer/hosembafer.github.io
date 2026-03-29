# ADR: Domain-Specific Types for Primitives

|            |            |
| ---------- | ---------- |
| **Status** | Accepted   |

---

## Context

As the codebase grows, relying on bare primitives to carry domain meaning leads to ambiguous interfaces, repeated validation, and accidental misuse of values that share a runtime representation but differ semantically.

A `string` may represent a customer id, an email address, or a country code. A `number` may represent money, a retry count, a percentage, or a quantity. Without explicit domain types, the code accepts these values too broadly and depends on humans to preserve meaning.

## Decision

We adopt **domain-specific types for semantically distinct primitives** across public APIs and business-domain code.

Primitive values may still be used for transport and storage, but once they cross into the business core they should be parsed, validated, and represented by domain-specific types.

**The Three Rules:**

1. **Parse at the Boundary** — External input may enter as primitives, but it must be validated and converted before reaching the core model.
2. **Preserve Meaning in Types** — Values that mean different things in the business domain must not share the same type only because they share the same runtime representation.
3. **Centralize Construction** — Validation and invariants must live in constructors, parsers, or other explicit type entry points, not as repeated local checks across the codebase.

## Examples

TypeScript:

```ts
type CustomerId = string & { readonly brand: 'CustomerId' };
```

Java:

```java
record CustomerId(String value) {}
```

C#:

```csharp
public readonly record struct CustomerId(string Value);
```

## Consequences

- Function signatures become more explicit and harder to misuse.
- Validation moves closer to type construction and farther from call-site convention.
- Refactoring becomes safer because type errors reveal invalid assumptions.
- The model becomes more verbose in targeted places, but ambiguity is reduced where confusion is expensive.

---

**Anti-patterns to avoid:**

| Anti-pattern             | Why it breaks integrity                                            |
| ------------------------ | ------------------------------------------------------------------ |
| Primitive overloading    | Distinct domain values become interchangeable by accident          |
| Repeated local validation| Invariants are scattered and inconsistently enforced               |
| Boundary leakage         | Raw external primitives drift into the core model without parsing  |

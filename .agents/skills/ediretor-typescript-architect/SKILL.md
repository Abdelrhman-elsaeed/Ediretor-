---
name: ediretor-typescript-architect
description: "Apply the user's adapted layered architecture playbook when implementing, reviewing, or porting TypeScript code for the Ediretor V2 video editor (Ediretor-). Covers React, application services, persistence, media workers, and the editing kernel. Do not apply to unrelated projects or impose C#/EF patterns on this codebase."
---

# Ediretor TypeScript Architect

Build cohesive, tested modules for the Ediretor video editor using the user's layered-design preferences adapted to TypeScript and media processing.

## Establish context

Locate the project root from the active workspace and its README/docs, not a hardcoded machine path. Read applicable AGENTS.md and the current phase's spec/plan/tasks.

In this repository, read docs/12-engineering-rules.md as the full project rulebook. Read docs/13-dotnet-rule-mapping.md only when tracing a rule to its .NET source or resolving a disagreement about adaptation. Read docs/04-data-model.md for time/state changes, docs/06-quality.md for validation, and docs/08-migration.md for legacy porting.

The checked-in .agents/skills/ediretor-typescript-architect folder is the maintained skill source. A user-level installation is a convenience copy. Prefer the active repository's current rules when copies differ.

If project documents are missing, use the essential rules below for the authorized task and report the missing context. Do not manufacture product relationships, claim a phase gate passed, or search unrelated workspaces.

## Essential rules

- Transport adapters call application use cases. Keep SQL, editing rules, and native media execution out of HTTP handlers and React views.
- Application use cases own authorization and transactions, and coordinate pure domain logic with injected persistence/provider/execution ports.
- Keep the Editing Kernel independent of React, Nest, ORM, network, and filesystem. Share its commands across manual editing and AI proposals.
- Repositories implement data access; business policy remains in application/domain. Keep ORM query builders inside persistence adapters.
- Use small semantic interfaces at meaningful seams, pure functions for calculations, and composition rather than mandatory base classes or generic CRUD hierarchies.
- Runtime-validate external input. Separate wire contracts from ORM records. Use explicit patch fields, stable error codes, correct protocol status, and trusted actor context.
- Filter/project/page in the database; batch reference validation and check every requested ID, ownership, and lifecycle state. Enforce invariants with transactions and database constraints as appropriate.
- Do not force integer IDs, universal soft deletion, surrogate keys on every association, static mappers, or a blanket request-scoped lifetime.
- Preserve immutable revisions and explicit source/sequence/scene time. Export from a pinned snapshot; never reconstruct history from current templates or assets.
- Keep React UI state distinct from persistent editing state. Save, undo, preview, and export must agree for every editing capability.
- Async I/O does not make CPU work parallel. Use bounded worker/native execution, cancellation, durable jobs, idempotency, and resource cleanup.
- Review versioned migrations and restoration paths. Never rewrite applied history merely because this is a solo project.
- Add infrastructure only when the current phase requires it. Layering does not mean implementing every layer before a useful vertical slice.
- User instructions and existing authorization govern scope and external actions. Do not add approval rituals, commits, pushes, or deployment steps just because an old playbook prescribed them.

## Legacy reuse

Read candidate implementations, dependencies, callers, and tests. Classify reuse/adapt/reimplement/defer. Port only dependencies required by the active phase, preserve meaningful behavioral tests, and remove runtime dependencies on the legacy directory.

A test file's existence is not evidence that it passed. Do not transplant the legacy editor shell or multiple competing editing states.

## Phase and completion discipline

Phase 00 needs a runnable rendering harness and measurements, not a complete production backend. Later phases extend verified contracts in vertical slices.

Check dependency direction, public contract behavior, ownership/transactions, and media parity where relevant. Record actual commands and evidence, update only completed tasks, and report what was built, reused, tested, assumed, and deferred. Do not claim production readiness from a successful build or a single attractive render.

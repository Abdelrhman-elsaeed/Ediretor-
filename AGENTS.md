# Ediretor V2 — project instructions

This is the new project for https://github.com/Abdelrhman-elsaeed/Ediretor-.
Preserve the existing planning documents. Build here; treat the legacy application as a read-only reference unless the user explicitly requests work there.

## Read for implementation and architecture work

- [.specify/memory/constitution.md](.specify/memory/constitution.md)
- [docs/12-engineering-rules.md](docs/12-engineering-rules.md)
- The current phase's spec.md, plan.md, and tasks.md.
- Relevant architecture/data-model/quality documents.

Use the project skill at [.agents/skills/ediretor-typescript-architect/SKILL.md](.agents/skills/ediretor-typescript-architect/SKILL.md) for TypeScript architecture, implementation, or legacy-porting tasks. The checked-in skill is the maintained copy; a user-level installation is a convenience, not required to read these rules.

## Scope and precedence

Apply the user's .NET playbook through its project-specific adaptation in docs/12-engineering-rules.md. Do not impose C#/EF conventions directly on TypeScript.
[docs/13-dotnet-rule-mapping.md](docs/13-dotnet-rule-mapping.md) explains what was retained, adapted, or replaced.

Current technical direction is React/TypeScript with Node.js and a separate media worker; framework, ORM, queue, and renderer choices remain subject to the recorded Phase 00 decisions. Do not select new infrastructure merely to satisfy an abstract layering diagram.

The current request defines the work scope. Updating rules or drafting a prompt does not start Phase 00. When Phase 00 is requested, build its runnable harness and port only dependencies it needs; do not scaffold every later phase.

User instructions take precedence over these local guidelines. Preserve existing authorization; do not add an approval ceremony for routine reversible implementation.

## Completion

Report changed behavior, reused/adapted modules, meaningful validation, unresolved assumptions, and deliberate deferrals. Mark phase tasks complete only with evidence. Keep Git operations within the requested scope; this file grants no permission to push, deploy, or make unrelated commits.

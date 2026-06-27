# ADR-0001 — Record architecture decisions

- Status: Accepted
- Date: 2025-01-01 <!-- example date — set to the real adoption date for YOUR project -->

## Context

We need a lightweight, versioned, queryable log of the project's technical
decisions, following the *Doc as Code* approach: the decision lives in the
repository, versions with the code, and travels in the same PR as the change.

## Decision

Adopt **ADRs** (Architecture Decision Records) under `docs/adr/`, in the
**Michael Nygard** format, numbered sequentially and published via MkDocs
Material. The template to copy is [`0000-adr-template.md`](0000-adr-template.md).

## Consequences

- Decisions are traceable in repo history and navigable in the docs site.
- **An accepted ADR is immutable:** to change a decision, create a *superseding*
  ADR that references the prior one; the only edit allowed on an accepted ADR is
  updating its **Status** to point at the replacement.
- The `mkdocs build --strict` gate turns "ADR missing from nav" or a broken link
  into a build failure.

# Sync write-path / async persistence

> **Seed page (Explanation).** TODO: explain WHY the API replies immediately
> without touching the database while the worker persists later. Cover the
> producer-generated identity, at-least-once delivery, and idempotent inserts.

## The write path responds without persisting

TODO: explain how the API validates, generates the id, publishes the event, and
replies — without writing to Postgres.

## The worker persists asynchronously

TODO: explain the idempotent `INSERT ... ON CONFLICT DO NOTHING` and why
at-least-once delivery is safe.

## Trade-offs

TODO: discuss the consistency model and why this trade-off is acceptable here.

# @vidimera/store-postgres

**PostgreSQL `Store` backing for `@vidimera/record` — the server-SQL third reference
backing (multi-connection-safe).**

`PostgresStore` runs over a `pg.Pool` the caller owns — the store never creates or
closes the pool. Genesis appends are serialized per (profile, subject) pair on an
advisory lock; every other append takes the record's row `FOR UPDATE`; and transitions
persist as `text`, never `jsonb`, so the stored transition bytes replay identically
across the three reference backings. Its method signatures are public but explicitly
unstable pre-1.0 — the behaviors are stable; the shapes freeze only at 1.0.

It is not compliance: adopting this backing, or `@vidimera/record` itself, makes no host
compliant with any law or regulation.

> **Status: not yet published.** The package is pre-0.1 and consumed from source in its
> repository. This line flips at the 0.1 cut.

## Requirements

- `@vidimera/record` — a peerDependency; install both.
- PostgreSQL 11 or newer — the oldest server construct it uses is `hashtextextended` —
  exercised in this repository against PostgreSQL 18.
- Node 22.16 or newer.

## Usage

```ts
import { create } from '@vidimera/record';
import { PostgresStore } from '@vidimera/store-postgres';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const store = new PostgresStore(pool, { schema: 'vidimera' });

const { agent, operator } = create({
  profiles: [
    {
      id: 'finance.invoice-approval.v1',
      subject: { canonicalizerRef: 'finance.invoice.v1' },
      legs: [{ id: 'approver-decide', allowedAuthorities: ['session:ap-console'] }],
      captureMode: 'staged',
      expiry: { ttl: 3600 },
    },
  ],
  store,
  canonicalizers: { 'finance.invoice.v1': (content) => content },
});
```

From here the flow is identical to every other backing — the store is just
`Config.store`, and the repository's `docs/guide/getting-started.md` walkthrough
applies unchanged. The schema's tables are created lazily on first use, so
construction is synchronous and never touches the database.

For AL2 detached signing, the store exposes its own signature sidecar as
`store.signatures` — a `signatures` table in the same schema, created by the same lazy
DDL. Configure `signing.signatures: store.signatures` and each signature is written inside
the transaction of the append it signs, so an append that does not commit leaves none; any
other sidecar is written before the append, outside it. The repository's
`docs/guide/integrating.md` AL2 section states both modes, switching an existing
deployment, and the rule for a wrapper around the store.

## Testing posture

The suite runs against a real embedded PostgreSQL started per run (no Docker, no
external database), includes real multi-connection contention coverage, and holds this
backing equivalent to the in-memory and embedded-SQL references through a shared
conformance suite plus a cross-backing byte-identity proof.

## License

Apache-2.0.

// Give every existing game a version, before deploying optimistic locking.
//
//   mongosh "$MONGODB_URI" --file infra/migrations/2026-08-17-game-version.js
//
// Run this BEFORE the deploy, unlike the migration next to it. Spring Data reads a
// missing @Version field as null, treats the entity as new, and issues an insert — which
// hits the existing _id and fails with a duplicate key error rather than an optimistic
// locking one. A game written before this field existed would therefore refuse every
// move made in it, and refuse it in a way the retry does not catch. Measured, not
// assumed: the probe threw E11000 on the first save.
//
// Idempotent: running it twice does nothing the second time.

const result = db.games.updateMany(
  { version: { $exists: false } },
  { $set: { version: NumberLong("0") } }
);

printjson({ gamesVersioned: result.modifiedCount });

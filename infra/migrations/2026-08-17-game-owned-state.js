// Migrate documents written before game state moved onto the game.
//
//   mongosh "$MONGODB_URI" --file infra/migrations/2026-08-17-game-owned-state.js
//
// Take a backup first. Run it against the same database the backend reads; the URI in
// SSM under /hand-of-fate/mongodb-uri already names it.
//
// Idempotent: running it twice does nothing the second time.
//
// What it does, and why each part is what it is — the shape of the data was checked
// against production on 2026-08-17 before this was written, and it is small enough that
// every case below is a real document rather than a hypothetical one.
//
//   1. Games that predate the change carry no hands and no placed cards of their own.
//      Those live on the players, and the cards on the board are per-deck instances
//      (spark_<uuid>) that appear in no catalogue, so a game whose players are gone has
//      lost the power of every card on its board and can never be rendered again. There
//      is no state to migrate them to. They are deleted.
//
//   2. currentDeck on a player mid-game points at a temporary deck that was never saved.
//      The real one is parked in original_deck. Put it back before dropping the field,
//      or the player is left owning a deck document that does not exist.
//
//   3. hand, score and placed_cards are no longer read or written by anything.

const summary = { gamesDeleted: 0, decksDeleted: 0, decksRestored: 0, playersCleaned: 0 };

// --- 1. games -------------------------------------------------------------------------
// Only games that predate the change: one written by the new code has a `hands` field.
const staleGames = db.games.find({ hands: { $exists: false } }, { _id: 1 }).toArray();
if (staleGames.length > 0) {
  const ids = staleGames.map((g) => g._id);
  print(`Deleting ${ids.length} game(s) written before game-owned state: ${ids.join(', ')}`);
  summary.gamesDeleted = db.games.deleteMany({ _id: { $in: ids } }).deletedCount;
}

// --- 2. restore the real deck ---------------------------------------------------------
const borrowed = db.players.find({ original_deck: { $exists: true, $ne: null } }).toArray();
borrowed.forEach((p) => {
  print(`Restoring ${p.name}'s deck from original_deck`);
  db.players.updateOne({ _id: p._id }, { $set: { currentDeck: p.original_deck } });
  summary.decksRestored += 1;
});

// --- 3. drop the fields the game now owns ---------------------------------------------
summary.playersCleaned = db.players.updateMany(
  {
    $or: [
      { hand: { $exists: true } },
      { score: { $exists: true } },
      { placed_cards: { $exists: true } },
      { original_deck: { $exists: true } },
    ],
  },
  { $unset: { hand: '', score: '', placed_cards: '', original_deck: '' } }
).modifiedCount;

// --- 4. decks nobody owns -------------------------------------------------------------
// Left behind by players that were deleted. Unrelated to this change in cause, but the
// deck collection is read by deck ownership checks and these can never match anybody.
const playerIds = db.players.find({}, { _id: 1 }).toArray().map((p) => String(p._id));
const orphanedDecks = db.deck
  .find({ ownerId: { $nin: playerIds } }, { _id: 1, ownerId: 1 })
  .toArray();
if (orphanedDecks.length > 0) {
  print(`Deleting ${orphanedDecks.length} deck(s) whose owner no longer exists`);
  summary.decksDeleted = db.deck.deleteMany({
    _id: { $in: orphanedDecks.map((d) => d._id) },
  }).deletedCount;
}

printjson(summary);

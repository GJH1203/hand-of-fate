/*
 * The table.
 *
 * Dark walnut, lifted so the figure actually reads, then darkened toward the
 * edges so the eye stays on whatever sheet is lying on it. That is the whole
 * component — no star field, no rune plate, no drifting particles, no stack of
 * radial pools pretending a flat colour is a place. A table is a place.
 *
 * Three explicit layers rather than a background plus pseudo-elements: the wood
 * needs a `filter` to be visible at all, and a filtered pseudo-element on a
 * negatively-stacked fixed parent gets painted behind the body's background and
 * silently vanishes.
 *
 * Fixed rather than scrolling, because a table does not move when you slide a
 * piece of paper up it.
 */

export default function AppBackground() {
  return (
    <div aria-hidden className="table-ground">
      <div className="table-ground__wood" />
      <div className="table-ground__vignette" />
    </div>
  );
}

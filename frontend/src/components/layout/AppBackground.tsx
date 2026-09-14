/*
 * The one background every page sits on.
 *
 * The brief it has to meet: a warm near-black ground, one cold light source, and no
 * even gradients — a flat linear fade over a full viewport bands visibly on a dark
 * screen, and the grain overlay in the root layout only hides so much.
 *
 * So the wash is built from three offset radial pools rather than one gradient: a
 * cold indigo bloom behind where the content sits, an ember pool low and to the
 * right, and the ground underneath both. The arena plate rides on top of them at
 * low opacity and breathes very slowly, which is the only motion here.
 *
 * The star field is gone. Thirty-four evenly scattered dots read as dust on the
 * screen, not as a sky, and they were competing with the grain for the same job.
 */

export default function AppBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Ground */}
      <div className="absolute inset-0" style={{ backgroundColor: "#0C0B0A" }} />

      {/* Cold light, high and slightly left of centre — the arena's own indigo */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 55% at 44% -10%, rgba(38,46,82,0.4) 0%, rgba(20,23,42,0.2) 44%, transparent 72%)",
        }}
      />

      {/* Warm light, low and right. Off-centre so the two never form a symmetry. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 82% 96%, rgba(122,70,26,0.34) 0%, rgba(74,42,16,0.14) 45%, transparent 70%)",
        }}
      />

      {/*
       * The rune plate, pushed right back and breathing on a 14s cycle.
       *
       * `screen` is the wrong blend for this: on a near-black ground it is purely
       * additive, so the plate's electric blue came back at full strength and turned
       * the warm ground cold — the exact thing the palette exists to avoid. Plain
       * alpha at a few percent, desaturated, leaves it as texture rather than a light
       * source. Any page that actually wants the artwork — the sign-in split, the
       * arena — puts its own copy down at full strength; this one only has to stop the
       * ground being a flat fill.
       */}
      <div
        className="absolute left-1/2 top-[46%] h-[130vmin] w-[175vmin] -translate-x-1/2 -translate-y-1/2 bg-contain bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/backgrounds/battle-arena.png')",
          filter: "saturate(0.3) brightness(0.9)",
          // The opacity lives in the keyframes — see plate-breathe in globals.css.
          animation: "plate-breathe 16s ease-in-out infinite",
        }}
      />

      {/*
       * Vignette, weighted to the top-left so it agrees with the shadow direction in
       * the design tokens. A symmetrical vignette reads as a camera effect; an
       * asymmetric one reads as a room with a lamp in it.
       */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(115% 95% at 42% 38%, transparent 38%, rgba(8,7,6,0.55) 76%, rgba(8,7,6,0.88) 100%)",
        }}
      />
    </div>
  );
}

/* ElaGate: a speed limit for pinned scroll builds.
   A hard flick used to fly through the whole pinned section in a split second, so people left
   mid-build. With the gate, scrolling ahead of what has been built holds the page and plays the
   build forward to where they were heading, at most `rate` progress per second. Normal scrolling,
   scrolling back up, Skip and nav links are untouched.
   usage (in the page's scroll code, before reading progress):
     const gate = ElaGate({ section: build, lenis, rate: .3 });
     const onScroll = () => { if (gate.check()) return; ...read progress, update UI... };
     skip / nav links past the section: gate.open();   "build it again": gate.arm();
   busy: optional () => boolean. While it returns true (the 3D is still catching up to the scroll position),
     the page is held where it is and the forward play waits, so nobody scrolls past a half-played build.
   Off with ?p= (QA jumps) and prefers-reduced-motion. */
(() => {
  window.ElaGate = function (o) {
    const sec = o.section, lenis = o.lenis || null, RATE = o.rate || .3, de = document.documentElement, busy = () => !!(o.busy && o.busy());
    const TOUCH = matchMedia('(pointer: coarse)').matches, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const len = () => Math.max(1, sec.offsetHeight - innerHeight), yOf = p => sec.offsetTop + p * len();
    const rawP = () => (scrollY - sec.offsetTop) / len();
    const setY = y => lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y);
    const g = { p: Math.min(1, Math.max(0, rawP())), want: 0, raf: 0, t: 0, last: performance.now(), free: RM || new URLSearchParams(location.search).has('p') || rawP() >= 1 };
    const unlock = () => { if (TOUCH) de.style.overflow = ''; };
    const stop = () => { cancelAnimationFrame(g.raf); g.raf = 0; unlock(); };
    function step(now) {
      const dt = Math.max(0, Math.min(.12, (now - g.t) / 1000)); g.t = now;   // rAF time can be behind performance.now(): never step backwards
      const hold = busy(); if (!hold) g.p = Math.min(g.want, g.p + RATE * dt); setY(yOf(g.p));
      if (g.p >= 1 && !hold) g.free = true;
      if (g.free || (!hold && g.p >= g.want - 1e-4)) { g.raf = 0; unlock(); return; }
      g.raf = requestAnimationFrame(step);
    }
    function check() {
      const now = performance.now(), dtE = Math.min(.08, (now - g.last) / 1000); g.last = now;
      if (g.free) return false;
      const r = rawP();
      if (r <= 0 && !g.raf) { g.p = 0; return false; }
      if (g.raf) { if (r < g.p - .01) { stop(); g.p = g.want = r; return false; } if (r > g.p + .002) { g.want = Math.min(1, Math.max(g.want, r)); setY(yOf(g.p)); return true; } return false; }
      // normal-speed scrolling: follow it
      // (the allowance is per second of real time: a fixed per-event slack let fast wheels run ~3x the rate)
      if (r < g.p || (r <= g.p + RATE * 1.5 * dtE + .0015 && !busy())) { g.p = Math.min(1, r); if (g.p >= 1) g.free = true; return false; }
      // too fast: hold here and play the build forward to where they were heading
      g.want = Math.min(1, r); setY(yOf(g.p));
      if (TOUCH) de.style.overflow = 'hidden';   // kills iOS momentum so it doesn't fight the hold
      g.t = now; g.raf = requestAnimationFrame(step);
      return true;
    }
    return {
      check,
      open() { g.free = true; stop(); },
      arm() { g.free = RM; g.p = 0; g.want = 0; stop(); },
      get p() { return g.p; }, get free() { return g.free; }, get playing() { return !!g.raf; }
    };
  };
})();

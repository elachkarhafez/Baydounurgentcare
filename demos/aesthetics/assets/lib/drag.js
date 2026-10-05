/* ElaDrag: the interaction rules every signature piece needs, in one helper.
   - mouse: free 2D drag;  touch: ONE AXIS only (horizontal), so vertical swipes still scroll the page
     (the element gets touch-action: pan-y)
   - hides the callout on first touch, runs an idle demo if nobody touches it within `idleAfter` ms
   - progress meter 0..1 from distance travelled; payoff fires once at 1
   - payoff buttons only become tappable 900ms after they appear (the finishing swipe must not land on them)
   usage:
   const d = ElaDrag(el, {
     callout: document.querySelector('.callout'), payoff: document.querySelector('.payoff'),
     perUnit: 2600,                       // px of travel for 0 → 1
     onMove: (x, y, dx, dy, touch) => {}, // x,y in element px; draw your effect here
     onProgress: p => {}, onPayoff: () => {},
     demo: t => ({ x, y }) | null,        // idle demo path for t in seconds (return null to stop)
     idleAfter: 2800
   });
   d.reset();  d.progress  */
(() => {
  window.ElaDrag = function (el, o = {}) {
    el.style.touchAction = 'pan-y'; el.style.userSelect = 'none';
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let down = false, lx = 0, ly = 0, touched = false, prog = 0, paid = false, idleT = null, demoRaf = 0;
    const rect = () => el.getBoundingClientRect();
    const hide = () => { touched = true; o.callout && o.callout.classList.add('gone'); cancelAnimationFrame(demoRaf); };
    const add = d => { if (paid) return; prog = Math.min(1, prog + d / (o.perUnit || 2600)); o.onProgress && o.onProgress(prog); if (prog >= 1) payoff(); };
    function payoff() { paid = true; o.onPayoff && o.onPayoff(); if (o.payoff) { o.payoff.classList.add('on'); o.payoff.style.pointerEvents = 'none'; setTimeout(() => { if (paid) o.payoff.style.pointerEvents = ''; }, 900); } }
    el.addEventListener('pointerdown', e => { down = true; hide(); const r = rect(); lx = e.clientX - r.left; ly = e.clientY - r.top; if (e.pointerType !== 'touch') el.setPointerCapture(e.pointerId); o.onStart && o.onStart(lx, ly); });
    el.addEventListener('pointermove', e => { if (!down) return; const r = rect(), x = e.clientX - r.left, y = e.clientY - r.top, touch = e.pointerType === 'touch';
      const dx = x - lx, dy = touch ? 0 : y - ly; lx = x; ly = touch ? ly : y; o.onMove && o.onMove(x, touch ? ly : y, dx, dy, touch); add(Math.hypot(dx, dy)); });
    const up = () => { if (!down) return; down = false; o.onEnd && o.onEnd(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', e => e.pointerType !== 'touch' && up());
    // idle demo (once, only while visible)
    if (o.demo && !RM) new IntersectionObserver(es => { if (!es[0].isIntersecting || touched) return clearTimeout(idleT); idleT = setTimeout(() => { if (touched) return; const t0 = performance.now(); let px = null, py = null; o.onStart && o.onStart();
      const step = now => { if (touched) return; const pt = o.demo((now - t0) / 1000); if (!pt) { o.onEnd && o.onEnd(); return; } if (px !== null) o.onMove && o.onMove(pt.x, pt.y, pt.x - px, pt.y - py, false); px = pt.x; py = pt.y; demoRaf = requestAnimationFrame(step); }; demoRaf = requestAnimationFrame(step); }, o.idleAfter || 2800); }).observe(el);
    return { reset() { prog = 0; paid = false; o.payoff && o.payoff.classList.remove('on'); o.onProgress && o.onProgress(0); }, get progress() { return prog; }, hide };
  };
})();

/* Home page only: the logo intro, the roaster video and the roast line behind it.
   The roaster is a pre-rendered 3D loop (src/roaster/), shown with mix-blend-mode:multiply so only the machine
   and its shadow show on the cream. It only plays while on screen. Behind it, belts carry raw nuts (lime outlines)
   in and roasted ones (golden) out. Everything decorative is paused off screen and still for reduced motion. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement, RM = matchMedia('(prefers-reduced-motion: reduce)').matches, PHONE = matchMedia('(max-width:900px)').matches;

  /* intro: once per session; any tap, scroll, key or the button skips it; never locks scrolling */
  const intro = $('#intro');
  if (intro && root.classList.contains('nn-intro-on')) {
    try { sessionStorage.setItem('nn-intro', '1'); } catch (e) {}
    let gone = false;
    const finish = fast => { if (gone) return; gone = true; intro.style.pointerEvents = 'none'; if (fast) intro.classList.add('nn-skip'); setTimeout(() => { intro.remove(); root.classList.remove('nn-intro-on'); }, fast ? 280 : 600); ['keydown', 'wheel', 'touchstart'].forEach(t => removeEventListener(t, any)); };
    const any = () => finish(true);
    intro.addEventListener('click', any); ['keydown', 'wheel', 'touchstart'].forEach(t => addEventListener(t, any, { passive: true }));
    setTimeout(() => finish(false), 1450);
  } else if (intro) intro.remove();

  /* the roaster video */
  const vid = $('#roastVid');
  if (vid && !RM) new IntersectionObserver(es => { if (es[0].isIntersecting) { const p = vid.play(); p && p.catch(() => {}); } else vid.pause(); }, { threshold: .15 }).observe(vid);

  /* the roast line: one SVG tile per belt, drawn raw (outlines) and roasted (filled) */
  const line = $('#line'), hero = $('.hero');
  if (line && hero) {
    const NUT = {
      cashew: { o: 'M13 33C8 24 13 12 24 10C32 8 39 11 40 16C41 20 37 21 34 19C29 17 23 18 21 23C19 28 22 32 23 35C24 39 17 39 13 33Z', d: 'M17 31C15 25 18 17 26 14', f: '#dfae68' },
      almond: { o: 'M24 6C33 12 37 24 34 34C32 40 28 42 24 42C20 42 16 40 14 34C11 24 15 12 24 6Z', d: 'M24 12C22 20 22 30 24 38M19 20l1 1M28 26l1 1M20 31l1 1', f: '#b9774a' },
      hazelnut: { o: 'M24 10C31 10 37 17 37 26C37 35 31 41 24 41C17 41 11 35 11 26C11 17 17 10 24 10Z', d: 'M13 22C18 18 30 18 35 22M22 10L24 6L26 10', f: '#a4683c' },
      pistachio: { o: 'M10 28C10 18 20 10 30 11C38 12 41 19 39 26C37 34 28 39 20 38C13 37 10 33 10 28Z', k: 'M17 26C20 20 27 17 33 19C31 25 24 29 17 26Z', kf: '#9cc95a', f: '#ead3a6' },
      walnut: { o: 'M24 8C32 8 39 15 39 24C39 33 32 40 24 40C16 40 9 33 9 24C9 15 16 8 24 8Z', d: 'M24 10V38M17 14C21 18 21 22 17 25C21 28 21 32 17 35M31 14C27 18 27 22 31 25C27 28 27 32 31 35', f: '#b98a4e' },
      pecan: { o: 'M8 24C8 17 16 13 24 13C32 13 40 17 40 24C40 31 32 35 24 35C16 35 8 31 8 24Z', d: 'M11 24H37M14 19C18 21 22 21 26 19C30 21 34 21 37 20M14 29C18 27 22 27 26 29C30 27 34 27 37 28', f: '#8a5130' },
      peanut: { o: 'M18 7C24 7 27 12 26 17C25 20 25 22 27 25C31 30 30 40 22 41C15 42 11 36 13 30C14 27 15 25 14 22C12 15 12 7 18 7Z', d: 'M16 14l2 2M21 12l2 2M16 32l2 2M21 35l2 2M23 29l2 2', f: '#d4a066' },
      sunflower: { o: 'M24 6C30 12 33 22 31 32C30 38 27 42 24 42C21 42 18 38 17 32C15 22 18 12 24 6Z', d: 'M21 14C20 22 20 30 21 38M27 14C28 22 28 30 27 38', f: '#4a4038', dc: '#efe6d2' },
      pumpkin: { o: 'M24 7C31 11 35 21 33 31C32 38 28 42 24 42C20 42 16 38 15 31C13 21 17 11 24 7Z', k: 'M24 12C28 16 30 23 29 31C28 35 26 37 24 37C22 37 20 35 19 31C18 23 20 16 24 12Z', kf: '#8fb04f', f: '#d9cfa4' }
    };
    const KEYS = Object.keys(NUT), TW = 640, LH = 64;
    const tile = (seed, roasted) => {
      let sd = seed; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      const ink = roasted ? '#6b3f1a' : '#3b6911', rail = roasted ? '#8a5a2b' : '#3b6911';
      let t = ''; for (let k = 0; k < TW; k += 16) { const L = k % 64 === 0 ? 7 : 3.5; t += `M${k + .5} 3V${3 + L}M${k + .5} ${LH - 3}V${LH - 3 - L}`; }
      let out = `<path d="M0 3H${TW}M0 ${LH - 3}H${TW}${t}" stroke="${rail}" stroke-opacity=".3" stroke-width="1" fill="none"/>`;
      ['¼ LB', '½ LB', '¾ LB', '1 LB'].forEach((l, k) => { out += `<text x="${k * 160 + 4}" y="15" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="7.5" letter-spacing="1" fill="${rail}" fill-opacity=".45">${l}</text>`; });
      let x = 14 + rnd() * 20;
      while (x < TW - 54) {
        const n = NUT[KEYS[Math.floor(rnd() * KEYS.length)]], sc = .74 + rnd() * .24, r = Math.round(rnd() * 70 - 35);
        let g = roasted ? `<path d="${n.o}" fill="${n.f}" stroke="${ink}" stroke-width="1.5" stroke-linejoin="round"/>` : `<path d="${n.o}" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linejoin="round"/>`;
        if (n.k) g += roasted ? `<path d="${n.k}" fill="${n.kf}" stroke="${ink}" stroke-width="1.2"/>` : `<path d="${n.k}" fill="none" stroke="${ink}" stroke-width="1.3"/>`;
        if (n.d) g += `<path d="${n.d}" fill="none" stroke="${roasted ? (n.dc || ink) : ink}" stroke-opacity="${roasted ? .75 : 1}" stroke-width="1.3" stroke-linecap="round"/>`;
        out += `<g transform="translate(${x.toFixed(1)} 8) rotate(${r} 24 24) translate(24 24) scale(${sc.toFixed(2)}) translate(-24 -24)">${g}</g>`;
        x += 48 * sc + 18 + rnd() * 46;
      }
      return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${LH}" viewBox="0 0 ${TW} ${LH}">${out}</svg>`)}")`;
    };
    const N = PHONE ? 3 : 5, SPEED = [34, 27, 40, 30, 37];
    line.style.setProperty('--n', N);
    line.innerHTML = '<div class="heat"></div>' + Array.from({ length: N }, (_, i) => `<div class="lane" style="--t:${SPEED[i]}s;--o:${(-i * 5.3).toFixed(1)}s"><div class="half raw"><i></i></div><div class="half done"><i></i></div></div>`).join('');
    $$('.lane', line).forEach((ln, i) => { const [a, b] = $$('i', ln); a.style.backgroundImage = tile(i * 7919 + 11, false); b.style.backgroundImage = tile(i * 7919 + 11, true); });
    const atmo = $('#atmo');
    const place = () => {
      const v = (vid || $('.stage')).getBoundingClientRect(), h = hero.getBoundingClientRect(); if (!v.width) return;
      line.style.setProperty('--split', Math.round(v.left + v.width * .45 - h.left) + 'px');
      if (PHONE) { line.style.setProperty('--lt', Math.round(v.top - h.top + v.height * .1) + 'px'); line.style.setProperty('--lh', Math.round(v.height * .78) + 'px'); }
      // cut the belts and the warm haze out where the machine stands, so they pass behind it
      if (CSS.supports && (CSS.supports('mask-composite', 'exclude') || CSS.supports('-webkit-mask-composite', 'xor'))) {
        [line, atmo].forEach(el => { if (!el) return; const b = el.getBoundingClientRect(); el.style.setProperty('--rx', (v.left - b.left).toFixed(1) + 'px'); el.style.setProperty('--ry', (v.top - b.top).toFixed(1) + 'px'); el.style.setProperty('--rw', v.width.toFixed(1) + 'px'); el.style.setProperty('--rh', v.height.toFixed(1) + 'px'); });
        hero.classList.add('nn-cut');
      }
    };
    place(); setTimeout(place, 1400); addEventListener('resize', () => requestAnimationFrame(place), { passive: true }); document.fonts && document.fonts.ready.then(place); addEventListener('load', place);
    if (!RM) new IntersectionObserver(es => line.classList.toggle('off', !es[0].isIntersecting)).observe(hero);
    // a few embers drifting up from the roaster
    if (atmo && !RM) {
      const h = hero.getBoundingClientRect(), r = $('.stage').getBoundingClientRect(), cx = (r.left + r.width * .46 - h.left) / h.width * 100, cy = (r.top + r.height * .4 - h.top) / h.height * 100;
      let sd = 7, html = ''; const rnd = () => (sd = sd * 16807 % 2147483647) / 2147483647;
      for (let i = 0, n = PHONE ? 7 : 12; i < n; i++) html += `<i class="at-ember" style="left:${(cx + (rnd() - .5) * (PHONE ? 60 : 30)).toFixed(1)}%;top:${(cy + 6 + rnd() * 30).toFixed(1)}%;--s:${(2.5 + rnd() * 3).toFixed(1)}px;--d:${(7 + rnd() * 7).toFixed(1)}s;--dl:${(-rnd() * 12).toFixed(1)}s;--sx:${Math.round((rnd() - .5) * 60)}px;--rise:${-Math.round(160 + rnd() * 160)}px;--o:${(.45 + rnd() * .4).toFixed(2)}"></i>`;
      atmo.insertAdjacentHTML('beforeend', html);
    }
  }
})();

/* ElaIntro: branded opening animations that never stutter.
   Every moving part is a transform/opacity Web Animation scheduled up front, so it runs on the
   compositor even while the page's main thread is busy (3D boot, image decode).
   Include as a classic <script> right after <body> so it starts before anything else.
   Each intro: plays once per tab (sessionStorage), skips on ?qa / reduced motion, has a Skip button,
   and calls onReveal() as the site is uncovered (start the hero animation there).

   ElaIntro.drip({ words:[{text:'Fudge', font:'"Leckerli One"', weight:400, color:'#2b140b'}, {text:'Fix', font:'Fredoka', weight:700, color:'#b77a3f', scale:.74}],
                   dripWord:0, liquid:'#2b140b', bg:'#f5ecdc', cherry:true, onReveal })
     Logo on a cream screen, drips grow out of the real bottoms of the letters, a drippy wave floods
     the screen, then the sheet drops away revealing the site. (The Fudge Fix opener.)
   ElaIntro.curtain({ words:[...], bg, panel:'#111', accent:'#ffd21f', onReveal })
     Logo, then two panels split and slide away with an accent line. Good for clean/luxury brands.
   ElaIntro.fill({ words:[...], bg, liquid:'#ffd21f', onReveal })
     The logo fills with liquid from the bottom (clip reveal), then the screen lifts away.
*/
(() => {
  const d = document, q = new URLSearchParams(location.search);
  const skipAll = () => { try { if (sessionStorage.getItem('elaIntro') === '1') return true; sessionStorage.setItem('elaIntro', '1'); } catch (e) {} return q.has('qa') || matchMedia('(prefers-reduced-motion: reduce)').matches || !d.body.animate; };
  function shell(bg) {
    const L = d.createElement('div');
    L.setAttribute('aria-hidden', 'true');
    L.style.cssText = `position:fixed;inset:0;z-index:1000;overflow:hidden;pointer-events:none`;
    L.innerHTML = `<div data-bg style="position:absolute;inset:0;background:${bg}"></div><div data-stage style="position:absolute;inset:0"></div><button type="button" data-skip style="position:absolute;left:50%;bottom:26px;transform:translateX(-50%);z-index:9;pointer-events:auto;background:none;border:1px solid rgba(128,128,128,.35);border-radius:99px;padding:9px 16px;cursor:pointer;color:inherit;font:500 11px/1 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;opacity:.7">Skip</button>`;
    d.body.appendChild(L); return L;
  }
  function logo(words, fs) {
    const el = d.createElement('div');
    el.style.cssText = `position:absolute;left:0;right:0;top:44%;display:flex;justify-content:center;align-items:baseline;gap:.1em;line-height:1;font-size:${fs}px;opacity:0;will-change:transform,opacity`;
    el.innerHTML = words.map((w, i) => `<span data-w="${i}" style="font:${w.weight || 400} ${w.scale || 1}em/1 ${w.font || 'system-ui'};color:${w.color || '#111'};letter-spacing:${w.tracking || 0};position:relative">${w.text}${i === 0 ? '<i data-base style="display:inline-block;width:0;height:0;vertical-align:baseline"></i>' : ''}</span>`).join('');
    return el;
  }
  const fontsReady = words => d.fonts ? Promise.race([Promise.all(words.map(w => d.fonts.load(`${w.weight || 400} 60px ${w.font || 'system-ui'}`))), new Promise(r => setTimeout(r, 700))]) : Promise.resolve();
  function run(o, build) {
    let revealed = false; const reveal = () => { if (revealed) return; revealed = true; window.__elaIntroDone = true; o.onReveal && o.onReveal(); };
    if (skipAll()) { reveal(); return; }
    const L = shell(o.bg || '#fff');
    const finish = () => { L.remove(); reveal(); };
    L.querySelector('[data-skip]').addEventListener('click', () => { L.getAnimations({ subtree: true }).forEach(a => a.cancel()); finish(); });
    fontsReady(o.words || []).then(() => requestAnimationFrame(() => build(L, reveal, finish)), () => requestAnimationFrame(() => build(L, reveal, finish)));
  }
  const NS = 'http://www.w3.org/2000/svg', HI = 'rgba(255,228,204,.3)';
  const fsFor = W => Math.round(Math.max(72, Math.min(W * (W < 600 ? .21 : .17), 170)));

  /* ---------------- drip ---------------- */
  function drip(o) {
    run(o, (L, reveal, finish) => {
      const W = innerWidth, H = innerHeight, fs = o.size || fsFor(W), F = o.liquid || '#2b140b', stage = L.querySelector('[data-stage]');
      let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const box = d.createElement('div'); box.style.cssText = 'position:absolute;inset:0'; stage.appendChild(box);
      const lg = logo(o.words, fs); stage.appendChild(lg);
      const w0el = lg.querySelector(`[data-w="${o.dripWord || 0}"]`), fr = w0el.getBoundingClientRect(), base = lg.querySelector('[data-base]').getBoundingClientRect().top, wd = o.words[o.dripWord || 0];
      // find the real bottoms of the letters
      const c = d.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true }), cw = Math.ceil(fr.width) + 20, ch = Math.ceil(fs * 2); c.width = cw; c.height = ch;
      x.font = `${wd.weight || 400} ${fs * (wd.scale || 1)}px ${wd.font || 'system-ui'}`; x.fillText(wd.text, 10, fs * 1.2);
      const px = x.getImageData(0, 0, cw, ch).data, bot = new Float32Array(cw).fill(-1e9);
      for (let col = 0; col < cw; col++) for (let row = ch - 1; row >= 0; row--) if (px[(row * cw + col) * 4 + 3] > 150) { bot[col] = row - fs * 1.2; break; }
      const TB = o.hold || 1150, TC = TB + 640, END = TC + 720, N = o.drips || 7;
      for (let k = 0; k < N; k++) {
        let best = -1e9, bx = 0; const a = Math.floor(10 + (k + .15) * fr.width / N), b = Math.floor(10 + (k + .85) * fr.width / N);
        for (let col = a; col < b; col++) if (bot[col] > best) { best = bot[col]; bx = col; }
        if (best < -fs * .25) continue;
        const w = Math.max(9, fs * (.07 + rnd() * .05)), r = w * .64, w0 = w * 1.4, w1 = Math.max(7, w * (.72 + rnd() * .14));
        const cx0 = fr.left + bx - 10, y0 = base + best - w * .8, Hd = H - y0 + r * 2 + 20, bw = Math.ceil(Math.max(w0, 2 * r) + 4), cx = bw / 2, ny = Hd - 2.4 * r;
        const clip = d.createElement('div'); clip.style.cssText = `position:absolute;overflow:hidden;left:${cx0 - cx}px;top:${y0}px;width:${bw}px;height:${Hd}px`;
        const sv = d.createElementNS(NS, 'svg'); sv.setAttribute('width', bw); sv.setAttribute('height', Hd); sv.setAttribute('viewBox', `0 0 ${bw} ${Hd}`); sv.style.cssText = 'position:absolute;left:0;top:0;will-change:transform';
        sv.innerHTML = `<path fill="${F}" d="M${cx - w0 / 2} 0 C${cx - w0 / 2} ${Hd * .2} ${cx - w1 / 2} ${Hd * .3} ${cx - w1 / 2} ${ny} C${cx - w1 / 2} ${Hd - 1.6 * r} ${cx - r} ${Hd - 1.5 * r} ${cx - r} ${Hd - r} A${r} ${r} 0 0 0 ${cx + r} ${Hd - r} C${cx + r} ${Hd - 1.5 * r} ${cx + w1 / 2} ${Hd - 1.6 * r} ${cx + w1 / 2} ${ny} C${cx + w1 / 2} ${Hd * .3} ${cx + w0 / 2} ${Hd * .2} ${cx + w0 / 2} 0Z"/><rect fill="${HI}" x="${cx - w1 * .3}" y="${Hd * .3}" width="${w1 * .14}" height="${Math.max(0, ny - Hd * .3)}" rx="${w1 * .07}"/><circle fill="${HI}" cx="${cx - r * .38}" cy="${Hd - r * 1.25}" r="${r * .22}"/>`;
        clip.appendChild(sv); box.appendChild(clip);
        const Lmax = H * (.1 + rnd() * .24), del = 250 + rnd() * 380, dur = 800 + rnd() * 500;
        sv.animate([{ transform: `translateY(${-Hd}px)` }, { transform: `translateY(${-Hd + Lmax}px)` }], { duration: dur, delay: del, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'both' });
        sv.animate([{ transform: `translateY(${-Hd + Lmax}px)` }, { transform: 'translateY(0)' }], { duration: 480, delay: TB, easing: 'cubic-bezier(.55,0,.9,.4)', fill: 'forwards' });
        if (rnd() > .45 && del + dur < TB) { const dr = d.createElement('div'), dd = r * 1.1; dr.style.cssText = `position:absolute;border-radius:50%;background:${F};width:${dd}px;height:${dd}px;left:${cx0 - dd / 2}px;top:${y0 + Lmax - dd * .9}px;opacity:0;will-change:transform`; box.appendChild(dr);
          dr.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 1, transform: `translateY(${H}px)` }], { duration: 620, delay: del + dur * .8, easing: 'cubic-bezier(.5,0,.85,.4)', fill: 'forwards' }); }
      }
      lg.animate([{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
      if (o.cherry) { const ch2 = d.createElementNS(NS, 'svg'); ch2.setAttribute('viewBox', '-12 -40 40 54'); ch2.style.cssText = `position:absolute;width:${fs * .42}px;height:${fs * .56}px;left:${fr.left + fs * .17}px;top:${base - fs * 1.12}px;opacity:0;will-change:transform`;
        ch2.innerHTML = '<path d="M2 -6 C4 -20 10 -30 22 -36" stroke="#5e4a22" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle r="10" fill="#c3162b"/><circle cx="-3.5" cy="-3.5" r="3" fill="rgba(255,255,255,.55)"/>'; stage.appendChild(ch2);
        ch2.animate([{ opacity: 1, transform: `translateY(${-H * .45}px)`, easing: 'cubic-bezier(.5,0,.9,.5)' }, { opacity: 1, transform: 'translateY(0)', offset: .62, easing: 'cubic-bezier(.2,.7,.4,1)' }, { opacity: 1, transform: `translateY(${-fs * .14}px)`, offset: .8, easing: 'cubic-bezier(.5,0,.9,.5)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 760, delay: 300, fill: 'both' }); }
      // the sheet: drippy bottom edge pours down, then the whole thing drops away
      const T = 190, E = 210, SH = T + H + E, sheet = d.createElement('div'); sheet.style.cssText = `position:absolute;left:0;top:0;width:100%;height:${SH}px;z-index:3;will-change:transform;transform:translateY(-200%)`; L.appendChild(sheet);
      const M = Math.max(5, Math.round(W / 74)), f = 9; let top = `M0 ${T}`, bottom = '', bulbs = '';
      const cols = [...Array(M)].map((_, i) => ({ x: (i + .5) * W / M + (rnd() - .5) * W / M * .4, w: 18 + rnd() * 18, a: 30 + rnd() * 140, b: 26 + rnd() * 150 }));
      for (const k of cols) { const sw = k.w * .55, sl = k.x - sw / 2, sr = k.x + sw / 2; top += ` L${sl - f} ${T} Q${sl} ${T} ${sl} ${T - f} L${sl} ${T - k.a + sw / 2} A${sw / 2} ${sw / 2} 0 0 1 ${sr} ${T - k.a + sw / 2} L${sr} ${T - f} Q${sr} ${T} ${sr + f} ${T}`; bulbs += `<circle fill="${F}" cx="${k.x}" cy="${T + H + k.b - k.w * .5}" r="${k.w * .64}"/><circle fill="${HI}" cx="${k.x - k.w * .24}" cy="${T + H + k.b - k.w * .7}" r="${k.w * .14}"/>`; }
      for (const k of [...cols].reverse()) { const l = k.x - k.w / 2, rr = k.x + k.w / 2, yb = T + H; bottom += ` L${rr + f} ${yb} Q${rr} ${yb} ${rr} ${yb + f} L${rr} ${yb + k.b - k.w / 2} A${k.w / 2} ${k.w / 2} 0 0 1 ${l} ${yb + k.b - k.w / 2} L${l} ${yb + f} Q${l} ${yb} ${l - f} ${yb}`; }
      sheet.innerHTML = `<svg viewBox="0 0 ${W} ${SH}" preserveAspectRatio="none" style="display:block;width:100%;height:100%"><path fill="${F}" d="${top} L${W} ${T} L${W} ${T + H}${bottom} L0 ${T + H}Z"/>${bulbs}</svg>`;
      sheet.animate([{ transform: `translateY(${-SH}px)` }, { transform: `translateY(${-T}px)` }], { duration: TC - TB, delay: TB, easing: 'cubic-bezier(.6,0,.35,1)', fill: 'forwards' });
      sheet.animate([{ transform: `translateY(${-T}px)` }, { transform: `translateY(${H + 30}px)` }], { duration: END - TC, delay: TC, easing: 'cubic-bezier(.55,0,.85,.35)', fill: 'forwards' });
      L.querySelector('[data-bg]').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1, delay: TC - 10, fill: 'forwards' });
      stage.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1, delay: TC - 10, fill: 'forwards' });
      L.querySelector('[data-skip]').animate([{ opacity: .7 }, { opacity: 0 }], { duration: 200, delay: TB, fill: 'forwards' });
      setTimeout(reveal, TC + 60); setTimeout(finish, END + 40);
    });
  }

  /* ---------------- curtain ---------------- */
  function curtain(o) {
    run(o, (L, reveal, finish) => {
      const W = innerWidth, fs = o.size || fsFor(W) * .8, stage = L.querySelector('[data-stage]'), bg = L.querySelector('[data-bg]');
      bg.style.background = 'transparent';
      const mk = side => { const p = d.createElement('div'); p.style.cssText = `position:absolute;top:0;bottom:0;${side}:0;width:50.5%;background:${o.panel || o.bg || '#111'};will-change:transform`; L.insertBefore(p, stage); return p; };
      const l = mk('left'), r = mk('right');
      const line = d.createElement('div'); line.style.cssText = `position:absolute;left:50%;top:0;bottom:0;width:2px;margin-left:-1px;background:${o.accent || '#fff'};transform:scaleY(0);will-change:transform`; stage.appendChild(line);
      const lg = logo(o.words, fs); stage.appendChild(lg);
      lg.animate([{ opacity: 0, transform: 'translateY(20px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
      lg.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.96)' }], { duration: 300, delay: 1000, fill: 'forwards' });
      line.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 400, delay: 950, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' });
      line.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 1450, fill: 'forwards' });
      l.animate([{ transform: 'none' }, { transform: 'translateX(-101%)' }], { duration: 750, delay: 1300, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' });
      r.animate([{ transform: 'none' }, { transform: 'translateX(101%)' }], { duration: 750, delay: 1300, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' });
      setTimeout(reveal, 1380); setTimeout(finish, 2100);
    });
  }

  /* ---------------- fill ---------------- */
  function fill(o) {
    run(o, (L, reveal, finish) => {
      const W = innerWidth, fs = o.size || fsFor(W) * .85, stage = L.querySelector('[data-stage]'), bg = L.querySelector('[data-bg]');
      const ghost = logo(o.words.map(w => Object.assign({}, w, { color: o.ghost || 'rgba(128,128,128,.25)' })), fs); stage.appendChild(ghost);
      const solid = logo(o.words, fs); stage.appendChild(solid);
      ghost.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'forwards' });
      solid.animate([{ opacity: 1, clipPath: 'inset(100% 0 0 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], { duration: 1000, delay: 150, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' });
      L.animate([{ transform: 'none' }, { transform: 'translateY(-100%)' }], { duration: 650, delay: 1350, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' });
      setTimeout(reveal, 1450); setTimeout(finish, 2050);
    });
  }
  window.ElaIntro = { drip, curtain, fill };
})();

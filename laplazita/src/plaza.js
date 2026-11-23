// La Plazita: the plaza scene. A scalloped kiosko canopy (from their logo) in the middle, their 19 carts in a ring around it
// as real-photo cards, string lights and papel picado running out from the canopy, palms on the horizon. Scroll brings the
// sun down and the bulbs come on string by string; drag or swipe walks you around the ring (la vuelta).
// Bundle: .claude/skills/ela-studio/kit/build3d/build.sh laplazita/src/plaza.js laplazita/assets/plaza.js
import {
  WebGLRenderer, Scene, PerspectiveCamera, Mesh, BufferGeometry, BufferAttribute, ShaderMaterial, CanvasTexture,
  Points, LineSegments, LineBasicMaterial, SphereGeometry, CircleGeometry, CylinderGeometry, InstancedMesh, PlaneGeometry,
  Object3D, DoubleSide, BackSide, AdditiveBlending, Vector3, Group, LinearSRGBColorSpace, LinearMipmapLinearFilter,
  LinearFilter, InstancedBufferAttribute, Color
} from 'three';

const TAU = Math.PI * 2;
const hex = h => new Color(h); // colours are used as display values (no colour management)

export function createPlaza(canvas, o) {
  const N = o.names.length, STEP = TAU / N;
  const R = 4.7, ARC = STEP * 0.82, CW = R * ARC, CH = CW * 4 / 3, Y0 = 0.16;
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  const dprCap = o.dprMax || 2; let dprNow = 9, slow = [];
  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 200);
  const U = {
    uTime: { value: 0 }, uPhase: { value: 0.12 }, uRot: { value: 0 }, uVel: { value: 0 }
  };

  /* ---------- sky ---------- */
  const sky = new Mesh(new SphereGeometry(90, 40, 20), new ShaderMaterial({
    side: BackSide, depthWrite: false, uniforms: U,
    vertexShader: `varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float uPhase,uTime;varying vec3 vD;
    float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    vec3 sky(float h,float p){
      vec3 dTop=vec3(.957,.874,.812),dHor=vec3(.992,.952,.905);
      vec3 gTop=vec3(.80,.55,.58),gHor=vec3(.99,.77,.60);
      vec3 nTop=vec3(.085,.06,.11),nHor=vec3(.33,.18,.24);
      vec3 top=p<.5?mix(dTop,gTop,smoothstep(0.,.5,p)):mix(gTop,nTop,smoothstep(.5,1.,p));
      vec3 hor=p<.5?mix(dHor,gHor,smoothstep(0.,.5,p)):mix(gHor,nHor,smoothstep(.5,1.,p));
      return mix(hor,top,pow(clamp(h,0.,1.),.6));
    }
    void main(){
      float h=max(vD.y,0.);vec3 c=sky(h,uPhase);
      vec3 sd=normalize(vec3(.35,mix(.42,-.06,smoothstep(0.,.75,uPhase)),-1.));
      float s=max(dot(vD,sd),0.);float g=(1.-smoothstep(.15,.95,uPhase))*smoothstep(.05,.45,uPhase);
      c+=vec3(1.,.72,.45)*pow(s,24.)*.55*g+vec3(1.,.85,.6)*pow(s,400.)*.8*g;
      float n=smoothstep(.65,1.,uPhase);
      vec2 q=floor(vec2(atan(vD.z,vD.x)*120.,vD.y*120.));float st=h21(q);
      c+=vec3(1.,.93,.85)*step(.9965,st)*n*(.55+.45*sin(uTime*2.+st*60.))*smoothstep(.06,.3,h);
      gl_FragColor=vec4(c,1.);
    }`
  }));
  scene.add(sky);

  /* ---------- palms on the horizon (drawn once on a 2D canvas) ---------- */
  {
    const pc = document.createElement('canvas'); pc.width = 2048; pc.height = 256; const x = pc.getContext('2d');
    x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineCap = 'round';
    const rnd = (a => () => (a = (a * 16807) % 2147483647) / 2147483647)(7);
    x.beginPath(); x.moveTo(0, 256);
    for (let i = 0; i <= 64; i++) x.lineTo(i * 32, 236 - 10 * Math.sin(i * .7) - 8 * rnd());
    x.lineTo(2048, 256); x.fill();
    for (let k = 0; k < 13; k++) {
      const bx = 60 + k * 152 + rnd() * 70, hgt = 120 + rnd() * 90, lean = (rnd() - .5) * 40, tx = bx + lean, ty = 240 - hgt;
      x.lineWidth = 5; x.beginPath(); x.moveTo(bx, 242); x.quadraticCurveTo(bx + lean * .2, 240 - hgt * .5, tx, ty); x.stroke();
      for (let f = 0; f < 9; f++) {
        const a = -Math.PI / 2 + (f - 4) * .36 + (rnd() - .5) * .2, L = 34 + rnd() * 20;
        const ex = tx + Math.cos(a) * L * 1.4, ey = ty + Math.sin(a) * L * .55 + L * .55;
        x.lineWidth = 4; x.beginPath(); x.moveTo(tx, ty); x.quadraticCurveTo(tx + Math.cos(a) * L * .8, ty + Math.sin(a) * L * .9, ex, ey); x.stroke();
      }
    }
    const tex = new CanvasTexture(pc);
    const band = new Mesh(new CylinderGeometry(60, 60, 9, 64, 1, true), new ShaderMaterial({
      side: BackSide, transparent: true, depthWrite: false, uniforms: { ...U, uT: { value: tex } },
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform sampler2D uT;uniform float uPhase;varying vec2 vUv;void main(){
        float a=texture2D(uT,vec2(fract(vUv.x*2.),vUv.y)).a;
        vec3 c=mix(vec3(.86,.74,.68),vec3(.05,.03,.06),smoothstep(.2,.8,uPhase));
        gl_FragColor=vec4(c,a*mix(.28,.92,smoothstep(.1,.6,uPhase)));}`
    }));
    band.position.y = 3.4; scene.add(band);
  }

  /* ---------- plaza floor with reflections ---------- */
  const floor = new Mesh(new CircleGeometry(60, 96), new ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { ...U, uR: { value: R } },
    vertexShader: `varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float uPhase,uR;varying vec3 vP;
    void main(){
      float r=length(vP.xy),a=atan(vP.y,vP.x);
      vec3 day=vec3(.93,.86,.80),dusk=vec3(.80,.60,.56),night=vec3(.12,.08,.11);
      vec3 c=uPhase<.5?mix(day,dusk,uPhase*2.):mix(dusk,night,(uPhase-.5)*2.);
      float ring=fract(r/.85);float lines=smoothstep(.0,.04,ring)*smoothstep(1.,.96,ring);
      float seg=fract(a/6.2832*floor(8.+r*7.));float rad=smoothstep(0.,.02,seg)*smoothstep(1.,.98,seg);
      c*=mix(.9,1.,lines*rad);
      float n=smoothstep(.4,.9,uPhase);
      c+=vec3(1.,.62,.36)*n*(.30*exp(-pow(r-uR,2.)*.5)+.22*exp(-r*r*.12));
      vec3 hor=uPhase<.5?mix(vec3(.99,.95,.90),vec3(.99,.77,.6),uPhase*2.):mix(vec3(.99,.77,.6),vec3(.33,.18,.24),(uPhase-.5)*2.);
      c=mix(c,hor,smoothstep(9.,34.,r));
      gl_FragColor=vec4(c,mix(.74,1.,smoothstep(8.,14.,r)));
    }`
  }));
  floor.rotation.x = -Math.PI / 2; floor.renderOrder = 2;

  /* ---------- the ring of carts (one merged mesh, drawn twice: real + mirrored) ---------- */
  const SEG = 18, vpc = (SEG + 1) * 2;
  const aU = new Float32Array(N * vpc), aV = new Float32Array(N * vpc), aB = new Float32Array(N * vpc), aS = new Float32Array(N * vpc * 2), aI = new Float32Array(N * vpc);
  const idx = [];
  const cols = o.cols, rows = o.rows, sw = 1 / cols, sh = 1 / rows;
  for (let c = 0; c < N; c++) {
    const col = c % cols, row = Math.floor(c / cols);
    for (let s = 0; s <= SEG; s++) for (let t = 0; t < 2; t++) {
      const k = c * vpc + s * 2 + t;
      aU[k] = s / SEG - .5; aV[k] = t; aB[k] = c * STEP; aI[k] = c;
      aS[k * 2] = col * sw; aS[k * 2 + 1] = 1 - (row + 1) * sh;
    }
    for (let s = 0; s < SEG; s++) { const b = c * vpc + s * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
  }
  const cg = new BufferGeometry();
  cg.setAttribute('position', new BufferAttribute(new Float32Array(N * vpc * 3), 3));
  cg.setAttribute('aU', new BufferAttribute(aU, 1)); cg.setAttribute('aV', new BufferAttribute(aV, 1));
  cg.setAttribute('aB', new BufferAttribute(aB, 1)); cg.setAttribute('aS', new BufferAttribute(aS, 2)); cg.setAttribute('aI', new BufferAttribute(aI, 1));
  cg.setIndex(idx);
  cg.boundingSphere = { center: new Vector3(), radius: 30 }; // shader moves the vertices; never cull
  const tex = new CanvasTexture(document.createElement('canvas'));
  const cardVS = `uniform float uRot,uVel,uFlip,uR,uArc,uH,uY0;attribute float aU,aV,aB,aI;attribute vec2 aS;
    varying vec2 vUv,vS;varying float vF,vV,vD;
    void main(){
      float a=aB+uRot+aU*uArc+uVel*(aV-.5)*.32;
      float r=uR+min(abs(uVel),1.2)*.55*(.25-aU*aU);
      vec3 p=vec3(r*sin(a),uY0+aV*uH,r*cos(a));
      vec3 n=vec3(sin(a),0.,cos(a));
      vF=dot(n,normalize(cameraPosition-p));
      vD=cos(aB+uRot);
      if(uFlip<0.)p.y=-p.y;
      vUv=vec2(aU+.5,aV);vS=aS;vV=aV;
      gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
    }`;
  const cardFS = `uniform sampler2D uTex;uniform vec2 uSl;uniform float uPhase,uFlip,uAsp;varying vec2 vUv,vS;varying float vF,vV,vD;
    void main(){
      vec2 q=(vUv-.5)*vec2(uAsp,1.);vec2 b=vec2(uAsp,1.)*.5-.055;float d=length(max(abs(q)-b,0.))-.055;
      if(d>0.)discard;
      vec3 c;
      if(vF>0.){
        c=texture2D(uTex,vS+vUv*uSl).rgb;
        float e=smoothstep(-.016,-.010,d);c=mix(c,vec3(.86,.70,.42),e*.95);
        float lit=mix(.42,1.,smoothstep(-.2,.95,vD));
        float n=smoothstep(.45,1.,uPhase);
        c*=lit*mix(vec3(1.),vec3(1.,.84,.74),n*.55);
        c+=vec3(1.,.6,.3)*n*.10*(1.-vV)*lit;
      }else{
        float st=step(.5,fract(vUv.x*5.));c=mix(vec3(.95,.84,.80),vec3(.99,.95,.91),st)*mix(.92,.3,smoothstep(.3,1.,uPhase));
        vec3 hz=uPhase<.5?mix(vec3(.99,.95,.90),vec3(.99,.77,.6),uPhase*2.):mix(vec3(.99,.77,.6),vec3(.33,.18,.24),(uPhase-.5)*2.);c=mix(c,hz,.4);
      }
      if(uFlip<0.){
        vec3 fl=uPhase<.5?mix(vec3(.93,.86,.80),vec3(.80,.60,.56),uPhase*2.):mix(vec3(.80,.60,.56),vec3(.12,.08,.11),(uPhase-.5)*2.);
        c=mix(c*.9,fl,smoothstep(0.,.75,vV));
      }
      gl_FragColor=vec4(c,1.);
    }`;
  const mkCards = flip => new ShaderMaterial({
    side: DoubleSide, uniforms: { ...U, uTex: { value: tex }, uSl: { value: [sw, sh] }, uFlip: { value: flip }, uR: { value: R }, uArc: { value: ARC }, uH: { value: CH }, uY0: { value: Y0 }, uAsp: { value: 3 / 4 } },
    vertexShader: cardVS, fragmentShader: cardFS
  });
  const cardsM = mkCards(1), mirrorM = mkCards(-1);
  const cards = new Mesh(cg, cardsM), mirror = new Mesh(cg, mirrorM);
  cards.frustumCulled = mirror.frustumCulled = false;
  mirror.renderOrder = 1; cards.renderOrder = 4;
  scene.add(mirror); scene.add(floor); scene.add(cards);

  /* ---------- the kiosko: their scalloped canopy ---------- */
  const kiosko = new Group(); scene.add(kiosko);
  const KR = 2.15, KA = 4.75, KB = 3.7, KV = 0.36, GORES = 14;
  const kMat = (fs, extra) => new ShaderMaterial({
    side: DoubleSide, uniforms: { ...U, ...extra },
    vertexShader: `varying vec3 vP,vN;varying vec2 vUv;void main(){vP=position;vN=normalize(normalMatrix*normal);vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float uPhase;varying vec3 vP,vN;varying vec2 vUv;
      vec3 lightIt(vec3 base,vec3 n,float under){
        float p=uPhase;vec3 L=normalize(vec3(.4,.8,.6));
        float dif=max(dot(n,L),0.);vec3 sun=mix(vec3(1.,.97,.92),vec3(1.,.78,.6),smoothstep(.2,.6,p))*(1.-smoothstep(.55,.95,p));
        vec3 amb=mix(vec3(.62,.58,.6),vec3(.22,.16,.2),smoothstep(.4,1.,p));
        vec3 bulbs=vec3(1.,.66,.38)*smoothstep(.45,.95,p)*(.55+under*.9);
        return base*(amb+sun*dif*.65+bulbs*.6);
      }
      ${fs}`
  });
  { // cone roof
    const seg = 112, pos = [], uv = [], ind = [];
    for (let i = 0; i <= seg; i++) { const a = i / seg * TAU; pos.push(0, KA, 0, KR * Math.sin(a), KB, KR * Math.cos(a)); uv.push(i / seg, 1, i / seg, 0); }
    for (let i = 0; i < seg; i++) { const b = i * 2; ind.push(b, b + 1, b + 3, b, b + 3, b + 2); }
    const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2)); g.setIndex(ind); g.computeVertexNormals();
    kiosko.add(new Mesh(g, kMat(`void main(){
      float f=fract(vUv.x*${GORES}.);float rib=1.-smoothstep(.0,.035,min(f,1.-f));
      vec3 base=mix(vec3(.90,.62,.58),vec3(.98,.93,.88),step(.5,fract(vUv.x*${GORES / 2}.)));
      base=mix(base,vec3(.78,.50,.46),rib*.85);
      vec3 n=normalize(vN);float under=gl_FrontFacing?0.:1.;if(!gl_FrontFacing)n=-n;
      gl_FragColor=vec4(lightIt(base*(gl_FrontFacing?1.:.8),n,under),1.);}`)));
  }
  { // scalloped valance
    const seg = GORES * 14, pos = [], uv = [], ind = [];
    for (let i = 0; i <= seg; i++) {
      const a = i / seg * TAU, f = (i / seg * GORES) % 1, drop = KV * (.42 + .58 * Math.sqrt(Math.max(0, 1 - Math.pow(2 * f - 1, 2))));
      const x = KR * Math.sin(a), z = KR * Math.cos(a);
      pos.push(x, KB + .02, z, x * 1.002, KB - drop, z * 1.002); uv.push(i / seg, 1, i / seg, 0);
    }
    for (let i = 0; i < seg; i++) { const b = i * 2; ind.push(b, b + 1, b + 3, b, b + 3, b + 2); }
    const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2)); g.setIndex(ind); g.computeVertexNormals();
    kiosko.add(new Mesh(g, kMat(`void main(){
      vec3 base=vec3(.86,.56,.52);float trim=smoothstep(.16,.10,vUv.y);base=mix(base,vec3(.99,.95,.9),trim);
      vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
      gl_FragColor=vec4(lightIt(base,n,gl_FrontFacing?0.:1.),1.);}`)));
  }
  const gold = kMat(`void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float sp=pow(max(dot(reflect(-normalize(vec3(.2,.6,1.)),n),vec3(0.,0.,1.)),0.),12.);gl_FragColor=vec4(lightIt(vec3(.86,.68,.36),n,0.)+sp*.5,1.);}`);
  const fin = new Mesh(new SphereGeometry(.14, 20, 12), gold); fin.position.y = KA + .1; kiosko.add(fin);
  const pole = new Mesh(new CylinderGeometry(.055, .07, KA, 12), gold); pole.position.y = KA / 2; kiosko.add(pole);
  const counter = new Mesh(new CylinderGeometry(1.25, 1.25, 1.05, 48), kMat(`void main(){vec3 n=normalize(vN);float band=step(.86,vUv.y);gl_FragColor=vec4(lightIt(mix(vec3(.97,.94,.9),vec3(.86,.68,.36),band),n,0.),1.);}`));
  counter.position.y = .52; kiosko.add(counter);

  /* ---------- string lights + papel picado ---------- */
  const S = 12, APEX = new Vector3(0, KA - .05, 0);
  const strings = [];
  for (let k = 0; k < S; k++) {
    const a = Math.PI * .42 + (k + .5) / S * Math.PI * 1.16, end = new Vector3(Math.sin(a) * 9.5, 3.1, Math.cos(a) * 9.5);
    strings.push({ a, end, bulbs: k % 2 === 0 });
  }
  const cat = (s, t) => new Vector3().lerpVectors(APEX, s.end, t).add(new Vector3(0, -1.15 * 4 * t * (1 - t) * (s.bulbs ? 1 : 1.25), 0));
  const wire = [];
  strings.forEach(s => { for (let i = 0; i < 40; i++) { wire.push(...cat(s, i / 40).toArray(), ...cat(s, (i + 1) / 40).toArray()); } });
  const wg = new BufferGeometry(); wg.setAttribute('position', new BufferAttribute(new Float32Array(wire), 3));
  const wires = new LineSegments(wg, new LineBasicMaterial({ color: 0x4a3034, transparent: true, opacity: .55 }));
  scene.add(wires);
  const bp = [], bOn = [], bSeed = [];
  strings.filter(s => s.bulbs).forEach((s, si) => {
    for (let i = 1; i <= 15; i++) { const t = i / 16; bp.push(...cat(s, t).add(new Vector3(0, -.07, 0)).toArray()); bOn.push(.36 + t * .3 + si * .012); bSeed.push(Math.random()); }
  });
  const bg = new BufferGeometry();
  bg.setAttribute('position', new BufferAttribute(new Float32Array(bp), 3)); bg.setAttribute('aOn', new BufferAttribute(new Float32Array(bOn), 1)); bg.setAttribute('aSeed', new BufferAttribute(new Float32Array(bSeed), 1));
  const bulbVS = (sz) => `uniform float uPhase,uTime,uPx;attribute float aOn,aSeed;varying float vOn;
    void main(){vec4 mv=modelViewMatrix*vec4(position,1.);
      float on=smoothstep(aOn,aOn+.035,uPhase);
      float fl=uPhase>aOn&&uPhase<aOn+.05?step(.45,fract(sin(aSeed*91.7+floor(uTime*24.))*43758.5)):1.;
      vOn=on*fl*(.9+.1*sin(uTime*3.+aSeed*40.));
      gl_PointSize=min(${sz}*uPx/-mv.z,${sz}*90.);gl_Position=projectionMatrix*mv;}`;
  const cores = new Points(bg, new ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { ...U, uPx: { value: 1 } }, vertexShader: bulbVS('0.16'),
    fragmentShader: `varying float vOn;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;
      vec3 off=vec3(1.,.96,.9);vec3 on=vec3(1.,.93,.75);gl_FragColor=vec4(mix(off,on*1.15,vOn),smoothstep(.5,.38,r)*mix(.55,1.,vOn));}`
  }));
  const halos = new Points(bg, new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, uniforms: { ...U, uPx: { value: 1 } }, vertexShader: bulbVS('1.7'),
    fragmentShader: `varying float vOn;void main(){float r=length(gl_PointCoord-.5)*2.;float g=exp(-r*r*4.)*.85+exp(-r*r*26.)*.8;gl_FragColor=vec4(vec3(1.,.62,.32)*g*vOn,1.);}`
  }));
  cores.renderOrder = 6; halos.renderOrder = 7; cores.frustumCulled = halos.frustumCulled = false;
  scene.add(cores); scene.add(halos);

  // papel picado flags (cut paper drawn once, holes are transparent)
  const pc = document.createElement('canvas'); pc.width = 128; pc.height = 160; { const x = pc.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 140);
    for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(i * 16, 140); x.lineTo(i * 16 + 8, 158); x.lineTo(i * 16 + 16, 140); x.fill(); }
    x.globalCompositeOperation = 'destination-out';
    x.beginPath(); x.arc(64, 70, 22, 0, TAU); x.fill(); x.globalCompositeOperation = 'source-over'; x.beginPath(); x.arc(64, 70, 11, 0, TAU); x.fill();
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; x.beginPath(); x.ellipse(64 + Math.cos(a) * 36, 70 + Math.sin(a) * 36, 7, 4, a, 0, TAU); x.fill(); }
    for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(14 + i * 20, 14, 5, 0, TAU); x.fill(); x.beginPath(); x.arc(14 + i * 20, 124, 4, 0, TAU); x.fill(); }
    x.fillRect(0, 0, 128, 5);
  }
  const ptex = new CanvasTexture(pc);
  const flagPal = ['#e8a99d', '#d6b06a', '#f6e7dc', '#c47466', '#f1c9bf', '#b98a3e'].map(hex);
  const fl = [];
  strings.filter(s => !s.bulbs).forEach(s => { for (let i = 2; i <= 20; i += 1) fl.push({ s, t: i / 22 }); });
  const fgeo = new PlaneGeometry(.27, .34); fgeo.translate(0, -.17, 0);
  const flags = new InstancedMesh(fgeo, new ShaderMaterial({
    side: DoubleSide, transparent: true, uniforms: { ...U, uT: { value: ptex } },
    vertexShader: `uniform float uTime;attribute vec3 aCol;attribute float aPh;varying vec2 vUv;varying vec3 vC;varying float vSh;
      void main(){vUv=uv;vC=aCol;vec3 p=position;float w=sin(uTime*1.7+aPh)*.32+sin(uTime*3.1+aPh*2.)*.08;
        float c=cos(w),s=sin(w);p=vec3(p.x,p.y*c,p.y*s);p.z+=sin(uTime*2.3+aPh+p.x*4.)*.03*-p.y;vSh=.85+.15*c;
        gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform sampler2D uT;uniform float uPhase;varying vec2 vUv;varying vec3 vC;varying float vSh;
      void main(){float a=texture2D(uT,vUv).a;if(a<.5)discard;
        float n=smoothstep(.45,1.,uPhase);vec3 c=vC*vSh*mix(vec3(1.),vec3(.55,.42,.42),n)+vec3(1.,.55,.3)*n*.18;
        gl_FragColor=vec4(c,1.);}`
  }), fl.length);
  { const d = new Object3D(), col = new Float32Array(fl.length * 3), ph = new Float32Array(fl.length);
    fl.forEach((f, i) => {
      const p = cat(f.s, f.t), q = cat(f.s, f.t + .01);
      d.position.copy(p); const dir = q.sub(p).normalize(); d.rotation.set(0, Math.atan2(dir.x, dir.z) + Math.PI / 2, 0); d.updateMatrix(); flags.setMatrixAt(i, d.matrix);
      flagPal[i % flagPal.length].toArray(col, i * 3); ph[i] = i * .7 + Math.random();
    });
    fgeo.setAttribute('aCol', new InstancedBufferAttribute(col, 3)); fgeo.setAttribute('aPh', new InstancedBufferAttribute(ph, 1));
  }
  flags.frustumCulled = false; flags.renderOrder = 5; scene.add(flags);

  /* ---------- atlas + labels ---------- */
  let ready = false;
  const img = new Image(); img.decoding = 'async';
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const w = c.width / cols, h = c.height / rows;
    o.names.forEach((nm, i) => {
      const X = (i % cols) * w, Y = Math.floor(i / cols) * h;
      const g = x.createLinearGradient(0, Y + h * .58, 0, Y + h); g.addColorStop(0, 'rgba(40,18,20,0)'); g.addColorStop(1, 'rgba(40,18,20,.78)');
      x.fillStyle = g; x.fillRect(X, Y + h * .58, w, h * .42);
      x.fillStyle = '#fff6ee'; x.font = `italic 600 ${Math.round(h * .085)}px "Playfair Display", Georgia, serif`; x.textBaseline = 'alphabetic';
      let fs = h * .085; while (x.measureText(nm).width > w * .84 && fs > 10) { fs -= 1; x.font = `italic 600 ${Math.round(fs)}px "Playfair Display", Georgia, serif`; }
      x.fillText(nm, X + w * .08, Y + h * .9);
      x.font = `700 ${Math.round(h * .036)}px Karla, sans-serif`; x.fillStyle = 'rgba(255,246,238,.8)';
      x.fillText(String(i + 1).padStart(2, '0') + ' / ' + N, X + w * .08, Y + h * .9 - fs * 1.15);
    });
    tex.image = c; tex.minFilter = LinearMipmapLinearFilter; tex.magFilter = LinearFilter; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    tex.needsUpdate = true; ready = true; dirty = true; o.onReady && o.onReady();
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { img.src = o.atlas; });

  /* ---------- state, input, loop ---------- */
  let rot = 0, vel = 0, target = null, dragging = false, lastX = 0, lastT = 0, moved = 0, front = 0, settledFront = -1;
  let phase = .12, phaseT = .12, timePhase = .12, scrollP = 0, px = 0, py = 0, tpx = 0, tpy = 0, open = o.reduced ? 1 : 0;
  let timeTarget = .12, running = false, visible = true, raf = 0, dirty = true, t0 = performance.now(), last = t0, idleAuto = !o.reduced, autoT = 0;
  const w0 = { w: 0, h: 0, off: 0 };
  function size() {
    const r = canvas.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap, dprNow);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    const asp = w / h; camera.aspect = asp;
    // the scene sits in the lower part of the stage; the top is left for the headline
    const off = Math.round(h * view(asp).top);
    w0.w = w; w0.h = h; w0.off = off;
    const offx = Math.round(w * (view(asp).left || 0));
    camera.setViewOffset(w + offx * 2, h + off * 2, 0, 0, w, h);
    const V = view(); camera.fov = V.fov;
    camera.updateProjectionMatrix();
    cores.material.uniforms.uPx.value = halos.material.uniforms.uPx.value = (h + 2 * off) * dpr / (2 * Math.tan(camera.fov * Math.PI / 360));
    dirty = true;
  }
  const ro = new ResizeObserver(size); ro.observe(canvas);
  size();
  function view(a) { a = a || camera.aspect; const v = a < .8 ? { fov: 50, d: 13.4, y: 3.05, ly: 2.05, top: .08 } : a < 1.3 ? { fov: 40, d: 13.2, y: 3.05, ly: 2.05, top: .14 } : { fov: 26, d: 17.5, y: 3.0, ly: 2.15, top: .035, left: .17 };
    return Object.assign(v, (window.__plazaCam || {})[a < .8 ? 'p' : a < 1.3 ? 't' : 'd'] || {}); }
  function frontIndex(r) { return ((Math.round(-r / STEP) % N) + N) % N; }
  function goTo(i) { const cur = -rot / STEP; let k = Math.round(cur); const d = ((i - k) % N + N) % N; const dd = d > N / 2 ? d - N : d; target = -(k + dd) * STEP; idleAuto = false; dirty = true; wake(); }
  function onDown(e) { dragging = true; lastX = e.clientX; lastT = performance.now(); moved = 0; target = null; vel = 0; idleAuto = false; wake(); }
  function onMove(e) {
    if (e.pointerType === 'mouse' || !dragging) { const r = canvas.getBoundingClientRect(); tpx = (e.clientX - r.left) / r.width - .5; tpy = (e.clientY - r.top) / r.height - .5; wake(); }
    if (!dragging) return;
    const now = performance.now(), dx = e.clientX - lastX, k = 1.7 / canvas.clientWidth;
    rot += dx * k; moved += Math.abs(dx); vel = vel * .5 + (dx * k / Math.max(8, now - lastT)) * 16 * .5;
    lastX = e.clientX; lastT = now; dirty = true;
  }
  function onUp(e) {
    if (!dragging) return; dragging = false;
    if (moved < 6 && e && e.type === 'pointerup') { // tap: walk to the card that was tapped
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let best = -1, bd = 1e9;
      for (let i = 0; i < N; i++) {
        const a = i * STEP + rot; if (Math.cos(a) < .2) continue;
        const p = new Vector3(R * Math.sin(a), Y0 + CH * .5, R * Math.cos(a)).project(camera);
        const sx = (p.x * .5 + .5) * r.width, sy = (-p.y * .5 + .5) * r.height, d = Math.hypot(sx - x, sy - y);
        if (d < bd) { bd = d; best = i; }
      }
      if (best >= 0 && bd < r.width * .2) goTo(best);
    }
  }
  canvas.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', () => { dragging = false; });
  canvas.addEventListener('pointerleave', () => { tpx = 0; tpy = 0; });
  canvas.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); rot -= e.deltaX * .004; vel = -e.deltaX * .002; target = null; idleAuto = false; dirty = true; wake(); } }, { passive: false });

  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) wake(); }, { threshold: 0 });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  function wake() { if (!running && started && visible && !document.hidden) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); } }
  let started = false;
  const stats = window.__plazaStats = { n: 0, sum: 0, list: [], cpu: 0, rt: 0 };
  function tick(now) {
    if (!visible || document.hidden) { running = false; return; }
    const tS = performance.now();
    const dt = Math.min(50, now - last); last = now; const k = dt / 16.67;
    const t = (now - t0) / 1000;
    if (!o.reduced) U.uTime.value = t;
    // auto walk: one cart every 4.2 s until the visitor takes over
    if (idleAuto && !dragging) { autoT += dt; if (autoT > 4200) { autoT = 0; const nf = (frontIndex(rot) + 1) % N; goTo(nf); idleAuto = true; } }
    if (!dragging) {
      if (target === null) {
        rot += vel * k; vel *= Math.pow(.93, k);
        if (Math.abs(vel) < .004) { const i = frontIndex(rot); const cur = -rot / STEP; target = -Math.round(cur) * STEP; void i; }
      } else { const d = target - rot; rot += d * (1 - Math.pow(.88, k)); vel = d * .12; if (Math.abs(d) < .0004) { rot = target; vel = 0; } }
    }
    timePhase += (timeTarget - timePhase) * (1 - Math.pow(.985, k));
    phaseT = Math.max(timePhase, .12 + scrollP * 2); if (o.reduced) phaseT = Math.max(.5, .12 + scrollP * 2);
    phaseT = Math.min(1, phaseT);
    phase += (phaseT - phase) * (1 - Math.pow(.93, k));
    px += (tpx - px) * (1 - Math.pow(.94, k)); py += (tpy - py) * (1 - Math.pow(.94, k));
    open += ((started ? 1 : 0) - open) * (1 - Math.pow(.9, k));
    U.uPhase.value = phase; U.uRot.value = rot; U.uVel.value = Math.max(-1.6, Math.min(1.6, vel * 9));
    kiosko.rotation.y = rot * .35;
    const s = .55 + .45 * open; kiosko.scale.set(s, .8 + .2 * open, s);
    // camera: low and close on phones, wider on desktop; scroll cranes it up a little
    const V = view();
    camera.position.set(px * 1.4, V.y + scrollP * .7 - py * .5, V.d - scrollP * .8);
    camera.lookAt(0, V.ly + scrollP * .35, 0);
    const r0 = performance.now(); renderer.render(scene, camera); const r1 = performance.now();
    stats.cpu += r0 - tS; stats.rt += r1 - r0; stats.info = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, dpr: renderer.getPixelRatio() };
    // adaptive resolution: if frames run long, render fewer pixels (never below 1x)
    slow.push(dt); if (slow.length >= 90) { const m = slow.sort((a, b) => a - b)[45]; slow = []; const cur = renderer.getPixelRatio(); if (m > 24 && cur > 1) { dprNow = Math.max(1, cur - .25); size(); } }
    const f = frontIndex(rot); if (f !== front) { front = f; o.onFront && o.onFront(f, false); }
    const settled = !dragging && target !== null && Math.abs(target - rot) < .002;
    if (settled && settledFront !== f) { settledFront = f; o.onFront && o.onFront(f, true); }
    stats.n++; stats.sum += dt; if (stats.list.length < 2000) stats.list.push(dt);
    // keep running while there is motion; in reduced motion stop once still
    const still = o.reduced && !dragging && Math.abs(vel) < .0005 && (target === null || Math.abs(target - rot) < .0004) && Math.abs(phaseT - phase) < .002 && Math.abs(tpx - px) < .002;
    if (still) { running = false; return; }
    raf = requestAnimationFrame(tick);
  }
  return {
    start() { started = true; size(); wake(); },
    goTo, get front() { return front; }, get phase() { return phase; }, N,
    setScroll(p) { scrollP = Math.max(0, Math.min(1, p)); if (scrollP > .25) idleAuto = false; wake(); },
    stopAuto() { idleAuto = false; },
    setTime(p) { timeTarget = p; wake(); },
    renderOnce() { renderer.render(scene, camera); }
  };
}

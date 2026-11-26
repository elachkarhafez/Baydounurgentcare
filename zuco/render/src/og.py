"""Write render/og.html (the 1200x630 link card) and render/icon.html (512px home-screen icon) with the traced logo inline.
usage: /usr/bin/python3 -I og.py"""
import os, json
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(D)
logo = json.load(open(os.path.join(D, 'logo.json')))
allp = ' '.join(p['d'] for p in logo['parts']); mark = ' '.join(p['d'] for p in logo['parts'] if p['g'] == 'mark')
vb = ' '.join(map(str, logo['vb']))
og = '''<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bellefair&family=Amiri:wght@700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden;background:#0f0f0f}
body{position:relative;font-family:Bellefair,serif;color:#f8f8f8}
.cove{position:absolute;left:60px;right:520px;top:0;height:3px;background:linear-gradient(90deg,transparent,#f8f8f8 15%,#f8f8f8 85%,transparent);box-shadow:0 0 18px 3px rgba(223,232,255,.6)}
.spill{position:absolute;left:-120px;top:-180px;width:900px;height:700px;background:radial-gradient(closest-side,rgba(223,232,255,.12),transparent)}
.sign{position:absolute;left:70px;top:58px;width:300px}
.sign svg{width:100%;height:auto;display:block;overflow:visible}
h1{position:absolute;left:70px;top:290px;width:600px;font-weight:400;font-size:54px;line-height:1.08}
h1 em{font-style:normal;color:#e6c08d}
.ar{position:absolute;left:70px;top:418px;font:700 34px/1.2 Amiri,serif;color:#cf9f67;direction:rtl}
.loc{position:absolute;left:70px;bottom:52px;font-size:26px;color:#b3b3b0;letter-spacing:.02em}
.loc b{font-weight:400;color:#f8f8f8}
.ph{position:absolute;top:0;bottom:0;right:0;width:470px;overflow:hidden}
.ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 70%}
.ph:before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,#0f0f0f,rgba(15,15,15,0) 22%)}
.chip{position:absolute;right:300px;bottom:44px;width:210px;height:210px;border-radius:18px;overflow:hidden;box-shadow:0 0 0 1px #3a3a3b,0 20px 40px rgba(0,0,0,.6);z-index:2}
.chip img{width:100%;height:100%;object-fit:cover}
</style></head><body>
<div class="spill"></div><div class="cove"></div>
<div class="sign"><svg viewBox="@VB@"><defs><filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="22" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="@ALL@" fill="#fff" fill-rule="evenodd" filter="url(#g)"/></svg></div>
<h1>21k and 18k gold, diamonds and watches on <em>Ford Rd</em></h1>
<div class="ar">ذهب عيار ٢١ و١٨ · ألماس · ساعات</div>
<div class="loc"><b>Zu &amp; Co. Jewelry</b> · Dearborn Heights, MI · 313-722-4420</div>
<div class="ph"><img src="../media/set.webp"></div>
<div class="chip"><img src="../media/cuban.webp"></div>
</body></html>'''.replace('@VB@', vb).replace('@ALL@', allp)
open(os.path.join(R, 'og.html'), 'w').write(og)
icon = '''<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0}html,body{width:512px;height:512px;background:#0f0f0f;overflow:hidden}
svg{position:absolute;left:96px;top:96px;width:320px;height:320px;overflow:visible}</style></head><body>
<svg viewBox="308 0 556 556"><defs><filter id="g" x="-30%%" y="-30%%" width="160%%" height="160%%"><feGaussianBlur stdDeviation="16" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="%s" fill="#fff" filter="url(#g)"/></svg></body></html>''' % mark
open(os.path.join(R, 'icon.html'), 'w').write(icon)
print('ok')

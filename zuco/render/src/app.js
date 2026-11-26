(function(){
'use strict';
var html=document.documentElement;
function $(s,c){return(c||document).querySelector(s)}function $$(s,c){return[].slice.call((c||document).querySelectorAll(s))}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function store(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem(k)||'null');localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
var RM=false;try{RM=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
var PHONE='+13137224420',PHONE_T='313-722-4420',IG='zuco.jewelry';
var LOGO=/*__LOGO__*/null;

/* ================= copy, English and Arabic ================= */
var T={en:{
 skip:'Skip',nCase:'The case',nWeight:'Gold by weight',nCustom:'Custom',nVisit:'Visit',bagAria:'Your bag',close:'Close',
 signAria:'The Zu & Co sign. Tap to switch it off and on.',tapSign:'Tap the sign',tapOn:'Tap to turn it back on',
 h1:'21k and 18k gold, diamonds and watches in <em>Dearborn Heights</em>',
 sub:'Chains, bracelets, full 21k sets and pieces we make with your name. Come see them in person on Ford\u00a0Rd.',
 ctaCase:'Browse the case',setCap:'A 21k set on the stand in our case, from our reels',setAlt:'A 21k gold set on a white bust: a braided rope necklace that crosses into a tassel drop, with matching tassel earrings',
 caseH:"What's in the case",caseLede:"A look at what we carry. Weights and prices here are samples and the case changes every week, so reserve a piece and we'll have it out for you.",
 empty:'Nothing in the case matches that. Try another filter or call and ask.',
 caseNote:'Photos: the 21k set is from our reels. The other pieces are 3D studio renders of styles we carry, not photos of a specific piece.',
 cat_all:'All',cat_sets:'Sets',cat_chains:'Chains',cat_bracelets:'Bracelets',cat_bangles:'Bangles',cat_rings:'Rings',cat_diamonds:'Diamonds',cat_watches:'Watches',cat_custom:'Custom',
 k_any:'Any karat',k18:'18K',k21:'21K',c_any:'Any colour',c_yellow:'Yellow',c_white:'White',c_rose:'Rose',
 sampleW:'sample {g} g',goldV:'≈ {v} in gold',askStore:'Price in store',fromReels:'From our reels',render3d:'3D render',
 wH:"What's gold worth by weight?",wLede:"Pick the karat, set the grams and see what the gold in it is worth at the spot price. It's the metal only, so it isn't a price or an offer. Call us for today's price.",
 gramsLab:'Grams',lSpot:'Spot gold (24k), per ounce',lGram:'24k per gram',purity:'{k}K is {p}% gold',lWeight:'Weight',
 srcLive:'Live spot price from gold-api.com, updated {t}',srcBuild:'Spot price from gold-api.com when this page was built ({d}). Call for today’s price.',srcLoad:'Loading the spot price',
 wFine:'Gold value only. Pieces in the case sell by weight plus the work in them, and what we pay for your gold is set in the shop. Call 313-722-4420 for today’s price.',
 cH:'Made with your name',cLede:'Write a name in English or Arabic and see it in gold. We go over the design, weight and price with you before we make it.',
 prevHint:'Preview only. Your piece is drawn and made by hand.',nameLab:'Name (English or Arabic)',karatLab:'Karat',chainLab:'Chain',lenLab:'Length',sizeLab:'Ring size',
 t_necklace:'Name necklace',t_bracelet:'Name bracelet',t_ring:'Name ring',ch_box:'Box',ch_rope:'Rope',ch_cuban:'Cuban',cAdd:'Add to bag',cDefault:'Zainab',
 vH:'Come by the shop',vLede:"It's all in the glass cases at our showroom on Ford Rd. Reserve a piece and it'll be waiting on the counter.",
 roomCap:'Our showroom: black walls, glass cases and the light strip overhead',roomAlt:'The Zu & Co showroom with a black ceiling, a white LED light strip and glass display cases',
 ownerCap:'At the shop door, from our reels',ownerAlt:'At the Zu & Co shop door, from one of their reels',
 dir:'Directions',call:'Call',text:'Text us',hours:"Hours aren't posted online yet, so call before you come.",
 clH:'Come see it under the lights',clP:"Gold always looks better in person. Reserve what you like and we'll have it out of the case when you get here.",reserve:'Reserve a visit',
 footNote:'Pieces, weights and prices on this site are samples. Stock and prices are confirmed in the shop.',callAria:'Call 313-722-4420',
 bagH:'Your bag',bagEmpty:'Your bag is empty. Pick something from the case or make a piece with your name.',toCase:'Browse the case',
 bagN:'Bag · {n}',bagNone:'Your bag',goldTot:'Gold value in your bag (estimate)',cont:'Continue',back:'Back',
 karat:'Karat',length:'Length',size:'Size',weight:'Sample weight',gvToday:'Gold value now (estimate)',price:'Price',setInStore:'Set in the shop by weight and work',
 addBag:'Add to bag',reservePiece:'Reserve to see it',added:'Added to your bag',removed:'Removed',
 whyH:"What's it for?",whyView:'See it in store',whyViewS:'We hold the pieces for your visit',whyCustom:'Order custom',whyCustomS:'We call you to go over the design',
 yourName:'Your name',yourPhone:'Phone',needName:'Add your name so we know who to look for.',needPhone:'Add a phone number we can text (10 digits).',
 whenH:'When would you like to come?',timeM:'Morning',timeA:'Afternoon',timeE:'Evening',whenNote:"We'll text you to confirm the time, since hours change.",note:'Anything else? (optional)',
 reviewH:'Check it and send it to us',sendH:'Send it to Zu & Co',viaText:'Text it to 313-722-4420',viaCall:'Call 313-722-4420',viaIG:'Copy and DM @zuco.jewelry',
 copied:'Message copied. Paste it in the DM.',sentH:'Your message is ready',sentP:"Send it by text or paste it in the DM and we'll get back to you to confirm. Keep your reference handy.",newBag:'Start a new bag',
 msgHi:'Hi Zu & Co, this is {name}.',msgView:"I'd like to see these in store:",msgCustom:"I'd like to order a custom piece:",msgMix:"I'd like to see these and order a custom piece:",
 msgWhen:'Visit: {day}, {time}',msgPhone:'My number: {phone}',msgRef:'Ref {ref} (from your website)',msgNote:'Note: {note}',
 watchH:'Watches',watchSub:"Ask what's in today",watchDesc:"Our watches change too often to list. Text or call us with the brand or style you're after and we'll tell you what's in the case.",watchText:'Text about watches',watchMsg:'Hi Zu & Co, what watches do you have in the case right now?',
 nameCardSub:'In English or Arabic',nameCardGo:'Make yours',ring_size:'Size {s}',custom:'Custom',
 realNote:'Photo from our reels.',renderNote:'3D studio render of this style, not a photo of a specific piece. Weight and price are samples.',viewSheet:'View',langSwitched:'English',lineCustom:'{type}, "{name}", {k}K, {opt}'
},ar:{
 skip:'تخطي',nCase:'الفاترينة',nWeight:'الذهب بالوزن',nCustom:'تفصيل',nVisit:'زورونا',bagAria:'السلة',close:'إغلاق',
 signAria:'لافتة زو آند كو. اضغط لإطفائها وتشغيلها.',tapSign:'اضغط على اللافتة',tapOn:'اضغط لتشغيلها من جديد',
 h1:'ذهب عيار ٢١ و١٨، ألماس وساعات في <em>ديربورن هايتس</em>',
 sub:'سلاسل وأساور وأطقم ذهب عيار ٢١، وقطع نفصّلها على اسمك. تفضلوا شاهدوها على الطبيعة في شارع فورد.',
 ctaCase:'تصفّح الفاترينة',setCap:'طقم ذهب عيار ٢١ على الستاند في فاترينتنا، من الريلز',setAlt:'طقم ذهب عيار ٢١ على مجسم أبيض: عقد مجدول ينزل بشراشيب مع حلق بشراشيب',
 caseH:'من الفاترينة',caseLede:'نماذج مما نقدمه. الأوزان والأسعار هنا للتوضيح والمعروض يتغير كل أسبوع، احجز القطعة ونجهزها لك عند زيارتك.',
 empty:'لا توجد قطعة بهذا الاختيار. جرّب اختيارًا آخر أو اتصل واسأل.',
 caseNote:'الصور: طقم عيار ٢١ من الريلز الخاصة بنا، وباقي القطع صور ثلاثية الأبعاد لموديلات نبيعها، وليست صورًا لقطعة محددة.',
 cat_all:'الكل',cat_sets:'أطقم',cat_chains:'سلاسل',cat_bracelets:'أساور',cat_bangles:'بناجر',cat_rings:'خواتم',cat_diamonds:'ألماس',cat_watches:'ساعات',cat_custom:'تفصيل',
 k_any:'كل العيارات',k18:'عيار ١٨',k21:'عيار ٢١',c_any:'كل الألوان',c_yellow:'أصفر',c_white:'أبيض',c_rose:'وردي',
 sampleW:'وزن تقريبي {g} غ',goldV:'≈ {v} قيمة الذهب',askStore:'السعر في المحل',fromReels:'من الريلز',render3d:'صورة ثلاثية الأبعاد',
 wH:'كم يساوي الذهب بالوزن؟',wLede:'اختر العيار وحدد الغرامات لترى قيمة الذهب حسب سعر الأونصة. هذه قيمة المعدن فقط، وليست سعر بيع ولا عرض شراء. اتصل بنا لسعر اليوم.',
 gramsLab:'الغرامات',lSpot:'سعر أونصة الذهب (عيار ٢٤)',lGram:'غرام عيار ٢٤',purity:'عيار {k} نسبة الذهب فيه {p}%',lWeight:'الوزن',
 srcLive:'سعر مباشر من gold-api.com، آخر تحديث {t}',srcBuild:'سعر gold-api.com يوم بناء الموقع ({d}). اتصل لسعر اليوم.',srcLoad:'جارٍ تحميل سعر الذهب',
 wFine:'قيمة الذهب فقط. القطع تُباع بالوزن مع المصنعية، وسعر شراء ذهبك يُحدد في المحل. اتصل على \u2066313-722-4420\u2069 لسعر اليوم.',
 cH:'تفصيل على اسمك',cLede:'اكتب الاسم بالعربي أو بالإنجليزي وشاهده بالذهب. نراجع معك التصميم والوزن والسعر قبل التنفيذ.',
 prevHint:'معاينة فقط، القطعة تُرسم وتُنفذ يدويًا.',nameLab:'الاسم (عربي أو إنجليزي)',karatLab:'العيار',chainLab:'نوع السلسلة',lenLab:'الطول',sizeLab:'مقاس الخاتم',
 t_necklace:'سلسال اسم',t_bracelet:'اسوارة اسم',t_ring:'خاتم اسم',ch_box:'بوكس',ch_rope:'حبل',ch_cuban:'كوبي',cAdd:'أضف إلى السلة',cDefault:'زينب',
 vH:'زورونا في المحل',vLede:'كل القطع في فاترينات المعرض على شارع فورد. احجز القطعة وستكون بانتظارك على الكاونتر.',
 roomCap:'معرضنا: جدران سوداء وفاترينات زجاج وإضاءة في السقف',roomAlt:'معرض زو آند كو بسقف أسود وشريط إضاءة أبيض وفاترينات زجاج',
 ownerCap:'على باب المحل، من الريلز',ownerAlt:'على باب محل زو آند كو، من أحد الريلز',
 dir:'الاتجاهات',call:'اتصل',text:'أرسل رسالة',hours:'ساعات العمل غير منشورة بعد، اتصل قبل زيارتك.',
 clH:'تعال وشاهدها تحت الأضواء',clP:'الذهب أجمل على الطبيعة. احجز ما يعجبك ونخرجه لك من الفاترينة عند وصولك.',reserve:'احجز زيارة',
 footNote:'القطع والأوزان والأسعار في الموقع أمثلة. المتوفر والأسعار تُؤكد في المحل.',callAria:'اتصل على \u2066313-722-4420\u2069',
 bagH:'السلة',bagEmpty:'السلة فارغة. اختر قطعة من الفاترينة أو فصّل قطعة باسمك.',toCase:'تصفّح الفاترينة',
 bagN:'السلة · {n}',bagNone:'السلة',goldTot:'قيمة الذهب في سلتك (تقديرية)',cont:'متابعة',back:'رجوع',
 karat:'العيار',length:'الطول',size:'المقاس',weight:'الوزن التقريبي',gvToday:'قيمة الذهب الآن (تقديرية)',price:'السعر',setInStore:'يُحدد في المحل حسب الوزن والمصنعية',
 addBag:'أضف إلى السلة',reservePiece:'احجزها لتشاهدها',added:'أُضيفت إلى سلتك',removed:'أُزيلت',
 whyH:'ما الغرض؟',whyView:'مشاهدتها في المحل',whyViewS:'نحجز القطع لزيارتك',whyCustom:'طلب تفصيل',whyCustomS:'نتصل بك لنراجع التصميم',
 yourName:'الاسم',yourPhone:'رقم الهاتف',needName:'أضف اسمك لنعرف من ننتظر.',needPhone:'أضف رقمًا نستطيع مراسلته (١٠ أرقام).',
 whenH:'متى تحب أن تزورنا؟',timeM:'صباحًا',timeA:'بعد الظهر',timeE:'مساءً',whenNote:'سنراسلك لتأكيد الوقت لأن ساعات العمل تتغير.',note:'ملاحظة إضافية (اختياري)',
 reviewH:'راجع الطلب وأرسله لنا',sendH:'أرسله إلى زو آند كو',viaText:'أرسله برسالة إلى \u2066313-722-4420\u2069',viaCall:'اتصل على \u2066313-722-4420\u2069',viaIG:'انسخه وأرسله على إنستغرام',
 copied:'تم نسخ الرسالة. الصقها في المحادثة.',sentH:'رسالتك جاهزة',sentP:'أرسلها برسالة نصية أو الصقها في محادثة إنستغرام وسنتواصل معك للتأكيد. احتفظ برقم الحجز.',newBag:'ابدأ سلة جديدة',
 msgHi:'مرحبا زو آند كو، معك {name}.',msgView:'أريد مشاهدة هذه القطع في المحل:',msgCustom:'أريد طلب قطعة تفصيل:',msgMix:'أريد مشاهدة هذه القطع وطلب قطعة تفصيل:',
 msgWhen:'الزيارة: {day}، {time}',msgPhone:'رقمي: {phone}',msgRef:'رقم الحجز {ref} (من موقعكم)',msgNote:'ملاحظة: {note}',
 watchH:'ساعات',watchSub:'اسأل عن المتوفر اليوم',watchDesc:'الساعات عندنا تتغير بسرعة فلا نعرضها هنا. راسلنا أو اتصل بنا بالماركة أو الموديل الذي تبحث عنه ونخبرك بما في الفاترينة.',watchText:'راسلنا عن الساعات',watchMsg:'مرحبا زو آند كو، ما الساعات المتوفرة عندكم الآن؟',
 nameCardSub:'بالعربي أو بالإنجليزي',nameCardGo:'فصّل اسمك',ring_size:'مقاس {s}',custom:'تفصيل',
 realNote:'الصورة من الريلز الخاصة بنا.',renderNote:'صورة ثلاثية الأبعاد لهذا الموديل وليست صورة قطعة محددة. الوزن والسعر للتوضيح.',viewSheet:'عرض',langSwitched:'العربية',lineCustom:'{type}، «{name}»، عيار {k}، {opt}'
}};
var LANG=html.lang==='ar'?'ar':'en',AR=LANG==='ar';
function t(k,v){var s=(T[LANG][k]!=null?T[LANG][k]:T.en[k]);if(s==null)return k;if(v)s=s.replace(/\{(\w+)\}/g,function(m,a){return v[a]!=null?v[a]:m});return s}
function L(o){return o?(o[LANG]||o.en):''}
var AD='٠١٢٣٤٥٦٧٨٩';function arNum(n){return AR?String(n).replace(/\d/g,function(d){return AD[d]}):String(n)}
function money(n){return '$'+Math.round(n).toLocaleString('en-US')}
function applyStatic(){$$('[data-t]').forEach(function(el){el.textContent=t(el.dataset.t)});$$('[data-th]').forEach(function(el){el.innerHTML=t(el.dataset.th)});
  $$('[data-ta]').forEach(function(el){el.setAttribute('aria-label',t(el.dataset.ta))});$$('[data-talt]').forEach(function(el){el.alt=t(el.dataset.talt)});
  $$('.lang button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.l===LANG)})}

/* ================= toast, ripple, the gold bead that flies to the bag ================= */
var toastEl=$('#toast'),toastT=0;
function toast(msg){$('span',toastEl).textContent=msg;toastEl.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){toastEl.classList.remove('on')},2200)}
document.addEventListener('pointerdown',function(e){var b=e.target.closest('.btn,.chip,.seg button,.tabs button,.karat button,.choice button,.days button');if(!b||RM)return;
  var r=b.getBoundingClientRect(),s=Math.max(r.width,r.height),i=document.createElement('span');i.className='ripple';i.style.width=i.style.height=s+'px';i.style.left=(e.clientX-r.left-s/2)+'px';i.style.top=(e.clientY-r.top-s/2)+'px';
  if(getComputedStyle(b).position==='static')b.style.position='relative';b.style.overflow='hidden';b.appendChild(i);setTimeout(function(){i.remove()},650)});
function bagTarget(){var bar=$('#barBag');if(bar&&bar.offsetParent&&!$('#bar').classList.contains('hide'))return bar;return $('#bagbtn')}
function fly(from){var tgt=bagTarget(),a=from.getBoundingClientRect(),b=tgt.getBoundingClientRect();
  var bump=function(){$('#bagbtn').classList.remove('bump');void $('#bagbtn').offsetWidth;$('#bagbtn').classList.add('bump')};
  if(RM||!document.body.animate){bump();return}
  var d=document.createElement('div');d.className='fly';document.body.appendChild(d);
  var x0=a.left+a.width/2,y0=a.top+a.height/2,x1=b.left+b.width/2,y1=b.top+b.height/2,mx=(x0+x1)/2,my=Math.min(y0,y1)-120;
  d.animate([{transform:'translate('+x0+'px,'+y0+'px) scale(1)'},{transform:'translate('+mx+'px,'+my+'px) scale(1.6)',offset:.5},{transform:'translate('+x1+'px,'+y1+'px) scale(.4)'}],{duration:650,easing:'cubic-bezier(.4,0,.2,1)'}).onfinish=function(){d.remove();bump()};
  d.style.left='0';d.style.top='0'}

/* ================= the sign: their logo traced into parts, lit like an LED sign ================= */
var VB=LOGO.vb,FACETS=['f0','f1','f2','f3'],WORD=['Z','U','amp','C','O','dot'],ORDER=FACETS.concat(WORD);
var PART={};LOGO.parts.forEach(function(p){PART[p.id]=p});
var GLOW='#dfe8ff',CORE='#ffffff';
var VERT={f0:[586,20],f1:[328,278],f2:[844,278],f3:[586,536]}; // the diamond's four points, in logo units
function svgPart(p,cls,fill,pad,extra){var x=p.box[0]-pad,y=p.box[1]-pad,w=p.box[2]-p.box[0]+pad*2,h=p.box[3]-p.box[1]+pad*2;
  return '<svg class="'+cls+'" viewBox="'+x+' '+y+' '+w+' '+h+'" preserveAspectRatio="none" aria-hidden="true"><path d="'+p.d+'" fill="'+fill+'" fill-rule="evenodd"'+(extra||'')+'/></svg>'}
function allD(ids){return(ids||ORDER).map(function(id){return PART[id].d}).join(' ')}
function buildSign(el,opt){opt=opt||{};var pad=14,ids=opt.ids||ORDER,vb=opt.vb||VB;
  var h='<svg class="glass" viewBox="'+vb.join(' ')+'" aria-hidden="true"><path d="'+allD(ids)+'" fill-rule="evenodd"/></svg>';
  h+='<svg class="bloom" viewBox="'+vb.join(' ')+'" aria-hidden="true"><path d="'+allD(ids)+'" fill="'+GLOW+'" fill-rule="evenodd"/></svg>';
  ids.forEach(function(id){var p=PART[id],x=p.box[0]-pad,y=p.box[1]-pad,w=p.box[2]-p.box[0]+pad*2,hh=p.box[3]-p.box[1]+pad*2;
    h+='<div class="pt" data-p="'+id+'" style="left:'+((x-vb[0])/vb[2]*100)+'%;top:'+((y-vb[1])/vb[3]*100)+'%;width:'+(w/vb[2]*100)+'%;height:'+(hh/vb[3]*100)+'%">'
      +'<div class="lit">'+svgPart(p,'g1',GLOW,pad)+svgPart(p,'g0',GLOW,pad)+svgPart(p,'core',CORE,pad)+'</div>'
      +(opt.draw?svgPart(p,'dr','none',pad,' stroke="'+GLOW+'" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"'):'')+'</div>'});
  if(opt.sweep)h+='<div class="sweep"><b></b></div>';
  el.innerHTML=h;el.style.aspectRatio=vb[2]+'/'+vb[3];
  if(opt.sweep)$('.sweep',el).style.setProperty('--smask','url("data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+vb.join(' ')+'" preserveAspectRatio="none"><path d="'+allD(ids)+'" fill-rule="evenodd"/></svg>')+'")');
  function unit(){var r=el.getBoundingClientRect();if(r.width)el.style.setProperty('--u',(r.width/vb[2]*3).toFixed(3))}
  unit();addEventListener('resize',unit);
  return{el:el,vb:vb,part:function(id){return $('[data-p="'+id+'"]',el)},unit:unit}}
function glint(sign,id,big){if(RM||!sign.el.animate)return;var v=VERT[id],vb=sign.vb||VB,g=document.createElement('div');g.className='glint';g.innerHTML='<i></i><i></i><i></i>';
  g.style.left=((v[0]-vb[0])/vb[2]*100)+'%';g.style.top=((v[1]-vb[1])/vb[3]*100)+'%';if(big)g.style.width='26%';sign.el.appendChild(g);
  g.animate([{opacity:0,transform:'scale(.2) rotate(0deg)'},{opacity:1,transform:'scale(1.15) rotate(35deg)',offset:.35},{opacity:0,transform:'scale(.5) rotate(90deg)'}],{duration:big?900:700,easing:'cubic-bezier(.2,.7,.2,1)'}).onfinish=function(){g.remove()}}
// a static lit copy (nav, footer): one svg with a soft glow
function smallSign(el,ids,vb){var d=allD(ids);vb=vb||VB;el.innerHTML='<svg viewBox="'+vb.join(' ')+'" width="100%" height="100%" aria-hidden="true"><defs><filter id="sg'+el.id+'" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="'+d+'" fill="#fff" fill-rule="evenodd" filter="url(#sg'+el.id+')"/></svg>'}
smallSign($('#nsign'));smallSign($('#fsign'));

/* hero sign: tap it off and on, the pointer brightens the glow, the diamond glints now and then */
var hs=buildSign($('#hsign'),{sweep:1}),hsEl=hs.el,hint=$('#signhint'),hero=$('#hero'),powered=true,busy=false,actx=null;
function hum(on){try{actx=actx||new(window.AudioContext||window.webkitAudioContext)();var tt=actx.currentTime,o=actx.createOscillator(),g=actx.createGain(),f=actx.createBiquadFilter();
  o.type='triangle';o.frequency.value=on?880:440;f.type='lowpass';f.frequency.value=2400;g.gain.setValueAtTime(0,tt);g.gain.linearRampToValueAtTime(.035,tt+.01);
  for(var i=0;i<4;i++)g.gain.setValueAtTime(i%2?.008:.03,tt+.03+i*.03);g.gain.exponentialRampToValueAtTime(.0001,tt+(on?.5:.25));
  o.connect(f);f.connect(g);g.connect(actx.destination);o.start(tt);o.stop(tt+.55)}catch(e){}}
function flick(el,kf,d){if(!el||RM||!el.animate)return null;return el.animate(kf,{duration:d,easing:'steps(1,end)'})}
function hintText(){$('span',hint).textContent=t(powered?'tapSign':'tapOn')}
function setPower(on){if(busy)return;busy=true;powered=on;hsEl.setAttribute('aria-pressed',on);hint.classList.toggle('off',!on);hintText();hum(on);
  hero.style.setProperty('--pow',on?1:0);var lits=ORDER.map(function(id){return $('.lit',hs.part(id))});
  if(RM){hsEl.classList.toggle('off',!on);busy=false;return}
  if(on){hsEl.classList.remove('off');
    lits.forEach(function(l,i){l.style.opacity=0;setTimeout(function(){flick(l,[{opacity:0},{opacity:1,offset:.2},{opacity:.15,offset:.4},{opacity:.9,offset:.6},{opacity:.35,offset:.75},{opacity:1,offset:.9}],260);l.style.opacity=1;
      if(i<4)glint(hs,FACETS[i]);if(i===lits.length-1){busy=false;sweep(hs,.15)}},40+i*60)})}
  else{var sh=lits.slice().sort(function(){return Math.random()-.5});
    sh.forEach(function(l,i){setTimeout(function(){flick(l,[{opacity:1},{opacity:.2,offset:.3},{opacity:.8,offset:.5},{opacity:0,offset:.8}],180);l.style.opacity=0;if(i===sh.length-1){hsEl.classList.add('off');lits.forEach(function(x){x.style.opacity=''});busy=false}},i*30)})}}
function sweep(sign,delay){var b=$('.sweep b',sign.el);if(!b||RM||!b.animate)return;b.animate([{transform:'translateX(0)'},{transform:'translateX(380%)'}],{duration:900,delay:(delay||0)*1000,easing:'cubic-bezier(.45,0,.2,1)'})}
hsEl.addEventListener('click',function(){setPower(!powered)});
hsEl.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();setPower(!powered)}});
function heat(x,y){var r=hsEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,d=Math.hypot(x-cx,y-cy),h=Math.max(0,1-d/(Math.max(r.width,260)*1.5));
  hero.style.setProperty('--heat',h.toFixed(3));hsEl.style.setProperty('--heat',h.toFixed(3))}
hero.addEventListener('pointermove',function(e){heat(e.clientX,e.clientY)});
hero.addEventListener('pointerdown',function(e){heat(e.clientX,e.clientY)});
hero.addEventListener('pointerleave',function(){hero.style.setProperty('--heat',0);hsEl.style.setProperty('--heat',0)});
var heroVis=true;if('IntersectionObserver'in window)new IntersectionObserver(function(es){heroVis=es[0].isIntersecting}).observe(hero);
(function idle(){setTimeout(function(){if(powered&&!busy&&heroVis&&!document.hidden&&!html.classList.contains('js-intro')){
  var r=Math.random();if(r<.55)glint(hs,FACETS[Math.floor(Math.random()*4)],Math.random()<.3);
  else if(r<.8)sweep(hs,0);
  else{var id=WORD[Math.floor(Math.random()*WORD.length)];flick($('.lit',hs.part(id)),[{opacity:1},{opacity:.2,offset:.2},{opacity:1,offset:.35},{opacity:.5,offset:.6},{opacity:1,offset:.75}],380)}}
  idle()},2600+Math.random()*3400)})();
/* closer: the diamond alone, lit */
var cs=buildSign($('#csign'),{ids:FACETS,vb:[308,0,556,556]});
var cVis=false;if('IntersectionObserver'in window)new IntersectionObserver(function(es){cVis=es[0].isIntersecting;if(cVis){glint(cs,'f0',1)}},{threshold:.6}).observe(cs.el);
// glints on the closer mark are placed relative to its own crop
cs.el.addEventListener('click',function(){});

/* ================= the case: sample inventory ================= */
var ITEMS=[
 {id:'set21',cats:['sets'],k:[21],col:'yellow',img:'media/set.webp',pos:'50% 78%',real:1,name:{en:'21k gold set',ar:'طقم ذهب عيار ٢١'},sub:{en:'Necklace and earrings',ar:'عقد وحلق'},
  desc:{en:'A braided rope necklace that crosses into a long tassel drop, with tassel earrings to match. This is the set from our reels. Ask us for its weight and today’s price.',ar:'عقد مجدول يتقاطع وينزل بشراشيب طويلة، مع حلق بشراشيب مطابق. هذا الطقم من الريلز الخاصة بنا. اسألنا عن وزنه وسعره اليوم.'}},
 {id:'cuban',cats:['chains'],k:[21,18],col:'yellow',img:'media/cuban.webp',name:{en:'Cuban link chain',ar:'سلسال كوبي'},sub:{en:'Heavy, tight links',ar:'حلقات عريضة متلاصقة'},
  opt:{key:'length',vals:['20"','22"','24"'],def:1},w:{'20"':38,'22"':42,'24"':46},desc:{en:'Thick curb links that sit flat on the chest. Comes in 21k or 18k.',ar:'حلقات عريضة تجلس مسطحة على الصدر. متوفر عيار ٢١ أو ١٨.'}},
 {id:'rope',cats:['chains'],k:[18,21],col:'yellow',img:'media/rope.webp',name:{en:'Rope chain',ar:'سلسال حبل'},sub:{en:'Twisted and bright',ar:'مجدول ولمّاع'},
  opt:{key:'length',vals:['18"','20"','22"','24"'],def:1},w:{'18"':9,'20"':10,'22"':11,'24"':12},desc:{en:'A twisted rope that catches light from every side. Good on its own or with a pendant.',ar:'سلسال مجدول يلمع من كل الجهات. جميل وحده أو مع تعليقة.'}},
 {id:'bangles',cats:['bangles'],k:[21],col:'yellow',img:'media/bangles.webp',name:{en:'Diamond-cut bangles, set of 3',ar:'بناجر مخرطة، ٣ قطع'},sub:{en:'21k yellow gold',ar:'ذهب أصفر عيار ٢١'},
  opt:{key:'size',vals:['S','M','L'],def:1},w:{S:30,M:33,L:36},desc:{en:'Three bangles with a cut finish that sparkles when you move. Sold as a set.',ar:'ثلاث بناجر بنقشة مخرطة تلمع مع الحركة. تُباع كطقم.'}},
 {id:'rosebangles',cats:['bangles'],k:[18],col:'rose',img:'media/rosebangle.webp',name:{en:'Rose gold bangles, set of 3',ar:'بناجر ذهب وردي، ٣ قطع'},sub:{en:'18k rose gold',ar:'ذهب وردي عيار ١٨'},
  opt:{key:'size',vals:['S','M','L'],def:1},w:{S:22,M:24,L:26},desc:{en:'The same stack in 18k rose gold.',ar:'نفس الطقم بالذهب الوردي عيار ١٨.'}},
 {id:'ring',cats:['rings','diamonds'],k:[18],col:'yellow',img:'media/ring.webp',name:{en:'Solitaire diamond ring',ar:'خاتم سوليتير ألماس'},sub:{en:'18k gold, round diamond',ar:'ذهب عيار ١٨ مع ألماسة مدورة'},
  opt:{key:'size',vals:['5','6','7','8','9'],def:2},w:{'5':2.8,'6':3,'7':3.2,'8':3.4,'9':3.6},stone:1,desc:{en:'A round diamond on a four-prong head. Stone size and grade are picked with you in the shop.',ar:'ألماسة مدورة على أربعة مخالب. حجم الألماسة ودرجتها نختارهما معك في المحل.'}},
 {id:'tennis',cats:['bracelets','diamonds'],k:[18],col:'white',img:'media/tennis.webp',name:{en:'Diamond tennis bracelet',ar:'اسوارة تنس ألماس'},sub:{en:'18k white gold',ar:'ذهب أبيض عيار ١٨'},
  opt:{key:'length',vals:['6.5"','7"','7.5"'],def:1},w:{'6.5"':8,'7"':8.6,'7.5"':9.2},stone:1,desc:{en:'A line of round diamonds, each in its own setting. Total carat is picked with you in the shop.',ar:'صف من الألماس المدور، كل حجر في مكانه. نختار معك عدد القراريط في المحل.'}},
 {id:'cubanbr',cats:['bracelets'],k:[21,18],col:'yellow',img:'media/cuban-br.webp',name:{en:'Cuban link bracelet',ar:'اسوارة كوبي'},sub:{en:'Matches the chain',ar:'تناسب السلسال'},
  opt:{key:'length',vals:['7"','7.5"','8"'],def:1},w:{'7"':22,'7.5"':24,'8"':26},desc:{en:'The Cuban link in bracelet size, 21k or 18k.',ar:'الحلقات الكوبية بمقاس اسوارة، عيار ٢١ أو ١٨.'}},
 {id:'name',cats:['custom','chains'],k:[18,21],col:'yellow',name:{en:'Name necklace',ar:'سلسال اسم'},sub:{en:'In English or Arabic',ar:'بالعربي أو بالإنجليزي'},custom:1},
 {id:'watch',cats:['watches'],k:[],col:'',name:{en:'Watches',ar:'ساعات'},sub:{en:"Ask what's in today",ar:'اسأل عن المتوفر اليوم'},watch:1}
];
var BY={};ITEMS.forEach(function(it){BY[it.id]=it});
var SPOT={usd:3600.600098,at:'2026-11-26T05:46:47Z',live:false}; // gold-api.com XAU, fetched when this page was built
var PUR={18:.75,21:.875};
function perGram(k){return SPOT.usd/31.1034768*PUR[k]}
function goldVal(it,k,o){if(!it.w)return null;var g=it.w[o||it.opt.vals[it.opt.def]];return g*perGram(k)}
var F=store('zuF')||{cat:'all',k:'any',c:'any'};
var CATS=['all','sets','chains','bracelets','bangles','rings','diamonds','watches','custom'];
function chipsCat(){$('#fCat').innerHTML=CATS.map(function(c){return '<button class="chip" type="button" data-cat="'+c+'" aria-pressed="'+(F.cat===c)+'">'+esc(t('cat_'+c))+'</button>'}).join('')}
function chipsK(){var dots={yellow:'linear-gradient(135deg,#e6c08d,#b2834f)',white:'linear-gradient(135deg,#f8f8f8,#9a9a98)',rose:'linear-gradient(135deg,#f1b9a3,#b9715c)'};
  $('#fK').innerHTML=['any','18','21'].map(function(k){return '<button class="chip" type="button" data-k="'+k+'" aria-pressed="'+(F.k===k)+'">'+esc(t(k==='any'?'k_any':'k'+k))+'</button>'}).join('')
  +'<span style="flex:none;width:1px;background:var(--line2);margin:6px 2px"></span>'
  +['any','yellow','white','rose'].map(function(c){return '<button class="chip" type="button" data-c="'+c+'" aria-pressed="'+(F.c===c)+'">'+(c!=='any'?'<span class="dot" style="background:'+dots[c]+'"></span>':'')+esc(t('c_'+c))+'</button>'}).join('')}
function nameSVG(txt,small){var ar=/[؀-ۿ]/.test(txt);return '<svg viewBox="0 0 300 300" aria-hidden="true"><defs><linearGradient id="ng'+(small?'s':'')+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d29a"/><stop offset=".45" stop-color="#cf9f67"/><stop offset=".7" stop-color="#e6c08d"/><stop offset="1" stop-color="#84582e"/></linearGradient></defs>'
  +'<path d="M20 0 C 60 120, 90 150, 104 158 M280 0 C 240 120, 210 150, 196 158" stroke="url(#ng'+(small?'s':'')+')" stroke-width="3" stroke-dasharray="4 2" fill="none"/>'
  +'<text x="150" y="182" text-anchor="middle" font-family="'+(ar?'Aref Ruqaa':'Great Vibes')+'" font-weight="'+(ar?700:400)+'" font-size="'+(ar?64:72)+'" fill="url(#ng'+(small?'s':'')+')" stroke="#84582e" stroke-width=".6">'+esc(txt)+'</text></svg>'}
function card(it){var k=it.k.length?it.k[0]:null,tagTxt=it.watch?'':(k?(AR?'عيار '+arNum(k):k+'K'):''),v='';
  if(it.w){var o=it.opt.vals[it.opt.def];v='<div class="val"><span class="num">'+esc(t('goldV',{v:money(goldVal(it,k,o))}))+'</span><small class="num">'+esc(t('sampleW',{g:it.w[o]}))+'</small></div>'}
  else if(it.custom)v='<div class="val"><span>'+esc(t('nameCardGo'))+' →</span></div>';
  else if(it.watch)v='<div class="val"><span>'+esc(t('watchText'))+' →</span></div>';
  else v='<div class="val"><span>'+esc(t('askStore'))+'</span><small>'+esc(t('fromReels'))+'</small></div>';
  var shot=it.img?'<img src="'+it.img+'" alt="" loading="lazy" width="720" height="720"'+(it.pos?' style="object-position:'+it.pos+'"':'')+'>'
    :it.custom?nameSVG(t('cDefault'),1):'<svg viewBox="0 0 48 48" fill="none" stroke="#cf9f67" stroke-width="1.2"><circle cx="24" cy="24" r="10"/><path d="M24 17v7l4 3"/><path d="M19 14l1.5-7h7l1.5 7M19 34l1.5 7h7l1.5-7"/></svg>';
  return '<button class="piece'+(it.img?'':' text')+'" type="button" data-id="'+it.id+'"><div class="shot">'+shot+(tagTxt?'<span class="tag"><span>'+esc(tagTxt)+'</span></span>':'')+'</div>'
    +'<div class="meta"><h3>'+esc(L(it.name))+'</h3><div class="sub">'+esc(L(it.sub))+'</div>'+v+'</div></button>'}
function renderCase(){$('#shelf').innerHTML=ITEMS.map(card).join('');filter(true)}
function match(it){if(F.cat!=='all'&&it.cats.indexOf(F.cat)<0)return false;if(F.k!=='any'&&it.k.indexOf(+F.k)<0&&!it.watch)return false;if(F.k!=='any'&&it.watch)return false;if(F.c!=='any'&&it.col!==F.c&&!it.custom)return false;if(F.c!=='any'&&(it.watch))return false;return true}
function filter(first){var n=0;$$('.piece',$('#shelf')).forEach(function(el,i){var ok=match(BY[el.dataset.id]);el.classList.toggle('hide',!ok);if(ok){n++;if(!first&&!RM&&el.animate)el.animate([{opacity:0,transform:'translateY(12px) scale(.97)'},{opacity:1,transform:'none'}],{duration:420,delay:Math.min(n,6)*45,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'})}});
  $('#empty').classList.toggle('on',!n);$('#shelf').scrollLeft=0;dots();store('zuF',F)}
$('#fCat').addEventListener('click',function(e){var b=e.target.closest('[data-cat]');if(!b)return;F.cat=b.dataset.cat;$$('[data-cat]').forEach(function(x){x.setAttribute('aria-pressed',x===b)});filter()});
$('#fK').addEventListener('click',function(e){var b=e.target.closest('[data-k],[data-c]');if(!b)return;if(b.dataset.k){F.k=b.dataset.k;$$('#fK [data-k]').forEach(function(x){x.setAttribute('aria-pressed',x===b)})}else{F.c=b.dataset.c;$$('#fK [data-c]').forEach(function(x){x.setAttribute('aria-pressed',x===b)})}filter()});
var shelf=$('#shelf');
function dots(){var vis=$$('.piece:not(.hide)',shelf),n=vis.length;$('#dots').innerHTML=n>1?vis.map(function(_,i){return '<i'+(i?'':' class="on"')+'></i>'}).join(''):''}
shelf.addEventListener('scroll',function(){var vis=$$('.piece:not(.hide)',shelf);if(!vis.length)return;var w=vis[0].getBoundingClientRect().width+12,i=Math.round(Math.abs(shelf.scrollLeft)/w);$$('#dots i').forEach(function(d,j){d.classList.toggle('on',j===Math.min(i,vis.length-1))})},{passive:true});
shelf.addEventListener('click',function(e){var b=e.target.closest('.piece');if(!b)return;var it=BY[b.dataset.id];
  if(it.custom){document.getElementById('custom').scrollIntoView({behavior:RM?'auto':'smooth'});setTimeout(function(){$('#cname').focus({preventScroll:true})},700);return}
  openSheet(it,b)});

/* ================= sheet: a piece out of the case ================= */
var sheet=$('#sheet'),scrim=$('#scrim'),SH=null,lastFocus=null;
function lockModal(on){html.style.overflow=on?'hidden':''}
function openSheet(it,from){lastFocus=from||document.activeElement;SH={it:it,k:it.k[0],o:it.opt?it.opt.vals[it.opt.def]:null};renderSheet();sheet.classList.add('on');scrim.classList.add('on');lockModal(true);updBar();setTimeout(function(){var x=$('.x',sheet);x&&x.focus({preventScroll:true})},60)}
function closeSheet(){if(!SH)return;sheet.classList.remove('on');scrim.classList.remove('on');SH=null;lockModal(!!DW);updBar();lastFocus&&lastFocus.focus&&lastFocus.focus({preventScroll:true})}
function renderSheet(){var it=SH.it,h='<div class="grab"></div><button class="x" type="button" aria-label="'+esc(t('close'))+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg></button><div class="inner">';
  if(it.watch){h+='<div class="big" style="display:grid;place-items:center;aspect-ratio:4/3"><svg viewBox="0 0 48 48" width="40%" fill="none" stroke="#cf9f67" stroke-width="1.1"><circle cx="24" cy="24" r="10"/><path d="M24 17v7l4 3"/><path d="M19 14l1.5-7h7l1.5 7M19 34l1.5 7h7l1.5-7"/></svg></div>'
    +'<div class="body"><h3 id="shTitle">'+esc(t('watchH'))+'</h3><p class="desc">'+esc(t('watchDesc'))+'</p><div class="acts"><a class="btn gold" href="sms:'+PHONE+'?&body='+encodeURIComponent(t('watchMsg'))+'">'+esc(t('watchText'))+'</a><a class="btn line" href="tel:'+PHONE+'">'+esc(t('call'))+'</a></div></div></div>';sheet.innerHTML=h;return}
  h+='<div class="big"><img src="'+it.img+'" alt="'+esc(L(it.name))+'"'+(it.pos?' style="object-position:'+it.pos+'"':'')+'></div><div class="body"><h3 id="shTitle">'+esc(L(it.name))+'</h3><p class="desc">'+esc(L(it.desc))+'</p>';
  h+='<div class="opt"><div class="lab"><span>'+esc(t('karat'))+'</span></div><div class="seg" data-s="k">'+it.k.map(function(k){return '<button type="button" data-v="'+k+'" aria-pressed="'+(SH.k===k)+'">'+esc(AR?'عيار '+arNum(k):k+'K')+'</button>'}).join('')+'</div></div>';
  if(it.opt)h+='<div class="opt"><div class="lab"><span>'+esc(t(it.opt.key))+'</span></div><div class="seg num" data-s="o">'+it.opt.vals.map(function(v){return '<button type="button" data-v="'+esc(v)+'" aria-pressed="'+(SH.o===v)+'">'+esc(v)+'</button>'}).join('')+'</div></div>';
  h+='<dl class="facts">';if(it.w)h+='<div><dt>'+esc(t('weight'))+'</dt><dd class="num" id="shW">'+it.w[SH.o]+' g</dd></div><div class="gv"><dt>'+esc(t('gvToday'))+'</dt><dd class="num" id="shV">'+money(goldVal(it,SH.k,SH.o))+'</dd></div>';
  h+='<div><dt>'+esc(t('price'))+'</dt><dd>'+esc(t('setInStore'))+'</dd></div></dl>';
  h+='<p class="fine">'+esc(t(it.real?'realNote':'renderNote'))+'</p>';
  h+='<div class="acts"><button class="btn line" type="button" data-act="add">'+esc(t('addBag'))+'</button><button class="btn gold" type="button" data-act="res">'+esc(t('reservePiece'))+'</button></div></div></div>';
  sheet.innerHTML=h}
sheet.addEventListener('click',function(e){if(e.target.closest('.x')){closeSheet();return}
  var b=e.target.closest('.seg button');if(b){var s=b.parentNode.dataset.s;if(s==='k')SH.k=+b.dataset.v;else SH.o=b.dataset.v;$$('button',b.parentNode).forEach(function(x){x.setAttribute('aria-pressed',x===b)});
    var it=SH.it;if(it.w){$('#shW').textContent=it.w[SH.o]+' g';countTo($('#shV'),goldVal(it,SH.k,SH.o))}return}
  var a=e.target.closest('[data-act]');if(!a)return;addPiece(SH.it,SH.k,SH.o,a);if(a.dataset.act==='res'){closeSheet();openDrawer(1)}else{setTimeout(closeSheet,350)}});
scrim.addEventListener('click',function(){closeSheet();closeDrawer()});
addEventListener('keydown',function(e){if(e.key==='Escape'){closeSheet();closeDrawer()}});
function countTo(el,to){if(!el)return;var from=parseFloat((el.textContent||'').replace(/[^\d.]/g,''))||0;if(RM){el.textContent=money(to);return}var t0=performance.now();
  (function f(now){var p=Math.min(1,(now-t0)/450),e=1-Math.pow(1-p,3);el.textContent=money(from+(to-from)*e);if(p<1)requestAnimationFrame(f)})(t0)}

/* ================= gold by weight ================= */
var W={k:21,g:20};var grams=$('#grams'),pan=$('#pan'),pg=$('#pangold');
$('#presets').innerHTML=[5,10,20,50,100].map(function(g){return '<button type="button" class="num" data-g="'+g+'">'+g+' g</button>'}).join('');
function wUpd(anim){var g=W.g,k=W.k,pgm=SPOT.usd/31.1034768,v=g*perGram(k);
  $('#lcdG').textContent=g.toFixed(1)+' g';$('#lcdK').textContent=k+'K';
  grams.style.setProperty('--p',((g-1)/199*100)+'%');
  pg.style.setProperty('--s',(.45+Math.min(1,Math.sqrt(g/200))*.62).toFixed(3));pan.style.transform='translateY('+(Math.min(1,g/200)*7).toFixed(1)+'px)';
  $('#lSpot').textContent='$'+SPOT.usd.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  $('#lGram').textContent='$'+pgm.toFixed(2);$('#lPurLab').textContent=t('purity',{k:AR?arNum(k):k,p:AR?arNum(PUR[k]*100):PUR[k]*100});$('#lPur').textContent='$'+perGram(k).toFixed(2)+' / g';
  $('#lW').textContent='× '+g.toFixed(1)+' g';
  if(anim)countTo($('#gv'),v);else $('#gv').textContent=money(v)}
function srcUpd(){var s=$('#src');s.classList.toggle('live',SPOT.live);var d=new Date(SPOT.at);
  $('#srcT').textContent=SPOT.live?t('srcLive',{t:d.toLocaleTimeString(AR?'ar':'en-US',{hour:'numeric',minute:'2-digit'})}):t('srcBuild',{d:d.toLocaleDateString(AR?'ar':'en-US',{month:'short',day:'numeric',year:'numeric'})})}
grams.addEventListener('input',function(){W.g=+grams.value;wUpd(false)});
grams.addEventListener('change',function(){W.g=+grams.value;wUpd(true)});
$('#presets').addEventListener('click',function(e){var b=e.target.closest('[data-g]');if(!b)return;W.g=+b.dataset.g;grams.value=W.g;wUpd(true)});
$$('.karat button').forEach(function(b){b.addEventListener('click',function(){W.k=+b.dataset.k;$$('.karat button').forEach(function(x){x.setAttribute('aria-pressed',x===b)});wUpd(true);
  if(!RM&&pg.animate)pg.animate([{filter:'brightness(1)'},{filter:'brightness(1.6)'},{filter:'brightness(1)'}],{duration:500})})});
(function fetchSpot(){if(!window.fetch)return;var ctl=window.AbortController?new AbortController():null,tm=setTimeout(function(){ctl&&ctl.abort()},6000);
  fetch('https://api.gold-api.com/price/XAU',{signal:ctl&&ctl.signal}).then(function(r){return r.json()}).then(function(j){clearTimeout(tm);if(j&&j.price>500&&j.price<20000){SPOT.usd=j.price;SPOT.at=j.updatedAt||new Date().toISOString();SPOT.live=true;wUpd(true);srcUpd();renderCase();if(SH)renderSheet();renderBag()}}).catch(function(){clearTimeout(tm)})})();

/* ================= custom piece builder ================= */
var C=store('zuC')||{type:'necklace',name:'',k:21,chain:'rope',len:'18"',size:'7'};
var SIZES={necklace:['16"','18"','20"','22"'],bracelet:['6.5"','7"','7.5"'],ring:['5','6','7','8','9','10']};
var GRAD={21:['#f3d29a','#e6c08d','#cf9f67','#84582e'],18:['#f6e2bd','#ead2a8','#d8b07c','#9a7040']};
function cName(){return(C.name||'').trim()||t('cDefault')}
function cControls(){$('#cType').innerHTML=['necklace','bracelet','ring'].map(function(x){return '<button type="button" data-v="'+x+'" aria-pressed="'+(C.type===x)+'">'+esc(t('t_'+x))+'</button>'}).join('');
  $('#cK').innerHTML=[18,21].map(function(k){return '<button type="button" data-v="'+k+'" aria-pressed="'+(C.k===k)+'">'+esc(AR?'عيار '+arNum(k):k+'K')+'</button>'}).join('');
  $('#cChain').innerHTML=['box','rope','cuban'].map(function(c){return '<button type="button" data-v="'+c+'" aria-pressed="'+(C.chain===c)+'">'+esc(t('ch_'+c))+'</button>'}).join('');
  $('#cChainRow').style.display=C.type==='ring'?'none':'';
  var list=SIZES[C.type],cur=C.type==='ring'?C.size:C.len;if(list.indexOf(cur)<0){cur=list[1];if(C.type==='ring')C.size=cur;else C.len=cur}
  $('#cSizeLab').textContent=t(C.type==='ring'?'sizeLab':'lenLab');
  $('#cSize').innerHTML=list.map(function(v){return '<button type="button" class="num" data-v="'+esc(v)+'" aria-pressed="'+(v===cur)+'">'+esc(v)+'</button>'}).join('');
  $('#ctry').innerHTML=(AR?['زينب','علي','مريم','حسين','Sara']:['Zainab','Ali','Maryam','زينب','حسين']).map(function(n){return '<button type="button" class="'+(/[؀-ۿ]/.test(n)?'ar':'')+'">'+esc(n)+'</button>'}).join('');
  $('#cname').placeholder=t('cDefault');$('#cname').value=C.name;$('#ccount').textContent=(C.name||'').length+'/12'}
function chainStroke(id){var s={box:'stroke-width="3.2" stroke-dasharray="3.2 1.6" stroke-linecap="butt"',rope:'stroke-width="3.6" stroke-dasharray="2.6 1" stroke-linecap="round"',cuban:'stroke-width="5" stroke-dasharray="4.6 1.4" stroke-linecap="round"'}[C.chain];return 'stroke="url(#'+id+')" fill="none" '+s}
function drawPreview(pop){var svg=$('#prev'),nm=cName(),ar=/[؀-ۿ]/.test(nm),g=GRAD[C.k];
  var defs='<defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+g[0]+'"/><stop offset=".38" stop-color="'+g[1]+'"/><stop offset=".62" stop-color="'+g[2]+'"/><stop offset="1" stop-color="'+g[3]+'"/></linearGradient>'
    +'<linearGradient id="pc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+g[3]+'"/><stop offset=".5" stop-color="'+g[1]+'"/><stop offset="1" stop-color="'+g[2]+'"/></linearGradient>'
    +'<linearGradient id="ps" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
    +'<filter id="psh" x="-20%" y="-40%" width="140%" height="180%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#000" flood-opacity=".7"/></filter>'
    +'<radialGradient id="pool" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#2a2a2e" stop-opacity=".9"/><stop offset="1" stop-color="#0b0b0c" stop-opacity="0"/></radialGradient></defs>';
  var fam=ar?'Aref Ruqaa':'Great Vibes',fw=ar?700:400,fs=ar?62:70,ty=C.type==='ring'?150:178;
  svg.innerHTML=defs+'<ellipse cx="200" cy="190" rx="190" ry="90" fill="url(#pool)"/><g id="chain"></g><g filter="url(#psh)"><text id="pt" x="200" y="'+ty+'" text-anchor="middle" font-family="'+fam+'" font-weight="'+fw+'" font-size="'+fs+'" fill="url(#pg)" stroke="'+g[3]+'" stroke-width=".8" paint-order="stroke">'+esc(nm)+'</text></g>'
    +'<clipPath id="pclip"><text x="200" y="'+ty+'" text-anchor="middle" font-family="'+fam+'" font-weight="'+fw+'" font-size="'+fs+'">'+esc(nm)+'</text></clipPath><g clip-path="url(#pclip)"><rect class="shine" x="120" y="60" width="160" height="160" fill="url(#ps)" opacity=".55"/></g>';
  var tx=$('#pt'),bb;try{bb=tx.getBBox()}catch(e){bb={x:120,y:130,width:160,height:60}}
  var maxW=C.type==='ring'?170:270;if(bb.width>maxW){var sc=maxW/bb.width;fs=Math.floor(fs*sc);tx.setAttribute('font-size',fs);$('#pclip text').setAttribute('font-size',fs);bb=tx.getBBox()}
  var l=bb.x+4,r=bb.x+bb.width-4,cy=bb.y+bb.height*.55,ch='';
  if(C.type==='necklace')ch='<path d="M30 -5 C 70 110, '+(l-40)+' '+(cy-6)+', '+l+' '+cy+'" '+chainStroke('pc')+'/><path d="M370 -5 C 330 110, '+(r+40)+' '+(cy-6)+', '+r+' '+cy+'" '+chainStroke('pc')+'/><circle cx="'+l+'" cy="'+cy+'" r="3.4" fill="url(#pg)"/><circle cx="'+r+'" cy="'+cy+'" r="3.4" fill="url(#pg)"/>';
  else if(C.type==='bracelet')ch='<path d="M-10 '+(cy+16)+' C 60 '+(cy+30)+', '+(l-40)+' '+(cy+4)+', '+l+' '+cy+'" '+chainStroke('pc')+'/><path d="M410 '+(cy+16)+' C 340 '+(cy+30)+', '+(r+40)+' '+(cy+4)+', '+r+' '+cy+'" '+chainStroke('pc')+'/><circle cx="'+l+'" cy="'+cy+'" r="3.4" fill="url(#pg)"/><circle cx="'+r+'" cy="'+cy+'" r="3.4" fill="url(#pg)"/>';
  else ch='<ellipse cx="200" cy="196" rx="118" ry="46" fill="none" stroke="'+g[3]+'" stroke-width="15"/><path d="M82 196 A118 46 0 0 0 318 196" fill="none" stroke="url(#pg)" stroke-width="14"/><path d="M86 202 A116 44 0 0 0 314 202" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>'
    +'<rect x="'+(bb.x-14)+'" y="'+(bb.y-4)+'" width="'+(bb.width+28)+'" height="'+(bb.height+8)+'" rx="14" fill="#1a1208" stroke="url(#pg)" stroke-width="3" opacity=".92"/>';
  $('#chain').innerHTML=ch;
  if(pop&&!RM&&svg.animate){$('#pt').animate([{opacity:.3,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:380,easing:'cubic-bezier(.2,.7,.2,1)'})}
  store('zuC',C)}
cControls();
$('#cType').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;C.type=b.dataset.v;cControls();drawPreview(1)});
$('#cK').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;C.k=+b.dataset.v;cControls();drawPreview(1)});
$('#cChain').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;C.chain=b.dataset.v;cControls();drawPreview(1)});
$('#cSize').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;if(C.type==='ring')C.size=b.dataset.v;else C.len=b.dataset.v;cControls();drawPreview()});
$('#ctry').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;C.name=b.textContent;cControls();drawPreview(1)});
var nameT=0;$('#cname').addEventListener('input',function(e){C.name=e.target.value.replace(/[<>{}]/g,'').slice(0,12);$('#ccount').textContent=C.name.length+'/12';clearTimeout(nameT);nameT=setTimeout(function(){drawPreview()},60)});
$('#cAdd').addEventListener('click',function(e){var it={uid:Date.now().toString(36),custom:1,type:C.type,name:cName(),k:C.k,chain:C.type==='ring'?null:C.chain,opt:C.type==='ring'?C.size:C.len};BAG.push(it);saveBag();fly(e.currentTarget);toast(t('added'))});
if(document.fonts&&document.fonts.load){Promise.all([document.fonts.load('400 40px "Great Vibes"'),document.fonts.load('700 40px "Aref Ruqaa"')]).then(function(){drawPreview()},function(){drawPreview()})}
drawPreview();

/* ================= bag + reserve flow ================= */
var BAG=store('zuBag')||[],DW=false,STEP=0;
var CK=Object.assign({why:'view',name:'',phone:'',day:'',time:'A',note:'',ref:''},store('zuCk')||{});
function saveBag(){store('zuBag',BAG);updBag()}
function addPiece(it,k,o,from){BAG.push({uid:Date.now().toString(36)+Math.random().toString(36).slice(2,5),id:it.id,k:k,opt:o});saveBag();fly(from);toast(t('added'))}
function lineTitle(b){if(b.custom)return t('t_'+b.type)+' · '+b.name;return L(BY[b.id].name)}
function lineSub(b){var k=AR?'عيار '+arNum(b.k):b.k+'K';if(b.custom)return k+(b.chain?' · '+t('ch_'+b.chain):'')+' · '+(b.type==='ring'?t('ring_size',{s:b.opt}):b.opt);
  var it=BY[b.id];return k+(b.opt?' · '+b.opt:'')+(it.w?' · '+it.w[b.opt]+(AR?' غ':' g'):'')}
function lineVal(b){if(b.custom||!BY[b.id].w)return null;return goldVal(BY[b.id],b.k,b.opt)}
function total(){return BAG.reduce(function(s,b){return s+(lineVal(b)||0)},0)}
function updBag(){var n=BAG.length,bn=$('#bagn');bn.textContent=n;bn.classList.toggle('on',n>0);$('#barBag').innerHTML=n?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" width="18" height="18"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 016 0V8"/></svg>'+esc(t('bagN',{n:n})):esc(t('bagNone'));if(DW&&STEP===0)renderBag()}
var drawer=$('#drawer');
function openDrawer(step){DW=true;STEP=step&&BAG.length?step:0;renderBag();drawer.classList.add('on');scrim.classList.add('on');lockModal(true);updBar();setTimeout(function(){$('#dwX').focus({preventScroll:true})},60)}
function closeDrawer(){if(!DW)return;DW=false;drawer.classList.remove('on');if(!SH)scrim.classList.remove('on');lockModal(!!SH);updBar()}
$('#bagbtn').addEventListener('click',function(){openDrawer(0)});$('#dwX').addEventListener('click',closeDrawer);
$$('[data-open=bag]').forEach(function(b){b.addEventListener('click',function(){openDrawer(BAG.length&&b.id!=='barBag'?1:0)})});
function thumb(b){if(b.custom)return nameSVG(b.name,1);var it=BY[b.id];return it.img?'<img src="'+it.img+'" alt="">':''}
function dayList(){var out=[],d=new Date();for(var i=0;i<8;i++){var x=new Date(d.getFullYear(),d.getMonth(),d.getDate()+i);out.push(x)}return out}
function dayKey(x){return x.getFullYear()+'-'+(x.getMonth()+1)+'-'+x.getDate()}
function dayLabel(key){var p=key.split('-'),x=new Date(+p[0],+p[1]-1,+p[2]);return x.toLocaleDateString(AR?'ar':'en-US',{weekday:'long',month:'short',day:'numeric'})}
function hasCustom(){return BAG.some(function(b){return b.custom})}function hasPieces(){return BAG.some(function(b){return!b.custom})}
function message(){var lines=[t('msgHi',{name:CK.name.trim()})];lines.push(hasCustom()&&hasPieces()?t('msgMix'):hasCustom()&&CK.why==='custom'?t('msgCustom'):CK.why==='custom'?t('msgCustom'):t('msgView'));
  BAG.forEach(function(b){lines.push('- '+lineTitle(b)+' ('+lineSub(b)+')')});
  if(CK.day)lines.push(t('msgWhen',{day:dayLabel(CK.day),time:t('time'+CK.time)}));lines.push(t('msgPhone',{phone:AR?'\u2066'+CK.phone+'\u2069':CK.phone}));if(CK.note.trim())lines.push(t('msgNote',{note:CK.note.trim()}));lines.push(t('msgRef',{ref:CK.ref}));return lines.join('\n')}
function steps(){$$('#steps i').forEach(function(s,i){s.classList.toggle('on',i<=Math.min(STEP,3))})}
function renderBag(){var inn=$('#dwIn'),ft=$('#dwFoot'),h='';steps();store('zuCk',CK);
  if(STEP===0){if(!BAG.length){inn.innerHTML='<div class="bagempty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 016 0V8"/></svg><p>'+esc(t('bagEmpty'))+'</p></div>';ft.innerHTML='<a class="btn line" href="#case" id="toCase">'+esc(t('toCase'))+'</a>';$('#toCase').addEventListener('click',closeDrawer);return}
    h=BAG.map(function(b){var v=lineVal(b);return '<div class="bline" data-uid="'+b.uid+'"><div class="th">'+thumb(b)+'</div><div><b>'+esc(lineTitle(b))+'</b><small class="num">'+esc(lineSub(b))+'</small>'+(v?'<small class="num" style="color:var(--goldlit)">'+esc(t('goldV',{v:money(v)}))+'</small>':'')+'</div><button class="rm" type="button" aria-label="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'}).join('');
    inn.innerHTML=h;var tot=total();ft.innerHTML=(tot?'<div class="tot"><span>'+esc(t('goldTot'))+'</span><span class="num" style="color:var(--goldlit)">'+money(tot)+'</span></div>':'')+'<button class="btn gold" type="button" data-go="1">'+esc(t('cont'))+'</button>';return}
  if(STEP===1){if(hasCustom()&&!hasPieces())CK.why='custom';
    h='<h3>'+esc(t('whyH'))+'</h3><div class="choice" style="margin-top:10px"><button type="button" data-why="view" aria-pressed="'+(CK.why==='view')+'"><b>'+esc(t('whyView'))+'</b>'+esc(t('whyViewS'))+'</button><button type="button" data-why="custom" aria-pressed="'+(CK.why==='custom')+'"><b>'+esc(t('whyCustom'))+'</b>'+esc(t('whyCustomS'))+'</button></div>'
     +'<div class="field" style="margin-top:16px"><label for="ckName">'+esc(t('yourName'))+'</label><input id="ckName" autocomplete="name" value="'+esc(CK.name)+'"><div class="err" id="eName"></div></div>'
     +'<div class="field"><label for="ckPhone">'+esc(t('yourPhone'))+'</label><input id="ckPhone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" value="'+esc(CK.phone)+'" placeholder="313 555 0100"><div class="err" id="ePhone"></div></div>';
    inn.innerHTML=h;ft.innerHTML='<div class="two"><button class="btn line" type="button" data-go="0">'+esc(t('back'))+'</button><button class="btn gold" type="button" data-go="2">'+esc(t('cont'))+'</button></div>';return}
  if(STEP===2){var dl=dayList();if(!CK.day)CK.day=dayKey(dl[1]);
    h='<h3>'+esc(t('whenH'))+'</h3><div class="days" style="margin-top:10px">'+dl.map(function(x){var k=dayKey(x);return '<button type="button" data-day="'+k+'" aria-pressed="'+(CK.day===k)+'">'+esc(x.toLocaleDateString(AR?'ar':'en-US',{weekday:'short'}))+'<b class="num">'+x.getDate()+'</b></button>'}).join('')+'</div>'
     +'<div class="seg" style="margin-top:12px">'+['M','A','E'].map(function(x){return '<button type="button" data-time="'+x+'" aria-pressed="'+(CK.time===x)+'">'+esc(t('time'+x))+'</button>'}).join('')+'</div><p class="fine">'+esc(t('whenNote'))+'</p>'
     +'<div class="field" style="margin-top:14px"><label for="ckNote">'+esc(t('note'))+'</label><input id="ckNote" value="'+esc(CK.note)+'"></div>';
    inn.innerHTML=h;ft.innerHTML='<div class="two"><button class="btn line" type="button" data-go="1">'+esc(t('back'))+'</button><button class="btn gold" type="button" data-go="3">'+esc(t('cont'))+'</button></div>';return}
  if(STEP===3){if(!CK.ref)CK.ref='ZU-'+(1000+Math.floor(Math.random()*9000));store('zuCk',CK);var msg=message();
    h='<div class="review"><h3>'+esc(t('reviewH'))+'</h3><div><span class="ref num">'+esc(CK.ref)+'</span></div><pre id="msg" dir="auto">'+esc(msg)+'</pre></div>'
     +'<div class="hand"><a class="btn gold" data-send="sms" href="sms:'+PHONE+'?&body='+encodeURIComponent(msg)+'">'+esc(t('viaText'))+'</a><button class="btn line" type="button" data-send="ig">'+esc(t('viaIG'))+'</button><a class="btn line" data-send="call" href="tel:'+PHONE+'">'+esc(t('viaCall'))+'</a></div>';
    inn.innerHTML=h;ft.innerHTML='<button class="btn line" type="button" data-go="2" style="width:100%">'+esc(t('back'))+'</button>';return}
  if(STEP===4){h='<div class="sent"><svg class="gem" viewBox="0 0 100 100"><path d="M50 6 L94 50 L50 94 L6 50 Z"/><path class="ck" d="M30 51 L44 64 L70 37"/></svg><h3>'+esc(t('sentH'))+'</h3><p class="fine" style="font-size:14px">'+esc(t('sentP'))+'</p><div class="ref num">'+esc(CK.ref)+'</div></div>'
     +'<div class="hand"><a class="btn line" href="sms:'+PHONE+'?&body='+encodeURIComponent(message())+'">'+esc(t('viaText'))+'</a><button class="btn line" type="button" data-send="ig">'+esc(t('viaIG'))+'</button></div>';
    inn.innerHTML=h;ft.innerHTML='<button class="btn gold" type="button" data-new="1" style="width:100%">'+esc(t('newBag'))+'</button>'}}
function validate(){var ok=true,n=$('#ckName'),p=$('#ckPhone');CK.name=n.value.trim();CK.phone=p.value.trim();var digits=CK.phone.replace(/\D/g,'').replace(/^1(?=\d{10}$)/,'');
  $('#eName').textContent=CK.name.length<2?t('needName'):'';$('#ePhone').textContent=digits.length!==10?t('needPhone'):'';
  if(CK.name.length<2){ok=false;shake(n)}if(digits.length!==10){ok=false;shake(p)}return ok}
function shake(el){if(!RM&&el.animate)el.animate([{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(-3px)'},{transform:'none'}],{duration:320});el.style.borderColor='#f3a38a';setTimeout(function(){el.style.borderColor=''},1500)}
drawer.addEventListener('click',function(e){var rm=e.target.closest('.rm');if(rm){var row=rm.closest('.bline'),uid=row.dataset.uid;row.classList.add('out');setTimeout(function(){BAG=BAG.filter(function(b){return b.uid!==uid});saveBag();renderBag()},RM?0:300);toast(t('removed'));return}
  var go=e.target.closest('[data-go]');if(go){var to=+go.dataset.go,fwd=to>STEP;if(STEP===1&&to===2&&!validate())return;if(STEP===2){CK.note=($('#ckNote')||{}).value||''}if(to===3)CK.ref='';STEP=to;renderBag();$('#dwIn').scrollTop=0;
    if(!RM&&$('#dwIn').animate)$('#dwIn').animate([{opacity:0,transform:'translateX('+(AR?-1:1)*(fwd?16:-16)+'px)'},{opacity:1,transform:'none'}],{duration:300,easing:'cubic-bezier(.2,.7,.2,1)'});return}
  var why=e.target.closest('[data-why]');if(why){CK.why=why.dataset.why;$$('[data-why]').forEach(function(x){x.setAttribute('aria-pressed',x===why)});return}
  var dy=e.target.closest('[data-day]');if(dy){CK.day=dy.dataset.day;$$('[data-day]').forEach(function(x){x.setAttribute('aria-pressed',x===dy)});return}
  var tm=e.target.closest('[data-time]');if(tm){CK.time=tm.dataset.time;$$('[data-time]').forEach(function(x){x.setAttribute('aria-pressed',x===tm)});return}
  var sd=e.target.closest('[data-send]');if(sd){var msg=message();if(sd.dataset.send==='ig'){e.preventDefault();var done=function(){toast(t('copied'));setTimeout(function(){window.open('https://ig.me/m/'+IG,'_blank','noopener')},500)};
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(msg).then(done,done);else done()}
    window.__lastSend={via:sd.dataset.send,msg:msg};if(STEP===3){setTimeout(function(){STEP=4;renderBag()},sd.dataset.send==='ig'?700:250)}return}
  if(e.target.closest('[data-new]')){BAG=[];CK.ref='';CK.note='';saveBag();STEP=0;renderBag();closeDrawer()}});
drawer.addEventListener('input',function(e){if(e.target.id==='ckName')CK.name=e.target.value;if(e.target.id==='ckPhone')CK.phone=e.target.value;if(e.target.id==='ckNote')CK.note=e.target.value});

/* ================= sticky bar: hides at the closer, under sheets and during the opening ================= */
var bar=$('#bar'),closerVis=false;
function updBar(){bar.classList.toggle('hide',closerVis||!!SH||DW||html.classList.contains('js-intro'))}
if('IntersectionObserver'in window){new IntersectionObserver(function(es){es.forEach(function(e){if(e.target.id==='closer')closerVis=e.isIntersecting});updBar()},{threshold:.15}).observe($('#closer'))}

/* ================= reveals ================= */
if('IntersectionObserver'in window&&!RM){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px'});$$('.reveal').forEach(function(el){io.observe(el)})}
else $$('.reveal').forEach(function(el){el.classList.add('in')});

/* ================= language: EN / ع ================= */
function renderAll(){applyStatic();hintText();chipsCat();chipsK();renderCase();cControls();drawPreview();wUpd(false);srcUpd();updBag();if(SH)renderSheet();if(DW)renderBag()}
$$('.lang button').forEach(function(b){b.addEventListener('click',function(){var l=b.dataset.l;if(l===LANG)return;var go=function(){LANG=l;AR=l==='ar';html.lang=l;html.dir=AR?'rtl':'ltr';try{localStorage.setItem('zuLang',l)}catch(e){}renderAll()};
  var m=$('main');if(RM||!m.animate){go();return}m.animate([{opacity:1},{opacity:0}],{duration:160,fill:'forwards'}).onfinish=function(){go();m.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:320,easing:'cubic-bezier(.2,.7,.2,1)'})}})});
renderAll();

/* ================= the opening: their sign switches on ================= */
function ready(){html.classList.remove('js-intro','lock');updBar()}
var G=window.gsap,intro=$('#intro');
if(!html.classList.contains('js-intro')||!G){ready();window.__intro=null;return}
var is=buildSign($('#isign'),{draw:1,sweep:1}),ise=is.el,done=false;
function finish(){if(done)return;done=true;try{sessionStorage.setItem('zuIntro1','1')}catch(er){}intro.style.display='none';ready()}
ise.classList.remove('off');
var Lt=function(id){return $('.lit',is.part(id))},D=function(id){return $('.dr path',is.part(id))},Dw=function(id){return $('.dr',is.part(id))};
G.set($$('.lit',ise),{opacity:0});G.set($('.bloom',ise),{opacity:0});
var tl=G.timeline({onComplete:finish});
window.__intro=tl;if(window.__qaPause)tl.pause();
var ON=[[0,1],[.04,.12],[.08,.95],[.12,.3],[.17,1]],BUZZ=[[0,1],[.04,0],[.1,.7],[.14,0],[.24,.45],[.29,1]];
function strike(el,at,pat){(pat||ON).forEach(function(s){tl.set(el,{opacity:s[1]},at+s[0])})}
// 0. the cove light over the case flickers on and the room picks up a little light
strike('#intro .cove',0,[[0,.8],[.05,.1],[.1,1]]);tl.to('#intro .ispill',{opacity:1,duration:.9,ease:'power2.out'},.15);
// 1. the diamond: current runs round each facet, it strikes on, and a prism glint fires off its point
var PR=[];for(var i=0;i<8;i++){var pr=document.createElement('i');pr.className='prism';intro.appendChild(pr);PR.push(pr)}
function prismAt(id,at){var r=ise.getBoundingClientRect(),v=VERT[id],x=r.left+v[0]/VB[2]*r.width,y=r.top+v[1]/VB[3]*r.height,a=PR.splice(0,2);
  a.forEach(function(p,j){tl.set(p,{left:x,top:y,rotation:(id==='f3'?0:180)+(j?38:-38)+(id==='f1'?60:id==='f2'?-60:0),opacity:0,scaleY:.2},at).to(p,{opacity:.85,scaleY:1,duration:.12,ease:'power2.out'},at).to(p,{opacity:0,duration:.35,ease:'power1.in'},at+.12)})}
[['f0',.12],['f1',.3],['f2',.46],['f3',.62]].forEach(function(m){var id=m[0],at=m[1];tl.set(Dw(id),{opacity:1},at-.16).fromTo(D(id),{strokeDashoffset:1},{strokeDashoffset:0,duration:.2,ease:'power1.inOut'},at-.16);
  strike(Lt(id),at);tl.to(Dw(id),{opacity:0,duration:.1},at+.1);tl.add(function(){glint(is,id,true)},at+.02);prismAt(id,at+.02)});
// 2. ZU & CO. strikes on letter by letter, each one rising into place; the ampersand buzzes before it holds
WORD.forEach(function(id,k){var at=.86+k*.09;tl.fromTo(is.part(id),{y:14},{y:0,duration:.32,ease:'back.out(2.2)'},at-.06);strike(Lt(id),at,id==='amp'?BUZZ:ON)});
tl.to($('.bloom',ise),{opacity:.5,duration:.5,ease:'power2.out'},.9);
// 3. a sweep of gold light crosses the whole sign
tl.fromTo($('.sweep b',ise),{x:0},{x:function(){return ise.getBoundingClientRect().width*1.55},duration:.5,ease:'power2.inOut'},1.5);
// 4. hand-off: the sign flies to its place on the hero wall while the room lights come up
var geo=null;function fly2(){if(!geo){var a=ise.getBoundingClientRect(),b=$('#hsign').getBoundingClientRect();geo={x:(b.left+b.width/2)-(a.left+a.width/2),y:(b.top+b.height/2)-(a.top+a.height/2),s:b.width/a.width}}return geo}
tl.add(function(){window.scrollTo(0,0);fly2()},1.98)
  .to('#intro .skip',{opacity:0,duration:.15},1.98)
  .to(ise,{x:function(){return fly2().x},y:function(){return fly2().y},scale:function(){return fly2().s},duration:.52,ease:'power3.inOut'},2.0)
  .to(intro,{backgroundColor:'rgba(10,10,11,0)',duration:.4,ease:'power1.inOut'},2.08)
  .to('#intro .ispill,#intro .cove',{opacity:0,duration:.35},2.08)
  .add(function(){$('#hsign').style.visibility='visible'},2.5)
  .to(intro,{opacity:0,duration:.08},2.5);
function skip(){if(done)return;tl.kill();finish()}
intro.addEventListener('pointerdown',skip);addEventListener('keydown',function k(){removeEventListener('keydown',k);skip()});
setTimeout(function(){if(!done&&!window.__qaPause)finish()},6000);
})();

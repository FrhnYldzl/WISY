/* =========================================================
   WISY MERKEZ — panel. Görünümler Claude Design omurga v1'den (design/claude-design-cikti) birebir;
   sabit örnek değerler kasa modeline bağlandı. "Kasa" kipinde veri /api/model'den gelir ve yazımlar
   /api/vault/apply ile Obsidian kasasına gider; "Örnek" kipinde ornek.js kullanılır, yazım tarayıcıda kalır.
   ========================================================= */
const FAM = {
  kok:{ad:"Kök",sh:"kok",dikey:"BİLGE",not:"Geçmişten gelen, bugünü okutan kimlikler"},
  mesleki:{ad:"Mesleki",sh:"mes",dikey:"VARLIKLI",not:"Gelir ve itibar üreten meslek kimlikleri"},
  kurucu:{ad:"Kurucu ve yatırımcı",sh:"kur",dikey:"VARLIKLI",not:"İş ve sermaye kuran kimlikler"},
  akademik:{ad:"Akademik",sh:"aka",dikey:"BİLGE",not:"Bilgiyi üreten, yazan, öğreten kimlikler"},
  kisisel:{ad:"Kişisel",sh:"kis",dikey:"BİLGE",not:"Kişinin kendisi için olan kimlikler"}
};
const FAMCLS = {kok:"kok",mesleki:"mes",kurucu:"kur",akademik:"aka",kisisel:"kis"};
const STAGES = ["cirak","yaratici","usta"];
const STAGE_AD = {cirak:"Çırak",yaratici:"Yaratıcı-aktif",usta:"Usta"};
const PSTATES=[["fikir","Fikir"],["hazirlik","Hazırlık"],["aktif","Aktif"],["tamam","Tamamlandı"],["arsiv","Arşiv"]];
const CHANNELS = [
 ["LinkedIn","medya","Haftada 2–3","Günün kartı, carousel, makale"],["Bülten","medya","İki haftada 1","Haftanın kartları, okuma listesi"],["Web arşivi","medya","Bültenle","Kalıcı makale, kavram sayfası"],
 ["Akademik","medya","Dönemlik","Makale, bildiri, panel"],["Video ve ses","medya","Ayda 2","Kısa video, podcast"],
 ["GitHub","teknik","Her sürüm","Ajan kodu, araçlar"],["Hugging Face","teknik","Demo hazır olunca","Veri seti, Space demo"],["Kaggle","teknik","Veri yayınında","Veri seti, notebook"],["Zenodo","teknik","Ana sürümlerde","DOI'li arşiv"],
 ["Udemy, Borfin, MasterClass","egitim","Modül olgunlaşınca","Kurs"]
];
const UYUM = {tbb:"TBB reklam yasağı",spk:"SPK: kişiye özel yatırım tavsiyesi yok",rekabet:"Rekabet yasağı alanları",alinti:"Alıntı ve telif"};
const UYUM_K = {tbb:"TBB",spk:"SPK",rekabet:"Rekabet",alinti:"Alıntı"};
const CST = {fikir:"Fikir",taslak:"Taslak",onay:"Onay",yayinda:"Yayında"};

/* =========================================================
   VERİ — tek model; görünümler bu adları okur
   ========================================================= */
let M, IDS=[], ID={}, CARDS=[], SK=[], PROJ=[], MODS=[], ASSETS={}, SICIL=[], CONTENT=[], CONCEPTS=[], EDGES=[], TODAY=new Date();
let SERVER=false;                 // /api erişilebilir mi
const LIVE=()=>M&&M.kaynak==="kasa";
function setModel(m){
  M=m; IDS=m.ids; ID=Object.fromEntries(IDS.map(i=>[i.slug,i])); CARDS=m.cards; SK=m.skills; PROJ=m.projects; MODS=m.modules;
  ASSETS=m.assets; SICIL=m.sicil; CONTENT=m.content; CONCEPTS=m.concepts; EDGES=m.edges;
  TODAY=m.kaynak==="kasa"?new Date(m.today+"T00:00:00"):new Date(2026,9,25);
}
async function api(path,opts={}){
  const r=await fetch(path,{...opts,headers:{"content-type":"application/json",...(opts.headers||{})},body:opts.body&&typeof opts.body!=="string"?JSON.stringify(opts.body):opts.body});
  const t=await r.text(); let j=null; try{j=t?JSON.parse(t):null}catch(e){}
  if(!r.ok) throw new Error((j&&(j.hata||j.message))||t||r.statusText);
  return j;
}
async function reload(){ if(!SERVER) return; setModel(await api("/api/model")); render(); }
/** Kasaya yazım: öneri biçiminde (sunucu kural denetimiyle yazar). Örnek kipte yerel geri çağrı çalışır. */
async function write(oneri,local,kaynak="panel"){
  if(!LIVE()){ local&&local(); render(); return {ok:true}; }
  try{ const r=await api("/api/vault/apply",{method:"POST",body:{oneri,kaynak}}); toast(r.ozet); await reload(); return r; }
  catch(e){ toast(e.message); throw e; }
}

/* =========================================================
   DURUM
   ========================================================= */
const S = {view:"pano",kim:"",taraf:"",q:"",pstate:"normal",cardFilter:"",evrenMode:"ag",mapTab:"bilim",idMode:"aile",accepted:{}};
try{const t=localStorage.getItem("wisy-theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}

/* =========================================================
   YARDIMCILAR (omurga)
   ========================================================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function idb(slug,short){
  if(!slug) return `<span class="idb none"><span class="sh mes" style="background:none;border:1.5px dashed currentColor"></span>Kimliksiz</span>`;
  const i=ID[slug]; if(!i) return `<span class="tag">${esc(slug)}</span>`;
  const c=FAMCLS[i.aile]||"kis";
  return `<span class="idb fam-${c}" title="${esc((FAM[i.aile]||FAM.kisisel).ad)} ailesi"><span class="sh ${c}"></span>${esc(short?i.ad.split(" ")[0]:i.ad)}</span>`;
}
function side(t){
  if(t==="sirket") return `<span class="side s"><i></i>Şirket</span>`;
  if(t==="ortak") return `<span class="side o"><i></i>Ortak</span>`;
  return `<span class="side k"><i></i>Kişisel</span>`;
}
function stage(ev,hd){
  const ix=STAGES.indexOf(ev), th=STAGES.indexOf(hd);
  return `<span class="stage" title="${ev?STAGE_AD[ev]:"Belirlenecek"} → ${STAGE_AD[hd]||"belirlenecek"}">${STAGES.map((s,k)=>`<b class="${ix<0?"tbd":k<=ix?"on":k<=th?"tgt":""}"></b>`).join("")}</span>`;
}
function fmtDate(d){return d.toLocaleDateString("tr-TR",{day:"numeric",month:"long"})}
function fmtIso(s){return /^\d{4}-\d{2}-\d{2}/.test(s||"")?fmtDate(new Date(s.slice(0,10)+"T00:00:00")):(s||"—")}
function addDays(n){const d=new Date(TODAY);d.setDate(d.getDate()+n);return d}
function monday(d){const x=new Date(d);x.setDate(x.getDate()-((x.getDay()+6)%7));return x}
function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function pass(rec){
  if(S.kim && rec.kim!==S.kim && rec.kim2!==S.kim) return false;
  if(S.taraf && rec.taraf && rec.taraf!==S.taraf) return false;
  return true;
}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove("on"),2600)}
function phead(eb,title,lead,actions="",hero){
  const st=LIVE()?`<span class="st live">Kasa · canlı</span>`:`<span class="st">Örnek veri</span>`;
  return `<header class="phead"><div class="ph-l"><div class="eyebrow">${eb}${st}</div><h1 class="${hero?"hero":""}">${title}</h1>${lead?`<p class="lead">${lead}</p>`:""}</div>${actions?`<div class="actions">${actions}</div>`:""}</header>`;
}
function chain(rings,mini){
  const html=rings.map((r,k)=>{
    const full=r[2], isA=k===5, nextEmpty=rings[k+1]&&!rings[k+1][2];
    const cls=["ring",full?"full":"empty",isA?"asset":"",(!full||nextEmpty)?"gapnext":""].join(" ");
    return `<div class="${cls}"><div class="o">${full?String(k+1):"—"}</div><div class="rt"><div class="rl">${r[0]}</div><div class="rv">${esc(r[1])}</div></div></div>`;
  }).join("");
  return `<div class="chain seg-link">${html}</div>`;
}
const filled=p=>p.rings.filter(r=>r[2]).length;
const famOrder=["kok","mesleki","kurucu","akademik","kisisel"];
/** Stüdyoda belirli bir ajanla iş başlat (studio.js) */
function ask(ajan,gorev,opts){ if(window.Studio) Studio.preset(ajan,gorev,opts); go("studio"); }
const askBtn=(ajan,gorev,label,cls="btn sm")=>`<button class="${cls}" data-ask="${esc(ajan)}" data-gorev="${esc(gorev)}">${label}</button>`;

/* yerel kimlik önerisi (Claude yokken): anahtar kelime → tema + kimlik adı öneki */
const KW=[
 [/risk|finansman|proje fin/i,"Proje finansmanı riski","Danışman"],[/tahkim|antlaşma|yatırımcı.devlet|icsid/i,"Yatırım tahkimi","Tahkim"],
 [/savaş|harekât|komuta|cephe|strateji/i,"Strateji ve lojistik","Harbiyeli"],[/reklam|kampanya|dönüşüm|roas|kreatif/i,"Ölçümleme","Performans"],
 [/ajan|model|yapay|llm|otomasyon/i,"Ajan tasarımı","AI"],[/ihracat|pazar|gümrük|lojistik/i,"Pazar seçimi","E-ihracat"],
 [/sözleşme|dava|mevzuat|dilekçe|hüküm|delil/i,"Sözleşme tasarımı","Avukat"],[/jeopolitik|dış politika|ittifak|yaptırım/i,"Ekonomi politik","Uluslararası"],
 [/müzik|loop|armoni|ses/i,"Loop prodüksiyonu","Müzisyen"],[/ders|kurs|öğren|müfredat/i,"Öğretim tasarımı","Eğitmen"],
 [/makale|seri|anlatı|yazı|marka|vaat/i,"Anlatı kurma","Araştırmacı"],[/sahne|panel|konuşma|sunum|bildiri/i,"Hikaye anlatımı","Konuşmacı"],[/yatırım|değerleme|portföy/i,"Değerleme","Yatırımcı"],
 [/akademi|tez|doktora|bildiri|cop/i,"Akademik yazım","Akademisyen"],[/girişim|marka|ölçeklen/i,"İş modeli tasarımı","Seri girişimci"]
];
const kimByAd=p=>{const lo=p.toLocaleLowerCase("tr");const i=IDS.find(x=>x.ad.toLocaleLowerCase("tr").startsWith(lo));return i?i.slug:null};
function kwHits(text){const hits=KW.filter(k=>k[0].test(text||"")).map(k=>[k[0],k[1],kimByAd(k[2])]).filter(h=>h[2]);return [...new Map(hits.map(h=>[h[2],h])).values()]}
function noidList(){
  return [...CARDS.filter(c=>!c.kim).map(c=>({id:c.id,type:"kart",t:c.idea})),...CONTENT.map((c,i)=>[c,i]).filter(([c])=>!c.kim).map(([c,i])=>({id:c.id??("c"+i),type:"icerik",t:c.t})),
    ...MODS.filter(m=>!m.kim).map(m=>({id:m.id,type:"modul",t:m.ad})),...PROJ.filter(p=>!p.kim).map(p=>({id:p.id,type:"proje",t:p.baslik}))];
}

/* =========================================================
   GÖRÜNÜMLER
   ========================================================= */
const V = {};
const TITLES = {studio:"Wisy Stüdyo",oturumlar:"Oturumlar",kutuphane:"Çıktı kütüphanesi",ajanlar:"Ajanlar",pano:"Pano",kartlar:"Kartlar",evren:"Kavram evreni",kimlikler:"Kimlikler",yetenekler:"Yetenekler",ogrenme:"Öğrenme",projeler:"Projeler",varliklar:"Varlıklar",yayin:"Yayın",kopru:"Köprü",muhasebe:"Kimlik muhasebesi",omurga:"Tasarım omurgası"};
const CRUMB = {studio:"Stüdyo",oturumlar:"Stüdyo",kutuphane:"Stüdyo",ajanlar:"Orkestrasyon",pano:"Günlük",kartlar:"Günlük",evren:"Ana hikaye · 1",kimlikler:"Ana hikaye · 2",yetenekler:"Ana hikaye · 3",ogrenme:"Ana hikaye · 4",projeler:"Ana hikaye · 5",varliklar:"Ana hikaye · 6",yayin:"Dağıtım",kopru:"Ayrım",muhasebe:"Rapor",omurga:"Omurga"};

const gapRank=s=>(s.hedef?STAGES.indexOf(s.hedef):-1)-(s.evre?STAGES.indexOf(s.evre):-1);
function gapSkills(){return SK.filter(s=>s.hedef&&s.evre!==s.hedef)}
function attention(){
  const due=CARDS.filter(c=>c.durum==="beklemede"&&c.kalan<=0&&pass(c));
  const items=[];
  due.forEach(c=>items.push({sv:"",kind:"Bekleme doldu",t:c.idea,meta:idb(c.kim)+side(c.taraf)+`<span class="tag">${esc(c.kaynak)}${c.sayfa&&c.sayfa!=="—"?" · s."+esc(c.sayfa):""}</span>`,act:`<button class="btn sm" data-card="${esc(c.id)}">Kartı aç</button>`}));
  const noid=noidList();
  if(noid.length) items.push({sv:"agent",kind:"Kimliksiz kayıt",t:`${noid.length} kayıt kimliksiz; öğrenmeye ve üretime giremez`,meta:noid.slice(0,4).map(r=>`<span class="tag">${esc(r.t.length>34?r.t.slice(0,32)+"…":r.t)}</span>`).join("")+`<span class="chip agent">Kimlik yönlendirici önerdi</span>`,act:`<button class="btn sm" data-go="#ajan">Önerileri gör</button>`});
  const temasiz=CARDS.filter(c=>c.tema==="Temasız"&&pass(c));
  if(temasiz.length) items.push({sv:"agent",kind:"Temasız kart",t:`${temasiz.length} kart henüz bir kavrama bağlı değil`,meta:`<span class="chip agent">Haritacı bağlayabilir</span>`,act:askBtn("haritaci","Temasız kartları var olan kavramlara bağla; uygun kavram yoksa yeni kavram öner.","Haritacıya sor")});
  PROJ.filter(p=>filled(p)<6&&pass(p)).forEach(p=>{const miss=p.rings.filter(r=>!r[2]).map(r=>r[0]);items.push({sv:miss.length>1?"":"warn",kind:"Eksik hikaye kartı",t:`${p.baslik}: ${miss.join(" ve ")} halkası boş`,meta:idb(p.kim)+side(p.taraf)+`<span class="chip ${miss.length>1?"attn":"warn"}">${filled(p)}/6 halka</span>`,act:`<button class="btn sm" data-proj="${esc(p.id)}">Hikaye kartı</button>`})});
  CONTENT.forEach((c,i)=>{if(!c.flag||!pass({kim:c.kim}))return;items.push({sv:"",kind:"Uyum onayı eksik",t:c.t,meta:Object.keys(c.uy).filter(k=>!c.uy[k]).map(k=>`<span class="chip attn">${UYUM_K[k]||k} kontrolü yok</span>`).join("")+`<span class="tag">${esc(c.ch)}${c.d?" · "+fmtIso(c.d):""}</span>`,act:`<button class="btn sm" data-content="${i}">İçeriği aç</button>`})});
  SICIL.filter(s=>s[4]!=null&&(!S.kim||s[5]===S.kim)).sort((a,b)=>a[4]-b[4]).forEach(s=>items.push({sv:"warn",kind:"Yenileme yaklaşıyor",t:`${s[0]} ${/^\d{4}/.test(s[3])?fmtIso(s[3]):s[3]} tarihinde sona eriyor`,meta:(s[5]?idb(s[5]):"")+`<span class="chip warn">${s[4]} gün</span>`,act:`<button class="btn sm" data-nav="varliklar">Sicile git</button>`}));
  if(LIVE()) (M.issues||[]).filter(i=>i.sev==="hata"&&!["kimliksiz","temasiz"].includes(i.kural)).slice(0,4).forEach(i=>items.push({sv:"",kind:"Kural ihlali",t:i.msg,meta:`<span class="tag">${esc(i.rel)}</span>`,act:`<button class="btn sm ghost" data-nav="ajanlar">Denetim</button>`}));
  const silent=IDS.filter(i=>i.yet.length&&(!S.kim||S.kim===i.slug)&&(i.son==null||i.son>30));
  if(silent.length===1){const i=silent[0];items.push({sv:"info",kind:"Sessiz kimlik",t:`${i.ad}: ${i.son==null?"henüz kayıt yok":i.son+" gündür kayıt yok"}`,meta:idb(i.slug),act:`<button class="btn sm ghost" data-id="${esc(i.slug)}">Kimliğe bak</button>`})}
  else if(silent.length) items.push({sv:"info",kind:"Sessiz kimlik",t:`${silent.length} kimlik 30 günden uzun süredir sessiz`,meta:silent.slice(0,4).map(i=>idb(i.slug)).join("")+(silent.length>4?`<span class="tag">+${silent.length-4}</span>`:""),act:`<button class="btn sm ghost" data-nav="kimlikler">Kimliklere bak</button>`});
  if(!LIVE()&&S.pstate==="yogun"){
    ["Bülten #5 için 3 kart eksik","Ajan geliştirme modülü 9 gündür ilerlemedi","Zenodo yayını için lisans seçilmedi","Hukuk ve Sinema #6 kaynak sayfası eksik"].forEach((t,k)=>items.push({sv:k%2?"warn":"",kind:["Yayın","Öğrenme","Teknik vitrin","Kaynak"][k],t,meta:`<span class="tag">yoğun gün örneği</span>`,act:`<button class="btn sm ghost">Aç</button>`}));
  }
  return items;
}

function greet(){const h=new Date().getHours();return h<12?"Günaydın":h<18?"İyi günler":"İyi akşamlar"}
V.pano = ()=>{
  const st=LIVE()?(CARDS.length?"normal":"bos"):S.pstate;
  const day=TODAY.toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).replace(/^./,c=>c.toLocaleUpperCase("tr")).replace(/ (\d{4})$/," $1");
  const head=phead(`${day} · ${new Date().getHours()<12?"sabah turu":"gün turu"}`,`${greet()} Ferhan. Bugün hangi <em>kimliği</em> ileri taşıyoruz?`,
    st==="bos"?"Kasa henüz boş. İlk kartla birlikte ana hikaye dolmaya başlar.":`Kavramdan varlığa altı halka. Dikkat isteyen kayıtlar aşağıda, en acil olan en üstte.`,
    `<button class="btn pri" data-act="capture">+ Hızlı kart</button>${LIVE()?"":`<div class="seg" id="pstate" role="group" aria-label="Pano durumu">${[["normal","Normal gün"],["yogun","Yoğun gün"],["bos","Boş kasa"]].map(([v,l])=>`<button data-v="${v}" class="${st===v?"on":""}">${l}</button>`).join("")}</div>`}`,true);
  if(st==="bos") return head+`<div class="story">${["Kavramlar","Kimlikler","Yetenekler","Öğrenme","Projeler","Varlıklar"].map((n,k)=>`<div class="tile st"><span class="n">${k+1}</span><div class="l">${n}</div><div class="v" style="color:var(--ink-4)">0</div><div class="d">henüz kayıt yok</div></div>`).join("")}</div>
   <div style="margin-top:20px" class="emptyst"><div class="lbl">Boş kasa</div><h3>İlk kartını yakala</h3><p>Bir kitaptan, sohbetten ya da deneyimden tek bir fikir yaz. Kütüphaneci ajanı kaynaklarını tarayınca kartlar burada birikir.</p><div class="actions" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn pri" data-act="capture">+ İlk kartı yakala</button>${askBtn("kutuphaneci","Kaynak envanterine başlayalım: hangi klasörleri ve kitap listelerini taramam gerektiğini sor, sonra kaynak notu önerileri hazırla.","Kütüphaneciyle başla","btn")}</div></div>`;

  const due=CARDS.filter(c=>c.durum==="beklemede"&&c.kalan<=0).length;
  const ready=CARDS.filter(c=>c.durum==="hazir").length;
  const noid=noidList().length;
  const mul=!LIVE()&&st==="yogun"?1:0;
  const eksik=PROJ.filter(p=>filled(p)<6).length;
  const ym=iso(TODAY).slice(0,7);
  const pub=CONTENT.filter(c=>c.st==="yayinda"&&(c.d||"").startsWith(ym)).length;
  const nAsset=Object.values(ASSETS).reduce((a,x)=>a+x.k.length+x.s.length,0);
  const gaps=gapSkills().length;
  const cells=[
    ["Kavramlar",Math.max(CONCEPTS.reduce((a,c)=>a+c.n,0),CARDS.length)+mul*14,`kart · ${ready+mul*6} hazır`,"evren",due>0],
    ["Kimlikler",noid+mul*4,"kimliksiz kayıt","kimlikler",noid>0],
    ["Yetenekler",gaps+mul*2,gaps?`açık · ${Math.min(3,gaps)} öncelikli`:"açık · evre ölçülmedi","yetenekler",false],
    ["Öğrenme",MODS.filter(m=>m.durum==="devam").length,`aktif modül · ${MODS.length} toplam`,"ogrenme",false],
    ["Projeler",PROJ.filter(p=>p.durum!=="arsiv").length,`proje · ${eksik} eksik halka`,"projeler",eksik>0],
    ["Varlıklar",pub+mul*2,`bu ay yayın · ${nAsset} varlık`,"varliklar",false]
  ];
  const story=`<div class="story" role="list">${cells.map((c,k)=>`<button class="tile st ${k===5?"accent":""}" role="listitem" data-nav="${c[3]}"><span class="n">${k+1}</span><div class="l">${c[0]}</div><div class="v">${c[1]}</div><div class="d">${c[2]}</div>${c[4]?'<span class="flag" title="Dikkat"></span>':""}</button>`).join("")}</div>`;

  const items=attention();
  const att=`<section class="panel"><div class="ph"><h3>Dikkat istiyor</h3><span class="chip attn">${items.length}</span><span class="r lbl">en acil üstte</span></div>
    ${items.length?`<ul class="alist">${items.map(i=>`<li><span class="sv ${i.sv}"></span><div><div class="kind">${i.kind}</div><div class="tt">${esc(i.t)}</div><div class="meta">${i.meta}</div></div>${i.act}</li>`).join("")}</ul>`:`<div class="pb small muted">Bugün dikkat isteyen kayıt yok.</div>`}</section>`;

  const mx=Math.max(4,...IDS.map(i=>i.act));
  const fams=famOrder.map(f=>{const ids=IDS.filter(i=>i.aile===f);if(!ids.length)return"";return `<div class="famh"><span class="idb fam-${FAMCLS[f]}" style="padding:0;border:0;background:none"><span class="sh ${FAMCLS[f]}"></span></span>${FAM[f].ad}</div>`+ids.map(i=>`<div class="bar fam-${FAMCLS[i.aile]} ${i.act===0?"zero":""}" style="${S.kim&&S.kim!==i.slug?"opacity:.35":""}"><span class="nm" title="${esc(i.ad)}">${esc(i.ad)}</span><span class="tr"><i style="width:${Math.max(i.act/mx*100,i.act?4:0)}%"></i></span><span class="v">${i.act}</span></div>`).join("")}).join("");
  const balance=`<section class="panel"><div class="ph"><h3>Kimlik dengesi</h3><span class="r lbl">son 30 gün · kayıt</span></div><div class="pb"><div class="bars">${fams}</div><p class="tiny muted" style="margin:12px 0 0">Kırmızı ad: 30 günde hiç kayıt yok.</p></div></section>`;

  const wk=monday(TODAY), wkEnd=addDays(6-((TODAY.getDay()+6)%7)), todayIx=(TODAY.getDay()+6)%7;
  const CSTEP=["fikir","taslak","onay","yayinda"];
  const upcoming=CONTENT.filter(c=>c.d&&c.d>=iso(wk)&&c.st!=="yayinda"&&pass({kim:c.kim})).sort((a,b)=>a.d<b.d?-1:1).slice(0,2);
  const mods=MODS.filter(m=>(m.durum==="devam"||m.durum==="planli")&&pass(m)).slice(0,2);
  const rows=[...upcoming.map(c=>{const on=CSTEP.indexOf(c.st)+1;return `<div class="rh asset" style="--n:4"><span class="t">${esc(c.t)}</span><span class="s">${CST[c.st]||c.st} · ${fmtIso(c.d)}</span><div class="steps">${CSTEP.map((_,k)=>`<i class="${k<on?"on":""}"></i>`).join("")}</div><span class="tiny muted" style="grid-column:1/-1">Fikir · taslak · uyum onayı · yayın</span></div>`}),
    ...mods.map(m=>{const n=Math.max(1,m.units.length),dn=m.units.filter(u=>u[1]===2).length;return `<div class="rh" style="--n:${n}"><span class="t">${esc(m.ad)}</span><span class="s">birim ${dn}/${m.units.length||"—"}</span><div class="steps">${Array.from({length:n},(_,k)=>`<i class="${k<dn?"on":""}"></i>`).join("")}</div></div>`})];
  const rhythm=`<section class="panel"><div class="ph"><h3>Bu haftanın ritmi</h3><span class="r lbl">${wk.getDate()}–${fmtDate(wkEnd)}</span></div><div class="pb rhythm">
    <div class="week">${["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"].map((d,k)=>`<span class="${k===todayIx?"today":""}">${d}</span>`).join("")}</div>
    ${rows.join("")||`<p class="small muted" style="margin:0">Bu hafta için tarihli içerik ya da aktif modül yok. ${askBtn("yayin-planlayici","Önümüzdeki 4 hafta için yayın takvimi taslağı hazırla.","Yayın planlayıcıya sor","btn sm ghost")}</p>`}
  </div></section>`;

  const recs=noidList().slice(0,3);
  const agent=`<section class="agentbox" id="ajan"><div class="who"><i>KY</i>Kimlik yönlendirici · katman 4 ajanı</div>
    <div class="q">${recs.length?`${recs.length===1?"Bir":recs.length} kimliksiz kayıt için birincil kimlik önerisi hazır.`:"Kimliksiz kayıt yok. Bütün kayıtlar bir kimliğe bağlı."}</div>
    <div class="sugg">${recs.map(r=>{const acc=S.accepted[r.id];const c=kwHits(r.t).slice(0,2).map(h=>h[2]);return `<div class="sugg-row"><div><div style="font-weight:600;font-size:13px">${esc(r.t)}</div><div class="small muted" style="margin-top:4px">${acc?`Atandı: ${idb(acc)}`:c.length>1?"Hangisi birincil? İki kimlik de uyuyor.":c.length?"Önerilen kimlik:":"Anahtar kelimeden öneri çıkmadı; ajana sor."}</div></div><div class="acts" style="display:flex;gap:6px;flex-wrap:wrap">${acc?(LIVE()?"":`<button class="btn sm ghost" data-unassign="${esc(r.id)}">Geri al</button>`):c.map(s=>`<button class="btn sm" data-assign="${esc(r.id)}" data-to="${s}">${esc(ID[s].ad)}</button>`).join("")||askBtn("kimlik-yonlendirici",`Şu kayıt için birincil kimlik öner: "${r.t}" (id: ${r.id}).`,"Ajana sor")}</div></div>`}).join("")}</div>
    ${recs.length?`<div class="acts" style="margin-top:10px">${askBtn("kimlik-yonlendirici","Kimliksiz bütün kayıtlar için birincil (ve gerekirse ikincil) kimlik öner; belirsiz olanlar için iki seçenekli soru sor.","Hepsini ajana yönlendir","btn sm acc")}</div>`:""}</section>`;

  return head+story+`<div class="grid g2" style="margin-top:16px"><div class="grid" style="align-content:start">${att}${agent}</div><div class="grid" style="align-content:start">${rhythm}${balance}</div></div>`;
};

function icard(c){
  const used=c.durum==="kullanildi";
  let w="";
  if(c.durum==="beklemede"){const k=Math.max(0,c.kalan);const done=Math.max(0,10-k);w=`<span class="wait ${k===0?"due":""}"><span class="segs">${Array.from({length:10},(_,i)=>`<i class="${i<done?"on":""}"></i>`).join("")}</span><span class="d">${k===0?"Bekleme doldu":k+" gün"}</span></span>`}
  const chipSt={taslak:'<span class="chip">Taslak</span>',hazir:'<span class="chip ok">Hazır</span>',kullanildi:'<span class="chip plain">Kullanıldı</span>',beklemede:""}[c.durum];
  return `<button class="icard ${used?"used":""}" data-card="${esc(c.id)}"><span class="punch" aria-hidden="true"></span><div class="top"><span class="theme">${esc(c.tema)}</span>${chipSt||""}</div><div class="idea">${esc(c.idea)}</div><div class="foot">${idb(c.kim)}${side(c.taraf)}</div>${w?`<div>${w}</div>`:""}<div class="src"><span>${esc(c.kaynak)}</span><span class="mono">${c.sayfa&&c.sayfa!=="—"?"s."+esc(c.sayfa):esc(c.tur)}</span></div></button>`;
}
V.kartlar = ()=>{
  const q=S.q.toLocaleLowerCase("tr");
  let list=CARDS.filter(pass).filter(c=>!q||(c.idea+c.tema+c.kaynak+(c.fikir||"")).toLocaleLowerCase("tr").includes(q));
  const tf=S.cardFilter; if(tf) list=list.filter(c=>c.tur===tf);
  const col=(nm,arr,note)=>`<section class="col"><div class="ch"><h3>${nm}</h3><span class="lbl">${note}</span><span class="n">${arr.length}</span></div>${arr.length?arr.map(icard).join(""):`<div class="emptyst" style="padding:22px 14px"><p class="small">Bu sütunda kart yok.</p></div>`}</section>`;
  const wait=list.filter(c=>c.durum==="beklemede"||c.durum==="taslak").sort((a,b)=>(a.durum==="taslak"?-1:a.kalan)-(b.durum==="taslak"?-1:b.kalan));
  return phead(`Katman 1 · Bültenci ajanı`,`Kartlar`,`Her kart tek bir fikir. Kitaptan gelen kart 10 gün bekler; sonra yeniden okunur ve hazır olur.`,`${askBtn("bultenci","Bekleme süresi dolan kartları gözden geçir: hangileri hazır olmalı, hangileri yeniden yazılmalı? Haftalık bülten için en iyi 3–5 kartı seç.","Bültenciye sor","btn")}<button class="btn pri" data-act="capture">+ Hızlı kart</button>`)+
   `<div class="filters"><span class="lbl">Kaynak</span>${[["","Tümü"],["kitap","Kitap"],["makale","Makale"],["kurs","Kurs"],["deneyim","Deneyim"],["sohbet","Sohbet"]].map(([v,l])=>`<button class="fchip ${S.cardFilter===v?"on":""}" data-cf="${v}">${l}</button>`).join("")}${S.q?`<span class="chip core plain">Arama: “${esc(S.q)}”</span>`:""}${S.kim&&ID[S.kim]?`<span class="chip core plain">Kimlik: ${esc(ID[S.kim].ad)}</span>`:""}</div>`+
   `<div class="kanban">${col("Beklemede",wait,"kalan gün")}${col("Hazır",list.filter(c=>c.durum==="hazir"),"kullanılabilir")}${col("Kullanıldı",list.filter(c=>c.durum==="kullanildi"),"içerikte")}</div>`;
};

V.evren = ()=>{
  const mode=S.evrenMode;
  let body="";
  if(!CONCEPTS.length) body=`<div class="emptyst"><h3>Kavram evreni boş</h3><p>Kartlar tema aldıkça kavramlar burada düğüm olur.</p></div>`;
  else if(mode==="ag"){
    const nodes=CONCEPTS.map((c,k)=>{const r=10+c.n*2.2;return `<g class="node" data-concept="${k}" tabindex="0"><circle class="c" cx="${c.x}" cy="${c.y}" r="${r}" style="fill:${c.p?"var(--core-soft)":"var(--surface)"};stroke:${c.orphan?"var(--attn)":c.p?"var(--core)":"var(--faint)"};stroke-width:1.5;${c.orphan?"stroke-dasharray:4 3":""}"/>${c.p?`<circle cx="${c.x+r*.72}" cy="${c.y-r*.72}" r="4.5" style="fill:var(--asset)"/>`:""}<text x="${c.x}" y="${c.y+r+15}" text-anchor="middle" style="fill:var(--fg);font:500 12.5px var(--font-body)">${esc(c.ad)}</text><text x="${c.x}" y="${c.y+4}" text-anchor="middle" style="fill:var(--muted);font:500 11px var(--font-mono)">${c.n}</text></g>`}).join("");
    const edges=EDGES.map(([a,b])=>`<line x1="${CONCEPTS[a].x}" y1="${CONCEPTS[a].y}" x2="${CONCEPTS[b].x}" y2="${CONCEPTS[b].y}" style="stroke:var(--line);stroke-width:1.2"/>`).join("");
    const grid=Array.from({length:12},(_,k)=>`<line x1="${k*80}" y1="0" x2="${k*80}" y2="480" style="stroke:var(--meridian);stroke-width:1"/>`).join("");
    body=`<div class="netwrap tbl-wrap"><svg viewBox="0 0 920 480" role="img" aria-label="Kavram ağı" style="min-width:640px">${grid}${edges}${nodes}</svg><div class="legend"><span><i style="background:var(--core-soft);border:1.5px solid var(--core)"></i>Projeye bağlı</span><span><i style="border:1.5px solid var(--faint)"></i>Kavram</span><span><i style="background:var(--asset)"></i>Varlık doğurdu</span><span><i style="border:1.5px dashed var(--attn)"></i>Kimliksiz kartlardan</span></div></div>`;
  } else {
    const q=S.q.toLocaleLowerCase("tr");
    body=`<div class="panel tbl-wrap"><table class="t"><thead><tr><th>Kavram</th><th>Kart</th><th>Disiplin</th><th>Fonksiyon</th><th>Sektör</th><th>Projede</th></tr></thead><tbody>${CONCEPTS.filter(c=>!q||c.ad.toLocaleLowerCase("tr").includes(q)).sort((a,b)=>b.n-a.n).map(c=>`<tr><td class="nm">${esc(c.ad)}</td><td class="num mono">${c.n}</td><td>${esc(c.d)}</td><td>${esc(c.f)}</td><td>${esc(c.s)}</td><td>${c.p?'<span class="chip core">Evet</span>':c.orphan?'<span class="chip attn">Kimliksiz</span>':'<span class="muted small">—</span>'}</td></tr>`).join("")}</tbody></table></div>`;
  }
  const mt=S.mapTab, map=(M.maps&&M.maps[mt])||[];
  const unfilled=CONCEPTS.filter(c=>/belirlenecek/i.test(c.d+c.f+c.s)).length;
  return phead(`Katman 2–3 · Haritacı ajanı`,`Kavram evreni`,`Kartlar kavramlara, kavramlar dört haritaya bağlanır. Düğüm büyüklüğü kart sayısını gösterir.`,
   `${unfilled?askBtn("haritaci",`Eksenleri "belirlenecek" olan ${unfilled} kavramın disiplin, fonksiyon ve sektör eksenlerini öner.`,`${unfilled} kavramın eksenini doldur`,"btn"):""}<div class="seg" id="evrenMode"><button data-v="ag" class="${mode==="ag"?"on":""}">Ağ</button><button data-v="liste" class="${mode==="liste"?"on":""}">Üç eksenli liste</button></div>`)+body+
   `<div class="sect"><h2>Dört harita</h2><span class="note">Eskizlerdeki katman mantığı: alan → bölüm → kavram</span></div>
    <div class="tabs" id="mapTabs">${[["bilim","Bilim alanları"],["uni","Üniversiteler"],["sirket","Şirketler ve fonksiyonlar"],["varlik","Varlıklar"]].map(([v,l])=>`<button data-v="${v}" class="${mt===v?"on":""}">${l}</button>`).join("")}</div>
    ${map.length?`<div class="mapgrid">${map.map(([h,items],k)=>`<div class="mapcell"><div class="lbl">Katman ${k+1}</div><h4>${esc(h)}</h4><div class="opts">${items.map(i=>`<span class="tag">${esc(i)}</span>`).join("")}</div></div>`).join("")}</div>`
      :`<div class="emptyst"><div class="lbl">Harita boş</div><h3>Haritacı bu haritayı henüz doldurmadı</h3><p>Harita notu kasada <span class="mono">30-kavramlar/haritalar/</span> altında. Başlıklar katman, maddeler kavram olur.</p>${askBtn("haritaci",`"${({bilim:"Bilim alanları",uni:"Üniversiteler",sirket:"Şirketler ve fonksiyonlar",varlik:"Varlıklar"})[mt]}" haritasını kasadaki kartlar ve kavramlardan kur: ## katman başlıkları ve - madde kavramlarıyla öner.`,"Haritacıya kurdur","btn core")}</div>`}`;
};

V.kimlikler = ()=>{
  const mode=S.idMode;
  const seg=`<div class="seg" id="idMode"><button data-v="aile" class="${mode==="aile"?"on":""}">Aileler</button><button data-v="zaman" class="${mode==="zaman"?"on":""}">Zaman ekseni</button></div>`;
  let body="";
  if(mode==="aile"){
    body=famOrder.map((f,fi)=>{const ids=IDS.filter(i=>i.aile===f&&(!S.kim||i.slug===S.kim));if(!ids.length)return"";
      return `<details class="famsec fam-${FAMCLS[f]}" ${fi<3||S.kim?"open":""}><summary><span class="glyph"><span class="sh ${FAMCLS[f]}"></span></span><div><h3>${FAM[f].ad}</h3><div class="small muted">${FAM[f].not}</div></div><span class="tag">${FAM[f].dikey}</span><span class="mono small muted">${ids.length}</span><svg class="caret" width="12" height="8" viewBox="0 0 12 8"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></summary>
      <div class="idrows">${ids.map(i=>`<div class="idrow" role="button" tabindex="0" data-id="${esc(i.slug)}" style="cursor:pointer"><div><div class="nm">${esc(i.ad)}</div><div class="ctx">${esc(i.baglam)}</div></div><div class="q">${esc(i.soru)}</div><div>${i.evre?`<span class="chip core plain">${STAGE_AD[i.evre]}</span>`:`<span class="chip plain" style="background:none;border:1px dashed var(--line);color:var(--faint)">Belirlenecek</span>`}</div><div class="last ${i.son===null||i.son>30?"cold":""}">${i.son===null?"kayıt yok":i.son===0?"bugün":i.son+" gün önce"}</div></div>`).join("")}</div></details>`}).join("");
  } else {
    const z=k=>IDS.filter(i=>i.zaman===k);
    body=`<div class="timeline"><div class="tc"><div class="lbl">Kök · geçmiş</div><h3>Nereden geliyorum</h3><div class="opts">${z("kok").map(i=>idb(i.slug)).join("")}</div><p class="small muted" style="margin:0">Bugünü okutan birikim. Evresi ölçülmez, kanıtla görünür.</p></div>
      <div class="tc"><div class="lbl">Güncel</div><h3>Bugün kimim</h3><div class="opts">${z("guncel").map(i=>idb(i.slug)).join("")}</div></div>
      <div class="tc"><div class="lbl">Hedef · gelecek</div><h3>Kime dönüşüyorum</h3><div class="opts">${z("hedef").map(i=>idb(i.slug)).join("")}${LIVE()?"":`<span class="idb fam-aka" style="border-style:dashed;background:none"><span class="sh aka"></span>Doçent</span>`}</div>${LIVE()?"":`<p class="small muted" style="margin:0">Kesik çizgili: henüz kimlik kartı açılmadı.</p>`}</div></div>`;
  }
  const syn=(M.syn||[]).filter(([ids])=>ids.every(s=>ID[s]));
  return phead(`Katman 4 · Kimlik yönlendirici`,`Kimlikler`,`${IDS.length} kimlik, beş aile. Her kayıt bir birincil kimliğe bağlanır; kimliksiz kayıt öğrenmeye ve üretime giremez.`,seg)+body+
   `<div class="sect"><h2>Sinerji kesişimleri</h2><span class="note">İki üç kimliğin buluştuğu, tek başına hiçbirinin göremediği alanlar</span><span class="r">${askBtn("proje-mimari","Kimlik kesişimlerinden yeni sinerji alanları ve birer hikaye kartı taslağı öner.","Proje mimarına sor","btn sm")}</span></div>
    ${syn.length?`<div class="syn">${syn.map(([ids,t,n])=>`<div class="syncard"><div class="venn">${ids.map(s=>`<span class="fam-${FAMCLS[ID[s].aile]}" title="${esc(ID[s].ad)}">${esc(ID[s].ad.slice(0,2).toLocaleUpperCase("tr"))}</span>`).join("")}</div><div class="arrow">${esc(t)}</div><div class="opts">${ids.map(s=>idb(s)).join("")}</div><div class="tiny muted mono">${esc(n)}</div></div>`).join("")}</div>`:`<div class="emptyst"><p>Kesişim yok. <span class="mono">30-kavramlar/haritalar/proje-uretici.md</span> içine "A + B → alan" satırı ekle.</p></div>`}`;
};

V.yetenekler = ()=>{
  const gaps=gapSkills().slice().sort((a,b)=>gapRank(b)-gapRank(a)||a.kanit-b.kanit).slice(0,3);
  const usedIn=ad=>PROJ.filter(p=>(p.rings[2]||[])[1]&&p.rings[2][1].includes(ad)).map(p=>p.baslik);
  const byId={};SK.filter(s=>pass({kim:s.kim})).forEach(s=>(byId[s.kim]=byId[s.kim]||[]).push(s));
  const measured=SK.filter(s=>s.evre||s.hedef).length;
  const gapHtml=gaps.length?`<div class="gaps">${gaps.map((g,k)=>{const u=usedIn(g.ad),m=MODS.find(x=>x.hedef.includes(g.ad));return `<div class="gap"><div style="display:flex;align-items:baseline;gap:12px"><span class="rk">${k+1}</span><div><div class="nm">${esc(g.ad)}</div><div style="margin-top:4px">${idb(g.kim)}</div></div></div><div style="display:flex;align-items:center;gap:10px">${stage(g.evre,g.hedef)}<span class="mono tiny muted">${g.evre?STAGE_AD[g.evre]:"Belirlenecek"} → ${STAGE_AD[g.hedef]} · ${g.kanit} kanıt</span></div><p class="small muted" style="margin:0">${u.length?`${u.join(", ")} bu yeteneğe dayanıyor; kanıt ${g.kanit}.`:g.kanit?`${g.kanit} kanıt var; henüz bir projede kullanılmıyor.`:"Hiç kanıt yok."}</p><div class="agentbox" style="padding:10px 12px"><div class="who"><i>HC</i>Hoca önerisi</div><div style="font-weight:600;font-size:14.5px;margin:6px 0 8px">${m?`Modül: ${esc(m.ad)}`:"Bu açık için modül yok"}</div>${m?`<button class="btn sm acc" style="background:var(--agent);color:var(--surface);border-color:var(--agent)" data-nav="ogrenme">Öğrenmede aç</button>`:askBtn("hoca",`"${g.ad}" yeteneğini ${g.evre?STAGE_AD[g.evre]:"başlangıç"} evresinden ${STAGE_AD[g.hedef]} evresine taşıyacak 3–5 birimlik bir modül tasarla; kapanış projesini bağla.`,"Modül tasarlat","btn sm acc")}</div></div>`}).join("")}</div>`
    :`<div class="emptyst"><div class="lbl">Açık ölçülmedi</div><h3>${measured?"Açık görünmüyor":"Yetenek evreleri henüz belirlenmedi"}</h3><p>${measured?"Ölçülen her yetenek hedef evresinde.":`${SK.length} yetenek evre ve hedef evre bekliyor. Yetenek ölçer kanıtlara bakarak önerir; sen onaylarsın.`}</p>${askBtn("yetenek-olcer","Kimlik kimlik ilerleyerek yeteneklerin bugünkü evresini ve hedef evresini birlikte belirleyelim. Önce en aktif 3 kimlikle başla; kanıt sorup öneri bloğu ver.","Yetenek ölçerle başla","btn core")}</div>`;
  return phead(`Katman 5 · Yetenek ölçer`,`Yetenekler`,`Evre çırak, yaratıcı-aktif, usta. Dolu çubuk bugünkü evre, kesik çubuk hedef. Taralı çubuk: evre henüz ölçülmedi.`,askBtn("yetenek-olcer","Yetenek açığı raporu çıkar: en büyük açıklar, kanıt durumu ve bir sonraki kanıt için öneri.","Açık raporu","btn"))+
   `<div class="sect" style="margin-top:0"><h2>En büyük üç açık</h2><span class="note">Hoca ajanı her açık için modül önerir</span></div>${gapHtml}
    <div class="sect"><h2>Kimlik başına</h2><span class="note">${gapSkills().length} yetenekte açık var · ${SK.length} yetenek</span></div>
    <div class="panel">${`<div class="skrow h"><span>Yetenek</span><span>Evre → hedef</span><span>Durum</span><span>Kanıt</span><span>Son kanıt</span></div>`}${Object.entries(byId).map(([kim,arr])=>`<div style="padding:12px 18px 4px;border-bottom:1px solid var(--line-2);background:var(--sunken)">${idb(kim)}</div>`+arr.map(s=>`<div class="skrow"><span style="font-weight:600">${esc(s.ad)}</span><span style="display:flex;align-items:center;gap:8px">${stage(s.evre,s.hedef)}</span><span class="evr">${s.evre?STAGE_AD[s.evre]:"Belirlenecek"}${s.hedef&&s.evre!==s.hedef?` → ${STAGE_AD[s.hedef]}`:""}</span><span class="mono num" style="${s.kanit===0?"color:var(--attn)":""}">${s.kanit}</span><span class="small muted">${esc(s.son)}</span></div>`).join("")).join("")}</div>`;
};

function term(){const m=TODAY.getMonth();return `${TODAY.getFullYear()} ${m>=8?"güz":m>=1&&m<=5?"bahar":m<1?"güz":"yaz"} dönemi`}
V.ogrenme = ()=>{
  const ms=MODS.filter(m=>pass(m));
  const stc={devam:'<span class="chip core">Devam</span>',planli:'<span class="chip">Planlı</span>',tamam:'<span class="chip ok">Tamamlandı</span>',oneri:'<span class="chip agent">Hoca önerisi</span>'};
  return phead(`Katman 6 · Hoca ajanı`,`Öğrenme`,`Kişisel üniversite, ${term()}. Her modül bir yetenek açığından doğar ve bir kapanış projesiyle biter.`,askBtn("hoca","En büyük üç yetenek açığı için müfredat ve modül planı kur; kaynakları kasadaki kaynak ve kartlardan seç.","Hoca'ya müfredat kurdur","btn"))+
   `<div class="flow"><div><div class="n">01</div><h4>Müfredat</h4><div class="small muted">Yetenek açıklarından kurulur</div></div><div><div class="n">02</div><h4>Modül</h4><div class="small muted">Birimler, kaynaklar, kartlar</div></div><div><div class="n">03</div><h4>Kanıt</h4><div class="small muted">Yetenek evresini ilerletir</div></div><div><div class="n" style="color:var(--asset)">04</div><h4>Kapanış projesi</h4><div class="small muted">Varlığa giden ilk adım</div></div></div>
   <div class="sect"><h2>Modüller</h2><span class="note">${ms.filter(m=>m.durum==="devam").length} aktif · ${ms.length} toplam</span></div>
   ${ms.length?`<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">${ms.map(m=>{const tot=m.units.length,dn=m.units.filter(u=>u[1]===2).length+m.units.filter(u=>u[1]===1).length*.5;return `<div class="mod" ${m.durum==="oneri"?'style="background:var(--agent-soft);border-color:color-mix(in srgb,var(--agent) 30%,transparent)"':""}><div style="display:flex;justify-content:space-between;gap:8px;align-items:center">${stc[m.durum]||`<span class="chip">${esc(m.durum)}</span>`}${side(m.taraf)}</div><h3 style="font-size:19px">${esc(m.ad)}</h3><div class="small"><span class="lbl">Hedef yetenek</span><div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap;align-items:center"><b style="font-weight:600">${esc(m.hedef)}</b>${idb(m.kim)}</div></div>${tot?`<ul class="units">${m.units.map(u=>`<li class="${u[1]===2?"done":u[1]===1?"cur":""}"><i></i>${esc(u[0])}</li>`).join("")}</ul>`:`<p class="small muted" style="margin:0">Birimler tanımlanmadı.</p>`}<div class="prog"><i style="width:${tot?dn/tot*100:0}%"></i></div><div class="opts">${m.kaynak.map(k=>`<span class="tag">${esc(k[0])} · ${esc(k[1])}</span>`).join("")}</div><div class="small" style="border-top:1px dashed var(--line);padding-top:8px;display:flex;justify-content:space-between;gap:8px"><span class="muted">Kapanış projesi</span><b style="color:var(--asset);font-weight:600">→ ${esc(m.cikti)}</b></div>${m.durum==="oneri"?`<div style="display:flex;gap:6px"><button class="btn sm" style="background:var(--agent);color:var(--surface);border-color:var(--agent)" data-toast="Modül planlı olarak eklendi">Kabul et</button><button class="btn sm ghost" data-toast="Öneri reddedildi">Reddet</button></div>`:""}</div>`}).join("")}</div>`:`<div class="emptyst"><h3>Bu filtreyle modül yok</h3><p>Hoca, yetenek açıklarından modül önerir.</p></div>`}`;
};

V.projeler = ()=>{
  const ps=PROJ.filter(pass);
  const mx=M.matrix||[];
  return phead(`Katman 6 · Proje mimarı`,`Projeler`,`Her proje altı halkalı bir hikaye kartıdır. Halkası boş olan proje başlamaz; eksik halka kırmızı ve kesik çizgiyle görünür.`,askBtn("proje-mimari","Proje üretici matrisi ve sinerji kesişimlerinden bir hikaye kartı taslağı öner: altı halkayı kasadaki kayıtlarla doldur, boş kalanı açıkça söyle.","Kesişimden proje öner","btn"))+
   `<div class="grid">${ps.map(p=>{const f=filled(p);const miss=p.rings.filter(r=>!r[2]).map(r=>r[0]);return `<article class="story-card" id="p-${esc(p.id)}"><div class="sc-h"><div style="flex:1;min-width:220px"><div class="lbl">Hikaye kartı · ${f}/6 halka</div><h3 style="margin-top:4px">${esc(p.baslik)}</h3><div class="small muted">${esc(p.alt)}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px"><span class="pstate">${PSTATES.map(([v,l])=>`<i class="${p.durum===v?"on":""}">${l}</i>`).join("")}</span><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">${idb(p.kim)}${p.kim2?idb(p.kim2):""}${side(p.taraf)}</div></div></div>
      <div class="sc-b">${chain(p.rings)}</div>
      <div class="sc-f"><span class="transfer"><svg width="18" height="12" viewBox="0 0 18 12"><path d="M1 4h14l-3-3M17 8H3l3 3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><b style="font-weight:600">Aktarım notu:</b> ${esc(p.not||"—")}</span>${miss.length?askBtn("proje-mimari",`"${p.baslik}" projesinin boş halkalarını (${miss.join(", ")}) doldurmak için öneri ver: gerekirse Hoca'nın modülünü ve Portföy yöneticisinin varlık kaydını taslakla.`,"Boş halkayı doldur","btn sm"):""}<span style="margin-left:auto" class="tiny mono muted">${esc(p.kesisim)}</span></div></article>`}).join("")||`<div class="emptyst"><h3>Bu filtreyle proje yok</h3><p>Kimlik ya da taraf filtresini kaldır.</p></div>`}</div>
    <div class="sect"><h2>Proje üretici matrisi</h2><span class="note">Varlık sınıfı × taraf. Kalın: hikaye kartı açık.</span></div>
    ${mx.length?`<div class="panel tbl-wrap"><table class="t"><thead><tr><th>Varlık sınıfı</th><th><span class="side k"><i></i>Kişisel</span></th><th><span class="side s"><i></i>Şirket</span></th></tr></thead><tbody>${mx.map(r=>`<tr><td class="nm">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table></div>`:`<div class="emptyst"><p>Matris notu boş: <span class="mono">30-kavramlar/haritalar/proje-uretici.md</span></p></div>`}`;
};

V.varliklar = ()=>{
  const cfL={in:"Nakit girer",out:"Nakit çıkar",val:"Değer biriktirir",none:"Veri yok"};
  const cell=(arr,sd)=>`<div class="cell" data-side="${sd}">${arr.filter(a=>!S.kim||a[2]===S.kim).length?arr.filter(a=>!S.kim||a[2]===S.kim).map(a=>`<div class="arow"><span>${esc(a[0])}</span><span class="cf ${a[1]}">${cfL[a[1]]}</span></div>`).join(""):`<span class="empty">Boş · proje üretici aday arıyor</span>`}</div>`;
  const showK=S.taraf!=="sirket", showS=S.taraf!=="kisisel";
  return phead(`Katman 7 · Portföy yöneticisi`,`Varlıklar`,`Beş varlık sınıfı, iki taraf. Her varlıkta nakit akışı ve değerleme katkısı. Kişisel emekle üretilen ile şirket kaynağıyla üretilen ayrı satırda durur.`,askBtn("portfoy-yoneticisi","Projelerden doğan ya da doğacak varlıkları tara; eksik varlık kayıtlarını ve nakit akışı / değerleme katkısı alanlarını öner.","Portföyü güncelle","btn"))+
   `<div class="amx"><div class="hd">Sınıf</div><div class="hd c"><span class="side k"><i></i>Kişisel</span></div><div class="hd c"><span class="side s"><i></i>Şirket</span></div>
    ${Object.values(ASSETS).map(a=>`<div><div class="cls">${a.ad}<small>${a.en}</small></div></div>${showK?cell(a.k,"Kişisel"):'<div class="cell" data-side="Kişisel"><span class="empty">Filtre dışında</span></div>'}${showS?cell(a.s,"Şirket"):'<div class="cell" data-side="Şirket"><span class="empty">Filtre dışında</span></div>'}`).join("")}</div>
   <div class="sect"><h2>Sicil</h2><span class="note">Entelektüel varlıklar ve yenileme tarihleri · Sicil tutucu, katman 10</span><span class="r">${askBtn("sicil-tutucu","Sicili gözden geçir: eksik kanıtlar, yaklaşan yenilemeler ve doçentlik kategorisi eşleşmeleri.","Sicil tutucuya sor","btn sm")}</span></div>
   <div class="panel tbl-wrap"><table class="t"><thead><tr><th>Kayıt</th><th>Tür</th><th>Kanıt</th><th>Kimlik</th><th>Geçerlilik</th></tr></thead><tbody>${SICIL.filter(s=>!S.kim||s[5]===S.kim).map(s=>`<tr><td class="nm">${esc(s[0])}</td><td><span class="tag">${esc(s[1])}</span></td><td class="small muted">${esc(s[2])}</td><td>${s[5]?idb(s[5]):'<span class="muted small">—</span>'}</td><td>${s[4]!=null?`<span class="chip warn">${esc(/^\d{4}/.test(s[3])?fmtIso(s[3]):s[3])} · ${s[4]} gün</span>`:`<span class="mono small">${esc(s[3])}</span>`}</td></tr>`).join("")||`<tr><td colspan="5" class="muted small">Sicil kaydı yok.</td></tr>`}</tbody></table></div>`;
};

V.yayin = ()=>{
  const start=addDays(-7-((TODAY.getDay()+6)%7));
  const days=Array.from({length:21},(_,k)=>{const d=new Date(start);d.setDate(d.getDate()+k);return d});
  const evCls={yayinda:"",onay:"appr",taslak:"draft",fikir:"draft"};
  const cal=`<div class="cal">${["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"].map(d=>`<div class="dh">${d}</div>`).join("")}${days.map(d=>{const evs=CONTENT.map((c,i)=>[c,i]).filter(([c])=>c.d===iso(d)&&pass({kim:c.kim}));const today=iso(d)===iso(TODAY);return `<div class="dc ${today?"today":""} ${evs.length?"":"noev"}"><span class="d">${d.getDate()} ${d.toLocaleDateString("tr-TR",{month:"short"})}</span>${evs.map(([c,i])=>`<button class="ev ${c.flag?"flag":evCls[c.st]}" data-content="${i}" title="${esc(c.t)}">${esc(c.ch)} · ${esc(c.t)}</button>`).join("")}</div>`}).join("")}</div>`;
  const undated=CONTENT.map((c,i)=>[c,i]).filter(([c])=>!c.d);
  const grp=(t,k)=>`<div class="lbl" style="margin:14px 0 8px">${t}</div><div class="chans">${CHANNELS.filter(c=>c[1]===k).map(c=>`<div class="chan ${k==="teknik"?"tek":k==="egitim"?"egt":""}"><div class="cn"><i></i>${c[0]}</div><div class="mono tiny muted">${c[2]}</div><div class="small muted">${c[3]}</div></div>`).join("")}</div>`;
  const cnt=b=>CONTENT.filter(c=>c.bas===b).length;
  return phead(`Katman 8 · Yayın planlayıcı · Editör`,`Yayın`,`Kart, günün kartına; günün kartı bültene; bülten seriye; seri kalıcı esere döner. Her içerik yayından önce uyum onaylarından geçer.`,`${askBtn("editor","Hazır kartlardan bir günün kartı taslağı derle; uyum alanlarını (TBB, SPK, rekabet, alıntı) değerlendir.","Günün kartı yaz","btn")}${askBtn("yayin-planlayici","Onaylı ve taslak içerikleri 4 haftalık takvime yerleştir; kanal ritmine uy, hiçbir şey yayınlama.","4 haftalık takvim","btn")}`)+
   `<div class="ladder">${[["Kart",CARDS.length,"tek fikir"],["Günün kartı",cnt("Günün kartı"),"LinkedIn"],["Bülten",cnt("Bülten"),"iki haftada 1"],["Seri",cnt("Seri"),"makale serisi, veri"],["Kalıcı",cnt("Kalıcı"),"kitap, kurs, araç"]].map((r,k)=>`<div class="rung"><span class="n">${k+1}</span><h4>${r[0]}</h4><span class="big num">${r[1]}</span><span class="small muted">${r[2]}</span></div>`).join("")}</div>
   <div class="sect"><h2>Takvim</h2><span class="note">${fmtDate(days[0])} – ${fmtDate(days[20])} · tıkla, uyum onaylarını gör</span><span class="r" style="display:flex;gap:10px;flex-wrap:wrap"><span class="chip asset">Yayında</span><span class="chip core">Onayda</span><span class="chip plain">Taslak</span><span class="chip attn">Uyum eksik</span></span></div>${cal}
   ${undated.length?`<div class="sect"><h2>Tarihsiz</h2><span class="note">Yayın planlayıcı tarih önerir</span></div><div class="opts">${undated.map(([c,i])=>`<button class="ev ${c.flag?"flag":evCls[c.st]}" style="width:auto" data-content="${i}">${esc(c.ch)} · ${esc(c.t)}</button>`).join("")}</div>`:""}
   <div class="sect"><h2>Kanallar</h2></div>${grp("Medya","medya")}${grp("Teknik vitrin · Depo sorumlusu","teknik")}${grp("Eğitim","egitim")}`;
};

V.kopru = ()=>{
  const rows=[["Kavram","Kişisel kavram evreni","Sektör ve iş kavramları"],["Kategori","Kimlikler ve dikeyler","Sektör, fonksiyon, iş kolu"],["Yetenek","Kişisel yetenekler ve evreleri","Kurumsal yetkinlikler ve ekip"],["Öğrenme","Kişisel üniversite","Ekip eğitimi ve süreç bilgisi"],["Proje","Kişisel projeler","Şirket projeleri"],["Varlık","Kişisel bilanço ve entelektüel varlıklar","Şirket bilançosu ve portföy"],["Marka","Kişisel marka","Şirket markası"]];
  const stChip=s=>/onay/i.test(s)?`<span class="chip ok">${esc(s)}</span>`:/engel/i.test(s)?`<span class="chip attn">${esc(s)}</span>`:/planl/i.test(s)?`<span class="chip">${esc(s)}</span>`:`<span class="chip warn">${esc(s)}</span>`;
  const tr=M.transfers||[];
  const sideCount=arr=>[arr.filter(x=>x.taraf!=="sirket").length,arr.filter(x=>x.taraf==="sirket").length];
  const bud=LIVE()?[["Kart",...sideCount(CARDS),"kayıt"],["Modül",...sideCount(MODS),"kayıt"],["Proje",...sideCount(PROJ),"kayıt"]]:[["Zaman",14,46,"sa"],["Derin dikkat",4,9,"oturum"],["Öğrenme",5,1,"sa"]];
  return phead(`Ayrım katmanı`,`Köprü · Wisy ve Vibe Management`,`Aynı zincir iki tarafta ayrı işler. Taraflar birbirini besler; kayıt, kaynak ve sahiplik ayrı tutulur.`,`<span class="side k"><i></i>Wisy · kişi</span><span class="muted">⇄</span><span class="side s"><i></i>MTFG Ana Merkez · şirket</span>`)+
   `<div class="bridge tbl-wrap"><div class="bh blank"></div><div class="bh w"><span class="side k"><i></i></span>Wisy · kişi</div><div class="bh blank"></div><div class="bh v"><span class="side s"><i></i></span>Vibe Management · şirket</div>
    ${rows.map(r=>`<div class="rk">${r[0]}</div><div>${r[1]}</div><div class="mid">⇄</div><div>${r[2]}</div>`).join("")}</div>
   <div class="grid g2" style="margin-top:18px">
    <section class="panel"><div class="ph"><h3>Aktarımlar</h3><span class="r lbl">kişiden şirkete ve geri</span></div><div class="tbl-wrap"><table class="t"><thead><tr><th>Ne</th><th>Yön</th><th>Dayanak</th><th>Durum</th></tr></thead><tbody>
      ${tr.map(t=>`<tr><td class="nm">${esc(t[0])}</td><td class="mono small">${esc(t[1])}</td><td class="small">${esc(t[2])}</td><td>${stChip(t[3])}</td></tr>`).join("")||`<tr><td colspan="4" class="small muted">Aktarım kaydı yok. Kayıtlara <span class="mono">aktarim:</span> alanı eklenince burada görünür.</td></tr>`}
    </tbody></table></div></section>
    <section class="panel"><div class="ph"><h3>${LIVE()?"Kayıt dengesi":"Haftalık bütçe"}</h3><span class="r lbl">${LIVE()?"kasadaki kayıtlar":"19–25 Ekim · örnek"}</span></div><div class="pb budget">
      ${bud.map(b=>`<div class="bud"><span style="font-weight:600">${b[0]}</span><span class="tr"><i class="k" style="width:${b[1]+b[2]?b[1]/(b[1]+b[2])*100:0}%"></i><i class="s" style="width:${b[1]+b[2]?b[2]/(b[1]+b[2])*100:0}%"></i></span><span class="mono small muted">${b[1]} / ${b[2]} ${b[3]}</span></div>`).join("")}
      <div style="display:flex;gap:14px" class="small"><span class="side k"><i></i>Kişisel</span><span class="side s"><i></i>Şirket</span></div>
      <p class="small muted" style="margin:0">${LIVE()?"Zaman ve dikkat bütçesi kasaya haftalık kayıt olarak girildiğinde burada iki taraf ayrı izlenir.":"Kişisel taraf hedefi haftada en az 12 saat. Biri diğerini sessizce tüketmez."}</p></div></section></div>
   <div class="grid g3" style="margin-top:16px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${[["Ayrım","Çift etiket","Her kart, proje ve varlık kişisel ya da şirket olarak etiketlenir. Ortak olanlar birincil taraf seçer."],["Kaynak","Zaman, para, dikkat","İki tarafın haftalık bütçesi ayrı izlenir."],["Sahiplik","Varlık kimin?","Ortak IP sözleşmeyle belgelenir. Meridyen kişiseldir; şirkete giden modüller sözleşmeyle aktarılır."],["Köprü","Neyin geçtiği","Kişiden şirkete yetenek, itibar ve ağ; şirketten kişiye deneyim ve vaka. Gizli bilgi geçmez."]].map(c=>`<div class="panel pb"><div class="lbl">${c[0]}</div><h3 style="font-size:17px;margin:4px 0 6px">${c[1]}</h3><p class="small muted" style="margin:0">${c[2]}</p></div>`).join("")}</div>`;
};

V.muhasebe = ()=>{
  const q=Math.floor(TODAY.getMonth()/3)+1;
  if(!LIVE()) return muhasebeOrnek();
  const A=M.activity||{};
  const rows=IDS.filter(i=>i.yet.length).map(i=>{const a=A[i.slug]||{q:0,pq:0,kanit:0};return [i.slug,a.q-a.pq,a.q,a.pq,a.kanit]}).sort((a,b)=>b[1]-a[1]||b[2]-a[2]);
  const active=IDS.filter(i=>(A[i.slug]||{}).q>0).length, cold=IDS.filter(i=>i.yet.length&&(i.son==null||i.son>30)).length;
  const kanit=SK.reduce((a,s)=>a+s.kanit,0), toAsset=PROJ.filter(p=>p.rings[5]&&p.rings[5][2]).length;
  const up=rows.find(r=>r[1]>0), dn=rows.slice().reverse().find(r=>r[2]===0&&ID[r[0]]);
  const title=up&&dn?`${ID[up[0]].ad.split(" ")[0]} büyüdü, ${ID[dn[0]].ad.split(" ")[0].toLocaleLowerCase("tr")} sustu`:"Çeyreğin ilk kayıtları";
  return phead(`Çeyreklik rapor · Kimlik yönlendirici · Yetenek ölçer`,`Kimlik muhasebesi`,`${TODAY.getFullYear()} ${q}. çeyrek. Hangi kimlik büyüdü, hangisi ihmal edildi, hangi kesişim değer üretti.`,askBtn("orkestrator","/kimlik-muhasebesi: Bu çeyreğin kimlik muhasebesini yaz. Kasadaki kayıt, kanıt ve proje verisine dayan; büyüyen, ihmal edilen kimlikleri ve değer üreten kesişimi anlat, gelecek çeyrek için üç karar öner.","Raporu Claude ile yaz","btn core"))+
  `<article class="report"><div class="eyebrow">${q}. çeyrek · ${TODAY.getFullYear()} · kasadan hesaplandı</div><h2>${esc(title)}</h2>
   <p>Bu çeyrekte ${active} kimlik en az bir kayıt üretti; ${cold} kimlik 30 günden uzun süredir sessiz. Anlatıyı Claude yazar: sağ üstteki düğme raporu kasadaki kayıtlardan derler ve Çıktı kütüphanesine kaydedilebilir.</p>
   <div class="kv"><div><div class="lbl">Aktif kimlik</div><div class="v num">${active}<span class="muted" style="font-size:18px">/${IDS.length}</span></div></div><div><div class="lbl">İhmal edilen</div><div class="v num">${cold}</div></div><div><div class="lbl">Kanıt (toplam)</div><div class="v num">${kanit}</div></div><div><div class="lbl">Varlığa dönen</div><div class="v num">${toAsset}</div></div></div>
   <h3>Kimlik bazında hareket</h3>
   <div class="tbl-wrap"><table class="t"><thead><tr><th>Kimlik</th><th>Kayıt farkı</th><th>Bu çeyrek</th><th>Önceki</th><th>Kanıt</th></tr></thead><tbody>${rows.slice(0,10).map(r=>`<tr><td>${idb(r[0])}</td><td><span class="delta ${r[1]>0?"up":r[1]<0?"dn":""}">${r[1]>0?"+":r[1]<0?"−":""}${Math.abs(r[1])}</span></td><td class="mono">${r[2]}</td><td class="mono muted">${r[3]}</td><td class="mono">${r[4]}</td></tr>`).join("")}</tbody></table></div>
   <h3>Değer üreten kesişim</h3>
   <p>${(M.syn||[]).find(s=>/Proje/.test(s[2]))?`<b>${esc(M.syn.find(s=>/Proje/.test(s[2]))[0].map(s=>ID[s]?ID[s].ad:s).join(" + "))}.</b> ${esc(M.syn.find(s=>/Proje/.test(s[2]))[1])} bir hikaye kartına dönüştü.`:"Henüz projeye dönüşen kesişim yok."}</p>
  </article>`;
};
function muhasebeOrnek(){
  const rows=[["ai","+9","Commerce Engine ve Meridyen ajanı kanıtları","up"],["akademisyen","+6","Tez bölümleri, COP31 bildiri taslağı","up"],["uluslararasi","+5","Günlük okuma kartlara dönüşmeye başladı","up"],["egitmen","0","Hedef kimlik; modül planlı ama başlamadı","dn"],["doga","−4","41 gündür kayıt yok","dn"],["ykuye","−2","Kapalı rapor dışında iz yok","dn"]];
  return phead(`Çeyreklik rapor · Kimlik yönlendirici · Yetenek ölçer`,`Kimlik muhasebesi`,`Temmuz–Eylül 2026. Hangi kimlik büyüdü, hangisi ihmal edildi, hangi kesişim değer üretti.`)+
  `<article class="report"><div class="eyebrow">3. çeyrek · 2026 · örnek rapor</div><h2>Mimar büyüdü, yürüyüşçü sustu</h2>
   <p>Çeyreğin en hızlı büyüyen kimliği AI sistem mimarı oldu: ajan tasarımında yaratıcı-aktif evrede yedi kanıt birikti. Akademisyen kimliği tezle birlikte istikrarlı ilerledi. Buna karşılık kişisel ailedeki Doğa insanı kimliği çeyreğin son altı haftasında hiç kayıt üretmedi.</p>
   <div class="kv"><div><div class="lbl">Aktif kimlik</div><div class="v num">14<span class="muted" style="font-size:18px">/19</span></div><span class="delta up">+2</span></div><div><div class="lbl">İhmal edilen</div><div class="v num">3</div><span class="delta dn">+1</span></div><div><div class="lbl">Yeni kanıt</div><div class="v num">31</div><span class="delta up">+8</span></div><div><div class="lbl">Varlığa dönen</div><div class="v num">2</div><span class="delta up">+1</span></div></div>
   <h3>Kimlik bazında hareket</h3>
   <div class="tbl-wrap"><table class="t"><thead><tr><th>Kimlik</th><th>Kanıt farkı</th><th>Not</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${idb(r[0])}</td><td><span class="delta ${r[3]}">${r[1]}</span></td><td class="small">${r[2]}</td></tr>`).join("")}</tbody></table></div>
   <h3>Değer üreten kesişim</h3>
   <p><b>Uluslararası ilişkiler + tahkim uzmanı + akademisyen.</b> Politik risk kavramı üç kimlikten beslendi; Meridyen'in politik risk modülü ve tezin üçüncü bölümü aynı kart kümesinden çıktı.</p>
   <h3>Gelecek çeyrek için üç karar</h3>
   <ol class="small" style="padding-left:20px;color:var(--fg-2);display:grid;gap:6px"><li>Savunma sanayii hukuku projesi için öğrenme halkasını aç: ihracat kontrol mevzuatı modülü.</li><li>Eğitmen kimliğinde ilk kanıtı üret: kurs omurgasının ilk birimi.</li><li>Doğa insanı için ayda iki rota kartı; ritmi kanıtla görünür kıl.</li></ol>
  </article>`;
}

V.omurga = ()=>{
  const sw=(n,hex,v,note,w)=>`<div class="swc ${w?"wisy":""}"><div class="c" style="background:${v}"></div><div class="m"><b>${n}</b><span>${hex}</span>${note?`<div class="tiny muted" style="margin-top:2px">${note}</div>`:""}</div></div>`;
  const mini=(mk,col,name,acc)=>`<div class="mini"><div class="r" style="color:${col}"><span class="mk" style="background:${col}">${mk}</span><i class="a"></i><i></i><i></i><i></i><i></i></div><div class="b"><span class="e" style="color:${acc}">${name}</span><span class="h">Günaydın Ferhan. Bugün hangi <em style="color:${acc}">${mk==="M"?"şirketi":"kimliği"}</em> ileri taşıyoruz?</span><div class="tl"><span class="${mk==="M"?"n":""}"></span><span></span><span></span><span class="${mk==="W"?"n":""}"></span></div></div></div>`;
  const comp=(demo,t,d)=>`<div class="panel"><div class="demo">${demo}</div><div class="cap"><b>${t}</b>${d}</div></div>`;
  const famPick=famOrder.map(f=>(IDS.find(i=>i.aile===f)||{}).slug).filter(Boolean);
  const demoProj=PROJ.find(p=>filled(p)<6)||PROJ[0];
  const plan=[
    ["0","Tasarım omurgası","v1","Token, yazı, kabuk, bileşen","—"],["1","Pano","v1","Ana hikaye sayıları, dikkat listesi, ritim, kimlik dengesi","Bültenci · Kimlik yönlendirici"],
    ["2","Kartlar ve hızlı kart","v1","Kart: başlık, tema, kimlik, taraf, durum, kaynak, sayfa, bekleme","Bültenci"],["3","Kimlikler","v1","Kimlik: ad, aile, dikey, evre, ana soru, sınır, kanal","Kimlik yönlendirici"],
    ["4","Projeler · hikaye kartı","v1","Proje: altı halka, taraf, durum, aktarım notu","Proje mimarı"],["5","Yetenekler","v1","Yetenek: evre, hedef evre, kanıt, son kanıt","Yetenek ölçer"],
    ["6","Öğrenme","v1","Modül: hedef yetenek, birimler, kaynak, kapanış projesi","Hoca"],["7","Varlıklar ve sicil","v1","Varlık: sınıf, taraf, nakit akışı, değerleme; sicil: geçerlilik","Portföy yöneticisi · Sicil tutucu"],
    ["8","Yayın","v1","İçerik: kanal, basamak, durum, uyum onayları, tarih","Yayın planlayıcı · Editör"],["9","Kavram evreni","v1","Kavram: kart sayısı, üç eksen, dört harita","Haritacı"],
    ["10","Köprü","v1","Aktarım, dayanak, taraf dengesi","—"],["11","Kimlik muhasebesi","v1","Çeyreklik kayıt farkı, ihmal, kesişim","Kimlik yönlendirici · Yetenek ölçer"],
    ["12","Wisy Stüdyo","v1","Komut satırı, ajan seçimi, akışlar, öneri kutuları, oturumlar","Orkestratör + 12 ajan"]
  ];
  return phead(`Tasarım omurgası`,`Tek aile, iki merkez`,`Wisy, MTFG Ana Merkez'in kabuğunu, yazı sistemini ve paletini paylaşır. Fark tek bir renktir: MTFG'nin vurgusu kırmızı, Wisy'ninki deniz yeşili. Paneller bu omurganın üzerinde tek tek detaylandırılır.`)+
  `<div class="cmp">${mini("M","#BC2F2C","MTFG Ana Merkez · şirket","#8A1F1D")}${mini("W","#12807A","Wisy · kişi","var(--wisy)")}</div>
   <p class="small muted" style="margin:8px 0 0">Aynı ray, aynı başlık dili, aynı tile. MTFG'de koyu tile ilk sırada (Networth), Wisy'de son sırada (Varlıklar): hikaye kavramdan başlar, varlıkta biter.</p>
   <div class="sect"><h2>Renk</h2><span class="note">MTFG paleti olduğu gibi; tek yeni renk çerçeveli</span></div>
   <div class="sw">
    ${sw("Wisy deniz yeşili","#0E6B68 · koyu #4FB7AA","#0E6B68","Vurgu, çekirdek halkalar, kişisel taraf",1)}${sw("Lacivert","#0A2240","#0A2240","Ray, birincil buton, varlık, şirket tarafı")}${sw("Kâğıt","#FAFAF7","#FAFAF7","Sayfa zemini")}${sw("Yüzey","#FFFFFF","#FFFFFF","Kart ve panel")}${sw("Çökük","#F3F2EE","#F3F2EE","Sütun, alt bilgi")}
    ${sw("Kırmızı","#BC2F2C","#BC2F2C","MTFG'de vurgu; Wisy'de yalnızca dikkat")}${sw("Bilgi","#1F5AA8","#1F5AA8","Ajan önerisi")}${sw("Başarı","#1F7A4E","#1F7A4E","Onay, nakit girer")}${sw("Uyarı","#B4701C","#B4701C","Yenileme, tek eksik halka")}${sw("Nötr","#5A6B82","#5A6B82","Taslak, belirlenecek")}
   </div>
   <div class="panel tbl-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>Wisy kavramı</th><th>Renk</th><th>Biçim (renge ek)</th></tr></thead><tbody>
    <tr><td class="nm">Çekirdek halkalar 1–5</td><td><span class="chip core">Deniz yeşili</span></td><td class="small">Dolu daire, numara</td></tr>
    <tr><td class="nm">Varlık, çıktı (halka 6)</td><td><span class="chip asset">Lacivert</span></td><td class="small">Koyu tile, dolu daire</td></tr>
    <tr><td class="nm">Boş halka, bekleme doldu</td><td><span class="chip attn">Kırmızı</span></td><td class="small">Kesik çizgi, "—"</td></tr>
    <tr><td class="nm">Ajan önerisi</td><td><span class="chip agent">Bilgi mavisi</span></td><td class="small">Ajan monogramı, kabul / reddet</td></tr>
    <tr><td class="nm">Kişisel / şirket</td><td>${side("kisisel")} ${side("sirket")}</td><td class="small">Halka ve kare; her zaman yazıyla</td></tr>
    <tr><td class="nm">Kimlik aileleri</td><td>${famPick.map(s=>idb(s,1)).join(" ")}</td><td class="small">Beş şekil: elmas, daire, kare, üçgen, damla</td></tr>
   </tbody></table></div>
   <div class="sect"><h2>Yazı</h2><span class="note">Playfair Display · Inter · JetBrains Mono (MTFG ile aynı)</span></div>
   <div class="panel pad">
    <div class="typerow"><span class="spec">Playfair 40 · Pano</span><span style="font-family:var(--font-display);font-size:clamp(26px,3.4vw,40px);line-height:1.1">Bugün hangi <em style="color:var(--wisy)">kimliği</em> ileri taşıyoruz?</span></div>
    <div class="typerow"><span class="spec">Playfair 30 · sayfa</span><span style="font-family:var(--font-display);font-size:30px;line-height:1.1">Kimlikler</span></div>
    <div class="typerow"><span class="spec">Playfair 28 · sayı</span><span style="font-family:var(--font-display);font-size:28px" class="num">73 <small style="font-family:var(--font-body);font-size:13px;color:var(--ink-3)">kart</small></span></div>
    <div class="typerow"><span class="spec">Playfair 19 · bölüm</span><span style="font-family:var(--font-display);font-size:19px">Dikkat istiyor</span></div>
    <div class="typerow"><span class="spec">Playfair 16.5 · fikir</span><span style="font-family:var(--font-display);font-size:16.5px">Risk, onu en iyi yönetebilecek tarafa yüklenir</span></div>
    <div class="typerow"><span class="spec">Inter 14 · gövde</span><span>Kavramdan varlığa altı halka. Dikkat isteyen kayıtlar en üstte.</span></div>
    <div class="typerow"><span class="spec">Inter 11 / 600 · etiket</span><span class="lbl">Bekleme doldu · son 30 gün</span></div>
    <div class="typerow"><span class="spec">Mono 11 · numara, tarih</span><span class="mono" style="font-size:11px">00 · 1→6 · s.112 · 25 Ekim 2026</span></div>
   </div>
   <div class="sect"><h2>Sayfa anatomisi</h2><span class="note">Her panel bu dört katmanla kurulur</span></div>
   <div class="anat">
    <div><span class="k">A</span><b>Üst çubuk</b>Konum · kimlik filtresi · taraf · arama · tema · tarih. Bütün ekranlarda aynı.</div>
    <div><span class="k">B</span><b>Sayfa başlığı</b>Etiket (katman ve ajan) · Playfair başlık · tek cümle açıklama · sağda eylemler.</div>
    <div><span class="k">C</span><b>Özet şeridi</b>MTFG tile'ları. Ana hikayede tile'lar halka rayıyla bağlanır.</div>
    <div><span class="k">D</span><b>Gövde</b>Panel kartları, tablo ve listeler. Solda iş, sağda ritim ve denge.</div>
   </div>
   <div class="sect"><h2>Bileşenler</h2><span class="note">Panellerde yalnızca bunlar kullanılır</span></div>
   ${demoProj?`<div class="panel" style="margin-bottom:12px"><div class="ph"><h3>Halka zinciri</h3><span class="r small muted">Wisy imzası · boş halka kırmızı, kesik</span></div><div class="pb" style="padding-top:20px">${chain(demoProj.rings)}</div></div>`:""}
   <div class="comp">
    ${comp(`<div class="tile" style="width:150px"><div class="l">Kimlikler</div><div class="v">3</div><div class="d">kimliksiz kayıt</div></div><div class="tile accent" style="width:150px"><div class="l">Varlıklar</div><div class="v">5</div><div class="d">bu ay yayın</div></div>`,"Tile","MTFG ile aynı. Koyu tile dizide tektir.")}
    ${comp(famPick.map(s=>idb(s)).join("")+idb(null),"Kimlik rozeti","Aile tonu ve şekli. Kimliksiz kayıt kesik çizgiyle.")}
    ${comp(`${side("kisisel")}${side("sirket")}${side("ortak")}`,"Taraf rozeti","Halka kişisel, kare şirket, yarım ortak.")}
    ${comp(`<span class="chip">Taslak</span><span class="chip core">Beklemede</span><span class="chip ok">Hazır</span><span class="chip plain">Kullanıldı</span><span class="chip attn">Eksik</span><span class="chip warn">20 gün</span>`,"Durum çipi","MTFG .pill ölçüsü: 11px, 600.")}
    ${comp(`<div style="display:grid;gap:8px">${[["cirak","usta"],["yaratici","usta"],["usta","usta"],[null,"yaratici"]].map(([a,b])=>`<div style="display:flex;gap:10px;align-items:center">${stage(a,b)}<span class="mono tiny muted">${a?STAGE_AD[a]:"Belirlenecek"} → ${STAGE_AD[b]}</span></div>`).join("")}</div>`,"Evre göstergesi","Dolu: bugün. Kesik: hedef. Taralı: ölçülmedi.")}
    ${comp(`<div style="display:grid;gap:8px"><span class="wait"><span class="segs">${Array.from({length:10},(_,i)=>`<i class="${i<4?"on":""}"></i>`).join("")}</span><span class="d">6 gün</span></span><span class="wait due"><span class="segs">${Array.from({length:10},()=>`<i class="on"></i>`).join("")}</span><span class="d">Bekleme doldu</span></span></div>`,"Bekleme sayacı","Kitaptan gelen kart 10 gün bekler.")}
    ${comp(`<div class="agentbox" style="width:100%;text-align:left"><div class="who"><i>KY</i>Kimlik yönlendirici</div><div class="q">Bu fikir hangi kimlik için?</div><div class="acts"><button class="btn sm">Akademisyen</button><button class="btn sm">Konuşmacı</button></div></div>`,"Ajan önerisi","Bilgi mavisi; her zaman kabul ya da reddet.")}
    ${CARDS[0]?comp(`<div style="width:100%">${icard(CARDS[0])}</div>`,"Fikir kartı","Playfair fikir, tema etiketi, kimlik, taraf, kaynak."):""}
    ${comp(`<button class="btn pri">+ Hızlı kart</button><button class="btn">İkincil</button><button class="btn core">Wisy eylemi</button><button class="btn ghost">Vazgeç</button>`,"Buton","MTFG ölçüsü: 32px, 12.5px, 600.")}
   </div>
   <div class="sect"><h2>Panel panel detaylandırma sırası</h2><span class="note">Omurga sabit; her turda bir panel</span></div>
   <div class="panel tbl-wrap"><table class="t"><thead><tr><th>Sıra</th><th>Panel</th><th>Durum</th><th>Okuduğu veri</th><th>Ajan</th></tr></thead><tbody>
    ${plan.map(p=>`<tr><td class="mono">${p[0]}</td><td class="nm">${p[1]}</td><td>${p[2]==="v1"?'<span class="chip core">Kasaya bağlı</span>':'<span class="chip">İskelet</span>'}</td><td class="small">${p[3]}</td><td class="small muted">${p[4]}</td></tr>`).join("")}
   </tbody></table></div>`;
};

/* =========================================================
   ÇEKMECELER
   ========================================================= */
function openDrawer(html){$("#drawer").innerHTML=html;$("#drawer").classList.add("on");$("#scrim").classList.add("on");setTimeout(()=>{const dr=$("#drawer");const f=dr.querySelector("textarea")||dr.querySelector("input")||dr.querySelector("button.x");f&&f.focus()},60)}
function closeDrawer(){$("#drawer").classList.remove("on");$("#scrim").classList.remove("on")}

const CAP={idea:"",kaynak:"",sayfa:"",tur:"kitap",tema:"",kim:"",taraf:"kisisel",sugg:null,amb:null,ai:null,busy:false};
function suggest(){
  const uniq=kwHits(CAP.idea);
  CAP.sugg=uniq[0]||null; CAP.amb=uniq.length>1?[uniq[0],uniq[1]]:null;
  if(CAP.ai) applyAi(CAP.ai);
}
/* Claude önerisi (Haritacı + Kimlik yönlendirici, Haiku) yerel eşleşmenin yerine geçer */
function applyAi(a){
  const tema=(CONCEPTS.find(c=>c.id===a.tema)||{}).ad||a.tema;
  const k=ID[a.kimlik]?a.kimlik:null, alt=ID[a.alternatif]?a.alternatif:null;
  if(!k) return;
  CAP.sugg=[null,tema,k]; CAP.amb=a.belirsiz&&alt?[[null,tema,k],[null,tema,alt]]:null; CAP.why=a.gerekce||"";
}
let sugT;
function aiSuggest(){
  clearTimeout(sugT); CAP.ai=null; CAP.why="";
  if(!LIVE()||!window.Studio||!Studio.claude||CAP.idea.trim().length<12) return;
  sugT=setTimeout(async()=>{const idea=CAP.idea;CAP.busy=true;rerenderAgent();try{const a=await api("/api/agents/suggest",{method:"POST",body:{fikir:idea,kaynak:CAP.kaynak||undefined}});if(idea===CAP.idea){CAP.ai=a;applyAi(a)}}catch(e){}CAP.busy=false;if($("#agentSlot"))rerenderAgent()},700);
}
function captureHTML(){
  const ids=IDS.filter(i=>i.yet.length).map(i=>`<option value="${esc(i.slug)}" ${CAP.kim===i.slug?"selected":""}>${esc(i.ad)}</option>`).join("");
  const s=CAP.sugg; const via=CAP.ai?"Claude":"yerel eşleşme";
  let ag="";
  if(CAP.idea.trim().length>8){
    if(CAP.busy&&!CAP.ai) ag=`<div class="agentbox"><div class="who"><i>KY</i>Ajan düşünüyor</div><div class="q small"><span class="typing"><i></i><i></i><i></i></span></div></div>`;
    else if(CAP.amb&&!CAP.kim) ag=`<div class="agentbox"><div class="who"><i>KY</i>Kimlik belirsiz · ${via}</div><div class="q">Bu fikir hangi kimlik için?${CAP.why?` <span class="small muted">${esc(CAP.why)}</span>`:""}</div><div class="acts">${CAP.amb.map(h=>`<button class="btn sm" data-capkim="${esc(h[2])}" data-captema="${esc(h[1])}">${esc(ID[h[2]].ad)}</button>`).join("")}</div></div>`;
    else if(s&&(!CAP.kim||!CAP.tema)) ag=`<div class="agentbox"><div class="who"><i>H</i>Ajan önerisi · Haritacı + Kimlik yönlendirici · ${via}</div><div class="q">Tema <b>${esc(s[1])}</b>, birincil kimlik <b>${esc(ID[s[2]].ad)}</b>.${CAP.why?`<br><span class="small muted">${esc(CAP.why)}</span>`:""}</div><div class="acts"><button class="btn sm acc" data-capacc="1">Kabul et</button><button class="btn sm ghost" data-caprej="1">Kendim seçeceğim</button></div></div>`;
    else if(!s) ag=`<div class="agentbox"><div class="who"><i>KY</i>Öneri yok</div><div class="q small">Ajan bu cümleden tema çıkaramadı. Temayı ve kimliği elle seç.</div></div>`;
  }
  const wait=CAP.tur==="kitap"?`<div class="waitnote"><span class="wait"><span class="segs">${Array.from({length:10},()=>"<i></i>").join("")}</span></span><span>Kitaptan geliyor: 10 gün bekler, <b>${fmtDate(addDays(10))}</b> tarihinde yeniden okunur.</span></div>`:`<div class="waitnote" style="background:var(--sunken)">Bekleme yok; kart doğrudan hazır olur.</div>`;
  const temaList=`<datalist id="temaList">${CONCEPTS.map(c=>`<option value="${esc(c.ad)}">`).join("")}</datalist>`;
  const srcList=`<datalist id="srcList">${(M.kaynaklar||[]).map(k=>`<option value="${esc(k.baslik)}">`).join("")}</datalist>`;
  return `<div class="dh"><h2 id="dTitle">Hızlı kart</h2><span class="mono tiny muted" style="position:relative">~20 sn</span><button class="iconbtn x" data-act="close" aria-label="Kapat">✕</button></div>
  <form class="db" id="capForm">
   <div class="fld"><label for="cIdea">Fikir <span>tek cümle</span></label><textarea class="inp" id="cIdea" placeholder="Ör. Sözleşme, uyuşmazlık anında okunacağı varsayımıyla yazılır">${esc(CAP.idea)}</textarea></div>
   <div class="fld"><label>Kaynak türü</label><div class="opts" id="cTur">${[["kitap","Kitap"],["makale","Makale"],["kurs","Kurs"],["deneyim","Deneyim"],["sohbet","Sohbet"]].map(([v,l])=>`<button type="button" class="opt ${CAP.tur===v?"on":""}" data-v="${v}">${l}</button>`).join("")}</div></div>
   <div class="row2"><div class="fld"><label for="cKaynak">Kaynak</label><input class="inp" id="cKaynak" list="srcList" value="${esc(CAP.kaynak)}" placeholder="Kitap ya da yazı adı"></div><div class="fld"><label for="cSayfa">Sayfa</label><input class="inp" id="cSayfa" value="${esc(CAP.sayfa)}" inputmode="numeric" placeholder="112"></div></div>
   ${wait}
   <div id="agentSlot">${ag}</div>
   <div class="fld"><label for="cTema">Tema</label><input class="inp" id="cTema" list="temaList" value="${esc(CAP.tema)}" placeholder="${s?esc(s[1]):"Kavram adı"}"></div>
   <div class="fld"><label for="cKim">Birincil kimlik</label><select class="inp" id="cKim"><option value="">Seç…</option>${ids}</select></div>
   <div class="fld"><label>Taraf</label><div class="opts" id="cTaraf">${[["kisisel","Kişisel"],["sirket","Şirket"],["ortak","Ortak"]].map(([v,l])=>`<button type="button" class="opt ${CAP.taraf===v?"on":""}" data-v="${v}">${side(v)}</button>`).join("")}</div></div>
   ${temaList}${srcList}
  </form>
  <div class="df"><span class="tiny muted">${LIVE()?"Obsidian · 20-kartlar/":"Örnek kip · bu tarayıcıda"}</span><span style="flex:1"></span><button class="btn ghost" data-act="close">Vazgeç</button><button class="btn pri" id="capSave">Kartı kaydet</button></div>`;
}
function openCapture(){Object.assign(CAP,{idea:"",kaynak:"",sayfa:"",tur:"kitap",tema:"",kim:"",taraf:"kisisel",sugg:null,amb:null,ai:null,busy:false,why:""});openDrawer(captureHTML());bindCapture()}
function rerenderAgent(){
  const d=document.createElement("div");d.innerHTML=captureHTML();
  $("#agentSlot").innerHTML=d.querySelector("#agentSlot").innerHTML;
  $("#cTema").placeholder=d.querySelector("#cTema").placeholder;
}
function bindCapture(){
  const f=$("#capForm"); f.addEventListener("submit",e=>e.preventDefault());
  $("#cIdea").addEventListener("input",e=>{CAP.idea=e.target.value;suggest();rerenderAgent();aiSuggest()});
  $("#cKaynak").addEventListener("input",e=>CAP.kaynak=e.target.value);
  $("#cSayfa").addEventListener("input",e=>CAP.sayfa=e.target.value);
  $("#cTema").addEventListener("input",e=>CAP.tema=e.target.value);
  $("#cKim").addEventListener("change",e=>{CAP.kim=e.target.value;rerenderAgent()});
  $("#cIdea").addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)){e.preventDefault();saveCapture()}});
}
function refreshCapture(){const keep={...CAP};$("#drawer").innerHTML=captureHTML();Object.assign(CAP,keep);bindCapture()}
async function saveCapture(){
  if(CAP.idea.trim().length<4){toast("Fikri tek cümleyle yaz.");$("#cIdea").focus();return}
  const idea=CAP.idea.trim().replace(/\.$/,""), tema=CAP.tema||(CAP.sugg?CAP.sugg[1]:"");
  const local=()=>{
    const c={id:Date.now(),idea,tema:tema||"Temasız",kim:CAP.kim||null,taraf:CAP.taraf,durum:CAP.tur==="kitap"?"beklemede":(CAP.kim?"hazir":"taslak"),kalan:10,kaynak:CAP.kaynak||"Belirtilmedi",tur:CAP.tur,sayfa:CAP.sayfa||"—",fikir:CAP.idea.trim(),baglam:"Hızlı kart ile eklendi."};
    CARDS.unshift(c);
    try{const ex=JSON.parse(localStorage.getItem("wisy-cards")||"[]");ex.unshift(c);localStorage.setItem("wisy-cards",JSON.stringify(ex.slice(0,50)))}catch(e){}
    toast(c.durum==="beklemede"?`Kart kaydedildi · ${fmtDate(addDays(10))} tarihinde hazır`:"Kart kaydedildi");
  };
  const btn=$("#capSave"); btn.disabled=true;
  try{
    await write({tur:"kart_olustur",baslik:idea,fikir:CAP.idea.trim(),baglam:"Hızlı kart ile eklendi.",kaynak:CAP.kaynak||undefined,kaynak_turu:CAP.tur,sayfa:CAP.sayfa||undefined,tema:tema||undefined,birincil_kimlik:CAP.kim||null,taraf:CAP.taraf},local);
    closeDrawer();
  }catch(e){btn.disabled=false}
}

function cardDetail(id){
  const c=CARDS.find(x=>String(x.id)===String(id)); if(!c) return;
  const steps=[["taslak","Taslak"],["beklemede","Beklemede"],["hazir","Hazır"],["kullanildi","Kullanıldı"]];
  const ix=steps.findIndex(s=>s[0]===c.durum);
  const cands=!c.kim?kwHits(c.idea+" "+(c.fikir||"")).slice(0,2).map(h=>h[2]):[];
  openDrawer(`<div class="dh"><h2 id="dTitle">Kart</h2><button class="iconbtn x" data-act="close" aria-label="Kapat">✕</button></div><div class="db">
   <div class="pstate">${steps.map((s,k)=>`<i class="${k===ix?"on":""}">${s[1]}</i>`).join("")}</div>
   <div><div class="eyebrow">${esc(c.tema)}</div><h2 style="font-size:26px;margin-top:6px;line-height:1.15">${esc(c.idea)}</h2></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${idb(c.kim)}${c.kim2?idb(c.kim2):""}${side(c.taraf)}</div>
   ${c.durum==="beklemede"?`<div class="waitnote">${icard(c).match(/<span class="wait[\s\S]*?<\/span><\/span>/)[0]}<span>${c.kalan<=0?"Bekleme doldu. Yeniden oku; hâlâ doğruysa hazır yap.":`${fmtDate(addDays(c.kalan))} tarihinde yeniden okunacak.`}</span></div>`:""}
   <div class="fld"><label>Fikir</label><p style="margin:0">${esc(c.fikir)}</p></div>
   <div class="fld"><label>Bağlam</label><p style="margin:0" class="muted">${esc(c.baglam||"—")}</p></div>
   <div class="fld"><label>Kaynak</label><p style="margin:0"><span class="tag">${esc(c.tur)}</span> ${esc(c.kaynak)} · <span class="mono">s.${esc(c.sayfa)}</span></p></div>
   ${c.file?`<div class="fld"><label>Kasa</label><span class="mono tiny muted">${esc(c.file)}</span></div>`:""}
   ${!c.kim?`<div class="agentbox"><div class="who"><i>KY</i>Kimlik gerekli</div><div class="q small">Kimliksiz kart öğrenmeye ve yayına giremez.</div><div class="acts">${cands.map(s=>`<button class="btn sm" data-assign="${esc(c.id)}" data-to="${s}">${esc(ID[s].ad)}</button>`).join("")}${askBtn("kimlik-yonlendirici",`Şu kart için birincil kimlik öner: "${c.idea}" (id: ${c.id}).`,"Ajana sor")}</div></div>`:""}
  </div><div class="df"><span style="flex:1"></span>${c.durum==="beklemede"&&c.kalan<=0?`<button class="btn core" data-ready="${esc(c.id)}">Hazır olarak işaretle</button>`:c.durum==="hazir"?`<button class="btn pri" data-daily="${esc(c.id)}">Günün kartı yap</button>`:`<button class="btn" data-act="close">Kapat</button>`}</div>`);
}
function idDetail(slug){
  const i=ID[slug]; if(!i) return; const sk=SK.filter(s=>s.kim===slug); const n=CARDS.filter(c=>c.kim===slug||c.kim2===slug).length;
  openDrawer(`<div class="dh"><h2 id="dTitle">${esc(i.ad)}</h2><button class="iconbtn x" data-act="close" aria-label="Kapat">✕</button></div><div class="db">
   <div style="display:flex;gap:8px;flex-wrap:wrap">${idb(slug)}<span class="tag">${(FAM[i.aile]||FAM.kisisel).ad}</span><span class="tag">${(FAM[i.aile]||FAM.kisisel).dikey}</span><span class="tag">${{kok:"Kök",guncel:"Güncel",hedef:"Hedef"}[i.zaman]||i.zaman}</span></div>
   <div class="fld"><label>Ana soru</label><p style="margin:0;font-family:var(--font-display);font-size:21px;line-height:1.25">${esc(i.soru)}</p></div>
   <div class="fld"><label>Bağlam</label><p style="margin:0">${esc(i.baglam)}</p></div>
   <div class="fld"><label>Yetenekler</label>${(sk.length?sk:i.yet.map(a=>({ad:a,evre:null,hedef:"yaratici",kanit:0}))).map(s=>`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;padding:6px 0;border-bottom:1px dashed var(--line-2)"><span>${esc(s.ad)}</span><span style="display:flex;gap:8px;align-items:center">${stage(s.evre,s.hedef)}<span class="mono tiny muted">${s.kanit} kanıt</span></span></div>`).join("")||'<span class="muted small">Ferhan tanımlar</span>'}</div>
   <div class="row2" style="grid-template-columns:1fr 1fr"><div class="fld"><label>Kanal</label><span class="small">${esc(i.kanal)}</span></div><div class="fld"><label>Bağlı kart</label><span class="mono">${n}</span></div></div>
   <div class="fld"><label>Sınır</label><div class="waitnote" style="background:var(--attn-soft);color:var(--fg)">${esc(i.sinir||"—")}</div></div>
  </div><div class="df"><span style="flex:1"></span>${askBtn("yetenek-olcer",`${i.ad} kimliğinin yeteneklerinde evre, hedef evre ve kanıtları birlikte güncelleyelim.`,"Yetenekleri ölç","btn")}${askBtn("hoca",`${i.ad} kimliği için bir sonraki evreye taşıyacak öğrenme modülü öner.`,"Modül öner","btn core")}</div>`);
}
function contentDetail(ix){
  const c=CONTENT[ix]; if(!c) return;
  const keys=Object.keys(c.uy); const miss=keys.some(k=>!c.uy[k]);
  const cands=!c.kim?kwHits(c.t).slice(0,2).map(h=>h[2]):[];
  const next=c.st==="fikir"||c.st==="taslak"?["onay","Onaya al"]:c.st==="onay"?["yayinda","Yayında olarak işaretle"]:null;
  openDrawer(`<div class="dh"><h2 id="dTitle">İçerik</h2><button class="iconbtn x" data-act="close" aria-label="Kapat">✕</button></div><div class="db">
   <div class="pstate">${Object.entries(CST).map(([k,l])=>`<i class="${c.st===k?"on":""}">${l}</i>`).join("")}</div>
   <h2 style="font-size:24px;line-height:1.2">${esc(c.t)}</h2>
   <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="chip asset plain">${esc(c.ch)}</span><span class="tag">${esc(c.bas)}</span>${idb(c.kim)}<span class="mono small muted">${c.d?fmtIso(c.d):"tarihsiz"}</span></div>
   <div class="fld"><label>Uyum onayları <span>${keys.filter(k=>c.uy[k]).length}/${keys.length}</span></label><ul class="checks">${keys.map(k=>`<li class="${c.uy[k]?"on":"miss"}" ${LIVE()?`data-uy="${k}" data-cix="${ix}" title="Tıkla: onayı değiştir"`:""}><span class="cb"></span><span>${UYUM[k]||k}</span><span class="mono tiny ${c.uy[k]?"muted":""}" style="${c.uy[k]?"":"color:var(--attn)"}">${c.uy[k]?"onaylı":"bekliyor"}</span></li>`).join("")}</ul></div>
   ${miss?`<div class="waitnote" style="background:var(--attn-soft)">Eksik onay varken içerik yayına alınamaz.</div>`:""}
   ${!c.kim?`<div class="agentbox"><div class="who"><i>KY</i>Kimlik belirsiz</div><div class="q">Bu içerik hangi kimlik için?</div><div class="acts">${cands.map(s=>`<button class="btn sm" data-assign="${esc(c.id||"")}" data-to="${s}">${esc(ID[s].ad)}</button>`).join("")}${askBtn("kimlik-yonlendirici",`Şu içerik için birincil kimlik öner: "${c.t}"${c.id?` (id: ${c.id})`:""}.`,"Ajana sor")}</div></div>`:""}
   ${askBtn("editor",`"${c.t}" içeriğini derlendiği kartlardan (${(c.kartlar||[]).join(", ")||"kart yok"}) yeniden yaz ve uyum kontrolünü yap.`,"Editöre yazdır","btn")}
  </div><div class="df"><span style="flex:1"></span><button class="btn" data-act="close">Kapat</button>${next?`<button class="btn pri" ${miss?"disabled style='opacity:.5;cursor:not-allowed'":""} data-cstate="${ix}" data-to="${next[0]}">${next[1]}</button>`:""}</div>`);
}

/* =========================================================
   ÇİZİM VE OLAYLAR
   ========================================================= */
function render(){
  const v=V[S.view]?S.view:"pano";
  $("#view").innerHTML=V[v]();
  $("#crumb").innerHTML=`Wisy · ${CRUMB[v]} · <b>${TITLES[v]}</b>`;
  document.querySelectorAll(".nav [data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===v));
  document.querySelectorAll(".tabbar [data-view]").forEach(b=>b.classList.toggle("on",b.dataset.view===v));
  $("#nc-kart").textContent=CARDS.filter(c=>c.durum!=="kullanildi").length;
  $("#nc-pano").textContent=attention().length;
  $("#nc-yet").textContent=gapSkills().length?gapSkills().length+" açık":"";
  $("#nc-evren").textContent=CONCEPTS.length; $("#nc-kim").textContent=IDS.length; $("#nc-ogr").textContent=MODS.length;
  $("#nc-proj").textContent=PROJ.length; $("#nc-var").textContent=Object.values(ASSETS).reduce((a,x)=>a+x.k.length+x.s.length,0); $("#nc-yayin").textContent=CONTENT.length;
  $("#today").textContent=fmtDate(TODAY)+" "+TODAY.getFullYear();
  const live=LIVE();
  $("#ents").innerHTML=`<span class="ent">${IDS.length} kimlik</span><span class="ent">5 aile</span><span class="ent">${live?"Obsidian kasası · canlı":"Örnek veri"}</span>`;
  $("#navSrc").innerHTML=live?`Kayıtlar <b>kasadan</b> okunur ve kasaya yazılır.`:`Sayılar <b>örnek</b> olarak işaretlenir.`;
  document.querySelectorAll("#srcsw button").forEach(b=>{b.classList.toggle("on",b.dataset.src===M.kaynak);if(b.dataset.src==="kasa")b.disabled=!SERVER});
  if(window.Studio) Studio.afterRender(v);
}
function go(v){S.view=v;try{history.replaceState(null,"","#"+v)}catch(e){}render();$("#main").scrollTop=0;$("#app").classList.remove("navopen")}
function fillKimlik(){$("#fKimlik").innerHTML=`<option value="">Tüm kimlikler</option>`+famOrder.map(f=>`<optgroup label="${FAM[f].ad}">${IDS.filter(i=>i.aile===f).map(i=>`<option value="${esc(i.slug)}">${esc(i.ad)}</option>`).join("")}</optgroup>`).join("");$("#fKimlik").value=S.kim}

$("#fKimlik").addEventListener("change",e=>{S.kim=e.target.value;render()});
$("#fTaraf").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;S.taraf=b.dataset.v;$("#fTaraf").querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));render()});
$("#q").addEventListener("input",e=>{S.q=e.target.value;if(S.view!=="kartlar"&&!(S.view==="evren"&&S.evrenMode==="liste"))S.view="kartlar";render()});
$("#themeBtn").addEventListener("click",()=>{const r=document.documentElement;const cur=r.getAttribute("data-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");const nx=cur==="dark"?"light":"dark";r.setAttribute("data-theme",nx);try{localStorage.setItem("wisy-theme",nx)}catch(e){}});
$("#menuBtn").addEventListener("click",()=>$("#app").classList.add("navopen"));
$("#navscrim").addEventListener("click",()=>$("#app").classList.remove("navopen"));
$("#scrim").addEventListener("click",closeDrawer);
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){closeDrawer();$("#app").classList.remove("navopen")}
  if((e.key==="k"||e.key==="K")&&!e.metaKey&&!e.ctrlKey&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();openCapture()}
  if(e.key==="Enter"&&document.activeElement.matches("[data-id],.node")){document.activeElement.click()}
});
document.addEventListener("click",async e=>{
  const t=e.target.closest("button,[data-id],[data-concept],[data-v],[data-uy]"); if(!t) return;
  const d=t.dataset;
  if(d.src){if(d.src==="kasa"&&SERVER){await reload().catch(er=>toast(er.message))}else if(d.src==="ornek"){setModel(window.WISY_ORNEK)}fillKimlik();render();try{localStorage.setItem("wisy-src",d.src)}catch(er){}return}
  if(d.ask!==undefined){closeDrawer();ask(d.ask,d.gorev);return}
  if(d.view){go(d.view);return}
  if(d.act==="capture"){openCapture();return}
  if(d.act==="menu"){$("#app").classList.add("navopen");return}
  if(d.nav){closeDrawer();go(d.nav);return}
  if(d.act==="close"){closeDrawer();return}
  if(d.go){document.querySelector(d.go)?.scrollIntoView({behavior:"smooth",block:"center"});return}
  if(d.card){cardDetail(d.card);return}
  if(d.content!==undefined){contentDetail(+d.content);return}
  if(d.proj){go("projeler");setTimeout(()=>document.getElementById("p-"+d.proj)?.scrollIntoView({behavior:"smooth"}),50);return}
  if(d.id){idDetail(d.id);return}
  if(d.concept!==undefined){const c=CONCEPTS[+d.concept];S.q=c.ad.split(" ")[0];$("#q").value=S.q;go("kartlar");return}
  if(d.cf!==undefined){S.cardFilter=d.cf;render();return}
  if(d.uy){const c=CONTENT[+d.cix];const uy={...Object.fromEntries(Object.entries(c.uy).map(([k,v])=>[k,!!v]))};uy[d.uy]=!uy[d.uy];await write({tur:"alan_guncelle",hedef:c.id,alan:"uyum",deger:uy}).catch(()=>{});contentDetail(+d.cix);return}
  if(d.cstate){const c=CONTENT[+d.cstate];await write({tur:"alan_guncelle",hedef:c.id,alan:"durum",deger:d.to},()=>{c.st=d.to;toast(`${CST[d.to]} olarak işaretlendi`)}).then(()=>closeDrawer()).catch(()=>{});return}
  if(d.assign){
    const id=d.assign,to=d.to;
    await write({tur:"kimlik_ata",hedef:id,birincil_kimlik:to},()=>{S.accepted[id]=to;const c=CARDS.find(x=>String(x.id)===id);if(c){c.kim=to;if(c.durum==="taslak")c.durum="hazir"}toast(`${ID[to].ad} birincil kimlik olarak atandı`)}).catch(()=>{});
    if($("#drawer").classList.contains("on")&&CARDS.find(x=>String(x.id)===id))cardDetail(id);
    return;
  }
  if(d.unassign){const c=CARDS.find(x=>String(x.id)===d.unassign);if(c){c.kim=null;c.durum="taslak"}delete S.accepted[d.unassign];render();return}
  if(d.ready){const c=CARDS.find(x=>String(x.id)===d.ready);await write({tur:"alan_guncelle",hedef:c.id,alan:"durum",deger:"hazir"},()=>{c.durum="hazir";toast("Kart hazır")}).then(()=>closeDrawer()).catch(()=>{});return}
  if(d.daily){const c=CARDS.find(x=>String(x.id)===d.daily);
    if(!LIVE()){toast("Günün kartı olarak takvime eklendi (örnek)");return}
    await write({tur:"not_olustur",tip:"icerik",baslik:`Günün kartı: ${c.idea}`,alanlar:{birincil_kimlik:c.kim,kanal:"linkedin",basamak:"gunun_karti",kartlar:[c.id],taraf:c.taraf,durum:"taslak",uyum:{tbb:false,spk:false,rekabet:false,alinti:false}},govde:`Taslak. Kart: [[${c.id}]]\n\n${c.fikir}`}).then(()=>{closeDrawer();go("yayin")}).catch(()=>{});return}
  if(d.toast){toast(d.toast);return}
  // çekmece içi
  if(t.id==="capSave"){saveCapture();return}
  if(d.capacc){CAP.tema=CAP.sugg[1];CAP.kim=CAP.sugg[2];refreshCapture();return}
  if(d.caprej){CAP.sugg=null;CAP.amb=null;CAP.ai=null;$("#agentSlot").innerHTML="";$("#cTema").focus();return}
  if(d.capkim){CAP.kim=d.capkim;CAP.tema=CAP.tema||d.captema;refreshCapture();return}
  const par=t.parentElement&&t.parentElement.id;
  if(par==="cTur"){CAP.tur=d.v;refreshCapture();return}
  if(par==="cTaraf"){CAP.taraf=d.v;refreshCapture();return}
  if(par==="pstate"){S.pstate=d.v;render();return}
  if(par==="evrenMode"){S.evrenMode=d.v;render();return}
  if(par==="mapTabs"){S.mapTab=d.v;render();return}
  if(par==="idMode"){S.idMode=d.v;render();return}
});

addEventListener("hashchange",()=>{const x=location.hash.slice(1);if(TITLES[x]&&x!==S.view)go(x)});

/* açılış: sunucu varsa kasa, yoksa örnek (dosyadan açıldığında). studio.js yüklendikten sonra başlar. */
addEventListener("DOMContentLoaded",async()=>{
  const h=(location.hash||"").slice(1); if(TITLES[h]) S.view=h;
  let pref="kasa"; try{pref=localStorage.getItem("wisy-src")||"kasa"}catch(e){}
  try{ const m=await api("/api/model"); SERVER=true; setModel(pref==="ornek"?window.WISY_ORNEK:m);
    api("/api/health").then(h=>{if(h.giris==="açık"){const f=document.createElement("form");f.method="post";f.action="/cikis";f.innerHTML=`<button class="btn sm ghost" title="Oturumu kapat">Çıkış</button>`;$("#today").after(f)}}).catch(()=>{}); }
  catch(e){ SERVER=false; setModel(window.WISY_ORNEK); }
  fillKimlik();
  if(window.Studio) await Studio.init(SERVER);
  render();
});

/* =========================================================
   WISY STÜDYO — VIBE Management stüdyosunun kişisel karşılığı.
   Komut satırı + ajan seçimi + kapsam + kaynaklar; akışlar (.claude/commands) çok adımlı çalışır.
   Ajan kasaya yazmaz: yanıttaki öneriler bilgi mavisi kutularda gelir, Ferhan kabul edince
   /api/vault/apply kural denetimiyle Obsidian kasasına yazar.
   ========================================================= */
const Studio=(()=>{
  const SRC_AD={kimlikler:"Kimlikler",kimliksiz:"Kimliksiz",kartlar:"Kartlar",kaynaklar:"Kaynaklar",kavramlar:"Kavramlar",yetenekler:"Yetenekler",ogrenme:"Öğrenme",projeler:"Projeler",varliklar:"Varlıklar",icerik:"İçerik",sicil:"Sicil",sinerji:"Sinerji",kurallar:"Kural denetimi"};
  const TIER_AD={quick:"Hızlı · Haiku",default:"Dengeli · Opus",complex:"Derin · Fable"};
  /* sunucuya ulaşılamazsa (dosyadan açılış) kadro yine görünsün: docs/04-ajanlar.md */
  const FALLBACK=[["orkestrator","Orkestratör","0–10","OR","İsteği ana hikayenin doğru katmanına yönlendirir."],["kutuphaneci","Kütüphaneci","0","KT","Kaynak envanteri ve kaynak notları."],["bultenci","Bültenci","1","B","İşaret → kart, bekleme, haftalık bülten."],["haritaci","Haritacı","2–3","H","Kavram evreni, eksenler, dört harita."],["kimlik-yonlendirici","Kimlik yönlendirici","4","KY","Kimliksiz kayıtlara birincil kimlik."],["yetenek-olcer","Yetenek ölçer","5","YÖ","Evre, hedef evre, kanıt, açık raporu."],["hoca","Hoca","6","HC","Yetenek açığından müfredat ve modül."],["proje-mimari","Proje mimarı","6","PM","Kesişimden hikaye kartı taslağı."],["editor","Editör","7","E","Kart koleksiyonundan içerik, uyum kontrolü."],["portfoy-yoneticisi","Portföy yöneticisi","7","PY","Varlık kaydı, nakit akışı ve değerleme."],["yayin-planlayici","Yayın planlayıcı","8","YP","Kanal takvimi ve geri bildirim."],["depo-sorumlusu","Depo sorumlusu","9","DS","GitHub, Hugging Face, Kaggle, Zenodo."],["sicil-tutucu","Sicil tutucu","10","ST","Diploma, lisans, sertifika, yenileme."]]
    .map(([id,ad,katman,kisa,aciklama])=>({id,ad,katman,kisa,aciklama,kaynaklar:["kartlar"],kullanim:null}));
  /* şablonlar: tekrarlayan işleri tek tıkla komut satırına yükler (ana hikaye sırasıyla) */
  const RECIPES=[
    ["kutuphaneci","Kaynak envanteri","Hangi klasör ve listeleri tarayacağımı sor; kaynak notu önerilerini hazırla. Yalnız liste, taşıma yok."],
    ["bultenci","Bekleme süresi dolan kartlar","Bekleme süresi dolan ve dolmak üzere olan kartları yeniden okut: hazır olmalı mı, yeniden mi yazılmalı? Haftalık bülten için en iyi 3–5 kartı seç."],
    ["haritaci","Kavram eksenlerini doldur","Eksenleri belirlenmemiş kavramlar için disiplin, fonksiyon ve sektör öner; ilgili kavram bağlantılarını ekle."],
    ["kimlik-yonlendirici","Kimliksiz kayıtları yönlendir","Kimliksiz bütün kayıtlar için birincil kimlik öner; belirsiz olanlar için iki seçenekli soru sor."],
    ["yetenek-olcer","Yetenek evrelerini belirle","En aktif üç kimliğin yeteneklerinde bugünkü evreyi ve hedef evreyi birlikte belirleyelim; kanıt sor."],
    ["hoca","Açıktan modül tasarla","En büyük yetenek açığı için 3–5 birimlik bir modül tasarla; kaynakları kasadan seç, kapanış projesini bağla."],
    ["proje-mimari","Kesişimden proje","Kimlik kesişimlerinden ve proje üretici matrisinden bir hikaye kartı taslağı öner; boş halkaları açıkça yaz."],
    ["editor","Günün kartı yaz","Hazır kartlardan bir günün kartı derle (LinkedIn); uyum alanlarını değerlendir, içerik notunu taslak olarak öner."],
    ["yayin-planlayici","4 haftalık takvim","Onaylı ve taslak içerikleri 4 haftalık takvime yerleştir; kanal ritmine uy, hiçbir şey yayınlama."],
    ["portfoy-yoneticisi","Varlık portföyünü güncelle","Projelerden doğan varlıkları tara; eksik varlık kayıtlarını ve katkı alanlarını öner."],
    ["depo-sorumlusu","Teknik vitrin listesi","Teknik varlıklar için GitHub, Hugging Face, Kaggle, Zenodo yayın listesi hazırla: sürüm, lisans, README. Yayın onayla."],
    ["sicil-tutucu","Sicil ve yenileme","Sicil kayıtlarını, eksik kanıtları ve yenileme takvimini çıkar; doçentlik kategorisi eşleşmelerini öner."]
  ];
  const ST={server:false,claude:false,agents:FALLBACK,flows:[],tiers:{},sessions:[],library:[],journal:null,cur:null,ajan:"orkestrator",kim:"",srcs:null,tier:"default",files:[],flow:null,busy:false,ctrl:null,draft:""};
  const A=id=>ST.agents.find(a=>a.id===id)||{id,ad:id,kisa:(id||"?").slice(0,2).toUpperCase(),katman:"?",kaynaklar:[]};
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  let saveT;
  function save(key){ if(!ST.server) return; clearTimeout(saveT); saveT=setTimeout(()=>api(`/api/state/${key}`,{method:"PUT",body:ST[key].map(s=>JSON.parse(JSON.stringify(s,(k,v)=>k==="busy"?undefined:v)))}).catch(e=>toast("Kaydedilemedi: "+e.message)),400); }
  const saveSess=()=>{ if(!ST.server) return; api("/api/state/sessions",{method:"PUT",body:ST.sessions.slice(0,200)}).catch(()=>{}); };

  async function init(server){
    ST.server=server;
    if(!server) return;
    try{const r=await api("/api/agents");ST.agents=r.agents;ST.flows=r.flows;ST.claude=r.claude;ST.tiers=r.tiers}catch(e){}
    try{ST.sessions=(await api("/api/state/sessions")).value||[]}catch(e){}
    try{ST.library=(await api("/api/state/library")).value||[]}catch(e){}
    Studio.claude=ST.claude;
  }
  function preset(ajan,gorev,opts={}){
    const flow=ST.flows.find(f=>gorev&&gorev.startsWith(f.ad+":"));
    ST.flow=flow||null; ST.ajan=flow?"orkestrator":(A(ajan).id||"orkestrator"); ST.srcs=null;
    ST.draft=flow?gorev.slice(flow.ad.length+1).trim():gorev||""; if(opts.kim!==undefined) ST.kim=opts.kim;
    ST.focus=true;
  }

  /* ---------------- küçük markdown ---------------- */
  const strip=t=>String(t||"").replace(/```wisy-oneri[\s\S]*?(```|$)/,"").trim();
  function inline(s){return esc(s).replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>").replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g,"$1<i>$2</i>").replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,(_,a,b)=>`<span class="tag">${b||a}</span>`)}
  function md(src){
    const L=String(src||"").replace(/\r/g,"").split("\n"),out=[];let i=0;
    const isBlock=l=>/^(```|#{1,6}\s|\s*[-*]\s|\s*\d+[.)]\s|>|\|)/.test(l);
    while(i<L.length){
      const l=L[i];
      if(/^```/.test(l)){const buf=[];i++;while(i<L.length&&!/^```/.test(L[i]))buf.push(L[i++]);i++;out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);continue}
      const h=l.match(/^(#{1,6})\s+(.*)$/);if(h){out.push(h[1].length<=2?`<h3>${inline(h[2])}</h3>`:`<h4>${inline(h[2])}</h4>`);i++;continue}
      if(/^\|/.test(l)&&/^\|?\s*:?-{2,}/.test(L[i+1]||"")){const row=r=>r.replace(/^\||\|$/g,"").split("|").map(c=>c.trim());const hd=row(l);i+=2;const rows=[];while(i<L.length&&/^\|/.test(L[i]))rows.push(row(L[i++]));out.push(`<div class="mdwrap"><table><thead><tr>${hd.map(c=>`<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);continue}
      if(/^\s*[-*]\s/.test(l)){const it=[];while(i<L.length&&/^\s*[-*]\s/.test(L[i]))it.push(L[i++].replace(/^\s*[-*]\s/,""));out.push(`<ul>${it.map(x=>`<li>${inline(x)}</li>`).join("")}</ul>`);continue}
      if(/^\s*\d+[.)]\s/.test(l)){const it=[];while(i<L.length&&/^\s*\d+[.)]\s/.test(L[i]))it.push(L[i++].replace(/^\s*\d+[.)]\s/,""));out.push(`<ol>${it.map(x=>`<li>${inline(x)}</li>`).join("")}</ol>`);continue}
      if(/^>/.test(l)){const it=[];while(i<L.length&&/^>/.test(L[i]))it.push(L[i++].replace(/^>\s?/,""));out.push(`<blockquote>${inline(it.join(" "))}</blockquote>`);continue}
      if(!l.trim()){i++;continue}
      const p=[];while(i<L.length&&L[i].trim()&&!isBlock(L[i]))p.push(L[i++]);
      if(!p.length){p.push(L[i++])}
      out.push(`<p>${p.map(inline).join("<br>")}</p>`);
    }
    return out.join("");
  }

  /* ---------------- öneri kutuları ---------------- */
  const TUR_AD={kart_olustur:"Yeni kart",kimlik_ata:"Kimlik ata",alan_guncelle:"Alan güncelle",kanit_ekle:"Kanıt ekle",not_olustur:"Yeni not"};
  const TIP_AD={kaynak:"kaynak",kavram:"kavram",modul:"modül",proje:"proje",icerik:"içerik",varlik:"varlık",sicil:"sicil"};
  const recTitle=id=>{const all=[...CARDS.map(c=>[c.id,c.idea]),...PROJ.map(p=>[p.id,p.baslik]),...MODS.map(m=>[m.id,m.ad]),...CONTENT.map(c=>[c.id,c.t]),...SK.map(s=>[s.id,s.ad]),...CONCEPTS.map(c=>[c.id,c.ad])];const f=all.find(x=>String(x[0])===String(id));return f?f[1]:id};
  const val=v=>typeof v==="object"&&v?Object.entries(v).map(([k,x])=>`${k}: ${x}`).join(" · "):String(v);
  function propHTML(p,mi,pi){
    const st=p._st||"bekliyor";
    let t="",meta="";
    if(p.tur==="kart_olustur"){t=`<div class="pt idea">${esc(p.baslik)}</div>`;meta=`${idb(p.birincil_kimlik||null)}${p.ikincil_kimlik?idb(p.ikincil_kimlik):""}${side(p.taraf)}${p.tema?`<span class="tag">${esc(p.tema)}</span>`:""}${p.kaynak?`<span class="tag">${esc(p.kaynak)}${p.sayfa?" · s."+esc(p.sayfa):""}</span>`:""}`}
    else if(p.tur==="kimlik_ata"){t=`<div class="pt">${esc(recTitle(p.hedef))}</div>`;meta=`→ ${idb(p.birincil_kimlik)}${p.ikincil_kimlik?idb(p.ikincil_kimlik):""}`}
    else if(p.tur==="alan_guncelle"){t=`<div class="pt">${esc(recTitle(p.hedef))}</div>`;meta=`<span class="tag">${esc(p.alan)}</span><span class="small">→ <b>${esc(val(p.deger))}</b></span>`}
    else if(p.tur==="kanit_ekle"){t=`<div class="pt">${esc(recTitle(p.hedef))}</div>`;meta=`<span class="small">kanıt + <b>${esc(recTitle(p.kanit))}</b></span>`}
    else if(p.tur==="not_olustur"){t=`<div class="pt">${esc(p.baslik)}</div>`;meta=`<span class="tag">${TIP_AD[p.tip]||p.tip}</span>${p.alanlar&&p.alanlar.birincil_kimlik?idb(String(p.alanlar.birincil_kimlik).replace(/^\[\[|\]\]$/g,"")):""}${p.alanlar&&p.alanlar.taraf?side(p.alanlar.taraf):""}`}
    const kind=st==="kabul"?"Kasaya yazıldı":st==="red"?"Reddedildi":st==="hata"?"Yazılmadı":TUR_AD[p.tur]+(p.tur==="not_olustur"?" · "+(TIP_AD[p.tip]||p.tip):"");
    const acts=st==="bekliyor"?`<button class="btn sm" style="background:var(--agent);color:var(--surface);border-color:var(--agent)" data-pa="${mi}:${pi}">Kabul et</button><button class="btn sm ghost" data-pr="${mi}:${pi}">Reddet</button>`:st==="hata"?`<button class="btn sm ghost" data-pa="${mi}:${pi}">Yeniden dene</button>`:"";
    return `<div class="prop ${st}"><div><div class="pk">${kind}</div>${t}<div class="pm">${meta}</div></div><div class="acts">${acts}</div>${p.gerekce||p._msg?`<div class="pg">${esc(p._msg||p.gerekce)}</div>`:""}</div>`;
  }

  /* ---------------- konuşma ---------------- */
  function msgHTML(m,mi){
    if(m.role==="user") return `<div class="msg user">${m.flow?`<div class="lbl" style="margin-bottom:4px">Akış ${esc(m.flow)}</div>`:""}${esc(m.text)}${m.files&&m.files.length?`<div class="files">${m.files.map(f=>`<span class="att">${esc(f)}</span>`).join("")}</div>`:""}</div>`;
    const a=A(m.ajan), body=strip(m.text);
    const pend=(m.proposals||[]).filter(p=>!p._st||p._st==="bekliyor").length;
    return `<div class="msg ai ${m.error?"err":""}" data-mi="${mi}"><div class="mh"><i>${esc(a.kisa)}</i>${esc(a.ad)} · katman ${esc(a.katman)}${m.flow?`<span class="steps-run">${m.flow.adimlar.map((s,k)=>`<span class="${k<m.flow.i?"done":k===m.flow.i?"cur":""}">${esc(A(s).ad)}</span>`).join("")}</span>`:""}<span class="r">${m.usage?`<span class="mono tiny">${TIER_AD[m.usage.tier]||m.usage.model} · ${(m.usage.input+m.usage.output).toLocaleString("tr-TR")} token · $${m.usage.usd.toFixed(3)}</span>`:m.busy?`<span class="mono tiny">${TIER_AD[m.tier]||""}</span>`:""}</span></div>
      <div class="mb"><div class="md">${m.error?`<p style="color:var(--red-ink)">${esc(m.error)}</p>`:body?md(body):m.busy?`<span class="typing"><i></i><i></i><i></i></span>`:`<p class="muted">Yanıt boş.</p>`}${m.truncated?`<p class="tiny muted">Yanıt token sınırında kesildi; "Derin" kademeyle yeniden deneyin.</p>`:""}</div></div>
      ${(m.proposals||[]).length?`<div class="props"><div class="ph2"><span class="lbl">Öneriler · ${m.proposals.length}</span>${pend>1?`<button class="btn sm ghost" data-paall="${mi}">Tümünü kabul et</button>`:""}<span class="tiny muted" style="margin-left:auto">Kabul edilen öneri kural denetiminden geçip kasaya yazılır.</span></div>${m.proposals.map((p,pi)=>propHTML(p,mi,pi)).join("")}</div>`:""}
      ${(m.invalid||[]).length?`<div class="props"><span class="tiny muted">${m.invalid.length} öneri şemaya uymadığı için gösterilmedi: ${esc(m.invalid.map(x=>x.hata).join(" · ").slice(0,240))}</span></div>`:""}
      ${!m.busy&&body?`<div class="mf"><button class="btn sm ghost" data-lib="${mi}">Kütüphaneye kaydet</button><button class="btn sm ghost" data-copy="${mi}">Kopyala</button><span class="spacer" style="flex:1"></span><span class="tiny muted">Devam etmek için yaz; bağlam bu oturumda korunur.</span></div>`:""}
    </div>`;
  }
  const threadHTML=()=>ST.cur&&ST.cur.msgs.length?ST.cur.msgs.map(msgHTML).join(""):"";
  function paintThread(){const el=$("#thread");if(el)el.innerHTML=threadHTML()}
  function paintMsg(mi){const m=ST.cur&&ST.cur.msgs[mi];const el=document.querySelector(`[data-mi="${mi}"]`);if(!m||!el)return;el.outerHTML=msgHTML(m,mi)}

  async function stream(body,m,mi){
    ST.ctrl=new AbortController();
    let raf=0; const paint=()=>{raf=0;const el=document.querySelector(`[data-mi="${mi}"] .md`);if(el)el.innerHTML=md(strip(m.text))||`<span class="typing"><i></i><i></i><i></i></span>`};
    try{
      const res=await fetch("/api/agents/run",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),signal:ST.ctrl.signal});
      if(!res.ok){let t=await res.text();try{t=JSON.parse(t).hata||t}catch(e){}throw new Error(t)}
      const rd=res.body.getReader(),dec=new TextDecoder();let buf="";
      for(;;){const {value,done}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});const ls=buf.split("\n");buf=ls.pop();
        for(const l of ls){if(!l.startsWith("data: "))continue;const d=l.slice(6);if(d==="[DONE]")continue;let ev;try{ev=JSON.parse(d)}catch(e){continue}
          if(ev.delta){m.text+=ev.delta;if(!raf)raf=requestAnimationFrame(paint)}
          if(ev.truncated)m.truncated=true;
          if(ev.proposals){m.proposals=ev.proposals;m.invalid=ev.invalid}
          if(ev.usage)m.usage=ev.usage;
          if(ev.error)throw new Error(ev.error);}}
    }catch(e){ if(e.name==="AbortError") m.error=m.text?null:"Durduruldu."; else m.error=e.message; }
    m.busy=false; ST.ctrl=null;
  }
  function flowTask(f,i,input,last){
    return `Akış ${f.ad} · adım ${i+1}/${f.adimlar.length} (${A(f.adimlar[i]).ad}).\nKomut tanımı:\n${f.govde}\n\nFerhan'ın girdisi: ${input||"(girdi yok)"}\n\n`+
      (last?"Son adımsın: önceki adımların bulgularını birleştir, Ferhan'a kısa bir özet ver ve kasaya yazılacak her şeyi tek bir wisy-oneri bloğunda öner.":"Yalnız bu adımın işini yap ve bulgularını sonraki adıma aktar. Bu adımda öneri bloğu verme.");
  }
  async function run(){
    const ta=$("#sq"); if(ta) ST.draft=ta.value;
    const task=ST.draft.trim(); if(ST.busy) return;
    if(!task&&!(ST.flow&&!ST.flow.girdi)){ta&&ta.focus();return}
    if(!ST.server){toast("Stüdyo sunucuyla çalışır: npm start");return}
    if(!ST.claude){toast("Claude bağlı değil: WISY_MANAGEMENT tanımlayın");return}
    if(!ST.cur){ST.cur={id:uid(),ts:new Date().toISOString(),title:(task||ST.flow.ad).slice(0,80),ajan:ST.flow?ST.flow.ad:ST.ajan,msgs:[]};ST.sessions.unshift(ST.cur)}
    const flow=ST.flow, files=ST.files.slice(), steps=flow?flow.adimlar:[ST.ajan];
    ST.files=[]; ST.draft=""; ST.flow=null; ST.busy=true;
    // önceki konuşma bağlamı (yalnız tek ajanlı devamlarda)
    const gecmis=flow?[]:ST.cur.msgs.filter(x=>!x.error&&!x.busy).slice(-10).map(x=>({role:x.role==="user"?"user":"assistant",content:x.role==="user"?x.text:strip(x.text)||"(boş)"})).filter((x,i,arr)=>!(i===0&&x.role==="assistant"));
    ST.cur.msgs.push({role:"user",text:task,files:files.map(f=>f.ad),flow:flow?flow.ad:null});
    render();
    let onceki="";
    for(let i=0;i<steps.length;i++){
      const last=i===steps.length-1;
      const m={role:"assistant",ajan:steps[i],text:"",proposals:[],tier:ST.tier,busy:true,flow:flow?{ad:flow.ad,i,adimlar:steps}:null};
      ST.cur.msgs.push(m); const mi=ST.cur.msgs.length-1; paintThread();
      document.querySelector(`[data-mi="${mi}"]`)?.scrollIntoView({behavior:"smooth",block:"nearest"});
      await stream({ajan:steps[i],gorev:flow?flowTask(flow,i,task,last):task,kim:ST.kim||null,kaynaklar:!flow&&ST.srcs?ST.srcs:undefined,gecmis:i===0?gecmis:[],onceki:onceki||undefined,tier:ST.tier,dosyalar:i===0?files:[]},m,mi);
      paintMsg(mi);
      if(m.error) break;
      onceki=strip(m.text);
    }
    ST.busy=false; saveSess(); render();
  }
  async function accept(mi,pi){
    const m=ST.cur.msgs[mi], p=m.proposals[pi]; if(!p) return;
    const {_st,_msg,...oneri}=p;
    if(!LIVE()){p._st="hata";p._msg="Örnek kipte kasa yazımı yok; üstteki kaynağı Kasa yapın.";paintMsg(mi);return}
    try{const r=await api("/api/vault/apply",{method:"POST",body:{oneri,kaynak:`ajan:${m.ajan}`}});p._st="kabul";p._msg=`${r.ozet} · ${r.yazilan.join(", ")}`;await reload().catch(()=>{})}
    catch(e){p._st="hata";p._msg=e.message}
    saveSess(); paintMsg(mi);
  }

  /* ---------------- görünümler ---------------- */
  function quick(){
    const q=[];
    const due=CARDS.filter(c=>c.durum==="beklemede"&&c.kalan<=0).length, noid=noidList().length, gaps=gapSkills().length;
    const unax=CONCEPTS.filter(c=>/belirlenecek/i.test(c.d+c.f+c.s)).length, empty=PROJ.filter(p=>filled(p)<6);
    if(due) q.push(["B",`${due} kartın beklemesi doldu`,"bultenci","Bekleme süresi dolan kartları yeniden okut: hangileri hazır olmalı?"]);
    if(noid) q.push(["KY",`${noid} kimliksiz kaydı yönlendir`,"kimlik-yonlendirici","Kimliksiz bütün kayıtlar için birincil kimlik öner."]);
    if(empty[0]) q.push(["PM",`${empty[0].baslik}: boş halkaları doldur`,"proje-mimari",`"${empty[0].baslik}" projesinin boş halkalarını (${empty[0].rings.filter(r=>!r[2]).map(r=>r[0]).join(", ")}) doldurmak için öneri ver.`]);
    if(!gaps&&SK.length) q.push(["YÖ","Yetenek evrelerini belirleyelim","yetenek-olcer","En aktif üç kimlikle başlayarak yeteneklerin evre ve hedef evresini birlikte belirleyelim."]);
    if(gaps) q.push(["HC","En büyük açığa modül","hoca","En büyük yetenek açığı için modül tasarla."]);
    if(unax) q.push(["H",`${unax} kavramın eksenlerini doldur`,"haritaci","Eksenleri belirlenmemiş kavramlar için disiplin, fonksiyon ve sektör öner."]);
    q.push(["OR","Bu hafta neye odaklanmalıyım?","orkestrator","Kasaya bak: bu hafta hangi kimliği ileri taşımalıyım? Üç somut adım öner; her adımı hangi ajanın yapacağını yaz."]);
    return q.slice(0,6);
  }
  V.studio=()=>{
    const a=A(ST.ajan), srcs=ST.srcs||a.kaynaklar||[];
    const status=!ST.server?`<span class="dot off"></span>Wisy Stüdyo · sunucu yok`:ST.claude?`<span class="dot"></span>Wisy Stüdyo · Claude bağlı`:`<span class="dot warn"></span>Wisy Stüdyo · Claude anahtarı yok`;
    const head=`<header class="phead"><div class="ph-l"><div class="eyebrow" style="color:var(--ink-3)">${status}${LIVE()?`<span class="st live">Kasa · canlı</span>`:`<span class="st">Örnek veri</span>`}</div><h1 class="hero">Bugün neyi <em>öğrenip</em> neye dönüştürüyoruz?</h1><p class="lead">Kasanın tamamı tek komut satırında. Bir ajan seç ya da orkestratöre bırak; öneriler kasaya yalnız senin onayınla, kural denetiminden geçerek yazılır.</p></div><div class="actions"><button class="btn" data-snew="1">+ Yeni oturum</button><button class="btn ghost" data-view="oturumlar">Oturumlar · ${ST.sessions.length}</button></div></header>`;
    const notice=!ST.server?`<div class="notice"><b>Sunucu yok.</b><span>Stüdyo kasayı okuyan yerel sunucuyla çalışır: <code>wisy</code> klasöründe <code>npm start</code>, sonra <code>http://localhost:8788</code>.</span></div>`
      :!ST.claude?`<div class="notice"><b>Claude bağlı değil.</b><span>Yerelde <code>.env</code>, dağıtımda Railway Variables içine <code>WISY_MANAGEMENT=…</code> ekleyip sunucuyu yeniden başlatın. Panel, kasa yazımı ve hızlı kart anahtarsız da çalışır.</span></div>`:"";
    const composer=`<div class="composer" id="composer">
      <div class="crow"><span class="lbl">Ajan</span>${ST.agents.map(x=>`<button class="opt ${x.id===ST.ajan&&!ST.flow?"on":""}" data-sag="${x.id}" title="${esc(x.aciklama)}"><span class="mk">${esc(x.kisa)}</span>${esc(x.ad)}</button>`).join("")}</div>
      <div class="crow"><span class="lbl">Kapsam</span><button class="opt ${!ST.kim?"on":""}" data-skim="">Tüm kasa</button><select class="sel" id="skim" aria-label="Kimlik kapsamı"><option value="">Bir kimlik seç…</option>${famOrder.map(f=>`<optgroup label="${FAM[f].ad}">${IDS.filter(i=>i.aile===f).map(i=>`<option value="${esc(i.slug)}" ${ST.kim===i.slug?"selected":""}>${esc(i.ad)}</option>`).join("")}</optgroup>`).join("")}</select>${ST.kim?idb(ST.kim):""}</div>
      ${ST.flow?"":`<div class="crow"><span class="lbl">Bağlam</span>${Object.keys(SRC_AD).map(k=>`<button class="fchip ${srcs.includes(k)?"on":""}" data-ssrc="${k}">${SRC_AD[k]}</button>`).join("")}${ST.srcs?`<button class="more" data-ssrc-reset="1">ajanın varsayılanı</button>`:""}</div>`}
      ${ST.flow?`<div class="flowchip"><span class="lbl">Akış</span><b>${esc(ST.flow.ad)}</b><span class="mini-chain">${ST.flow.adimlar.map((s,k)=>`${k?"<b></b>":""}<span title="${esc(A(s).ad)}">${esc(A(s).kisa)}</span>`).join("")}</span><span class="small muted">${esc(ST.flow.aciklama)}</span><button class="btn sm ghost" data-sflow-x="1" style="margin-left:auto">✕</button></div>`:""}
      <label for="sq" style="position:absolute;left:-9999px">İstek</label>
      <textarea id="sq" rows="3" placeholder="${ST.flow?esc(ST.flow.girdi?`Girdi: ${ST.flow.girdi}`:"Girdi gerekmez; Çalıştır'a bas."):`${esc(a.ad)} için iste. Ör. “Bu hafta okuduğum ekonomi politik notlarını kartlara çevir.” Dosya ekleyip “bunu kartlara böl” de diyebilirsin.`}">${esc(ST.draft)}</textarea>
      ${ST.files.length?`<div class="atts">${ST.files.map((f,k)=>`<span class="att">${esc(f.ad)} · ${Math.round(f.metin.length/1000)}k <button data-sfile-x="${k}" aria-label="Kaldır">✕</button></span>`).join("")}</div>`:""}
      <div class="cfoot"><button class="btn sm ghost" data-sfile="1"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M10.5 5.5l-4.6 4.6a1.6 1.6 0 002.3 2.3l5-5a3 3 0 00-4.3-4.3l-5.3 5.3a4.4 4.4 0 006.3 6.3l4.4-4.4"/></svg>Dosya ekle</button><input type="file" id="sfin" multiple hidden accept=".txt,.md,.csv,.json,.html,.htm,.xml">
        <span class="tiny muted">${ST.flow?`${ST.flow.adimlar.length} adım sırayla çalışır`:`${esc(a.ad)} · katman ${esc(a.katman)}`}</span><span class="spacer"></span>
        <select class="sel" id="stier" aria-label="Model kademesi">${Object.entries(TIER_AD).map(([k,l])=>`<option value="${k}" ${ST.tier===k?"selected":""}>${l}</option>`).join("")}</select>
        ${ST.busy?`<button class="btn" data-sstop="1">Durdur</button>`:`<button class="btn pri" data-srun="1">Çalıştır<kbd>Ctrl ↵</kbd></button>`}</div>
    </div>`;
    const qk=`<div class="quick">${quick().map(([k,t,aj,g])=>`<button data-ask="${aj}" data-gorev="${esc(g)}"><b>${k}</b>${esc(t)}</button>`).join("")}</div>`;
    const thread=`<div class="thread" id="thread">${threadHTML()}</div>`;
    const flows=ST.flows.length?`<div class="sect"><h2>Akışlar</h2><span class="note">Claude Code komutlarıyla aynı: <span class="mono">.claude/commands</span> · ajanlar sırayla çalışır</span></div><div class="gallery">${ST.flows.map(f=>`<button class="tcard akis" data-sflow="${f.id}"><div class="tk"><i>/</i>Akış · ${f.adimlar.length} adım</div><div class="tt">${esc(f.ad)}</div><div class="small muted">${esc(f.aciklama)}</div><div class="mini-chain">${f.adimlar.map((s,k)=>`${k?"<b></b>":""}<span title="${esc(A(s).ad)}">${esc(A(s).kisa)}</span>`).join("")}</div></button>`).join("")}</div>`:"";
    const recipes=`<div class="sect"><h2>Şablonlar</h2><span class="note">Tekrarlayan işi tek tıkla komut satırına yükler · ana hikaye sırasıyla</span></div><div class="gallery">${RECIPES.map(([aj,t,g])=>`<button class="tcard" data-ask="${aj}" data-gorev="${esc(g)}"><div class="tk"><i>${esc(A(aj).kisa)}</i>${esc(A(aj).ad)} · katman ${esc(A(aj).katman)}</div><div class="tt">${esc(t)}</div><div class="small muted">${esc(g)}</div></button>`).join("")}</div>`;
    return head+notice+composer+qk+thread+flows+recipes;
  };
  V.oturumlar=()=>phead("Wisy Stüdyo","Oturumlar","Oturum, bir kimlik ya da konu etrafında süren çalışma alanıdır: bağlam korunur, öneriler kabul edildikçe kasaya yazılır.",`<button class="btn pri" data-snew="1">+ Yeni oturum</button>`)+
    (ST.sessions.length?`<div class="sess">${ST.sessions.map((s,k)=>{const props=s.msgs.flatMap(m=>m.proposals||[]);const ok=props.filter(p=>p._st==="kabul").length;return `<div class="sesscard"><button style="text-align:left;display:flex;flex-direction:column;gap:6px" data-sopen="${k}"><div class="lbl">${new Date(s.ts).toLocaleDateString("tr-TR",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"})}</div><div class="tt">${esc(s.title)}</div><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span class="tag">${esc((A(s.ajan)||{}).ad||s.ajan)}</span><span class="tiny muted mono">${s.msgs.length} mesaj · ${ok}/${props.length} öneri kasada</span></div></button><div style="display:flex;justify-content:flex-end"><button class="btn sm ghost" data-sdel="${k}">Kaldır</button></div></div>`}).join("")}</div>`
      :`<div class="emptyst"><h3>Henüz oturum yok</h3><p>Stüdyoda ilk isteği çalıştırınca oturum burada birikir.</p><button class="btn pri" data-view="studio">Stüdyoya git</button></div>`);
  V.kutuphane=()=>phead("Wisy Stüdyo","Çıktı kütüphanesi","Kaydedilen ajan çıktıları. Bülten taslağı, modül planı, rapor: hepsi bir yerde, kopyala ya da indir.")+
    (ST.library.length?ST.library.map((l,k)=>`<details class="libitem"><summary><span class="tag">${esc(A(l.ajan).ad)}</span><b style="font-family:var(--font-display);font-weight:500;font-size:16.5px">${esc(l.title)}</b><span class="tiny muted mono" style="margin-left:auto">${new Date(l.ts).toLocaleDateString("tr-TR",{day:"numeric",month:"long"})}</span><button class="btn sm ghost" data-lcopy="${k}">Kopyala</button><button class="btn sm ghost" data-ldl="${k}">İndir .md</button><button class="btn sm ghost" data-ldel="${k}">Kaldır</button></summary><div class="md">${md(l.text)}</div></details>`).join("")
      :`<div class="emptyst"><h3>Kütüphane boş</h3><p>Stüdyoda bir yanıtın altındaki “Kütüphaneye kaydet” ile eklenir.</p></div>`);
  V.ajanlar=()=>{
    const issues=(LIVE()&&M.issues)||[];
    const use=a=>a.kullanim?`<span class="mono tiny">${a.kullanim.n} çağrı · $${a.kullanim.usd.toFixed(2)}</span>`:`<span class="tiny muted">bu ay çalışmadı</span>`;
    const j=ST.journal;
    return phead(`Orkestrasyon · ${ST.agents.length-1} ajan, 11 katman`,`Ajanlar`,`Her katmanın bir sahibi ajan var. Ajan hazırlar, sınıflar, önerir; silme, yayınlama ve dışa aktarma senin onayınla. Tanımlar <span class="mono">.claude/agents</span> içinde: Claude Code ve panel aynı ajanları kullanır.`,`<button class="btn pri" data-view="studio">Stüdyoya git</button>`)+
    `<div class="rail">${ST.agents.map(a=>`<div class="rrow ${a.id==="orkestrator"?"orch":""}"><div class="ly"><span>Katman</span><b>${esc(a.katman)}</b></div><div><div class="nm"><i>${esc(a.kisa)}</i>${esc(a.ad)}</div><div class="small muted" style="margin-top:3px">${esc((a.aciklama||"").replace(/^Wisy katman [^.]*\.\s*/,""))}</div></div><div class="opts">${(a.kaynaklar||[]).slice(0,5).map(s=>`<span class="tag">${SRC_AD[s]||s}</span>`).join("")}</div><div>${use(a)}</div><div><button class="btn sm" data-ask="${a.id}" data-gorev="">Çalıştır</button></div></div>`).join("")}</div>
     ${ST.flows.length?`<div class="sect"><h2>Akışlar</h2><span class="note">Komut → ajan zinciri</span></div><div class="gallery">${ST.flows.map(f=>`<button class="tcard akis" data-sflow="${f.id}"><div class="tk"><i>/</i>${f.adimlar.length} adım</div><div class="tt">${esc(f.ad)}</div><div class="small muted">${esc(f.aciklama)}</div><div class="mini-chain">${f.adimlar.map((s,k)=>`${k?"<b></b>":""}<span title="${esc(A(s).ad)}">${esc(A(s).kisa)}</span>`).join("")}</div></button>`).join("")}</div>`:""}
     <div class="grid g2" style="margin-top:18px">
      <section class="panel"><div class="ph"><h3>Kasa günlüğü</h3><span class="r lbl">son yazımlar</span></div>${!ST.server?`<div class="pb small muted">Sunucu yok.</div>`:j==null?`<div class="pb small muted">Yükleniyor…</div>`:j.length?`<div class="tbl-wrap"><table class="t"><thead><tr><th>Ne zaman</th><th>Kim</th><th>Ne</th></tr></thead><tbody>${j.slice(0,25).map(r=>`<tr><td class="mono tiny">${new Date(r.ts).toLocaleString("tr-TR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</td><td class="small">${esc(String(r.kaynak).replace(/^ajan:/,"")===r.kaynak?r.kaynak:A(String(r.kaynak).slice(5)).ad)}</td><td class="small">${esc(r.ozet)}<div class="tiny muted mono">${esc(r.dosyalar.join(", "))}</div></td></tr>`).join("")}</tbody></table></div>`:`<div class="pb small muted">Henüz kasaya yazım yok.</div>`}</section>
      <section class="panel"><div class="ph"><h3>Kural denetimi</h3><span class="chip ${issues.some(i=>i.sev==="hata")?"attn":"ok"}">${issues.filter(i=>i.sev==="hata").length} hata · ${issues.filter(i=>i.sev==="uyari").length} uyarı</span><span class="r lbl">validate_vault ile aynı</span></div>${issues.length?`<ul class="alist">${issues.slice(0,30).map(i=>`<li><span class="sv ${i.sev==="uyari"?"warn":""}"></span><div><div class="kind">${i.sev==="hata"?"Hata":"Uyarı"} · ${esc(i.kural)}</div><div class="tt" style="font-weight:500;font-size:13px">${esc(i.msg)}</div><div class="meta"><span class="tag">${esc(i.rel)}</span></div></div><span></span></li>`).join("")}</ul>`:`<div class="pb small muted">${LIVE()?"Kasa temiz: 0 hata, 0 uyarı.":"Örnek kipte denetim yok."}</div>`}</section>
     </div>`;
  };

  /* ---------------- olaylar ---------------- */
  function afterRender(v){
    $("#nc-sess").textContent=ST.sessions.length||""; $("#nc-lib").textContent=ST.library.length||""; $("#nc-ajan").textContent=ST.agents.length-1;
    if(v==="ajanlar"&&ST.server&&ST.journal==null){api("/api/vault/journal").then(j=>{ST.journal=j;if(S.view==="ajanlar")render()}).catch(()=>{ST.journal=[]})}
    if(v!=="ajanlar") ST.journal=null;
    if(v!=="studio") return;
    const ta=$("#sq"); if(!ta) return;
    ta.addEventListener("input",()=>{ST.draft=ta.value});
    ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();run()}});
    $("#skim").addEventListener("change",e=>{ST.kim=e.target.value;render()});
    $("#stier").addEventListener("change",e=>{ST.tier=e.target.value});
    $("#sfin").addEventListener("change",async e=>{for(const f of e.target.files){const t=await f.text();ST.files.push({ad:f.name,metin:t.slice(0,200000)})}render()});
    if(ST.focus){ST.focus=false;ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);document.getElementById("composer").scrollIntoView({block:"center"})}
  }
  document.addEventListener("click",async e=>{
    const t=e.target.closest("button"); if(!t) return; const d=t.dataset;
    const keep=()=>{const ta=$("#sq");if(ta)ST.draft=ta.value};
    if(d.sag){keep();ST.ajan=d.sag;ST.srcs=null;ST.flow=null;render();return}
    if(d.skim!==undefined){keep();ST.kim="";render();return}
    if(d.ssrc){keep();const cur=ST.srcs||A(ST.ajan).kaynaklar.slice();ST.srcs=cur.includes(d.ssrc)?cur.filter(x=>x!==d.ssrc):[...cur,d.ssrc];render();return}
    if(d.ssrcReset){keep();ST.srcs=null;render();return}
    if(d.sflow){const f=ST.flows.find(x=>x.id===d.sflow);if(!f)return;ST.flow=f;ST.draft="";ST.focus=true;if(S.view!=="studio")go("studio");else render();return}
    if(d.sflowX){keep();ST.flow=null;render();return}
    if(d.sfile){$("#sfin").click();return}
    if(d.sfileX!==undefined){keep();ST.files.splice(+d.sfileX,1);render();return}
    if(d.srun){run();return}
    if(d.sstop){ST.ctrl&&ST.ctrl.abort();return}
    if(d.snew){ST.cur=null;ST.draft="";ST.flow=null;ST.focus=true;go("studio");return}
    if(d.sopen!==undefined){ST.cur=ST.sessions[+d.sopen];go("studio");return}
    if(d.sdel!==undefined){if(!confirm("Bu oturum listeden kaldırılsın mı? Kasaya yazılmış kayıtlar yerinde kalır."))return;const s=ST.sessions.splice(+d.sdel,1)[0];if(ST.cur===s)ST.cur=null;saveSess();render();return}
    if(d.pa){const [mi,pi]=d.pa.split(":").map(Number);t.disabled=true;await accept(mi,pi);return}
    if(d.pr){const [mi,pi]=d.pr.split(":").map(Number);ST.cur.msgs[mi].proposals[pi]._st="red";saveSess();paintMsg(mi);return}
    if(d.paall!==undefined){const mi=+d.paall;t.disabled=true;for(let pi=0;pi<ST.cur.msgs[mi].proposals.length;pi++){const p=ST.cur.msgs[mi].proposals[pi];if(!p._st||p._st==="bekliyor")await accept(mi,pi)}return}
    if(d.lib!==undefined){const m=ST.cur.msgs[+d.lib];const text=strip(m.text);ST.library.unshift({id:uid(),ts:new Date().toISOString(),ajan:m.ajan,title:(text.match(/^#+\s*(.+)$/m)||[,text.split("\n")[0]])[1].replace(/[*#]/g,"").slice(0,90),text});save("library");toast("Kütüphaneye kaydedildi");afterRender(S.view);return}
    if(d.copy!==undefined){navigator.clipboard.writeText(strip(ST.cur.msgs[+d.copy].text)).then(()=>toast("Kopyalandı"));return}
    if(d.lcopy!==undefined){e.preventDefault();navigator.clipboard.writeText(ST.library[+d.lcopy].text).then(()=>toast("Kopyalandı"));return}
    if(d.ldl!==undefined){e.preventDefault();const l=ST.library[+d.ldl];const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([l.text],{type:"text/markdown"}));a.download=(l.title||"wisy").replace(/[^\wçğıöşüÇĞİÖŞÜ -]/g,"").slice(0,60)+".md";a.click();return}
    if(d.ldel!==undefined){e.preventDefault();ST.library.splice(+d.ldel,1);save("library");render();return}
  });
  return {init,preset,afterRender,claude:false};
})();
window.Studio=Studio;

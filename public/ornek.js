/* Örnek veri — Claude Design omurga v1 (design/claude-design-cikti) ile birebir. Gerçek kayıt değildir.
   Panel "Örnek" kipinde bunu, "Kasa" kipinde /api/model yanıtını aynı biçimde okur. */
(function(){
const TODAY = new Date(2026,9,25);
const FAM = {
  kok:{ad:"Kök",sh:"kok",dikey:"BİLGE",not:"Geçmişten gelen, bugünü okutan kimlikler"},
  mesleki:{ad:"Mesleki",sh:"mes",dikey:"VARLIKLI",not:"Gelir ve itibar üreten meslek kimlikleri"},
  kurucu:{ad:"Kurucu ve yatırımcı",sh:"kur",dikey:"VARLIKLI",not:"İş ve sermaye kuran kimlikler"},
  akademik:{ad:"Akademik",sh:"aka",dikey:"BİLGE",not:"Bilgiyi üreten, yazan, öğreten kimlikler"},
  kisisel:{ad:"Kişisel",sh:"kis",dikey:"BİLGE",not:"Kişinin kendisi için olan kimlikler"}
};
const FAMCLS = {kok:"kok",mesleki:"mes",kurucu:"kur",akademik:"aka",kisisel:"kis"};
// slug, ad, aile, zaman, bağlam, ana soru, evre, yetenekler, sınır, kanal, son etkinlik (gün önce), 30 günlük etkinlik
const IDS = [
 ["harbiyeli","Harbiyeli ve subay","kok","kok","Askeri tarih, strateji","Strateji, komuta ve çatışma bugün neyi açıklar?",null,["Strateji ve harekât düşüncesi","Liderlik ve komuta","Kriz yönetimi"],"Görev dönemine ait gizlilik yükümlülükleri","LinkedIn, bülten",9,4],
 ["uluslararasi","Uluslararası ilişkiler","kok","kok","Her gün aktif: jeopolitik, dış politika, ekonomi politik","Jeopolitik ve ekonomi politik kararlarımı nasıl etkiler?",null,["Jeopolitik analiz","Ekonomi politik okuma","Senaryo planlama"],"Kaynak doğrulama, tarafsız analiz","Bülten, LinkedIn",1,14],
 ["avukat","Avukat","mesleki","guncel","Juris","Müvekkile hangi riski veya çözümü getirir?","usta",["Sözleşme tasarımı","Uyuşmazlık stratejisi","Mevzuat takibi"],"TBB reklam yasağı, sır saklama","LinkedIn, bülten",2,11],
 ["tahkim","Tahkim uzmanı","mesleki","guncel","Yatırım tahkimi","Uyuşmazlık nasıl önlenir veya çözülür?",null,["Yatırım antlaşması analizi","Tahkim usulü","Delil ve dilekçe kurgusu"],"Dosya gizliliği","Akademik, LinkedIn",3,9],
 ["danisman","Danışman ve mentor","mesleki","guncel","Onscala, FleetMole","Hangi karar için çerçeve olur?",null,["Problem çerçeveleme","Finansal analiz","İkna edici sunum"],"Çıkar çatışması","Web, GitHub, kurs",1,12],
 ["ykuye","Yönetim kurulu üyesi","mesleki","guncel","Kurumsal yönetim","Hangi yönetişim ve risk sorusuna cevap verir?",null,["Finansal tablo okuma","Risk ve iç kontrol","Kurumsal yönetim ilkeleri"],"Gizlilik, içeriden bilgi","Kapalı rapor, seçili konuşma",12,3],
 ["performans","Performans pazarlamacı","mesleki","guncel","Meta, Google, Amazon, Pinterest","Hangi kanal, hangi maliyetle büyütür?","usta",["Kampanya mimarisi","Ölçümleme","Kreatif test"],"Müşteri verisi gizliliği","Kurs, LinkedIn",4,6],
 ["girisimci","Seri girişimci","kurucu","guncel","FevUp, Marqby, STANDIO, TOVU","Hangi problem ölçeklenebilir bir işe dönüşür?","usta",["İş modeli tasarımı","Fon toplama","Ekip kurma"],"Yatırımcı sözleşmeleri, rekabet yasağı","LinkedIn, GitHub",2,10],
 ["eihracat","E-ihracatçı","kurucu","guncel","FevUp, D2X, EuroStep","Hangi ürün, pazar ve büyüme kaldıracı?",null,["Pazar araştırması","Lojistik ve gümrük","Teşvik yönetimi"],"Rekabet yasağı alanları","LinkedIn, Kaggle",5,7],
 ["yatirimci","Yatırımcı","kurucu","guncel","MTFG, fon portföyü","Nakit akışı mı, değer mi, risk ne?",null,["Değerleme","Portföy ve risk yönetimi","Sermaye piyasası mevzuatı"],"Kişiye özel yatırım tavsiyesi yok (SPK)","Kapalı panel, seçili içerik",3,8],
 ["ai","AI sistem mimarı","kurucu","guncel","Commerce Engine, JCE, Vibe Management","Hangi süreç ajanla otomatikleşir?","yaratici",["Ajan tasarımı","Veri yönetimi","Değerlendirme ve test"],"Veri güvenliği, KVKK","GitHub, Hugging Face",0,16],
 ["akademisyen","Akademisyen","akademik","guncel","Doktora, doçentlik hedefi","Bunu yayımlayabilir, öğretebilir miyim?","yaratici",["Araştırma yöntemi","Akademik yazım","Literatür yönetimi"],"Bilimsel etik, atıf kuralları","Akademik yayın, Zenodo",1,13],
 ["yazar","Araştırmacı-yazar","akademik","guncel","Hukuk ve Sinema, Türkiye 3X","Hangi fikir kalıcı metne dönüşür?","yaratici",["Anlatı kurma","Editörlük","Seri planlama"],"Telif ve alıntı kuralları","LinkedIn, web, bülten",2,9],
 ["konusmaci","Konuşmacı ve panelist","akademik","guncel","COP31, girişim sunumları","Bu fikir sahnede nasıl anlatılır?",null,["Hikaye anlatımı","Sahne hakimiyeti","Soru-cevap yönetimi"],"Kurum adına konuşma sınırı","Etkinlik, video",6,4],
 ["egitmen","Eğitmen","akademik","hedef","Udemy, Borfin, MasterClass","Kim, neyi, hangi sırayla öğrenecek?","cirak",["Öğretim tasarımı","Video üretimi","Ölçme ve değerlendirme"],"Meslek kuralları, telif","Kurs platformları",15,2],
 ["dusunur","Düşünür ve okur","kisisel","guncel","Felsefe, sanat tarihi, politik ekonomi","Bu beni nasıl dönüştürür?",null,["Derin okuma","Sentez","Karşılaştırmalı analiz"],"Mahremiyet","Özel arşiv, seçili deneme",4,7],
 ["muzisyen","Müzisyen","kisisel","guncel","Loop prodüksiyonu, ev stüdyosu","Ne yaratmak istiyorum?","cirak",["Loop prodüksiyonu","Armoni","Ses tasarımı"],"Telif, örnekleme hakları","Özel arşiv",8,3],
 ["doga","Doğa insanı","kisisel","guncel","Yürüyüş, rota, dayanıklılık","Nasıl dinç ve dengede kalırım?",null,["Rota planlama","Dayanıklılık","Ekipman bilgisi"],"Mahremiyet","Özel arşiv",41,0],
 ["aile","Aile ve ilişki rolleri","kisisel","guncel","Ferhan tanımlar","Ferhan tanımlar",null,[],"Mahremiyet","Paylaşılmaz",null,0]
].map(a=>({slug:a[0],ad:a[1],aile:a[2],zaman:a[3],baglam:a[4],soru:a[5],evre:a[6],yet:a[7],sinir:a[8],kanal:a[9],son:a[10],act:a[11]}));
const ID = Object.fromEntries(IDS.map(i=>[i.slug,i]));

let CARDS = [
 {id:1,idea:"Risk, onu en iyi yönetebilecek tarafa yüklenir",tema:"Proje finansmanı riski",kim:"danisman",kim2:"akademisyen",taraf:"kisisel",durum:"hazir",kaynak:"Proje finansmanı ders kitabı",tur:"kitap",sayfa:"112",fikir:"Proje finansmanında her risk, onu en düşük maliyetle kontrol edebilecek tarafa sözleşmeyle yüklenir. Yanlış dağıtılan risk uyuşmazlığa dönüşür.",baglam:"Meridyen risk modülünün çekirdek ilkesi."},
 {id:2,idea:"Stabilizasyon şartı yatırımcıyı korur, ama devletin düzenleme alanını daraltır",tema:"Politik risk",kim:"tahkim",kim2:"uluslararasi",taraf:"kisisel",durum:"beklemede",kalan:0,kaynak:"Yatırım tahkimi el kitabı",tur:"kitap",sayfa:"88",fikir:"Mevzuat değişikliğine karşı dondurma, yatırımcı için güvence ve ev sahibi devlet için egemenlik maliyetidir.",baglam:"Tez 3. bölüm ve politik risk modülü."},
 {id:3,idea:"Tedarik zinciri, savaşın görünmeyen cephesidir",tema:"Strateji ve lojistik",kim:"harbiyeli",kim2:"eihracat",taraf:"kisisel",durum:"beklemede",kalan:3,kaynak:"Lojistik tarihi okuması",tur:"kitap",sayfa:"4",fikir:"Harekâtın sınırını cephe değil ikmal hattı çizer.",baglam:"E-ihracat lojistiği ile kesişim adayı."},
 {id:4,idea:"Çift kullanımlı ürün, sözleşmeden önce sınıflandırılır",tema:"İhracat kontrolü",kim:"avukat",kim2:"harbiyeli",taraf:"kisisel",durum:"beklemede",kalan:0,kaynak:"İhracat kontrol rejimleri notları",tur:"makale",sayfa:"—",fikir:"Sınıflandırma sonradan yapılırsa sözleşme, lisans alınamayan bir teslim taahhüdüne dönüşür.",baglam:"Savunma sanayii hukuku projesinin kavram halkası."},
 {id:5,idea:"Reklamda en pahalı hata, yanlış ölçülen dönüşümdür",tema:"Ölçümleme",kim:"performans",taraf:"sirket",durum:"hazir",kaynak:"Kampanya incelemesi",tur:"deneyim",sayfa:"—",fikir:"Bütçe kararı ölçümün doğruluğundan daha iyi olamaz.",baglam:"Şirket tarafı: FevUp deneyiminden. Gizli veri içermez."},
 {id:6,idea:"Ajanın değerlendirmesi, ajanın kendisinden önce yazılır",tema:"Ajan tasarımı",kim:"ai",taraf:"kisisel",durum:"hazir",kaynak:"Ajan geliştirme modülü",tur:"kurs",sayfa:"Birim 1",fikir:"Neyin iyi sayılacağı baştan yazılmazsa ajan, ölçülemeyen bir prototipte kalır.",baglam:"Meridyen ajanı v0."},
 {id:7,idea:"Para politikası, dış politikanın sessiz koludur",tema:"Ekonomi politik",kim:"uluslararasi",kim2:"yatirimci",taraf:"kisisel",durum:"beklemede",kalan:6,kaynak:"Ekonomi politik derlemesi",tur:"kitap",sayfa:"57",fikir:"Faiz ve kur kararları, ittifak ve yaptırım kadar dış etkilidir.",baglam:"Bülten #5 adayı."},
 {id:8,idea:"Marka, tekrar edilen vaattir",tema:"Marka",kim:null,taraf:"kisisel",durum:"taslak",kaynak:"Sohbet notu",tur:"sohbet",sayfa:"—",fikir:"Vaat tutuldukça marka birikir; değiştikçe sıfırlanır.",baglam:"Kimlik belirsiz: girişimci mi, yazar mı?"},
 {id:9,idea:"Yönetim kurulunun ilk işi, riski görünür kılacak soruyu sormaktır",tema:"Kurumsal yönetim",kim:"ykuye",taraf:"sirket",durum:"kullanildi",kaynak:"Kurumsal yönetim ilkeleri",tur:"kitap",sayfa:"31",fikir:"Soru sorulmadan raporlanan risk, yönetilmeyen risktir.",baglam:"Kullanıldı: Bülten #4."},
 {id:10,idea:"Bir kursun omurgası, öğrencinin ilk hafta yapabildiği şeydir",tema:"Öğretim tasarımı",kim:"egitmen",taraf:"kisisel",durum:"beklemede",kalan:8,kaynak:"Öğretim tasarımı kitabı",tur:"kitap",sayfa:"19",fikir:"Müfredat, konu listesinden değil ilk somut başarıdan geriye kurulur.",baglam:"Kurs omurgası modülü."},
 {id:11,idea:"Loop tekrar değildir; her turda küçük bir sapmadır",tema:"Loop prodüksiyonu",kim:"muzisyen",taraf:"kisisel",durum:"hazir",kaynak:"Stüdyo notu",tur:"deneyim",sayfa:"—",fikir:"Dinleyiciyi tutan, döngünün içindeki küçük değişimdir.",baglam:"Özel arşiv."},
 {id:12,idea:"Uzun yürüyüşte tempo nefesle ayarlanır",tema:"Dayanıklılık",kim:"doga",taraf:"kisisel",durum:"kullanildi",kaynak:"Rota günlüğü",tur:"deneyim",sayfa:"—",fikir:"Nefes konuşmaya izin veriyorsa tempo sürdürülebilir.",baglam:"Kullanıldı: kişisel deneme."},
 {id:13,idea:"Delil, hikayeyi taşıyan iskelettir",tema:"Uyuşmazlık stratejisi",kim:null,taraf:"kisisel",durum:"taslak",kaynak:"Duruşma hazırlığı",tur:"deneyim",sayfa:"—",fikir:"İyi dilekçe önce delil sırasını kurar, sonra anlatıyı.",baglam:"Kimlik belirsiz: avukat mı, tahkim uzmanı mı?"},
 {id:14,idea:"Kalıcı varlık, üretildiği kimlikten bağımsız yaşayabilendir",tema:"Varlık",kim:"dusunur",taraf:"kisisel",durum:"kullanildi",kaynak:"Felsefe okuması",tur:"kitap",sayfa:"140",fikir:"Bir eser, yazarının o günkü rolünden ayrıldığında varlığa dönüşür.",baglam:"Kullanıldı: Wisy ekosistem metni."},
 {id:15,idea:"İlk pazar en büyük değil, en az sürtünmeli olandır",tema:"Pazar seçimi",kim:"eihracat",taraf:"sirket",durum:"hazir",kaynak:"Pazar araştırması",tur:"makale",sayfa:"—",fikir:"Lojistik, dil ve ödeme sürtünmesi düşük pazar, öğrenmeyi hızlandırır.",baglam:"Şirket tarafı: D2X."},
 {id:16,idea:"Sözleşme, uyuşmazlık anında okunacağı varsayımıyla yazılır",tema:"Sözleşme tasarımı",kim:"avukat",kim2:"tahkim",taraf:"kisisel",durum:"beklemede",kalan:2,kaynak:"Sözleşme yazımı kitabı",tur:"kitap",sayfa:"203",fikir:"Belirsiz hüküm, yazıldığı gün değil ihtilaf günü pahalıdır.",baglam:"Hukuk ve Sinema #6 adayı."}
];
try{const extra=JSON.parse(localStorage.getItem("wisy-cards")||"[]");if(Array.isArray(extra))CARDS=extra.concat(CARDS)}catch(e){}
const STAGES = ["cirak","yaratici","usta"];
const STAGE_AD = {cirak:"Çırak",yaratici:"Yaratıcı-aktif",usta:"Usta"};
// yetenek: [ad, kimlik, evre(null=belirlenecek), hedef, kanıt, son kanıt]
const SK = [
 ["Sözleşme tasarımı","avukat","usta","usta",14,"Onscala pay devri taslağı"],["Uyuşmazlık stratejisi","avukat","usta","usta",9,"Tahkim ön değerlendirmesi"],["Mevzuat takibi","avukat","yaratici","usta",6,"İhracat kontrol notu"],
 ["Yatırım antlaşması analizi","tahkim","cirak","usta",1,"Tez 3. bölüm"],["Tahkim usulü","tahkim","yaratici","usta",4,"ICSID usul notu"],["Delil ve dilekçe kurgusu","tahkim","yaratici","usta",5,"Dilekçe şablonu"],
 ["Problem çerçeveleme","danisman","usta","usta",11,"FleetMole yol haritası"],["Finansal analiz","danisman","yaratici","usta",4,"Meridyen risk tablosu"],["İkna edici sunum","danisman","yaratici","usta",6,"NEVA ortak sunumu"],
 ["Ajan tasarımı","ai","yaratici","usta",7,"Commerce Engine orkestratörü"],["Veri yönetimi","ai","yaratici","yaratici",5,"JCE içerik şeması"],["Değerlendirme ve test","ai","cirak","yaratici",2,"Meridyen eval taslağı"],
 ["Araştırma yöntemi","akademisyen","yaratici","usta",6,"Tez yöntem bölümü"],["Akademik yazım","akademisyen","yaratici","usta",8,"COP31 bildiri taslağı"],["Literatür yönetimi","akademisyen","yaratici","yaratici",5,"Dipnot denetimi"],
 ["Öğretim tasarımı","egitmen","cirak","yaratici",0,"—"],["Video üretimi","egitmen","cirak","yaratici",1,"Kısa video denemesi"],["Ölçme ve değerlendirme","egitmen",null,"yaratici",0,"—"],
 ["Kampanya mimarisi","performans","usta","usta",12,"Pinterest hesap yapısı"],["Ölçümleme","performans","usta","usta",9,"Dönüşüm denetimi"],["Kreatif test","performans","yaratici","usta",7,"Meta kreatif matrisi"],
 ["Jeopolitik analiz","uluslararasi",null,"usta",3,"Bülten #4 dış politika notu"],["Ekonomi politik okuma","uluslararasi",null,"usta",4,"Türkiye 3X notu"],["Senaryo planlama","uluslararasi",null,"yaratici",1,"Politik risk senaryosu"],
 ["Loop prodüksiyonu","muzisyen","cirak","yaratici",2,"Ev stüdyosu döngüsü"],["Armoni","muzisyen","cirak","yaratici",1,"Akor çalışması"],["Ses tasarımı","muzisyen",null,"cirak",0,"—"]
].map(a=>({ad:a[0],kim:a[1],evre:a[2],hedef:a[3],kanit:a[4],son:a[5]}));

const PROJ = [
 {id:"meridyen",baslik:"Meridyen",alt:"Proje finansmanı yatırım aracı ajanı",taraf:"kisisel",durum:"hazirlik",kim:"danisman",kim2:"tahkim",
  rings:[["Kavram","Proje finansmanı riski · Politik risk",1],["Kimlik","Danışman (birincil) · Tahkim uzmanı",1],["Yetenek","Finansal analiz · Yatırım antlaşması analizi · Ajan tasarımı",1],["Öğrenme","Risk dağılımı modülü · Ajan geliştirme modülü",1],["Proje","Meridyen v1 · politik risk modülü",1],["Varlık","Henüz yok. Planlı: Meridyen ajanı (kişisel IP), makale, kurs",0]],
  not:"Seçili modüller sözleşmeyle şirkete aktarılır",kesisim:"Uluslararası ilişkiler + yatırımcı + Meridyen → politik risk modülü"},
 {id:"savunma",baslik:"Savunma sanayii hukuku uyum metodolojisi",alt:"İhracat kontrolü ve uyum için yöntem",taraf:"kisisel",durum:"fikir",kim:"avukat",kim2:"harbiyeli",
  rings:[["Kavram","İhracat kontrolü",1],["Kimlik","Avukat (birincil) · Harbiyeli ve subay",1],["Yetenek","Mevzuat takibi · Sözleşme tasarımı",1],["Öğrenme","Boş: modül yok",0],["Proje","Uyum metodolojisi taslağı",1],["Varlık","Boş: varlık tanımlanmadı",0]],
  not:"Öğrenme ve varlık halkaları boş, bu yüzden başlamadı",kesisim:"Subay + uluslararası ilişkiler + avukat → savunma sanayii hukuku"},
 {id:"sinema",baslik:"Hukuk ve Sinema İncelemeleri",alt:"Film üzerinden hukuk dersi veren makale serisi",taraf:"kisisel",durum:"aktif",kim:"yazar",kim2:"avukat",
  rings:[["Kavram","Güven yükümlülüğü · Piyasa riski",1],["Kimlik","Araştırmacı-yazar · Avukat",1],["Yetenek","Anlatı kurma · Seri planlama",1],["Öğrenme","Seri formatı (Margin Call v3)",1],["Proje","6 bölümlük LinkedIn serisi",1],["Varlık","Telifli makale arşivi · seri formatı",1]],
  not:"Kişisel telif; Juris adına reklam içermez (TBB)",kesisim:"Avukat + araştırmacı-yazar → kalıcı seri"}
];
const PSTATES=[["fikir","Fikir"],["hazirlik","Hazırlık"],["aktif","Aktif"],["tamam","Tamamlandı"],["arsiv","Arşiv"]];

const MODS = [
 {ad:"Proje finansmanında risk dağılımı",kim:"danisman",hedef:"Finansal analiz",durum:"devam",units:[["Okuma ve kartlama",2],["Vaka analizi",1],["Meridyen risk modülüne uygulama",0]],kaynak:[["Kitap","Proje finansmanı ders kitabı"],["Kart","6 hazır kart"]],cikti:"Meridyen",taraf:"kisisel"},
 {ad:"Ajan geliştirme",kim:"ai",hedef:"Ajan tasarımı",durum:"devam",units:[["Değerlendirme önce yazılır",2],["Araç kullanımı ve bağlam",2],["Meridyen ajanı v0",1],["Sürüm ve belgeleme",0]],kaynak:[["Udemy","Ajan mimarisi kursu"],["Kod","GitHub deposu"]],cikti:"Meridyen ajanı",taraf:"kisisel"},
 {ad:"Kurs omurgası",kim:"egitmen",hedef:"Öğretim tasarımı",durum:"planli",units:[["İlk hafta başarısı",0],["Modül sırası",0],["Ölçme planı",0]],kaynak:[["Borfin","Eğitmen rehberi"],["MasterClass","Anlatım dersleri"]],cikti:"Proje finansmanı kursu",taraf:"kisisel"},
 {ad:"Yatırım antlaşmalarını okuma",kim:"tahkim",hedef:"Yatırım antlaşması analizi",durum:"oneri",units:[["İkili yatırım antlaşması yapısı",0],["Adil ve hakkaniyete uygun muamele",0],["Tezle bağlama",0]],kaynak:[["Kitap","Yatırım tahkimi el kitabı"]],cikti:"Tez makalesi",taraf:"kisisel"}
];

const ASSETS = {
 donen:{ad:"Dönen",en:"Nakit, alacak, hisse devri",k:[["Danışmanlık gelirleri","in","danisman"]],s:[["Juris müvekkil alacakları","in","avukat"]]},
 maddi:{ad:"Maddi",en:"CAPEX · ev, araç, kütüphane",k:[["Kütüphane (basılı kitap ve dergi)","val","dusunur"],["Ev stüdyosu ekipmanı","out","muzisyen"]],s:[["Ofis demirbaşları","out","avukat"]]},
 finansal:{ad:"Finansal",en:"Ortaklık, BES, yatırım aracı",k:[["Ortaklık payları","val","yatirimci"],["Meridyen (geliştirmede)","none","danisman"]],s:[["Meridyen modülleri (aktarılacak)","val","danisman"]]},
 gayri:{ad:"Gayri maddi",en:"Dijital varlık, marka, telif, alan adı",k:[["Hukuk ve Sinema telifi","val","yazar"],["Kişisel alan adları","out","girisimci"]],s:[["Juris içerik arşivi (JCE)","val","avukat"]]},
 entel:{ad:"Entelektüel",en:"Diploma, lisans, sertifika, yayın",k:[["Doktora (savunma öncesi)","val","akademisyen"],["Avukatlık ruhsatı","in","avukat"]],s:[]}
};
const SICIL = [
 ["Doktora","Diploma","Başkent Üniversitesi · tez savunması sonrası","Süresiz",null,"akademisyen"],
 ["Harbiye","Diploma","Harp Okulu","Süresiz",null,"harbiyeli"],
 ["Avukatlık ruhsatı","Lisans","Baro kaydı","Süresiz",null,"avukat"],
 ["SPL lisansı","Lisans","Sınav hazırlığı: modül 2/5","Hedef 2027",null,"yatirimci"],
 ["Google Ads sertifikası","Sertifika","Ölçümleme kanıtı","14 Kasım 2026",20,"performans"],
 ["Hukuk ve Sinema · Margin Call","Yayın","LinkedIn makalesi · doçentlik dosyası adayı","Kalıcı",null,"yazar"]
];

const CHANNELS = [
 ["LinkedIn","medya","Haftada 2–3","Günün kartı, carousel, makale"],["Bülten","medya","İki haftada 1","Haftanın kartları, okuma listesi"],["Web arşivi","medya","Bültenle","Kalıcı makale, kavram sayfası"],
 ["Akademik","medya","Dönemlik","Makale, bildiri, panel"],["Video ve ses","medya","Ayda 2","Kısa video, podcast"],
 ["GitHub","teknik","Her sürüm","Ajan kodu, araçlar"],["Hugging Face","teknik","Demo hazır olunca","Veri seti, Space demo"],["Kaggle","teknik","Veri yayınında","Veri seti, notebook"],["Zenodo","teknik","Ana sürümlerde","DOI'li arşiv"],
 ["Udemy, Borfin, MasterClass","egitim","Modül olgunlaşınca","Kurs"]
];
// içerik: gün (Ekim/Kasım), başlık, kanal, basamak, durum, kimlik, uyum
const CONTENT = [
 {d:"2026-10-20",t:"Günün kartı: Ajanın değerlendirmesi önce yazılır",ch:"LinkedIn",bas:"Günün kartı",st:"yayinda",kim:"ai",uy:{alinti:1,tbb:1}},
 {d:"2026-10-22",t:"Bülten #4: Riski görünür kılan soru",ch:"Bülten",bas:"Bülten",st:"yayinda",kim:"ykuye",uy:{alinti:1,tbb:1,spk:1}},
 {d:"2026-10-27",t:"Carousel: Risk, onu en iyi yönetebilecek tarafa yüklenir",ch:"LinkedIn",bas:"Günün kartı",st:"onay",kim:"danisman",uy:{alinti:1,tbb:1,spk:0}},
 {d:"2026-10-29",t:"Bülten #5: Para politikası ve dış politika",ch:"Bülten",bas:"Bülten",st:"taslak",kim:"uluslararasi",uy:{alinti:0,spk:1}},
 {d:"2026-10-31",t:"Hukuk ve Sinema #6: Sözleşme ihtilaf günü okunur",ch:"LinkedIn",bas:"Seri",st:"onay",kim:"yazar",uy:{alinti:1,tbb:0,rekabet:1},flag:true},
 {d:"2026-11-03",t:"Meridyen risk veri seti v0",ch:"Zenodo",bas:"Seri",st:"taslak",kim:"ai",uy:{alinti:1,rekabet:0}},
 {d:"2026-11-05",t:"Günün kartı: İlk pazar en az sürtünmeli olandır",ch:"LinkedIn",bas:"Günün kartı",st:"fikir",kim:"eihracat",uy:{rekabet:0}},
 {d:"2026-11-06",t:"COP31 bildiri taslağı",ch:"Akademik",bas:"Kalıcı",st:"taslak",kim:null,uy:{alinti:0}}
];
const UYUM = {tbb:"TBB reklam yasağı",spk:"SPK: kişiye özel yatırım tavsiyesi yok",rekabet:"Rekabet yasağı alanları",alinti:"Alıntı ve telif"};
const CST = {fikir:"Fikir",taslak:"Taslak",onay:"Onay",yayinda:"Yayında"};

const CONCEPTS = [
 {ad:"Proje finansmanı riski",n:9,x:430,y:200,d:"Hukuk · İktisat",f:"Finans",s:"Enerji, altyapı",p:1},
 {ad:"Politik risk",n:6,x:600,y:150,d:"Uluslararası ilişkiler",f:"Risk",s:"Altyapı",p:1},
 {ad:"Yatırım tahkimi",n:8,x:560,y:280,d:"Hukuk",f:"Hukuk",s:"Kamu",p:0},
 {ad:"İhracat kontrolü",n:4,x:250,y:300,d:"Hukuk · Güvenlik",f:"Uyum",s:"Savunma",p:1},
 {ad:"Strateji ve lojistik",n:5,x:130,y:190,d:"Askeri tarih",f:"Operasyon",s:"Savunma",p:0},
 {ad:"Ekonomi politik",n:7,x:740,y:240,d:"İktisat · Uİ",f:"Strateji",s:"Kamu",p:0},
 {ad:"Ajan tasarımı",n:6,x:420,y:360,d:"Bilgisayar bilimi",f:"Teknoloji",s:"Yazılım",p:1},
 {ad:"Ölçümleme",n:5,x:270,y:420,d:"Pazarlama bilimi",f:"Pazarlama",s:"E-ticaret",p:0},
 {ad:"Pazar seçimi",n:3,x:130,y:390,d:"İşletme",f:"Satış",s:"E-ticaret",p:0},
 {ad:"Kurumsal yönetim",n:4,x:700,y:370,d:"Hukuk · İşletme",f:"Yönetişim",s:"Genel",p:0},
 {ad:"Sözleşme tasarımı",n:7,x:330,y:110,d:"Hukuk",f:"Hukuk",s:"Genel",p:1},
 {ad:"Öğretim tasarımı",n:2,x:820,y:120,d:"Eğitim bilimi",f:"İK",s:"Eğitim",p:0},
 {ad:"Marka",n:2,x:120,y:80,d:"İletişim",f:"Pazarlama",s:"Genel",p:0,orphan:1},
 {ad:"Varlık",n:3,x:560,y:420,d:"Felsefe · Muhasebe",f:"Finans",s:"Genel",p:0},
 {ad:"Loop prodüksiyonu",n:2,x:840,y:420,d:"Müzik",f:"—",s:"—",p:0}
];
const EDGES = [[0,1],[0,2],[1,2],[0,6],[0,10],[3,10],[3,4],[1,5],[5,9],[7,8],[6,7],[2,10],[0,13],[9,13],[3,8],[11,6],[5,2]];
const MAPS={
  bilim:[["Sosyal bilimler",["Hukuk","Uluslararası ilişkiler","İktisat","İşletme"]],["Fen ve mühendislik",["Bilgisayar bilimi","Veri bilimi","İstatistik"]],["Askeri bilimler",["Strateji","Lojistik","Harp tarihi"]],["Beşeri bilimler ve sanat",["Felsefe","Sanat tarihi","Müzik","Sinema"]]],
  uni:[["Hukuk fakültesi",["Doktora: proje finansmanı ve yatırım tahkimi","Sözleşmeler","Usul"]],["Siyasal bilgiler",["Dış politika","Ekonomi politik"]],["İşletme",["Finans","Pazarlama","Kurumsal yönetim"]],["Kişisel üniversite",["Udemy","Borfin","MasterClass"]]],
  sirket:[["Finans",["Proje finansmanı riski","Varlık","Ekonomi politik"]],["Hukuk ve uyum",["Sözleşme tasarımı","İhracat kontrolü","Yatırım tahkimi"]],["Pazarlama ve satış",["Ölçümleme","Pazar seçimi","Marka"]],["Teknoloji",["Ajan tasarımı"]],["Yönetişim",["Kurumsal yönetim","Politik risk"]]],
  varlik:[["Dönen",["Danışmanlık gelirleri"]],["Maddi",["Kütüphane","Ev stüdyosu"]],["Finansal",["Meridyen","Ortaklık payları"]],["Gayri maddi",["Hukuk ve Sinema telifi","Alan adları"]],["Entelektüel",["Doktora","Avukatlık ruhsatı","SPL"]]]
};
const SYN=[
  [["harbiyeli","uluslararasi","avukat"],"Savunma sanayii hukuku","Proje: fikir · 4/6 halka"],
  [["uluslararasi","tahkim","akademisyen"],"Yatırım tahkimi ve jeopolitik","Tez ve bülten"],
  [["uluslararasi","yatirimci","danisman"],"Politik risk modülü","Meridyen içinde"],
  [["dusunur","eihracat"],"Pazar ve ticaret politikası","Hipotez"],
  [["harbiyeli","ykuye"],"Kriz ve yönetişim","Hipotez"]
];
const TRANSFERS=[["Meridyen risk modülü","Wisy → MTFG","Lisans sözleşmesi","Sözleşme taslağı"],["Ajan geliştirme birimleri","Wisy → Juris","Kullanım izni","Planlı"],["Kampanya vakaları (anonim)","FevUp → Wisy","Gizli veri yok","Onaylı"],["Kurumsal yönetim notları","Onscala → Wisy","İçeriden bilgi kontrolü","Engellendi"]];
const MATRIX=[["Dönen","Kişisel bilanço ve nakit akışı paneli","Nakit akım tahmin paneli · alacak takip ajanı"],["Maddi","Koleksiyon kataloğu · gayrimenkul getiri analizörü","CAPEX değerlendirme"],["Finansal","<b>Meridyen</b> · ortaklık payı ve BES izleme","Meridyen modülleri (aktarılan) · yatırımcı sunumu üretici"],["Gayri maddi","Kişisel IP envanteri · <b>Hukuk ve Sinema</b> telif arşivi","Portföy şirketleri IP envanteri"],["Entelektüel","SPL hazırlık modülleri · doçentlik sicili","Ekip yetkinlik matrisi"]];
const noid=[...CARDS.filter(c=>!c.kim).map(c=>({id:c.id,type:"kart",t:c.idea})),...CONTENT.filter(c=>!c.kim).map(c=>({id:c.t,type:"icerik",t:c.t}))];
window.WISY_ORNEK={kaynak:"ornek",today:"2026-10-25",ids:IDS,cards:CARDS,skills:SK,projects:PROJ,modules:MODS,assets:ASSETS,sicil:SICIL,content:CONTENT,concepts:CONCEPTS,edges:EDGES,maps:MAPS,syn:SYN,transfers:TRANSFERS,matrix:MATRIX,noid,issues:[],activity:null,kaynaklar:[]};
})();

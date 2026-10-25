# 02 — Bilgi mimarisi

## Ana gezinme

Gezinme ana hikayenin sırasını izler. Sol kenar çubuğu (masaüstü), alt sekme çubuğu + menü (telefon).

1. **Pano** — bugün neyin dikkat istediği
2. **Kartlar** — yakalama, bekleme, hazır kartlar
3. **Kavram evreni** — kavram ağı ve dört harita
4. **Kimlikler** — kimlik aileleri, zaman ekseni, sinerji
5. **Yetenekler** — yetenek haritası, evreler, açıklar
6. **Öğrenme** — müfredat ve modüller (kişisel üniversite)
7. **Projeler** — hikaye kartları, proje üretici matrisi
8. **Varlıklar** — varlık portföyü ve sicil
9. **Yayın** — içerik merdiveni, takvim, kanallar, teknik vitrin
10. **Köprü** — Wisy ↔ Vibe Management (kişisel/şirket ayrımı ve aktarımlar)

Telefon alt çubuğu: Pano, Kartlar, Projeler, Yayın, Menü.

## Küresel öğeler

- **Hızlı kart yakalama** düğmesi: her ekranda erişilebilir. En sık kullanılan eylem.
- **Kimlik filtresi**: üst çubukta; seçilen kimliğe göre tüm ekranları süzer.
- **Taraf anahtarı**: Kişisel / Şirket / Tümü.
- **Arama**: kart, kavram, proje ve kaynakta.

## Nesneler ve ilişkiler

```
Kaynak ──< Kart >── Kavram
             │
             └── Kimlik ──< Yetenek
                               │
                     Modül >───┘
                       │
                     Proje ──< Varlık
                       │
                     İçerik ── Kanal
Sicil (entelektüel varlık) ── Yetenek
```

## Her nesnenin görünür alanları

| Nesne | Kartta/satırda görünen | Detayda görünen |
|-------|------------------------|-----------------|
| Kart | Başlık (fikir), tema, kimlik rozeti, durum | Fikir, bağlam, alıntı, kaynak ve sayfa, bekleme tarihi |
| Kavram | Ad, kart sayısı, üç eksen | Bağlı kartlar, ilgili kavramlar, projeler |
| Kimlik | Ad, aile, dikey, evre | Ana soru, yetenekler, bağlı kayıtlar, sınır, kanal |
| Yetenek | Ad, kimlik, evre → hedef evre | Kanıtlar, modüller, açık |
| Modül | Başlık, hedef yetenek, durum | Birimler, kaynaklar, kapanış projesi |
| Proje | Başlık, kimlik, taraf, altı halka doluluk göstergesi | Hikaye kartı, aktarım notu |
| Varlık | Ad, sınıf, taraf, katkı | Vitrin bağlantıları, lisans, kaynak proje |
| İçerik | Başlık, kanal, basamak, durum | Kartlar, uyum onayları, tarih |

## Durumlar (her ekranda tutarlı)

| Nesne | Durumlar |
|-------|----------|
| Kart | Taslak → Beklemede → Hazır → Kullanıldı |
| Proje | Fikir → Hazırlık → Aktif → Tamamlandı → Arşiv |
| İçerik | Fikir → Taslak → Onay → Yayında |
| Modül | Planlı → Devam → Tamamlandı |
| Yetenek evresi | Çırak → Yaratıcı-aktif → Usta |

# Wisy ana pano

Kavramlar → Kimlikler → Yetenekler → Öğrenme → Projeler → Varlıklar

## Bekleme süresi dolan kartlar

```dataview
TABLE tema AS "Tema", birincil_kimlik AS "Kimlik", bekleme_bitis AS "Bekleme"
FROM "20-kartlar" WHERE durum = "beklemede" AND date(bekleme_bitis) <= date(today)
```

## Kimliksiz kayıtlar (öğrenmeye ve üretime giremez)

```dataview
LIST FROM "20-kartlar" OR "60-ogrenme" OR "70-projeler" OR "90-icerik"
WHERE !birincil_kimlik
```

## Aktif projeler

```dataview
TABLE birincil_kimlik AS "Kimlik", taraf AS "Taraf", durum AS "Durum"
FROM "70-projeler" WHERE durum != "arsiv" SORT durum ASC
```

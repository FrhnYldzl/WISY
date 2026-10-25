# Varlık portföyü

```dataview
TABLE varlik_sinifi AS "Sınıf", taraf AS "Taraf", nakit_akisi_katkisi AS "Nakit akışı", degerleme_katkisi AS "Değerleme"
FROM "80-varliklar" SORT varlik_sinifi ASC
```

## Sicil

```dataview
TABLE tur AS "Tür", gecerlilik AS "Geçerlilik", yenileme AS "Yenileme"
FROM "85-sicil"
```

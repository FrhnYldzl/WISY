# Yetenek açıkları

```dataview
TABLE kimlik AS "Kimlik", evre AS "Evre", hedef_evre AS "Hedef", length(kanitlar) AS "Kanıt"
FROM "50-yetenekler" WHERE evre != hedef_evre OR evre = "belirlenecek"
SORT kimlik ASC
```

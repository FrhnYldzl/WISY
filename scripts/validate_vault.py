#!/usr/bin/env python3
"""Wisy kasa doğrulayıcı.

Kullanım:
    python scripts/validate_vault.py <kasa-klasoru> [--schema schema/entities.yaml]

Kontroller:
  - Dosya adları kasada benzersiz ([[bağlantı]] adla çözülür)
  - Her notun type alanı ve tipin zorunlu alanları
  - Enum değerleri
  - [[bağlantı]] alanlarının kasada karşılığı
  - taraf: ortak ise birincil_taraf
  - Proje hikaye kartı: aktif/tamamlandi ise altı halka dolu
  - Avukat ve yatırımcı kimlikli içerikte uyum alanları
  - Hazır kartta bekleme tarihi
Çıkış kodu: hata varsa 1, yoksa 0. Uyarılar çıkış kodunu etkilemez.
"""
from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("PyYAML gerekli: pip install pyyaml")

LINK = re.compile(r"\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]")
SKIP_DIRS = {"_sablonlar", ".obsidian", ".trash", "_silinecek"}


def read_frontmatter(path: Path):
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return None
    parts = text.split("---", 2)
    if len(parts) < 3:
        return None
    try:
        data = yaml.safe_load(parts[1]) or {}
    except yaml.YAMLError as e:
        raise ValueError(f"YAML okunamadı: {e}") from e
    return data if isinstance(data, dict) else None


def empty(v) -> bool:
    return v is None or v == "" or v == [] or v == {}


def links_in(v) -> list[str]:
    if v is None:
        return []
    if isinstance(v, list):
        out = []
        for x in v:
            out += links_in(x)
        return out
    return [m.group(1).strip() for m in LINK.finditer(str(v))]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("vault")
    ap.add_argument("--schema", default=str(Path(__file__).resolve().parent.parent / "schema" / "entities.yaml"))
    args = ap.parse_args()

    vault = Path(args.vault)
    schema = yaml.safe_load(Path(args.schema).read_text(encoding="utf-8"))
    enums, types = schema["enums"], schema["types"]

    notes = [p for p in vault.rglob("*.md") if not (set(p.relative_to(vault).parts) & SKIP_DIRS)]
    names = {p.stem for p in notes}
    errors, warnings = [], []
    first: dict[str, Path] = {}
    for p in sorted(notes):
        if p.stem in first:
            errors.append(f"{p.relative_to(vault)}: aynı dosya adı {first[p.stem].relative_to(vault)} ile çakışıyor; [[{p.stem}]] belirsiz")
        else:
            first[p.stem] = p
    today = dt.date.today()
    counts: dict[str, int] = {}

    for p in sorted(notes):
        rel = p.relative_to(vault)
        try:
            fm = read_frontmatter(p)
        except ValueError as e:
            errors.append(f"{rel}: {e}")
            continue
        if fm is None:
            continue  # pano ve README notları frontmatter taşımaz
        t = fm.get("type")
        if t not in types:
            errors.append(f"{rel}: bilinmeyen type '{t}'")
            continue
        counts[t] = counts.get(t, 0) + 1
        spec = types[t]

        for field in spec.get("required", []):
            if empty(fm.get(field)):
                errors.append(f"{rel}: zorunlu alan boş: {field}")

        for field, enum_name in (spec.get("enums") or {}).items():
            v = fm.get(field)
            if not empty(v) and v not in enums[enum_name]:
                errors.append(f"{rel}: {field} geçersiz '{v}' (izinli: {', '.join(enums[enum_name])})")

        for field in spec.get("links", []):
            v = fm.get(field)
            if empty(v):
                continue
            found = links_in(v)
            if not found:
                errors.append(f"{rel}: {field} [[bağlantı]] biçiminde olmalı")
            for target in found:
                if target not in names:
                    errors.append(f"{rel}: {field} -> [[{target}]] kasada yok")

        if fm.get("taraf") == "ortak" and fm.get("birincil_taraf") not in ("kisisel", "sirket"):
            errors.append(f"{rel}: taraf 'ortak' ise birincil_taraf (kisisel|sirket) zorunlu")

        if t == "proje":
            missing = [f for f in spec.get("hikaye_zinciri", []) if empty(fm.get(f))]
            if fm.get("durum") in ("aktif", "tamamlandi") and missing:
                errors.append(f"{rel}: hikaye kartı eksik, durum '{fm.get('durum')}' olamaz. Boş halkalar: {', '.join(missing)}")
            elif missing:
                warnings.append(f"{rel}: hikaye kartında boş halkalar: {', '.join(missing)}")

        if t == "icerik" and fm.get("durum") in ("onay", "yayinda"):
            kimlik = " ".join(links_in(fm.get("birincil_kimlik")))
            uyum = fm.get("uyum") or {}
            if "avukat" in kimlik and uyum.get("tbb") is not True:
                errors.append(f"{rel}: avukat kimlikli içerikte uyum.tbb: true olmadan onay/yayın yok")
            if "yatirimci" in kimlik and uyum.get("spk") is not True:
                errors.append(f"{rel}: yatırımcı kimlikli içerikte uyum.spk: true olmadan onay/yayın yok")

        if t == "kart" and fm.get("durum") == "hazir" and not empty(fm.get("bekleme_bitis")):
            try:
                if dt.date.fromisoformat(str(fm["bekleme_bitis"])) > today:
                    errors.append(f"{rel}: bekleme süresi dolmadan kart 'hazir' olamaz")
            except ValueError:
                errors.append(f"{rel}: bekleme_bitis YYYY-MM-DD olmalı")

    print(f"Kasa: {vault}")
    print("Notlar: " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))
    for w in warnings:
        print(f"UYARI  {w}")
    for e in errors:
        print(f"HATA   {e}")
    print(f"\n{len(errors)} hata, {len(warnings)} uyarı")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())

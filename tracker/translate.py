"""Machine-translate the Nepali-only text (agendas, minutes, statements, bios,
a few bill titles) into English, a sentence at a time, with a cache.

The model is Meta's NLLB-200 (distilled 1.3B), run on the CPU with CTranslate2.
Translations are stored in data/translations.json keyed by the Nepali sentence,
so each sentence is only ever translated once and the site build can look them up.

    python -m tracker.translate --model models/nllb --minutes 40
"""
import argparse
import json
import re
import time
from pathlib import Path

from .text import ascii_digits

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CACHE = DATA / "translations.json"
HF_MODEL = "facebook/nllb-200-distilled-1.3B"

DEV = re.compile(r"[ऀ-ॿ]")
# Split on line breaks and after the Devanagari full stop (danda), ? and !.
SPLIT = re.compile(r"(\n+|(?<=[।॥?!])\s*)")
MAX_CHARS = 600  # longer sentences are cut at commas so the model doesn't drop text


def pieces(text):
    """Alternating [segment, separator, segment, ...]; segments over MAX_CHARS are split at commas."""
    out = []
    for i, p in enumerate(SPLIT.split(text or "")):
        if i % 2 or len(p) <= MAX_CHARS:
            out.append(p)
            continue
        chunks = re.split(r"(?<=[,،])\s+", p)
        for j, c in enumerate(chunks):
            if j:
                out.append(" ")
            out.append(c)
    return out


def segments(text):
    return [p.strip() for i, p in enumerate(pieces(text)) if not i % 2 and DEV.search(p)]


def english(text, cache):
    """The cached English version of text, or None if any sentence is missing."""
    if not text or not DEV.search(text):
        return None
    out = []
    for i, p in enumerate(pieces(text)):
        if i % 2 or not DEV.search(p):
            out.append(p)
            continue
        t = cache.get(p.strip())
        if t is None:
            return None
        out.append(t)
    return "".join(out).strip()


def read(path, default=None):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def texts():
    """Every Nepali text the site shows, most useful first."""
    out = []
    for b in read(DATA / "bills.json", []):
        if not b.get("title"):
            out.append(b.get("title_ne"))
    meetings = sorted(read(DATA / "meetings.json", []), key=lambda m: m.get("date") or "", reverse=True)
    out += [m.get("agenda") for m in meetings]
    members = [read(p, {}) for p in sorted((DATA / "members").glob("*.json"))]
    out += [s.get(k) for m in members for s in m.get("statements") or [] for k in ("kind", "text")]
    out += [v for m in members for v in (m.get("bio") or {}).values() if isinstance(v, str)]
    for m in meetings:
        full = read(DATA / "meetings" / f"{m['id']}.json", {})
        out.append(full.get("minutes"))
    return [t for t in out if t]


def todo(cache):
    seen, out = set(cache), []
    for t in texts():
        for s in segments(t):
            if s not in seen:
                seen.add(s)
                out.append(s)
    return out


class Model:
    def __init__(self, path):
        import ctranslate2
        from transformers import AutoTokenizer

        self.tok = AutoTokenizer.from_pretrained(HF_MODEL, src_lang="npi_Deva")
        self.tr = ctranslate2.Translator(str(path), device="cpu", compute_type="int8", inter_threads=1, intra_threads=0)

    def __call__(self, batch):
        src = [self.tok.convert_ids_to_tokens(self.tok.encode(ascii_digits(s), truncation=True, max_length=400)) for s in batch]
        res = self.tr.translate_batch(src, target_prefix=[["eng_Latn"]] * len(src), beam_size=2,
                                      max_decoding_length=400, repetition_penalty=1.1, no_repeat_ngram_size=4)
        return [self.tok.decode(self.tok.convert_tokens_to_ids(r.hypotheses[0][1:]), skip_special_tokens=True).strip() for r in res]


def save(cache):
    CACHE.write_text(json.dumps(dict(sorted(cache.items())), ensure_ascii=False, indent=0), encoding="utf-8")


def run(model_path, minutes, batch=16):
    cache = read(CACHE, {})
    work = todo(cache)
    print(f"{len(cache)} cached, {len(work)} sentences to translate ({sum(map(len, work))} chars)", flush=True)
    if not work:
        return
    model = Model(model_path)
    stop = time.time() + minutes * 60
    done, t0 = 0, time.time()
    # Similar lengths together keeps batches efficient; order within the priority list is kept per chunk.
    for i in range(0, len(work), 256):
        chunk = sorted(work[i:i + 256], key=len)
        for j in range(0, len(chunk), batch):
            part = chunk[j:j + batch]
            for s, t in zip(part, model(part)):
                cache[s] = t
            done += len(part)
            if time.time() > stop:
                break
        save(cache)
        print(f"  {done}/{len(work)} in {time.time() - t0:.0f}s", flush=True)
        if time.time() > stop:
            print("time budget used up; the rest continues next run")
            break
    save(cache)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="models/nllb")
    ap.add_argument("--minutes", type=float, default=40)
    ap.add_argument("--dry-run", action="store_true", help="only count what is left")
    a = ap.parse_args()
    if a.dry_run:
        w = todo(read(CACHE, {}))
        print(f"{len(w)} sentences, {sum(map(len, w))} chars")
        return
    run(a.model, a.minutes)


if __name__ == "__main__":
    main()

# /// script
# requires-python = ">=3.11"
# dependencies = ["faster-whisper>=1.1", "praat-parselmouth>=0.4.4", "huggingface-hub>=0.23"]
# ///
# Measures voice clips for tools/voice/voice.mjs (DESIGN §12.4): what a speech recogniser for the
# line's language hears, the word error rate against the line, and the pitch (Praat). All local, on
# the CPU, free:
#   sv  KBLab's kb-whisper-small (Swedish)
#   no  the National Library of Norway's nb-whisper-small (bokmål; its CTranslate2 export, ct2/)
#   es  faster-whisper medium (multilingual), asked for Spanish
# Reads JSON lines on stdin, {"file", "text", "lang"} (lang sv | no | es, default sv; "text" may be
# empty: then only what was heard, no WER); writes JSON lines on stdout,
# {"file", "heard", "wer", "f0", "f0lo", "f0hi", "voiced", "dur"}.
#   uv run tools/voice/analyze.py < jobs.jsonl > results.jsonl
import json, os, re, subprocess, sys, unicodedata
import numpy as np
import parselmouth
from faster_whisper import WhisperModel
from huggingface_hub import snapshot_download

MODELS = {
    "sv": ("KBLab/kb-whisper-small", None, "sv"),
    "no": ("NbAiLab/nb-whisper-small", "ct2", "no"),
    "es": ("Systran/faster-whisper-medium", None, "es"),
}

ONES = {
    "sv": "noll ett två tre fyra fem sex sju åtta nio tio elva tolv tretton fjorton femton sexton sjutton arton nitton".split(),
    "no": "null en to tre fire fem seks sju åtte ni ti elleve tolv tretten fjorten femten seksten sytten atten nitten".split(),
}
TENS = {
    "sv": {20: "tjugo", 30: "trettio", 40: "fyrtio", 50: "femtio", 60: "sextio", 70: "sjuttio", 80: "åttio", 90: "nittio"},
    "no": {20: "tjue", 30: "tretti", 40: "førti", 50: "femti", 60: "seksti", 70: "sytti", 80: "åtti", 90: "nitti"},
}
HUNDRED = {"sv": ("hundra", "ett", "tusen"), "no": ("hundre", "ett", "tusen")}

def num_words(n, lang):
    # Swedish and Norwegian numbers written as one word ("tvåtusentrehundra"); the comparison drops
    # the spaces anyway. Spanish digits are left as digits (the recogniser writes them so too).
    if lang not in ONES: return str(n)
    ones, tens, (hund, one, thou) = ONES[lang], TENS[lang], HUNDRED[lang]
    if n < 20: return ones[n]
    if n < 100: return tens[n - n % 10] + (ones[n % 10] if n % 10 else "")
    if n < 1000: return (ones[n // 100] if n >= 200 else one) + hund + (num_words(n % 100, lang) if n % 100 else "")
    if n < 1000000: return ("" if n < 2000 else num_words(n // 1000, lang)) + thou + (num_words(n % 1000, lang) if n % 1000 else "")
    return str(n)

def norm(s, lang):
    s = unicodedata.normalize("NFC", s.lower())
    s = re.sub(r"\[[^\]]*\]", " ", s)            # audio tags are not words
    s = re.sub(r"(?<=\d) (?=\d{3}\b)", "", s)    # "2 300"
    s = re.sub(r"\d+", lambda m: " " + num_words(int(m.group()), lang) + " ", s)
    s = re.sub(r"[^\w\s-]", " ", s)
    s = s.replace("-", " ")
    if lang == "sv": s = re.sub(r"\bi (går|dag|morgon|kväll|natt|morse)\b", r"i\1", s)
    return s.split()

def lev(a, b):
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(b) + 1):
            cur = min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] != b[j - 1]))
            prev, d[j] = d[j], cur
    return d[len(b)]

def same(a, b):
    # (names and long words spelt a letter differently: Majsan / Maisan, Josito / Jositos)
    return a == b or (min(len(a), len(b)) >= 5 and lev(a, b) <= 1)

def wer(ref, hyp, lang):
    r, h = norm(ref, lang), norm(hyp, lang)
    # (the same letters with the spaces elsewhere: "Stig-Helmer" / "Stig Helmer", "pizza-racern")
    if "".join(r) == "".join(h): return 0.0
    if not r: return 0.0 if not h else 1.0
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            cur = min(d[j] + 1, d[j - 1] + 1, prev + (not same(r[i - 1], h[j - 1])))
            prev, d[j] = d[j], cur
    return d[len(h)] / len(r)

def pitch(path):
    snd = parselmouth.Sound(path)
    p = snd.to_pitch_ac(time_step=0.01, pitch_floor=60, pitch_ceiling=600)
    f = [v for v in p.selected_array["frequency"] if v > 0]
    if len(f) < 5: return None, None, None, len(f) / 100, snd.duration
    f.sort()
    q = lambda k: round(f[int(k * (len(f) - 1))], 1)
    return q(0.5), q(0.1), q(0.9), len(f) / 100, snd.duration

def pcm16k(path):
    # (decoded with ffmpeg, -nostdin: it would eat the jobs waiting on stdin)
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)

_loaded = {}
def model(lang):
    if lang not in _loaded:
        repo, sub, _ = MODELS[lang]
        if sub:
            root = snapshot_download(repo, allow_patterns=[f"{sub}/*"])
            _loaded[lang] = WhisperModel(os.path.join(root, sub), device="cpu", compute_type="int8")
        else:
            _loaded[lang] = WhisperModel(repo, device="cpu", compute_type="int8")
    return _loaded[lang]

for line in sys.stdin:
    if not line.strip(): continue
    job = json.loads(line)
    lang = job.get("lang") or "sv"
    segs, info = model(lang).transcribe(pcm16k(job["file"]), language=MODELS[lang][2], beam_size=5, condition_on_previous_text=False, vad_filter=False)
    heard = " ".join(s.text.strip() for s in segs).strip()
    f0, lo, hi, voiced, dur = pitch(job["file"])
    text = job.get("text", "")
    out = {"file": job["file"], "heard": heard, "wer": round(wer(text, heard, lang), 3) if text else None, "f0": f0, "f0lo": lo, "f0hi": hi, "voiced": round(voiced, 2), "dur": round(dur, 3)}
    print(json.dumps(out, ensure_ascii=False), flush=True)

"""Torch-free checkpoint bookkeeping: atomic 'latest' pointer, pruning, resume discovery."""
import os, json, glob, time, shutil

def ckpt_dir(run_dir):
    d = os.path.join(run_dir, "checkpoints"); os.makedirs(d, exist_ok=True); return d

def write_latest(run_dir, steps, files, extra=None):
    """files: dict name->filename (relative to checkpoints dir). Written atomically so a crash never leaves a half-written pointer."""
    meta = dict(steps=int(steps), files=files, time=time.time(), **(extra or {}))
    p = os.path.join(ckpt_dir(run_dir), "latest.json")
    tmp = p + ".tmp"
    with open(tmp, "w") as f: json.dump(meta, f)
    os.replace(tmp, p)
    return p

def read_latest(run_dir):
    p = os.path.join(ckpt_dir(run_dir), "latest.json")
    if not os.path.exists(p): return None
    try:
        meta = json.load(open(p))
    except Exception:
        return None
    d = ckpt_dir(run_dir)
    if not all(os.path.exists(os.path.join(d, f)) for f in meta["files"].values()):
        return None          # pointer refers to missing files -> treat as no checkpoint
    meta["paths"] = {k: os.path.join(d, f) for k, f in meta["files"].items()}
    return meta

def prune(run_dir, keep=3):
    d = ckpt_dir(run_dir)
    steps = sorted({int(os.path.basename(f).split("_")[1].split(".")[0]) for f in glob.glob(os.path.join(d, "ckpt_*_model.zip"))})
    latest = read_latest(run_dir)
    protect = latest["steps"] if latest else None
    for st in steps[:-keep]:
        if st == protect: continue
        for f in glob.glob(os.path.join(d, f"ckpt_{st}_*")):
            try: os.remove(f)
            except OSError: pass

def bundle(run_dir, out_zip=None):
    """Zip the whole run (latest checkpoint + logs) so it can be copied to another machine/session."""
    out_zip = out_zip or run_dir.rstrip("/\\") + "_bundle"
    return shutil.make_archive(out_zip, "zip", run_dir)

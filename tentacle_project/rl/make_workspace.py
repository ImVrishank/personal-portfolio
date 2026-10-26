"""python make_workspace.py --group 3 --mount up --n 2000   (target sets already shipped for g3 up/horizontal/down)"""
import argparse, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tentacle_env import generate_workspace
ap = argparse.ArgumentParser(); ap.add_argument("--group", type=int, default=3)
ap.add_argument("--mount", default="up"); ap.add_argument("--n", type=int, default=2000)
a = ap.parse_args(); print("saved", generate_workspace(group=a.group, mount=a.mount, n=a.n))

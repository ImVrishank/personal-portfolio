"""Evaluate the latest checkpoint: success rate / mean final distance over N episodes (randomization on by default).
   python evaluate.py --run-dir runs/reach1 --episodes 50 [--no-dr] [--mount up]
"""
import argparse, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from tentacle_env import TentacleReachEnv
import ckpt_utils as cu

ap = argparse.ArgumentParser()
ap.add_argument("--run-dir", default="runs/reach1"); ap.add_argument("--episodes", type=int, default=50)
ap.add_argument("--group", type=int, default=3); ap.add_argument("--mount", default="random_h")
ap.add_argument("--coupled", action="store_true"); ap.add_argument("--no-dr", action="store_true")
a = ap.parse_args()
L = cu.read_latest(a.run_dir)
assert L, "no checkpoint found in " + a.run_dir
venv = DummyVecEnv([lambda: TentacleReachEnv(group=a.group, mount=a.mount, randomize=not a.no_dr, seed=123, coupled=a.coupled)])
venv = VecNormalize.load(L["paths"]["vecnorm"], venv); venv.training = False; venv.norm_reward = False
model = PPO.load(L["paths"]["model"], env=venv, device="cpu")
succ, dists = [], []
obs = venv.reset()
while len(succ) < a.episodes:
    act, _ = model.predict(obs, deterministic=True)
    obs, r, done, info = venv.step(act)
    if done[0]:
        succ.append(bool(info[0].get("is_success", False))); dists.append(info[0].get("dist", np.nan))
print(f"checkpoint {L['steps']} steps | success {100*np.mean(succ):.0f}% | mean final dist {1000*np.nanmean(dists):.1f} mm over {a.episodes} episodes")

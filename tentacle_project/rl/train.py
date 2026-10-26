"""PPO training for the tentacle reach task (CPU).  Auto-resumes from the latest checkpoint in --run-dir.

  python train.py --run-dir runs/reach1                     # start or resume
  python train.py --run-dir runs/reach1 --total-steps 20000000

Checkpoint = model (incl. optimizer state) + VecNormalize running stats + step count. Saved every --save-every steps
OR every --save-minutes minutes (whichever first), written atomically, last 3 kept.
To move to another machine: copy the whole run dir (see bundle_run.py) and run the same command there.
"""
import argparse, os, time, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import torch
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import SubprocVecEnv, DummyVecEnv, VecNormalize, VecMonitor
from stable_baselines3.common.callbacks import BaseCallback
from stable_baselines3.common.logger import configure
from tentacle_env import TentacleReachEnv
import ckpt_utils as cu

def make_env(rank, args):
    def _f():
        return TentacleReachEnv(group=args.group, mount=args.mount, randomize=not args.no_dr, seed=args.seed + rank, coupled=args.coupled)
    return _f

class CkptCallback(BaseCallback):
    def __init__(self, run_dir, venv, save_every, save_minutes):
        super().__init__()
        self.run_dir, self.venv = run_dir, venv
        self.save_every, self.save_s = save_every, save_minutes * 60
        self.last_steps, self.last_t = 0, time.time()
    def _save(self):
        n = self.num_timesteps
        d = cu.ckpt_dir(self.run_dir)
        mp, vp = f"ckpt_{n}_model.zip", f"ckpt_{n}_vecnorm.pkl"
        self.model.save(os.path.join(d, mp))
        self.venv.save(os.path.join(d, vp))
        cu.write_latest(self.run_dir, n, {"model": mp, "vecnorm": vp})
        cu.prune(self.run_dir)
        self.last_steps, self.last_t = n, time.time()
        print(f"[ckpt] saved at {n} steps", flush=True)
    def _on_step(self):
        if (self.num_timesteps - self.last_steps >= self.save_every) or (time.time() - self.last_t >= self.save_s):
            self._save()
        return True
    def _on_training_end(self):
        self._save()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-dir", default="runs/reach1")
    ap.add_argument("--group", type=int, default=3)
    ap.add_argument("--mount", default="random_h", choices=["up", "down", "horizontal", "random_h"])
    ap.add_argument("--n-envs", type=int, default=4)
    ap.add_argument("--total-steps", type=int, default=10_000_000)
    ap.add_argument("--save-every", type=int, default=200_000)
    ap.add_argument("--save-minutes", type=float, default=10)
    ap.add_argument("--coupled", action="store_true", help="2-D bend command; tendon pulls always sum to zero")
    ap.add_argument("--no-dr", action="store_true", help="disable domain randomization")
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--threads", type=int, default=2, help="torch threads (keep low; the sim needs the cores)")
    args = ap.parse_args()
    torch.set_num_threads(args.threads)
    os.makedirs(args.run_dir, exist_ok=True)

    Vec = SubprocVecEnv if args.n_envs > 1 else DummyVecEnv
    venv = VecMonitor(Vec([make_env(i, args) for i in range(args.n_envs)]))
    latest = cu.read_latest(args.run_dir)
    if latest:
        print(f"[resume] found checkpoint at {latest['steps']} steps")
        venv = VecNormalize.load(latest["paths"]["vecnorm"], venv)
        venv.training = True
        model = PPO.load(latest["paths"]["model"], env=venv, device="cpu")
        done = latest["steps"]
    else:
        print("[new run]")
        venv = VecNormalize(venv, norm_obs=True, norm_reward=True, clip_obs=10.0)
        model = PPO("MlpPolicy", venv, n_steps=512, batch_size=256, n_epochs=10, gamma=0.99, gae_lambda=0.95,
                    learning_rate=lambda f: 3e-4 * max(f, 0.1), ent_coef=0.005, clip_range=0.2, target_kl=0.03, device="cpu", seed=args.seed,
                    policy_kwargs=dict(net_arch=[128, 128], log_std_init=-0.5))
        done = 0
    model.set_logger(configure(os.path.join(args.run_dir, "log"), ["stdout", "csv"]))
    remaining = max(args.total_steps - done, 0)
    if remaining == 0:
        print("already at/over total-steps; nothing to do"); return
    cb = CkptCallback(args.run_dir, venv, args.save_every, args.save_minutes)
    cb.last_steps = done
    try:
        model.learn(total_timesteps=remaining, callback=cb, reset_num_timesteps=False, log_interval=5)
    except KeyboardInterrupt:
        print("interrupted -> saving checkpoint"); cb._save()

if __name__ == "__main__":
    main()

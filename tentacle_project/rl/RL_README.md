# Tentacle RL – Stage 1 (reach) on your laptop (CPU)

## What's here (rl/)
| File | Purpose |
|---|---|
| `build_mjcf.py` | Builds the MuJoCo model from `../reference/disk_table.csv` (g3 = 12 segments fast, g1 = full 35 disks) |
| `tentacle_env.py` | Gymnasium reach env (domain randomization built in) |
| `train.py` | PPO training, **auto-resumes** from latest checkpoint |
| `evaluate.py` | success rate / mean distance of the latest checkpoint |
| `benchmark.py` | measures steps/s on your machine |
| `view_model.py` | opens the viewer, sweeps the arm so you can see it move |
| `bundle_run.py` | zips a run (checkpoint + logs) to carry elsewhere |
| `workspace_g3_*.npz` | pre-generated reachable target sets |

## Setup (once)
1. Install Python 3.10-3.12 (python.org). In the folder that contains `rl/` and `reference/`:
```
python -m venv venv
venv\Scripts\activate            (Windows)   |   source venv/bin/activate (Mac/Linux)
pip install numpy gymnasium "mujoco>=3.1" "stable-baselines3>=2.3"
pip install torch --index-url https://download.pytorch.org/whl/cpu
cd rl
```
2. Keep the folder structure as shipped (`rl/` next to `reference/`) - the model reads `../reference/disk_table.csv`.

## Run
```
python view_model.py            # sanity: you should see the arm bend and rotate (close window to stop)
python benchmark.py             # tells you env steps/s for 1,2,4,6 workers -> pick n-envs (probably 4)
python train.py --run-dir runs/reach1 --total-steps 3000000 --n-envs 4
```
* **Stop any time** with Ctrl+C (it saves). **Resume = run the same command again.**
* Checkpoints: every 200k steps or 10 min, last 3 kept, in `runs/reach1/checkpoints/` (model + optimizer + normalization stats).
* To continue on another machine/session: `python bundle_run.py runs/reach1`, copy the zip, unzip into `rl/runs/`, run the same train command.
* Progress: `runs/reach1/log/progress.csv` - watch `rollout/success_rate` and `rollout/ep_rew_mean`.
* Check quality: `python evaluate.py --run-dir runs/reach1 --episodes 50`.

## Laptop tips
Plug in, "Best performance" power mode, disable sleep, raise the back for airflow. Leave 1-2 cores free (use `--n-envs 3` if you want to keep using the laptop).

## What to expect (honest)
* Estimates, not measurements on your machine: about 2-4k env steps/s with 4 workers => 3M steps ~ 15-25 min.
* I expect `success_rate` to start rising within the first ~0.5-2M steps. If it stays ~0 after ~2M steps, send me `progress.csv` - the reward/hyper-parameters need tuning.
* **Tested in my sandbox (1 CPU core):** short training run, stop + resume (continues from the saved step count), `evaluate.py`, bundling.
  Learning check (vertical arm, no randomization, 150k steps, ~4 min): mean episode reward -196 -> +8 and tip-within-1-cm rate 0% -> 35%. So reward + PPO setup work.
  NOT yet tested: long runs, randomized training to a high success rate, behaviour on your Windows/Python setup.
* Joint stiffness, tendon friction and servo behaviour are guesses, so the policy is trained across randomized values. It will need system identification on the real arm before it transfers.

## Next (Stage 2, after reach works)
Add a sphere object + contact, reward for wrap/grasp (multiple tip segments in contact, object lifted), start from the reach checkpoint.

"""Open the MuJoCo viewer and sweep the arm through a circular bend so you can SEE the model move.
   python view_model.py [group] [mount]      group: 3 (coarse, default) or 1 (full 35 disks); mount: up|horizontal|down"""
import sys, os, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, mujoco, mujoco.viewer
from build_mjcf import build_mjcf
from tentacle_env import gravity_vec
group = int(sys.argv[1]) if len(sys.argv) > 1 else 3
mount = sys.argv[2] if len(sys.argv) > 2 else "up"
xml, info = build_mjcf(group=group)
m = mujoco.MjModel.from_xml_string(xml); d = mujoco.MjData(m)
m.opt.gravity[:] = gravity_vec(mount)
mujoco.mj_forward(m, d); L0 = d.ten_length.copy()
phis = np.radians([270, 30, 150])
with mujoco.viewer.launch_passive(m, d) as v:
    t0 = time.time()
    while v.is_running():
        t = time.time() - t0
        beta = 0.5 * (1 - math.cos(0.5 * t))                 # slow 0..1 bend
        phi = 0.7 * t                                         # rotating bend direction
        p = beta * 0.045 * np.cos(phi - phis)
        d.ctrl[:] = L0 - p
        mujoco.mj_step(m, d); v.sync(); time.sleep(m.opt.timestep)

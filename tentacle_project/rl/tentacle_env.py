"""Gymnasium environment: tendon-driven tentacle, STAGE 1 = reach a target with the tip.

Action  (3,) in [-1,1]  : change of tendon pull per control step (x MAX_STEP metres)
State   pulls p_i in [P_MIN, P_MAX] (m): line length = L0_i - p_i.   p>0 shortens (servo takes up line), p<0 pays out.
Obs     (21,) : pulls, servo loads, tip pos, tip vel, target pos, tip-target, gravity dir  (all scaled ~[-1,1])
Reward  -dist shaping, -action penalty, +hold bonus when within SUCCESS_R of target.

Mount: gravity is expressed in the arm frame (arm axis = +Z).
   'up' arm vertical, 'down' arm hanging, 'horizontal' fixed horizontal azimuth, 'random_h' random azimuth each episode.
"""
import os, math
import numpy as np
import gymnasium as gym
from gymnasium import spaces
import mujoco
from build_mjcf import build_mjcf

HERE = os.path.dirname(os.path.abspath(__file__))
P_MIN, P_MAX = -0.040, 0.045          # pay-out / take-up range of each tendon [m]
MAX_STEP = 0.001                      # max pull change per control step [m]
C_SCALE = 0.040                       # coupled mode: pull at full bend command [m]
C_STEP = 0.025                        # coupled mode: max bend-command change per control step
SUCCESS_R = 0.010                     # 1 cm
G = 9.81

def gravity_vec(mount, rng=None):
    if mount == "up": return np.array([0, 0, -G])
    if mount == "down": return np.array([0, 0, G])
    if mount == "horizontal": return np.array([-G, 0, 0])
    if mount == "random_h":
        a = (rng or np.random).uniform(0, 2 * math.pi)
        return np.array([G * math.cos(a), G * math.sin(a), 0])
    raise ValueError(mount)

def _settle(m, d, pulls, L0, steps=500):
    mujoco.mj_resetData(m, d)
    d.ctrl[:] = L0 - pulls
    for _ in range(steps):
        mujoco.mj_step(m, d)

def generate_workspace(group=3, mount="up", n=1500, seed=0, path=None):
    """Sample reachable tip positions by settling the arm under random pull patterns."""
    xml, info = build_mjcf(group=group)
    m = mujoco.MjModel.from_xml_string(xml); d = mujoco.MjData(m)
    m.opt.gravity[:] = gravity_vec("up" if mount in ("random_h",) else mount)
    if mount == "random_h": m.opt.gravity[:] = gravity_vec("horizontal")
    mujoco.mj_forward(m, d); L0 = d.ten_length.copy(); tip = m.site("tip").id
    rng = np.random.default_rng(seed)
    phis = np.radians([270, 30, 150])
    pts, pul = [], []
    for _ in range(n):
        if rng.random() < 0.7:
            beta, phi = rng.uniform(0.05, 1), rng.uniform(0, 2 * math.pi)
            p = beta * 0.045 * np.cos(phi - phis) + rng.normal(0, 0.003, 3)
        else:
            p = rng.uniform(P_MIN, P_MAX, 3)
        p = np.clip(p, P_MIN, P_MAX)
        _settle(m, d, p, L0)
        pts.append(d.site_xpos[tip].copy()); pul.append(p)
    pts = np.array(pts); pul = np.array(pul)
    # drop points that are in the floor region
    keep = pts[:, 2] > -0.10
    path = path or os.path.join(HERE, f"workspace_g{group}_{mount}.npz")
    np.savez(path, tip=pts[keep], pulls=pul[keep])
    return path

class TentacleReachEnv(gym.Env):
    metadata = {"render_modes": []}

    def __init__(self, group=3, mount="random_h", randomize=True, ep_len=150, timestep=0.002,
                 tip_noise=0.003, pull_noise=0.0002, seed=None, coupled=False):
        super().__init__()
        self.group, self.mount, self.randomize, self.ep_len = group, mount, randomize, ep_len
        self.coupled = coupled
        self.hole_u = np.array([[math.cos(a), math.sin(a)] for a in np.radians([270, 30, 150])])
        self.c = np.zeros(2)
        self.substeps = int(round(0.04 / timestep))      # control period fixed at 25 Hz
        self.tip_noise, self.pull_noise = tip_noise, pull_noise
        xml, info = build_mjcf(group=group, timestep=timestep)
        self.m = mujoco.MjModel.from_xml_string(xml)
        self.d = mujoco.MjData(self.m)
        self.arm_len = info["arm_len"]
        mujoco.mj_forward(self.m, self.d)
        self.L0 = self.d.ten_length.copy()
        self.tip_id = self.m.site("tip").id
        self.target_mocap = self.m.body("target").mocapid[0]
        self.force_max = 40.0
        # nominal copies for randomization
        self._nom = dict(k=self.m.jnt_stiffness.copy(), c=self.m.dof_damping.copy(),
                         f=self.m.tendon_frictionloss.copy(), mass=self.m.body_mass.copy(),
                         inertia=self.m.body_inertia.copy())
        self.action_space = spaces.Box(-1.0, 1.0, (2 if coupled else 3,), np.float32)
        self.observation_space = spaces.Box(-np.inf, np.inf, (21,), np.float32)
        self.np_random_ = np.random.default_rng(seed)
        self.pulls = np.zeros(3); self.target = np.zeros(3); self.t = 0
        self._prev_a = np.zeros(3); self._delay_buf = np.zeros(2 if coupled else 3)

    # ---------------- helpers ----------------
    def _randomize(self):
        r = self.np_random_
        m, n = self.m, self._nom
        if self.randomize:
            ks = math.exp(r.uniform(math.log(0.3), math.log(3.0)))
            cs = math.exp(r.uniform(math.log(0.5), math.log(2.0)))
            fs = r.uniform(0.0, 3.0)
            ms = r.uniform(0.8, 1.3)
        else:
            ks = cs = ms = 1.0; fs = 1.0
        m.jnt_stiffness[:] = n["k"] * ks
        m.dof_damping[:] = n["c"] * cs
        m.tendon_frictionloss[:] = n["f"] * fs
        m.body_mass[:] = n["mass"] * ms
        m.body_inertia[:] = n["inertia"] * ms
        m.opt.gravity[:] = gravity_vec(self.mount, r)
        self._delay = int(r.integers(0, 2)) if self.randomize else 0

    def _obs(self):
        d = self.d
        tip = d.site_xpos[self.tip_id].copy()
        vel = np.zeros(6); mujoco.mj_objectVelocity(self.m, d, mujoco.mjtObj.mjOBJ_SITE, self.tip_id, vel, 0)
        tip_n = tip + self.np_random_.normal(0, self.tip_noise, 3) if self.randomize else tip
        pulls_n = self.pulls + self.np_random_.normal(0, self.pull_noise, 3) if self.randomize else self.pulls
        L = self.arm_len
        o = np.concatenate([
            pulls_n / 0.045,
            d.actuator_force / self.force_max,
            tip_n / L,
            vel[3:] / 0.5,
            self.target / L,
            (self.target - tip_n) / L,
            self.m.opt.gravity / G,
        ])
        return o.astype(np.float32)

    def _sample_target(self):
        """Reachable target for THIS episode's gravity/stiffness: settle the arm under random pulls, take the tip."""
        r = self.np_random_
        phis = np.radians([270, 30, 150])
        if r.random() < 0.7:
            p = r.uniform(0.05, 1) * P_MAX * np.cos(r.uniform(0, 2 * math.pi) - phis) + r.normal(0, 0.003, 3)
        else:
            p = r.uniform(P_MIN, P_MAX, 3)
        if self.coupled:
            ang, mag = r.uniform(0, 2 * math.pi), math.sqrt(r.uniform(0, 1))
            p = C_SCALE * mag * self.hole_u @ np.array([math.cos(ang), math.sin(ang)])
        p = np.clip(p, P_MIN, P_MAX)
        mujoco.mj_resetData(self.m, self.d)
        self.d.ctrl[:] = self.L0 - p
        for _ in range(400): mujoco.mj_step(self.m, self.d)
        tgt = self.d.site_xpos[self.tip_id].copy()
        mujoco.mj_resetData(self.m, self.d)
        self.d.ctrl[:] = self.L0
        return tgt

    # ---------------- gym API ----------------
    def reset(self, seed=None, options=None):
        if seed is not None: self.np_random_ = np.random.default_rng(seed)
        self._randomize()
        self.pulls[:] = 0.0; self.c[:] = 0.0
        mujoco.mj_resetData(self.m, self.d)
        self.d.ctrl[:] = self.L0
        mujoco.mj_setConst(self.m, self.d)
        self.target = self._sample_target()
        self.d.mocap_pos[self.target_mocap] = self.target
        mujoco.mj_forward(self.m, self.d)
        for _ in range(100): mujoco.mj_step(self.m, self.d)
        self.t = 0
        self._prev_a[:] = 0; self._delay_buf[:] = 0
        self.prev_dist = np.linalg.norm(self.d.site_xpos[self.tip_id] - self.target)
        return self._obs(), {}

    def step(self, action):
        a = np.clip(np.asarray(action, dtype=np.float64), -1, 1)
        a_eff = self._delay_buf if self._delay else a
        if self._delay: self._delay_buf = a.copy()
        if self.coupled:
            self.c = self.c + a_eff * C_STEP
            n = np.linalg.norm(self.c)
            if n > 1: self.c /= n
            self.pulls = C_SCALE * (self.hole_u @ self.c)      # sums to zero: pulling one pays out the other two
        else:
            self.pulls = np.clip(self.pulls + a_eff * MAX_STEP, P_MIN, P_MAX)
        self.d.ctrl[:] = self.L0 - self.pulls
        for _ in range(self.substeps): mujoco.mj_step(self.m, self.d)
        tip = self.d.site_xpos[self.tip_id]
        dist = float(np.linalg.norm(tip - self.target))
        L = self.arm_len
        reward = -2.0 * dist / L + 5.0 * (self.prev_dist - dist) / L - 0.01 * float(np.sum(a ** 2))
        success = dist < SUCCESS_R
        if success: reward += 1.0
        self.prev_dist = dist
        self.t += 1
        trunc = self.t >= self.ep_len
        bad = not np.all(np.isfinite(self.d.qpos))
        return self._obs(), reward, bad, trunc, {"dist": dist, "success": success, "is_success": success}

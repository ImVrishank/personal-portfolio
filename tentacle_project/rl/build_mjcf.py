"""Generate a MuJoCo model of the tendon-driven tentacle from reference/disk_table.csv.

Units: metres / kg / seconds.  Arm axis is +Z; gravity direction is set by the env (mount = up/horizontal/down).

group = number of disks merged into one rigid segment (1 = full 35-disk model, 3 = coarse/fast model).
Joint between segments = 2 hinges (x,y) with range = sum(gap/lever) of the gaps it represents.
Tendons: 3 spatial tendons through sites at the hole circle (angles 270/30/150 deg), pulled by position actuators.
"""
import csv, os, math
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
TABLE = os.path.join(os.path.dirname(HERE), "reference", "disk_table.csv")
HOLE_ANGLES = [270.0, 30.0, 150.0]
RHO_PLA = 1240.0          # kg/m3

def load_disks():
    rows = list(csv.DictReader(open(TABLE)))
    rows.sort(key=lambda r: int(r["disk"]))          # 01 = base ... 35 = tip
    out = []
    for r in rows:
        out.append(dict(idx=int(r["disk"]), z0=float(r["z0"]) / 1e3, z1=float(r["z1"]) / 1e3,
                        width=float(r["width"]) / 1e3, rh=float(r["tendon_pcd_r"]) / 1e3,
                        vol=float(r["volume"]) * 1e-9))
    return out

def build_mjcf(group=3, joint_k0=0.4, joint_damp0=0.004, tendon_friction=0.3,
               kp=6000.0, kv=40.0, force_max=40.0, with_target=True, timestep=0.002,
               lever_width_factor=0.40):
    """joint_k0: stiffness [N*m/rad] of a joint at base size (scaled by (rh/rh_base)^2 for smaller joints).
       tendon_friction: dry friction force along each tendon [N] (hole friction proxy).
       force_max: max pulling force per tendon [N]."""
    disks = load_disks()
    base = disks[0]
    rh_base = base["rh"]
    moving = disks[1:]
    segs = [moving[i:i + group] for i in range(0, len(moving), group)]

    # pivot heights: gap midpoint before each segment
    prev_top = base["z1"]
    pivots, alphas = [], []
    for s in segs:
        zp = 0.5 * (prev_top + s[0]["z0"])
        pivots.append(zp)
        # all gaps owned by this segment: preceding gap + internal gaps
        a = 0.0
        pt = prev_top
        for d in s:
            gap = d["z0"] - pt
            lever = d["rh"] + lever_width_factor * d["width"]
            a += gap / lever
            pt = d["z1"]
        alphas.append(a)
        prev_top = s[-1]["z1"]

    X = []
    X.append('<mujoco model="tentacle">')
    X.append(f'  <option timestep="{timestep}" integrator="implicitfast" gravity="0 0 -9.81"/>')
    X.append('  <compiler angle="radian" inertiafromgeom="auto"/>')
    X.append('  <default>')
    X.append('    <geom contype="2" conaffinity="0" rgba="0.85 0.35 0.3 1"/>')
    X.append('    <site size="0.0006" rgba="0.1 0.1 0.1 1"/>')
    X.append('    <joint limited="true"/>')
    X.append('  </default>')
    X.append('  <worldbody>')
    X.append('    <light pos="0.3 -0.3 0.6" dir="-0.3 0.3 -0.6"/>')
    X.append('    <geom name="floor" type="plane" size="1 1 0.1" pos="0 0 -0.12" contype="1" conaffinity="1" rgba="0.8 0.8 0.8 1"/>')
    if with_target:
        X.append('    <body name="target" mocap="true" pos="0 0 0.2"><geom type="sphere" size="0.008" contype="0" conaffinity="0" rgba="0.1 0.7 0.2 0.6"/></body>')

    def disk_geoms(d, zp, name_prefix):
        r = 0.5 * d["width"] * 0.85
        hl = 0.5 * (d["z1"] - d["z0"])
        zc = 0.5 * (d["z0"] + d["z1"]) - zp
        m = d["vol"] * RHO_PLA
        return f'<geom name="{name_prefix}" type="cylinder" size="{r:.5f} {hl:.5f}" pos="0 0 {zc:.5f}" mass="{m:.6f}"/>'

    def site(name, d, zlevel, zp, k):
        a = math.radians(HOLE_ANGLES[k])
        return f'<site name="{name}" pos="{d["rh"]*math.cos(a):.5f} {d["rh"]*math.sin(a):.5f} {zlevel-zp:.5f}"/>'

    # base body (fixed)
    X.append('    <body name="base" pos="0 0 0">')
    X.append('      ' + disk_geoms(base, 0.0, "disk01"))
    for k in range(3):
        X.append('      ' + site(f"s_base_b{k}", base, base["z0"], 0.0, k))
        X.append('      ' + site(f"s_base_t{k}", base, base["z1"], 0.0, k))

    # nested segments
    indent = '      '
    prev_pivot = 0.0
    for si, s in enumerate(segs):
        zp = pivots[si]
        rel = zp - prev_pivot
        r_j = s[0]["rh"]
        kj = joint_k0 * (r_j / rh_base) ** 2
        dj = joint_damp0 * (r_j / rh_base) ** 2
        arm_ = 1e-6
        a = alphas[si]
        X.append(f'{indent}<body name="seg{si}" pos="0 0 {rel:.5f}">')
        X.append(f'{indent}  <joint name="jx{si}" type="hinge" axis="1 0 0" range="{-a:.5f} {a:.5f}" stiffness="{kj:.6f}" damping="{dj:.6f}" armature="{arm_}"/>')
        X.append(f'{indent}  <joint name="jy{si}" type="hinge" axis="0 1 0" range="{-a:.5f} {a:.5f}" stiffness="{kj:.6f}" damping="{dj:.6f}" armature="{arm_}"/>')
        for d in s:
            X.append(f'{indent}  ' + disk_geoms(d, zp, f"disk{d['idx']:02d}"))
        first, last = s[0], s[-1]
        for k in range(3):
            X.append(f'{indent}  ' + site(f"s{si}_b{k}", first, first["z0"], zp, k))
            X.append(f'{indent}  ' + site(f"s{si}_t{k}", last, last["z1"], zp, k))
        if si == len(segs) - 1:
            X.append(f'{indent}  <site name="tip" pos="0 0 {last["z1"]-zp:.5f}" size="0.001" rgba="1 1 0 1"/>')
        prev_pivot = zp
        indent += '  '
    # close bodies
    for si in range(len(segs)):
        indent = indent[:-2]
        X.append(f'{indent}</body>')
    X.append('    </body>')
    X.append('  </worldbody>')

    # tendons
    X.append('  <tendon>')
    for k in range(3):
        X.append(f'    <spatial name="t{k}" width="0.0005" frictionloss="{tendon_friction}" rgba="0.1 0.3 0.9 1">')
        X.append(f'      <site site="s_base_b{k}"/><site site="s_base_t{k}"/>')
        for si in range(len(segs)):
            X.append(f'      <site site="s{si}_b{k}"/><site site="s{si}_t{k}"/>')
        X.append('    </spatial>')
    X.append('  </tendon>')
    X.append('  <actuator>')
    for k in range(3):
        X.append(f'    <position name="a{k}" tendon="t{k}" kp="{kp}" kv="{kv}" ctrllimited="false" forcelimited="true" forcerange="{-force_max} 0"/>')
    X.append('  </actuator>')
    X.append('</mujoco>')
    return "\n".join(X), dict(n_segments=len(segs), alphas=alphas, pivots=pivots,
                              tip_height=moving[-1]["z1"], arm_len=moving[-1]["z1"])

if __name__ == "__main__":
    import mujoco, sys
    g = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    xml, info = build_mjcf(group=g)
    p = os.path.join(HERE, f"tentacle_g{g}.xml")
    open(p, "w").write(xml)
    m = mujoco.MjModel.from_xml_string(xml)
    d = mujoco.MjData(m)
    mujoco.mj_forward(m, d)
    print("saved", p, "| segments", info["n_segments"], "| dofs", m.nv, "| total mass g %.1f" % (1000 * m.body_mass.sum()))
    print("total curl capacity (deg): %.0f" % math.degrees(sum(info["alphas"])))
    print("straight tendon lengths (mm):", np.round(d.ten_length * 1000, 2))
    print("tip z (mm):", round(d.site('tip').xpos[2] * 1000, 1) if hasattr(d, 'site') else d.site_xpos[m.site('tip').id])

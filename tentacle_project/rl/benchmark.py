"""Measure environment steps/second on THIS machine for 1..N parallel processes (random actions, no torch needed).
   python benchmark.py            -> tests 1,2,4,6 workers, 8 s each
"""
import time, sys, os, multiprocessing as mp
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def worker(seconds, q):
    import numpy as np
    from tentacle_env import TentacleReachEnv
    env = TentacleReachEnv(group=3, mount="random_h", randomize=True, seed=os.getpid() % 1000)
    env.reset(); n = 0; t0 = time.time()
    while time.time() - t0 < seconds:
        _, _, te, tr, _ = env.step(env.action_space.sample()); n += 1
        if te or tr: env.reset()
    q.put(n / (time.time() - t0))

if __name__ == "__main__":
    print("cpu count:", os.cpu_count())
    counts = [int(a) for a in sys.argv[1:]] or [1, 2, 4, 6]
    for k in counts:
        q = mp.Queue(); ps = [mp.Process(target=worker, args=(8, q)) for _ in range(k)]
        [p.start() for p in ps]; [p.join() for p in ps]
        tot = sum(q.get() for _ in ps)
        print(f"{k} workers: {tot:7.0f} env steps/s total  ({tot/k:6.0f} per worker)")
    print("Rule of thumb: real PPO training reaches ~60-80% of the best number here (policy updates take time).")

"""Zip a run directory (latest checkpoint + logs) to carry to another machine/session."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ckpt_utils as cu
run = sys.argv[1] if len(sys.argv) > 1 else "runs/reach1"
print("created", cu.bundle(run))

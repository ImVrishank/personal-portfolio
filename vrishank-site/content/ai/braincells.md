---
title: "BrainCells"
kind: ai
art: nn
tagline: "A neural network from raw PyTorch tensors: no torch.nn, no autograd"
status: built
project: braincells
order: 5.5
core: false
specs:
  - Framework: PyTorch tensors only
  - Written by hand: Forward pass, activations, loss, backprop, weight updates
  - Companion: Detailed blog on neural networks
links:
  - Code on GitHub|https://github.com/ImVrishank/BrainCells
  - The neural networks blog|/writing/neural-networks/
---

I made a neural network from scratch using only PyTorch tensors. No `torch.nn`, no Autograd, no helpers — just raw tensors and a bunch of manual math.

**BrainCells** is me trying to understand how neural nets *actually* work. I built everything by hand: forward pass, activations, loss, backprop (with the chain rule, of course), and weight updates. It’s a simple feedforward network, but the whole point was to stop relying on magic and start figuring stuff out myself.

No fancy features here. Just basic code that made my brain hurt (in a good way) and helped me connect all the dots we usually ignore.

If you're into building things from the ground up or just want to grow a few brain cells, this might be your vibe.

[GitHub repo](https://github.com/ImVrishank/BrainCells)

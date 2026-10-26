---
title: "Under the Hood: CUDA, MatMul, and the Engine of AI"
slug: cuda-matmul-engine-of-ai
date: 2026-01-24
category: ai
tags: [cuda, gpu, matmul]
summary: "Moving closer to the hardware: why matrix multiplication is the core computation of modern AI, and how CUDA runs it on a GPU."
---

After spending time in the worlds of IoT and the Jetson Nano, I wanted to move closer to the heartbeat of modern Artificial Intelligence. It’s easy to import a library and train a model, but I wanted to understand the raw computation that makes it all possible.

The answer? **Matrix Multiplication.**

It might sound like a dry topic from a linear algebra lecture, but Matrix Multiplication (MatMul) is the fundamental operation powering every forward pass, every backpropagation step, and every transformer head in existence. The difference between a model taking years to train or just hours isn't *what* is being computed - it's *how* efficiently we do the math.

#### **The Experiment: Images as Mathematical Objects**

To make this tangible, I designed a small experiment. Instead of multiplying grids of random numbers, I used two grayscale images: one of myself and one of a friend.

In the world of computing, an image is just a massive grid of pixel values (0–255). By treating these portraits as raw mathematical matrices, I could visualize the sheer scale of the operation. I ran the multiplication on two different fronts:

1. **The CPU:** The reliable, sequential workhorse.
2. **The GPU (via CUDA):** The specialized speed demon.

#### **The Showdown: CPU vs. GPU**

The results were striking. On the CPU, even medium-sized matrices caused a noticeable lag. But when I switched to the GPU using **CUDA**, the operation was unleashed. What brought the CPU to its knees, the GPU handled in a fraction of the time.

> The Secret Sauce: "Embarrassingly Parallel" Problems
> Matrix multiplication is what we call an *embarrassingly parallel* problem. Every single cell in the resulting matrix can be calculated independently of the others. While a CPU has a few powerful cores to handle tasks one by one, a GPU has thousands of smaller cores designed to do thousands of tiny tasks simultaneously.

This architectural shift is the exact reason AI has exploded in the last decade. Without the ability to parallelize these billions of multiplications, training a model like GPT-4 would be physically impossible.

#### **Visualizing the Performance**

::figure{src="/media/imported/cuda-matmul-engine-of-ai/1.png" alt=""}

*Setting up the benchmark parameters.*

::figure{src="/media/imported/cuda-matmul-engine-of-ai/2.png" alt=""}

*The final scores: A clear victory for parallel computing.*

#### **Connecting the Dots**

This wasn't just a lab task; it was a continuation of my journey into the "how" of AI. This exploration was fueled by a CUDA workshop at **Marvel Labs**, which gave me the foundation to write these kernels.

It also reminded me of the time I built a **GPT-2 model from scratch**. Back then, I was training on a GTX 1650, feeling the heat of the GPU as it crunched through Shakespearean text. Seeing the math happen at the pixel level in this experiment brought that experience full circle.

#### **Deepen Your Dive**

If you want to see the "why" behind the math, check out my other post on [The Math Behind Neural Networks](https://vrishank.super.site/neural-networks).

For the code-curious, you can find my implementation and the exact benchmarks I ran here:

- [Google Colab Notebook](https://colab.research.google.com/drive/1Bj__u-NPNvFEHwW60mckOF8fJ3VPVyGt?usp=sharing&authuser=1)
- [GitHub](https://github.com/ImVrishank/marvel-task1-photos/blob/main/matmul_images.ipynb)
Understanding MatMul is understanding the core engine of AI. It’s not just math; it’s the physical limit of how fast we can make machines "think."

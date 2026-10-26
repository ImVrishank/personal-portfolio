---
title: "Lecture 18: Continuous State MDPs and Model Simulation"
slug: cs229-lecture-18-continuous-state-mdps-and-model-simulation
date: 2025-10-18
tags: [cs229, None, course-notes]
summary: "Stanford CS229 lecture 18 notes: Continuous State MDPs and Model Simulation."
---

## The problem with continuous states

Real systems have continuous states. A car has position and velocity, and a helicopter has position, orientation (3 angles), and velocities, which is a 12 dimensional continuous state. We can't keep a table with one value per state.

## Option 1: Discretization

Chop the continuous space into a grid, and treat each cell as a discrete state.

It works for 1 or 2 dimensions. But it has two big problems:

1. **Piecewise constant representation:** the value function is flat within each cell, so you need very fine grids for smooth functions.
2. **Curse of dimensionality:** if each dimension has $k$ values, then an $n$-dimensional state has $k^n$ cells. With $k=100$ and $n=4$, that's $10^8$ states. With 12 dimensions, it's hopeless.

Discretization is fine for problems up to around 4D, and sometimes up to 6D with care.

## Option 2: Fitted Value Iteration

Approximate the value function with a **parametric function**, such as a linear function of some features:

$$
V(s) = \theta^T\phi(s)
$$

where $\phi(s)$ is a feature vector (e.g., $[1, s_1, s_2, s_1s_2, s_1^2, ...]$).

### Needing a model

To compute the value iteration update, we need to compute an expectation over next states. We usually don't have a closed form, so we need a **simulator** (model) that, given $(s, a)$, produces a next state $s'$.

### The algorithm

Sample $m$ states $s^{(1)}, ..., s^{(m)}$ at random. Then repeat:

For each sample state $s^{(i)}$ and each action $a$:
1. Sample $k$ next states $s'_1, ..., s'_k \sim P_{s^{(i)}a}$ from the simulator.
2. Compute $q(a) = \frac{1}{k}\sum_{j=1}^{k}\left[R(s^{(i)}) + \gamma V(s'_j)\right]$.

Set the target: $y^{(i)} = \max_a q(a)$.

Then fit $\theta$ with **linear regression**, so that $\theta^T\phi(s^{(i)}) \approx y^{(i)}$:

$$
\theta := \arg\min_\theta \frac{1}{2}\sum_{i=1}^{m}\left(\theta^T\phi(s^{(i)}) - y^{(i)}\right)^2
$$

So fitted value iteration is just value iteration, where the "assignment" step is replaced by a regression. It's not guaranteed to converge in general, but works well in practice.

## Where does the simulator come from?

### Physics-based simulators
Built from the equations of motion. Used in robotics, games, etc.

### Learning a model from data
Have a human (or a random policy) control the system, record the transitions $(s_t, a_t, s_{t+1})$, and fit a model. A simple choice is a linear model:

$$
s_{t+1} = As_t + Ba_t
$$

fit by least squares:

$$
\arg\min_{A,B}\sum_{i}\sum_{t}\left\|s_{t+1}^{(i)} - \left(As_t^{(i)} + Ba_t^{(i)}\right)\right\|^2
$$

You can add features to make it non-linear, like using $[s_t, s_t^2, ...]$ as inputs.

### Making it stochastic
Real systems are noisy, so we add noise: $s_{t+1} = As_t + Ba_t + \epsilon_t$, with $\epsilon_t \sim \mathcal{N}(0, \sigma^2 I)$. This is a **stochastic simulator**, and it lets the algorithm account for uncertainty.

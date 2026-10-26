---
title: "Lecture 15: PCA and ICA"
slug: cs229-lecture-15-pca-and-ica
date: 2025-10-15
tags: [cs229, None, course-notes]
summary: "Stanford CS229 lecture 15 notes: PCA and ICA."
---

## Principal Component Analysis (PCA)

Problem: your data has $n$ dimensions, but a lot of them are redundant. Maybe two features are almost the same thing (a length in cm and in inches, with some noise). We want to find the main directions along which the data actually varies, and project onto them.

### Preprocessing

1. Subtract the mean of each feature, so the data is centered at the origin.
2. (Optional) Divide each feature by its standard deviation, so all features are on the same scale. This matters if the features have wildly different units.

### The idea

Find the unit vector $u$ such that when you project the data onto $u$, the **variance of the projections is maximized**.

The projection of $x^{(i)}$ onto $u$ has length $x^{(i)T}u$, so we maximize:

$$
\frac{1}{m}\sum_{i=1}^{m}\left(x^{(i)T}u\right)^2 = u^T\left(\frac{1}{m}\sum_i x^{(i)}x^{(i)T}\right)u = u^T \Sigma u \quad \text{s.t. } \|u\|=1
$$

where $\Sigma$ is the empirical covariance matrix.

The answer: **$u$ is the top eigenvector of $\Sigma$**. Likewise, the top $k$ eigenvectors $u_1, ..., u_k$ are the $k$ best directions.

### The algorithm

1. Compute the covariance matrix $\Sigma$.
2. Find its top $k$ eigenvectors $u_1, ..., u_k$.
3. Represent each point by its coordinates in this new basis:

$$
y^{(i)} = \begin{bmatrix} u_1^T x^{(i)} \\ \vdots \\ u_k^T x^{(i)} \end{bmatrix} \in \mathbb{R}^k
$$

```
Before:               After projecting on u1:
   .   .  /               . . . . . . . . . 
 .  . . /  .             (all the info in
  . . ./ .                1 dimension)
   . /.
    /
```

### How many components?

Look at the eigenvalues. Each eigenvalue is the variance captured by that direction. Pick $k$ so that you keep, say, 95 or 99% of the total variance.

### Uses

- Compression and speeding up other algorithms
- Visualization (reduce to 2D or 3D)
- Noise reduction
- Removing correlated features, which can also help a learning algorithm that's overfitting

## Independent Component Analysis (ICA)

PCA finds directions of maximum variance, which are orthogonal. ICA has a different goal: find directions along which the data is **independent**.

### The cocktail party problem

There are $n$ speakers, and $n$ microphones. Each microphone records a mix of all the speakers. The sources are $s \in \mathbb{R}^n$ (unknown) and what we observe is:

$$
x = As
$$

where $A$ is an unknown **mixing matrix**. Our goal is to find the **unmixing matrix** $W = A^{-1}$ so that we can recover $s^{(i)} = Wx^{(i)}$.

### Why is this possible?

Because we assume the sources are **independent** of each other and **non-Gaussian**. (The speakers are talking independently.)

Why non-Gaussian? Because a Gaussian is rotationally symmetric. If the sources were Gaussian, then any rotation of them would look statistically identical, and there'd be no way to tell the right $W$ from a rotated one. The non-Gaussianity breaks this symmetry.

### The algorithm

Assume each source has a density $p_s$ (for example, a sigmoid-based CDF $g(s) = \frac{1}{1+e^{-s}}$, whose derivative is the density). Because the sources are independent, $p(s) = \prod_j p_s(s_j)$, and with $s = Wx$:

$$
p(x) = \left(\prod_{j=1}^{n} p_s(w_j^T x)\right)|W|
$$

We maximize the log likelihood using stochastic gradient ascent:

$$
W := W + \alpha\left(\begin{bmatrix} 1 - 2g(w_1^T x^{(i)}) \\ \vdots \\ 1 - 2g(w_n^T x^{(i)}) \end{bmatrix} x^{(i)T} + (W^T)^{-1}\right)
$$

After it converges, recover the sources with $s = Wx$.

### Ambiguities

ICA can't recover everything:

- The **ordering** of the sources (which output is speaker 1?)
- The **scale** and sign (a source's volume and polarity are unknown)

For audio, these don't matter at all.

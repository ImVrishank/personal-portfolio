---
title: "Lecture 6: Support Vector Machines"
slug: cs229-lecture-6-support-vector-machines
date: 2025-10-06
tags: [cs229, None, course-notes]
summary: "Stanford CS229 lecture 6 notes: Support Vector Machines."
---

## Why SVMs?

We want a classifier that not only separates the data, but separates it with the **widest possible margin**. For a given dataset there are infinitely many lines that separate the classes. Some of them pass very close to a point, so a tiny bit of noise would flip the prediction. We prefer the line that stays as far away as possible from the points.

## Notation

For SVMs, we use labels $y \in \{-1, +1\}$ (not 0 and 1), and write the classifier as:

$$
h_{w,b}(x) = g(w^T x + b), \quad g(z) = 1 \text{ if } z \geq 0, \text{ else } -1
$$

Here $b$ is the intercept, and $w$ are the weights.

## Margins

**Functional margin** of a point:

$$
\hat{\gamma}^{(i)} = y^{(i)}(w^T x^{(i)} + b)
$$

If this is positive, the prediction is correct. The larger it is, the more confident we are.

Problem: you can scale $w$ and $b$ by 2 and the functional margin doubles, without the boundary actually changing. So it isn't a real measure of distance.

**Geometric margin:** the actual Euclidean distance from the point to the boundary:

$$
\gamma^{(i)} = y^{(i)}\left(\frac{w^T}{\|w\|} x^{(i)} + \frac{b}{\|w\|}\right)
$$

This doesn't change if you rescale $w$ and $b$.

The margin of the whole training set is the smallest margin among all points.

## The Optimal Margin Classifier

Goal: maximize the geometric margin. Because we can rescale $w, b$ freely, we can pick the scale so that the functional margin is exactly 1. Then maximizing $\frac{1}{\|w\|}$ is the same as minimizing $\|w\|^2$:

$$
\min_{w,b} \; \frac{1}{2}\|w\|^2 \quad \text{s.t.} \quad y^{(i)}(w^T x^{(i)} + b) \geq 1, \; i = 1, ..., m
$$

This is a convex quadratic program. We can solve it with off-the-shelf software.

```
  o         |  margin  |        x
     o      |<-------->|     x
   o     o  |    / / / |  x      x
            |  / / / / |     x
            boundary
```

## Lagrange Duality

To get to the really nice version of this, we need Lagrange multipliers. For the problem

$$
\min_w f(w) \quad \text{s.t.} \quad g_i(w) \leq 0
$$

we form the Lagrangian $\mathcal{L}(w, \alpha) = f(w) + \sum_i \alpha_i g_i(w)$, with $\alpha_i \geq 0$.

The key condition is **complementary slackness** (KKT): at the optimum, $\alpha_i g_i(w) = 0$. So either the constraint is exactly tight ($g_i = 0$), or $\alpha_i = 0$.

For the SVM, the constraints are tight only for the points sitting right on the margin. These points are called the **support vectors**. All other points have $\alpha_i = 0$, which means they don't matter at all. You could delete them and get the same boundary.

Solving for $w$ and $b$ in the Lagrangian gives:

$$
w = \sum_{i=1}^{m} \alpha_i y^{(i)} x^{(i)}
$$

The weight vector is a linear combination of just the support vectors.

## The Dual Problem

Plugging back in, we get:

$$
\max_\alpha \; W(\alpha) = \sum_{i=1}^{m}\alpha_i - \frac{1}{2}\sum_{i,j=1}^{m} y^{(i)}y^{(j)}\alpha_i\alpha_j \langle x^{(i)}, x^{(j)}\rangle
$$

$$
\text{s.t.} \quad \alpha_i \geq 0, \quad \sum_i \alpha_i y^{(i)} = 0
$$

**The important thing:** the data only shows up as inner products $\langle x^{(i)}, x^{(j)} \rangle$. And to make predictions:

$$
w^T x + b = \sum_{i} \alpha_i y^{(i)} \langle x^{(i)}, x \rangle + b
$$

which also only depends on inner products, and only needs the support vectors since the rest have $\alpha_i = 0$.

This is what makes the next lecture (kernels) possible.

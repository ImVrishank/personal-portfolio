---
title: "Lecture 7: Kernels"
slug: cs229-lecture-7-kernels
date: 2025-10-07
tags: [cs229, None, course-notes]
summary: "Stanford CS229 lecture 7 notes: Kernels."
---

## The motivation

Linear classifiers can only draw straight boundaries. What if the data isn't linearly separable?

One idea: map the inputs to a bigger feature space where it *is* separable. For example, from $x$ to $\phi(x) = [x, x^2, x^3]$. A linear boundary in the new space is a curved boundary in the original.

The issue is that if $\phi(x)$ has a million (or infinitely many) dimensions, computing it is a nightmare.

## The kernel trick

We saw that the SVM only ever needs **inner products** $\langle x^{(i)}, x^{(j)} \rangle$. So, replace them with $\langle \phi(x^{(i)}), \phi(x^{(j)}) \rangle$.

Define the **kernel**:

$$
K(x, z) = \phi(x)^T \phi(z)
$$

The trick: for many choices of $\phi$, we can compute $K(x, z)$ **without ever computing $\phi(x)$**.

Example: $K(x, z) = (x^T z)^2$. Expanding it gives $\sum_{i,j} (x_i x_j)(z_i z_j)$. This corresponds to a feature map $\phi$ with all $n^2$ pairwise products $x_i x_j$. Computing $\phi$ explicitly takes $O(n^2)$, but computing $(x^T z)^2$ takes just $O(n)$.

The recipe:

1. Write the algorithm in terms of inner products $\langle x, z \rangle$ only.
2. Pick a kernel $K(x, z)$.
3. Replace every inner product with $K(x, z)$.

## Common kernels

- **Linear:** $K(x, z) = x^T z$ (just regular SVM)
- **Polynomial:** $K(x, z) = (x^T z + c)^d$ (features: all monomials up to degree $d$)
- **Gaussian (RBF):** $K(x, z) = \exp\left(-\frac{\|x - z\|^2}{2\sigma^2}\right)$

The Gaussian kernel corresponds to an **infinite dimensional** feature space. We can still compute it in $O(n)$.

Intuition: a kernel measures similarity. $K(x,z)$ is large if $x$ and $z$ are similar (close together), and small if not.

## Which functions are valid kernels?

A function $K$ is a valid kernel (it corresponds to some $\phi$) if and only if the matrix $K_{ij} = K(x^{(i)}, x^{(j)})$ is **symmetric positive semi-definite** for any set of points. This is **Mercer's theorem**.

## Kernels beyond SVMs

The trick isn't SVM specific. Anything that can be written in terms of inner products can be kernelized: linear regression, logistic regression, perceptron, PCA, and so on.

## Soft margin SVM (dealing with noise)

What if the data isn't separable, even in feature space? Or one outlier would force a tiny margin?

We allow some points to violate the margin, but pay a price:

$$
\min_{w,b,\xi} \; \frac{1}{2}\|w\|^2 + C\sum_{i=1}^{m}\xi_i \quad \text{s.t.} \quad y^{(i)}(w^T x^{(i)} + b) \geq 1 - \xi_i, \; \xi_i \geq 0
$$

The $\xi_i$ are slack variables.

- Big $C$: violations are expensive, so you get a narrow margin that fits training data tightly (risk of overfitting).
- Small $C$: tolerant to violations, wider margin (smoother, risk of underfitting).

The dual looks almost identical to before, except the constraint becomes $0 \leq \alpha_i \leq C$.

## Solving it: SMO

The dual is a big quadratic program with $m$ variables. **Sequential Minimal Optimization (SMO)** solves it by repeatedly picking just **two** $\alpha$'s, and optimizing them while keeping all others fixed. (Two, because the constraint $\sum \alpha_i y^{(i)} = 0$ means you can't change just one.) Each step has a closed form solution, so it's really fast.

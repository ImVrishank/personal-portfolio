---
title: "Lecture 14: Expectation-Maximization and Factor Analysis"
slug: cs229-lecture-14-expectation-maximization-and-factor-analysis
date: 2025-10-14
category: notes
tags: [cs229, None, course-notes]
summary: "Stanford CS229 lecture 14 notes: Expectation-Maximization and Factor Analysis."
---

## Unsupervised learning: clustering

Now we only have $x^{(1)}, ..., x^{(m)}$ with no labels. We want to find groups.

## K-means

1. Pick $k$ random points as initial **cluster centroids** $\mu_1, ..., \mu_k$.
2. **Assign** every point to its closest centroid.
3. **Update** each centroid to be the mean of the points assigned to it.
4. Repeat 2 and 3 until nothing changes.

```
Step 1:      Step 2:       Step 3:
 o o  x      o o  x        o o  x
 o  x x      o  x x        o  x x
  X1 X2      (colors by    (centroids
              nearest)      move)
```

It's guaranteed to converge (the distortion function $J = \sum_i \|x^{(i)} - \mu_{c^{(i)}}\|^2$ goes down every step), but only to a **local** optimum. So run it several times from different random starts and keep the best result.

K-means makes a *hard* assignment: each point belongs to exactly one cluster. What if a point is kind of in the middle?

## Mixture of Gaussians

A softer, probabilistic version. Suppose there's a hidden (latent) variable $z^{(i)}$ telling us which cluster each point came from:

$$
z^{(i)} \sim \text{Multinomial}(\phi), \quad x^{(i)} \mid z^{(i)}=j \sim \mathcal{N}(\mu_j, \Sigma_j)
$$

We never observe $z$. The log likelihood is:

$$
\ell(\phi, \mu, \Sigma) = \sum_{i=1}^{m} \log \sum_{z^{(i)}} p(x^{(i)} \mid z^{(i)}; \mu, \Sigma)\, p(z^{(i)}; \phi)
$$

That sum inside the log makes it hard to maximize in closed form. If we **knew** $z$, it would be easy (it'd be GDA). So we use EM.

## The EM algorithm

Repeat until convergence:

**E-step:** guess the latent variables. For each $i, j$, compute the posterior probability that point $i$ came from cluster $j$:

$$
w_j^{(i)} = p(z^{(i)} = j \mid x^{(i)}; \phi, \mu, \Sigma)
$$

(Think of this as a soft version of K-means' "assign" step.)

**M-step:** update the parameters, using the $w_j^{(i)}$ as soft counts:

$$
\phi_j = \frac{1}{m}\sum_{i} w_j^{(i)}, \quad \mu_j = \frac{\sum_i w_j^{(i)} x^{(i)}}{\sum_i w_j^{(i)}}
$$
$$
\Sigma_j = \frac{\sum_i w_j^{(i)} (x^{(i)} - \mu_j)(x^{(i)} - \mu_j)^T}{\sum_i w_j^{(i)}}
$$

Compare it with GDA's formulas and you'll see it's exactly the same, with $1\{z = j\}$ replaced by the soft weight $w_j^{(i)}$.

## Why does EM work?

### Jensen's inequality

If $f$ is concave (like $\log$), then $f(E[X]) \geq E[f(X)]$.

Using this, for any distribution $Q_i$ over $z^{(i)}$:

$$
\log p(x; \theta) = \log \sum_z Q(z) \frac{p(x, z; \theta)}{Q(z)} \geq \sum_z Q(z) \log \frac{p(x, z; \theta)}{Q(z)}
$$

The right side is a **lower bound** on the log likelihood (the ELBO). Equality holds when the ratio $\frac{p(x,z;\theta)}{Q(z)}$ is constant, which happens when $Q(z) = p(z \mid x; \theta)$.

- **E-step:** set $Q$ to the posterior. This makes the lower bound **touch** the true log likelihood at the current $\theta$.
- **M-step:** maximize the lower bound with respect to $\theta$. This pushes the likelihood up.

So each EM iteration is guaranteed to never decrease the likelihood. Like K-means, it can only find local optima.

## Factor Analysis

A problem: what if $n$ (features) is bigger than $m$ (examples)? For example, 100 dimensional data with only 30 points. The MLE covariance matrix $\Sigma$ is singular (not invertible), and a Gaussian fit just breaks.

**Factor analysis** assumes the data actually lives near a low dimensional subspace. There is a latent $z \in \mathbb{R}^d$ with $d \ll n$:

$$
z \sim \mathcal{N}(0, I), \quad x = \mu + \Lambda z + \epsilon, \quad \epsilon \sim \mathcal{N}(0, \Psi)
$$

where $\Lambda$ is $n \times d$, and $\Psi$ is diagonal.

The marginal of $x$ is Gaussian with covariance $\Lambda\Lambda^T + \Psi$. This is a covariance with only about $nd + n$ parameters instead of $n^2$, and it's always invertible since $\Psi$ is positive diagonal.

We fit $\Lambda, \Psi, \mu$ with EM, where $z$ is the latent variable. Since the joint of $(z, x)$ is Gaussian, the E-step has a closed form.

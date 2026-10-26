---
title: "Lecture 9: Approximation/Estimation Error and ERM"
slug: cs229-lecture-9-approximation-estimation-error-and-erm
date: 2025-10-09
tags: [cs229, None, course-notes]
summary: "Stanford CS229 lecture 9 notes: Approximation/Estimation Error and ERM."
---

This is the learning theory lecture. The question: can we say anything *provable* about when learning works?

## Setting up

- Data $(x^{(i)}, y^{(i)})$ is drawn i.i.d. from some distribution $D$.
- The **training error** (empirical risk): $\hat{\varepsilon}(h) = \frac{1}{m}\sum_i 1\{h(x^{(i)}) \neq y^{(i)}\}$
- The **generalization error** (true risk): $\varepsilon(h) = P_{(x,y)\sim D}(h(x) \neq y)$

We care about generalization error, but we can only measure training error.

## Empirical Risk Minimization (ERM)

Pick a **hypothesis class** $\mathcal{H}$ (e.g., all linear classifiers). ERM chooses the hypothesis with the lowest training error:

$$
\hat{h} = \arg\min_{h \in \mathcal{H}} \hat{\varepsilon}(h)
$$

Logistic regression, SVMs, and so on are all approximations of this (since minimizing 0-1 loss directly is hard).

## Approximation vs Estimation error

Define:
- $g$ = the best possible hypothesis overall (the "Bayes optimal" one)
- $h^*$ = the best hypothesis **in our class** $\mathcal{H}$
- $\hat{h}$ = what ERM actually gives us from the finite data

Then we can break down the error:

$$
\varepsilon(\hat{h}) = \underbrace{\varepsilon(g)}_{\text{irreducible error}} + \underbrace{\varepsilon(h^*) - \varepsilon(g)}_{\text{approximation error}} + \underbrace{\varepsilon(\hat{h}) - \varepsilon(h^*)}_{\text{estimation error}}
$$

- **Approximation error:** the penalty for restricting ourselves to $\mathcal{H}$. Bigger class means smaller approximation error.
- **Estimation error:** the penalty for having only finite data. Bigger class means larger estimation error.

This lines up with what we saw before: **approximation error is bias, estimation error is variance.**

## Two tools: Union bound and Hoeffding

**Union bound:** $P(A_1 \cup \dots \cup A_k) \leq \sum_i P(A_i)$

**Hoeffding inequality:** if $\hat{\phi}$ is the average of $m$ i.i.d. Bernoulli($\phi$) variables, then

$$
P(|\phi - \hat{\phi}| > \gamma) \leq 2\exp(-2\gamma^2 m)
$$

In plain words, the more samples you have, the exponentially less likely it is that your estimate is far off.

## Uniform convergence (finite $\mathcal{H}$)

Suppose $\mathcal{H}$ has $k$ hypotheses. For one fixed $h$, Hoeffding says its training error is close to its true error. Using the union bound over all $k$ hypotheses:

$$
P\left(\exists h \in \mathcal{H}: |\varepsilon(h) - \hat{\varepsilon}(h)| > \gamma\right) \leq 2k\exp(-2\gamma^2 m)
$$

So with probability at least $1-\delta$, **all** hypotheses have training error within $\gamma$ of true error, as long as:

$$
m \geq \frac{1}{2\gamma^2}\log\frac{2k}{\delta}
$$

This is the **sample complexity**: how much data you need. The cool part is that it grows only with $\log k$.

And then the ERM guarantee: with probability $1-\delta$,

$$
\varepsilon(\hat{h}) \leq \varepsilon(h^*) + 2\gamma
$$

meaning ERM is within $2\gamma$ of the best hypothesis in the class.

## Infinite classes and VC dimension

Linear classifiers have infinitely many hypotheses, so $\log k$ is useless. But a $d$-parameter model can be treated as having effectively $k \approx$ (some finite number) when computed on a computer with finite precision, which gives a sample complexity that's roughly linear in the number of parameters $d$.

The proper tool is the **VC dimension**: the size of the largest set of points that the class can *shatter* (label in every possible way). For linear classifiers in $\mathbb{R}^n$, VC dimension is $n + 1$. The takeaway is that the number of examples you need scales roughly linearly with VC dimension.

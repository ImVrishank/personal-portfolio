---
title: "Lecture 4: Perceptron and Generalized Linear Models"
slug: cs229-lecture-4-perceptron-and-generalized-linear-models
date: 2025-10-04
category: notes
tags: [cs229, None, course-notes]
summary: "Stanford CS229 lecture 4 notes: Perceptron and Generalized Linear Models."
---

## The Perceptron

Take logistic regression, but replace the smooth sigmoid with a hard threshold:

$$
g(z) = \begin{cases} 1 & \text{if } z \geq 0 \\ 0 & \text{if } z < 0 \end{cases}
$$

with $h_\theta(x) = g(\theta^T x)$. The update rule looks the same as before:

$$
\theta_j := \theta_j + \alpha \left(y^{(i)} - h_\theta(x^{(i)})\right) x_j^{(i)}
$$

What does this do?

- If the prediction is right, $y - h = 0$, so nothing changes.
- If it predicts 0 but the answer is 1, $y - h = 1$, so we add $\alpha x$ to $\theta$ (rotate the boundary towards classifying that point as 1).
- If it predicts 1 but the answer is 0, we subtract.

The perceptron has no probabilistic interpretation. It just says 0 or 1, with nothing about how confident it is. That's one reason it isn't used much today, but it was historically important for neural nets.

## The Exponential Family

Here's something that ties linear regression and logistic regression together. A distribution is in the **exponential family** if it can be written as:

$$
p(y; \eta) = b(y) \exp\left(\eta^T T(y) - a(\eta)\right)
$$

- $\eta$ = natural parameter
- $T(y)$ = sufficient statistic (usually just $y$)
- $a(\eta)$ = log partition function (makes it normalize to 1)

Lots of distributions fit this: Gaussian, Bernoulli, Poisson, Gamma, Beta, Dirichlet...

**Example: Bernoulli** with parameter $\phi$. We get $\eta = \log\frac{\phi}{1-\phi}$. Invert it and you get $\phi = \frac{1}{1+e^{-\eta}}$, the sigmoid! That's where it comes from.

## Generalized Linear Models (GLMs)

A GLM is a recipe. Say you want to model $y$ given $x$. Make three assumptions:

1. $y \mid x; \theta \sim \text{ExponentialFamily}(\eta)$
2. The prediction is $h(x) = E[y \mid x; \theta]$
3. The natural parameter is linear in the inputs: $\eta = \theta^T x$

Plug in different distributions, and you get different models:

| If $y$ is... | Distribution | Model |
|---|---|---|
| real valued | Gaussian | Linear regression |
| 0 or 1 | Bernoulli | Logistic regression |
| a count (0, 1, 2, ...) | Poisson | Poisson regression |
| positive real | Gamma / Exponential | Gamma regression |

And the cool part: for **every** GLM, the learning rule is the same gradient ascent update we've been seeing:

$$
\theta_j := \theta_j + \alpha \left(y^{(i)} - h_\theta(x^{(i)})\right) x_j^{(i)}
$$

That's why logistic regression's update matched linear regression's.

## Softmax Regression

What if $y$ can be one of $k$ classes (dog, cat, bird...)? This is a multinomial distribution, which is also in the exponential family. The GLM recipe gives:

$$
P(y = i \mid x; \theta) = \frac{e^{\theta_i^T x}}{\sum_{j=1}^{k} e^{\theta_j^T x}}
$$

This is **softmax**. It turns $k$ scores into $k$ probabilities that add up to 1. We train it by maximizing the log likelihood, same as before. You'll see this at the end of every classification neural net.

---
title: "Lecture 3: Locally Weighted Regression and Logistic Regression"
slug: cs229-lecture-3-locally-weighted-regression-and-logistic-regression
date: 2025-10-03
tags: [cs229, machine-learning, course-notes]
summary: "Stanford CS229 lecture 3 notes: Locally Weighted Regression and Logistic Regression."
---

## Why least squares? The probabilistic view

Why should we use the *squared* error? Why not absolute error or something else? Here's a justification.

Assume the target is the linear prediction plus some noise:

$$
y^{(i)} = \theta^T x^{(i)} + \epsilon^{(i)}, \quad \epsilon^{(i)} \sim \mathcal{N}(0, \sigma^2)
$$

That means $y^{(i)} \mid x^{(i)}; \theta \sim \mathcal{N}(\theta^T x^{(i)}, \sigma^2)$. Now write the likelihood of the data and take the log:

$$
\ell(\theta) = m \log \frac{1}{\sqrt{2\pi}\sigma} - \frac{1}{\sigma^2} \cdot \frac{1}{2}\sum_{i=1}^m (y^{(i)} - \theta^T x^{(i)})^2
$$

Maximizing this is the exact same as minimizing the sum of squared errors. So least squares **is** maximum likelihood under Gaussian noise. Nice.

## Parametric vs Non-parametric

- **Parametric:** fixed number of parameters, and once trained, you can throw away the training data (linear regression).
- **Non-parametric:** the number of parameters grows with the training set size, so you need to keep the data around.

## Locally Weighted Regression (LWR)

Problem: if the data isn't linear, a straight line fits badly, and you'd have to pick features by hand.

The idea: to make a prediction at a point $x$, only look at the training examples **near $x$**, and fit a line just to those.

For each query point $x$, fit $\theta$ to minimize:

$$
\sum_{i} w^{(i)} \left(y^{(i)} - \theta^T x^{(i)}\right)^2
$$

where the weights are:

$$
w^{(i)} = \exp\left(-\frac{(x^{(i)} - x)^2}{2\tau^2}\right)
$$

- If $x^{(i)}$ is close to $x$, the weight is about 1.
- If it's far, the weight is about 0.

$\tau$ is the **bandwidth**. Small $\tau$ means only very close points matter (wiggly fit, risk of overfitting). Big $\tau$ means more points matter (smoother, closer to plain linear regression).

The downside is that you have to refit for every prediction, and you keep the whole training set. It's great for small, low dimensional datasets.

## Classification and Logistic Regression

Now $y \in \{0, 1\}$. Using linear regression for this is a bad idea (one far away outlier can drag the line and mess up the threshold). Plus $h$ would output values way above 1 or below 0.

So we choose:

$$
h_\theta(x) = g(\theta^T x) = \frac{1}{1 + e^{-\theta^T x}}
$$

where $g$ is the **sigmoid** (logistic) function. It squashes everything into $(0, 1)$.

```
 1 |            ______
   |          /
.5 |        /
   |      /
 0 |_____/
   +---------------- z
```

We interpret the output as a probability:

$$
P(y = 1 \mid x; \theta) = h_\theta(x), \quad P(y = 0 \mid x; \theta) = 1 - h_\theta(x)
$$

Combined: $p(y \mid x; \theta) = h_\theta(x)^y (1 - h_\theta(x))^{1-y}$.

### Fitting it

Maximize the log likelihood:

$$
\ell(\theta) = \sum_{i=1}^{m} y^{(i)} \log h(x^{(i)}) + (1 - y^{(i)}) \log (1 - h(x^{(i)}))
$$

Gradient **ascent** (since we're maximizing):

$$
\theta_j := \theta_j + \alpha \sum_{i=1}^{m} \left(y^{(i)} - h_\theta(x^{(i)})\right) x_j^{(i)}
$$

Wait, that looks identical to the linear regression update! It is, in form. The only difference is that $h_\theta(x)$ is now the sigmoid. This isn't a coincidence, and we'll see why in the lecture on GLMs.

## Newton's Method

A faster way to maximize $\ell(\theta)$. To find where $\ell'(\theta) = 0$, Newton's method repeatedly approximates the function with a tangent line and jumps to where that line hits zero:

$$
\theta := \theta - \frac{\ell'(\theta)}{\ell''(\theta)}
$$

For a vector of parameters:

$$
\theta := \theta - H^{-1} \nabla_\theta \ell(\theta)
$$

where $H$ is the **Hessian** (matrix of second derivatives).

- Converges in very few iterations (quadratic convergence, the number of correct digits roughly doubles each step).
- Each iteration is expensive, because you need to compute and invert an $(n+1) \times (n+1)$ matrix.

So Newton's method is great when $n$ is small (say, up to a few thousand), and a pain when it's huge.

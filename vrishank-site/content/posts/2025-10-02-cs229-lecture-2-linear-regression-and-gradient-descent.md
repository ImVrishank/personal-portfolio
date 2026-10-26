---
title: "Lecture 2: Linear Regression and Gradient Descent"
slug: cs229-lecture-2-linear-regression-and-gradient-descent
date: 2025-10-02
category: notes
tags: [cs229, None, course-notes]
summary: "Stanford CS229 lecture 2 notes: Linear Regression and Gradient Descent."
---

## Setting up

Notation we'll use for the whole course:

- $m$ = number of training examples
- $n$ = number of features
- $x^{(i)}$ = input features of the $i$-th example
- $y^{(i)}$ = output of the $i$-th example
- $(x^{(i)}, y^{(i)})$ = one training example

The job of a supervised learning algorithm is to learn a function $h: X \rightarrow Y$. This $h$ is called the **hypothesis**.

For linear regression we choose:

$$
h_\theta(x) = \theta_0 + \theta_1 x_1 + \dots + \theta_n x_n = \sum_{j=0}^{n} \theta_j x_j = \theta^T x
$$

(We set $x_0 = 1$ so that the intercept term fits neatly into the sum.)

## Picking the parameters

We want $h_\theta(x)$ to be close to $y$ on the training examples. So we define a cost function, the sum of squared errors:

$$
J(\theta) = \frac{1}{2} \sum_{i=1}^{m} \left(h_\theta(x^{(i)}) - y^{(i)}\right)^2
$$

and choose the $\theta$ that minimizes $J(\theta)$. The $\frac{1}{2}$ is there only to make the derivative cleaner.

## Gradient Descent

Start with some random $\theta$ (say all zeros), and keep updating:

$$
\theta_j := \theta_j - \alpha \frac{\partial}{\partial \theta_j} J(\theta)
$$

$\alpha$ is the **learning rate**.

Intuition: imagine standing on a hill, looking around 360 degrees, and taking a small step in the steepest downhill direction. Keep doing that and you end up at the bottom.

Working out the derivative for one training example:

$$
\frac{\partial}{\partial \theta_j} \frac{1}{2}(h_\theta(x) - y)^2 = (h_\theta(x) - y) x_j
$$

So for all examples, the update is:

$$
\theta_j := \theta_j + \alpha \sum_{i=1}^{m} \left(y^{(i)} - h_\theta(x^{(i)})\right) x_j^{(i)}
$$

### Why is there only one minimum?

For linear regression, $J(\theta)$ is a **convex quadratic function**, so it looks like a bowl. There are no local minima, only one global minimum. That's why gradient descent works so well here.

### Batch vs Stochastic Gradient Descent

- **Batch gradient descent:** use all $m$ examples for each single step. Gets very slow when $m$ is huge (millions).
- **Stochastic gradient descent (SGD):** use only one example for each step, and sweep through the data again and again. It doesn't converge perfectly (it keeps wiggling around the minimum), but it gets close really fast.

For big datasets, SGD is almost always what people use. (Mini-batch is the happy middle ground.)

### Picking the learning rate

- Too big: you overshoot, bounce around, and might even diverge.
- Too small: it works, but takes forever.

A good habit is to plot $J(\theta)$ against the number of iterations. It should go down smoothly. If it doesn't, change $\alpha$.

## The Normal Equation

For linear regression, we can skip gradient descent entirely and just solve for $\theta$ directly.

Stack the examples as rows in a matrix $X$ (size $m \times (n+1)$) and the labels into a vector $y$. Then $J(\theta) = \frac{1}{2}(X\theta - y)^T(X\theta - y)$.

Set the gradient to zero:

$$
\nabla_\theta J(\theta) = X^T X \theta - X^T y = 0
$$

$$
\theta = (X^T X)^{-1} X^T y
$$

One line, no learning rate, no iterations.

The catch: inverting $X^T X$ costs roughly $O(n^3)$, so it's slow when you have a lot of features (tens of thousands). Then gradient descent wins.

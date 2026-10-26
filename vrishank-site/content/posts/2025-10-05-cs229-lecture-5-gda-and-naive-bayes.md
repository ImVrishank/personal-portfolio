---
title: "Lecture 5: GDA and Naive Bayes"
slug: cs229-lecture-5-gda-and-naive-bayes
date: 2025-10-05
tags: [cs229, machine-learning, course-notes]
summary: "Stanford CS229 lecture 5 notes: GDA and Naive Bayes."
---

## Discriminative vs Generative

Everything so far (linear regression, logistic regression) has been **discriminative**. It learns $p(y \mid x)$ directly, or learns a mapping from $x$ to $y$ directly.

**Generative** learning algorithms flip it. They learn $p(x \mid y)$, which is "what do the features look like, given the class?", and also $p(y)$, the prior. Then they use Bayes' rule to classify:

$$
p(y \mid x) = \frac{p(x \mid y) p(y)}{p(x)}
$$

where $p(x) = p(x \mid y=1)p(y=1) + p(x \mid y=0)p(y=0)$. To predict, we just pick whichever class has the higher $p(x \mid y)p(y)$, and we don't even need to compute $p(x)$.

An analogy: to tell elephants from dogs, a discriminative model learns the boundary between them. A generative model builds a model of what elephants look like and a model of what dogs look like, then checks which one a new animal looks more like.

## Gaussian Discriminant Analysis (GDA)

Assume $x \in \mathbb{R}^n$ is continuous, and that $p(x \mid y)$ is Gaussian:

$$
y \sim \text{Bernoulli}(\phi)
$$
$$
x \mid y=0 \sim \mathcal{N}(\mu_0, \Sigma)
$$
$$
x \mid y=1 \sim \mathcal{N}(\mu_1, \Sigma)
$$

Note that both classes share the same covariance $\Sigma$ but have different means. The parameters are $\phi, \mu_0, \mu_1, \Sigma$.

We fit them by maximizing the **joint** likelihood $\prod_i p(x^{(i)}, y^{(i)})$. The MLE comes out as exactly what you'd guess:

$$
\phi = \frac{1}{m}\sum_{i=1}^{m} 1\{y^{(i)} = 1\}
$$
$$
\mu_0 = \frac{\sum_i 1\{y^{(i)}=0\} x^{(i)}}{\sum_i 1\{y^{(i)}=0\}}, \quad \mu_1 = \frac{\sum_i 1\{y^{(i)}=1\} x^{(i)}}{\sum_i 1\{y^{(i)}=1\}}
$$
$$
\Sigma = \frac{1}{m}\sum_{i=1}^{m} (x^{(i)} - \mu_{y^{(i)}})(x^{(i)} - \mu_{y^{(i)}})^T
$$

So $\phi$ is the fraction of positives, $\mu$'s are the class averages, and $\Sigma$ is the covariance around the right class mean. No gradient descent needed, it's a closed form.

### GDA and logistic regression

If you work out $p(y=1 \mid x)$ under GDA, it turns out to be exactly a sigmoid of a linear function of $x$. So GDA gives a logistic-regression-shaped boundary. But the reverse isn't true. Logistic regression doesn't assume anything about $p(x \mid y)$.

So which one to use?

- GDA makes **stronger assumptions** (the data is Gaussian). If they are correct, GDA does better, and needs less data.
- Logistic regression makes **weaker assumptions**, so it's more robust when you aren't sure of the distribution. E.g., if the data is Poisson, logistic regression still works fine, GDA wouldn't.

With a huge dataset, logistic regression generally wins. With a tiny dataset where you trust the assumptions, GDA can win.

## Naive Bayes

Let's build a spam classifier. Make a vocabulary of, say, 50,000 words. An email becomes a vector $x \in \{0,1\}^{50000}$, where $x_j = 1$ if word $j$ appears in the email.

We want $p(x \mid y)$, but $x$ can take $2^{50000}$ values, so modelling that directly is hopeless.

### The Naive Bayes assumption

Assume that the words are **conditionally independent given $y$**:

$$
p(x_1, ..., x_n \mid y) = \prod_{j=1}^{n} p(x_j \mid y)
$$

This is obviously false (the words "Stanford" and "university" are surely correlated). But it works surprisingly well in practice, and that's why it's called naive.

The parameters:

- $\phi_{j|y=1} = p(x_j = 1 \mid y=1)$
- $\phi_{j|y=0} = p(x_j = 1 \mid y=0)$
- $\phi_y = p(y=1)$

The MLE is just counting:

$$
\phi_{j|y=1} = \frac{\sum_i 1\{x_j^{(i)}=1, y^{(i)}=1\}}{\sum_i 1\{y^{(i)}=1\}}
$$

(of all the spam emails, what fraction contain word $j$?)

### Laplace smoothing

Here's the problem. Say the word "Stanford" never appeared in a training set spam email. Then $\phi_{j|y=1} = 0$. Now if a new email contains that word, $p(x \mid y=1) = 0$, and you'd get $\frac{0}{0}$. Also, saying something has zero probability just because you haven't seen it is a bad idea.

Fix: add 1 to the numerator and $2$ to the denominator (for a binary feature):

$$
\phi_{j|y=1} = \frac{\sum_i 1\{x_j^{(i)}=1, y^{(i)}=1\} + 1}{\sum_i 1\{y^{(i)}=1\} + 2}
$$

For a feature with $k$ possible values, add $k$ to the denominator.

### Multinomial event model

The above ignores how many times a word appears. A better version represents an email as the *sequence* of its words, and models each word as drawn from a multinomial given the class. It uses the same independence assumption, but captures counts. This is usually the better model for text.

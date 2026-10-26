---
title: "Lecture 13: Debugging ML Models and Error Analysis"
slug: cs229-lecture-13-debugging-ml-models-and-error-analysis
date: 2025-10-13
tags: [cs229, machine-learning, course-notes]
summary: "Stanford CS229 lecture 13 notes: Debugging ML Models and Error Analysis."
---

This lecture is less about new algorithms and more about **what to do when your model isn't working**. Andrew's point is that most people just try things randomly (get more data, add features, try a new algorithm) and some of those take months, only to find out it wouldn't have helped.

## Diagnostic 1: Bias or variance?

Say you trained a spam classifier and it gets 20% error on the dev set, which is way worse than you hoped. Is it a bias problem or a variance problem?

Compare the training error to the dev error.

| Training error | Dev error | Diagnosis |
|---|---|---|
| High (e.g. 15%) | High (e.g. 16%) | **High bias** (underfitting) |
| Low (e.g. 1%) | High (e.g. 15%) | **High variance** (overfitting) |

And each has a different fix:

**High variance fixes:**
- Get more training data
- Try a smaller set of features
- Increase regularization

**High bias fixes:**
- Try a bigger set of features (or a more complex model)
- Decrease regularization
- Train longer / use a more powerful model

Important point: **more data doesn't fix high bias.** If your model is too simple, you can give it 10x more data and the error will stay the same.

### Learning curves

Plot the training error and dev error as you increase the training set size.

```
error
  |  \                      High variance:
  |   \__ dev                big gap, which
  |        \___________      keeps shrinking
  |                         with more data
  |   ___ train
  |  /
  +------------------- m
```

- **High variance:** a big gap between train and dev, which shrinks with more data. Getting more data helps.
- **High bias:** both curves flatten out, close together, at a high error. More data doesn't help.

## Diagnostic 2: Optimization algorithm or objective function?

Say you're running logistic regression for spam, with a weighted accuracy objective, and it performs worse than an SVM. Is the problem that gradient descent hasn't found the best $\theta$, or that the objective itself is wrong?

Let $\theta_{SVM}$ be the SVM's parameters and $\theta_{BLR}$ be those from Bayesian logistic regression. Compute your objective $J$ for each:

- If $J(\theta_{SVM}) > J(\theta_{BLR})$: the optimizer failed to maximize the objective. **Fix the optimization algorithm** (more iterations, better optimizer, etc.).
- If $J(\theta_{SVM}) \leq J(\theta_{BLR})$: the optimizer did its job, but the objective is the wrong thing to maximize. **Change the objective function.**

## Error analysis

Say you have a pipeline with many components: e.g. face recognition = camera image → remove background → detect face → detect eyes, nose, mouth → logistic regression for identity.

Which component should you improve? Don't guess. **Replace one component at a time with ground truth** and see how much the overall accuracy goes up.

| Component | Accuracy after using ground truth |
|---|---|
| Overall system | 85% |
| + perfect background removal | 85.1% |
| + perfect face detection | 91% |
| + perfect eyes/nose/mouth | 95% |
| + perfect logistic regression | 100% |

The biggest jumps are 85.1% → 91% (face detection, +5.9%) and 91% → 95%. Background removal only gave 0.1%, so don't waste time on it. Face detection is the first place to look.

## Ablative analysis

The opposite direction. Start with your full system (the one with all the fancy features and tricks), and **remove components one at a time** to see which ones actually matter.

Or, start from a simple baseline, and add components one at a time, noting the improvement each time. This helps you understand where the performance is really coming from, and which of the complicated bits can be thrown away.

## Getting started on a problem

Andrew's advice for a new project:

1. **Quick and dirty first.** Build something simple really fast, and set up the train/dev/test split.
2. Run diagnostics to find out what's wrong.
3. Iterate based on what the diagnostics say.

The alternative is to design a big careful system from the start, which usually ends in over-engineering a bunch of things that turn out not to matter.

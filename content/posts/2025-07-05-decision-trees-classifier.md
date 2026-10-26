---
title: "Decision Trees Classifier"
slug: decision-trees-classifier
date: 2025-07-05
category: ai
tags: [decision-trees, classification, desmos]
summary: "Decision trees for classification, built one split at a time on a two-feature dataset, with a live Desmos graph for every step."
---

## Intuition behind Decision Trees:

Say, we have 2 features and 2 classes of data. One Depicted by red and the other depicted by blue.  
Here is the dataset plotted.

::desmos{id="zgsiwjsgnw" height="420"}

As we can clearly observe, these two sets cannot be separated by a linear decision boundary. Here is how Binary decision tree goes about this.

Now if i make draw a line at $x = 5$, this line separates three datapoints of the blue class from the rest of the data. Let this be our root node.

::desmos{id="yvnkoxruu0" height="420"}

This root node classifies data into two sects. One daughter containing only blue class and the other daughter containing both blue and red classes. Now let us add another set of daughters to the child node of the initial parent node.

Our splitting condition will be the line $x = -5$, this again leaves us with 2 nodes. One with a leaf node containing only blues and the other with a mix of both the classes. Here is how it looks now

::desmos{id="mkdz6wqhlw" height="420"}

Now we can add on more decision boundaries to our data points. Let the next one be: $y = 6$  
Here is how it would look:

::desmos{id="uz01kvmtp6" height="420"}

One last decision boundary now: $y = -4$

::desmos{id="nfvfi3tbpd" height="420"}

We have successfully separated all the blues from the reds. Here is how the final graph looks:

::desmos{id="k3tiiefzn1" height="420"}

## Visualization of the Binary Decision Tree

::figure{src="/media/imported/decision-trees-classifier/1.png" alt=""}

### Why is this a greedy algorithm?

Once you have decided the decision boundary for a certain child node, we cannot go back and select a different condition for this node. We just go ahead and only worry ourselves with the present node and how it affects the split of data. This also kind of makes it naive. The training becomes a lot more faster nevertheless.

## Building a Binary Decision Tree

### Which split is better?

The split that has the lowest amount of entropy is the best split. Here we introduce a concept called **Information Gain**. We define information gain or IG at every single split. We want to try to maximize the IG.  
Where $p_i$ is the probability of the $i^{th}$ class. Then the way we get information gain is:

$$
Entropy = \sum{-p_i \log_2{(p_i)}}
$$

$$
Information \space gain = Entropy\space of \space parent \space node - \sum w_i.Entropy(child_i)
$$

So we just pick the one with the highest information gain as the decision split.

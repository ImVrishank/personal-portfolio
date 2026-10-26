---
title: "Lecture 1: Introduction and Word Vectors"
slug: cs224n-lecture-1-word-vectors
date: 2025-03-29
category: notes
tags: [cs224n, nlp, course-notes]
summary: "Stanford CS224N lecture 1 notes: why human language is hard for machines, and word vectors as the starting point."
---

[Lecture 1](https://www.youtube.com/watch?v=rmVRLeJRkl4&list=PLoROMvodv4rMFqRtEuo6SGjY4XbRIVRd4&index=2)

Natural Language processing with Deep Learning.

## The Course:

- We will be learning the basics of NLP, the key methods used here.
- Recurrent Neural Networks, attention and transformers.
- Understanding the human languages and the difficulties in understanding and producing them.
- Ability to build systems (in PyTorch) for some problems in NLP. Some of them include:
  - Word meaning
  - Dependency parsing
  - Machine translation
  - Question answering

## Human Language:

The Human Language is such a complex entity. As humans, we are accustomed to understand and interpret words and their meaning together. This seems to be a simple task, but training a computer to do the same is extremely complicated. Matter of fact, even we tend to interpret sequences of words in the wrong context. Here's the question, how do we train a computer to get all the contexts, interpret them and then output valid tokens in a way that makes complete sense in the human language? This is what NLP deals with.

### Getting the meanings of words

We know that we need to generate text, but the text in itself should make sense, meaning, the words should make sense in that context. For this we could consider using a source like **WordNet**, This is an open source library in python that gives you synonyms, hypernyms and whatnot.

#### The issue with WordNet:

A great example telling us why we shouldn't use WordNet: In WordNet, good and proficient is listed as synonyms, This might be right in some contexts, but is wrong in majority of the contexts. This is just one of the examples out of many suggesting we shouldn't be using a library like WordNet.  
WordNet also does not add to its word set often. Meaning, the newer words like slay, yasss and other such words, may not have their meanings listed at all, or might have wrong meanings. Knowing these meanings is very important to give the right sentiment in each output generated.  
With WordNet, you aren’t really teaching the computer to adapt to newer lingo. Teaching it newer lingo would be very labor intensive and painful.

### Other issues:

- We have a very vast dictionary of words. In traditional ML, we usually use One-Hot vectors to represent these sentences or contexts. This would have to be a very very large One-hot Vector to be able to hold all the words in the English dictionary.
- The even bigger issue is, In web searches. motels and hotels would essentially mean the same thing. But They are given different One-Hot vectors. We would like for these One-Hot vectors to be orthogonal (that is, similar), But there is no natural notion of similarity for One-Hot Vectors.

#### How do we get over this?

We try to encode similarity. This is what modern NLP is based off. A words meaning is not given by its dictionary meaning, It is given by the words it appears next to it often.

~*You shall know a word by the company it keeps* (**J. R. Firth**, a famous linguist)

In layman's terms:

::figure{src="/media/imported/cs224n-lecture-1-word-vectors/1.png" alt=""}

The words commonly surrounding *banking* will represent its meaning. This is a way of training our data.

### Word Vectors \ Word Embeddings:

*Instead of sparse one-hot vectors, word embeddings aim to learn dense and lower-dimensional vectors for each word. These vectors (e.g., with 100-2000 dimensions) capture semantic relationships.* - From NoteBookLM  
Word vectors are basically dense vectors of dimension (1,N). Where N is around the range of 200-300. All the values inside it will contain real numbers and they correspond to another word (another word for each of the N cells). And the numbers inside might give us an idea of how closely related they are to the other N words that we are defining the meaning of this word with. Each word (token) has a Word Vector and the values inside the Word Vector defines the meaning of the word, by taking the other words that commonly surround this word as the definition.

### Word2vec Algorithm:

Core principles:

- We have a large body of text
- Each word is given a Word Vector.
- We go through the entire text **T**, with each word in mind called the center word **C** and the surrounding/context words **O**.
- We define/alter each Word Vector when it becomes the center word **C**, with respect to the surrounding words **O**. When we say define/alter the word vector, we are speaking about the meaning of the word **W**, with the surrounding words **O** as context.
- When we say alter we look at the surrounding words **O** and then make the model guess the center word **C**. We look at this guess and the actual center word **C** to give us the error. Now that we have the error, we work on minimizing the error by changing the Word Vector of the center word **C**. The alias for error in this algo is probability of **O** given **C**, but we **maximize** this probability to minimize error.
- The above point is us guessing the center word **C** using the context words **O**, we could also do the exact opposite, that is, guess **O** when given **C**
- Now we use these Word Vectors to calculate the probability of **O** given **C**, or calculate the probability of **C** given **O**.
- Here is what this looks like:
We do this word (into) first.
  ::figure{src="/media/imported/cs224n-lecture-1-word-vectors/2.png" alt=""}

Then we move on to the next word (banking).

::figure{src="/media/imported/cs224n-lecture-1-word-vectors/3.png" alt=""}

Coming to the math behind this algo:  
For each position t = 1,...,T, predict context words within a window of fixed size m, given the center word $w_j$

$$
\text{Likelihood} = L(\theta) = \prod_{t=1}^{T} \prod_{\substack{(-m-1)<j<(m+1) \\ j\neq0}} \log P(W_{t+j} \mid W_t; \theta)
$$

Since we like speaking in terms of Loss and Cost in ML:

Same thing, but we need to minimize $J(\theta)$ instead of maximizing $L(\theta)$.

$$
J(\theta) = -\frac{1}{T} \log L(\theta) = -\frac{1}{T} \sum_{t=1}^{T} \sum_{\substack{(-m-1)<j<(m+1) \\ j\neq0}} \log P(W_{t+j} \mid W_t; \theta)
$$

Here is how this math works:

::figure{src="/media/imported/cs224n-lecture-1-word-vectors/4.jpg" alt=""}

::figure{src="/media/imported/cs224n-lecture-1-word-vectors/5.jpg" alt=""}

Now that we have the loss function, we need to minimize it. To minimize it, pass it though an optimizer.

All that is fair, Now how do i go about calculating $P(W_{t+j}|W_t;\theta)$ ?

- Each word is given two vectors:  $v_w$ and $u_w$.
  - $v_w$ vector is used when $w$ is the center word
  - vector is used when $w$ is the context word
- This is done as it makes the math way easier.
- Once we have this:
  - NOTE: We need to understand that if two words have a high dot product, then that means that they are pretty similar.
  $$
  P(o \mid c) = \frac{\exp(u_o^T v_c)}{\sum_{w\in V} \exp(u_w^T v_c)}
  $$

- The above formula, it tells us how similar the word **o** and the word **c** are. Softmax is being applied because we want a positive probability distribution.

#### Training the model:

As we do in all models, we want to minimize the cost function. We do this by changing the parameters.

$$
\theta = \begin{bmatrix} V_{\text{aardvark}} \\ V_{a} \\ \vdots \\ V_{\text{zebra}} \\ U_{\text{aardvark}} \\ U_{a} \\ \vdots \\ U_{\text{zebra}} \end{bmatrix} \in \mathbb{R}^{2dV}
$$

This is of dimension, $2dV$, where d is the number of dimensional vector and V is the vocab size, that is, the number of tokens.

Once we do this, we have a a large space of words where all the similar words are grouped together in this huge space. When squeezed back to 2 dimensional space, it looks somewhat like this:

::figure{src="/media/imported/cs224n-lecture-1-word-vectors/6.png" alt=""}

Keep in mind that when squeezing this data from huge dimensions to such tiny dimensions, we tend to lose a lot of the data. Imagine crushing a 3 dimensional sphere into 1 dimension, it would just be 2 lines. If we look at 3 spheres as a venn-diagram, this when converted to 1 dimension would just be the intersection of 2 lines.  
On reducing 2 dimensions, we are losing so much info, it would be way worse when squeezed into what's shown above.  
Yet you can see that all the similar words are grouped together. Even among the countries, countries that are often spoken of together appear to be closer. This is the magic of this algorithm!

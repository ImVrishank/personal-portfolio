---
title: "Word2Vec"
kind: ai
art: word2vec
tagline: "Word embeddings from scratch, bag-of-words, 5000 words in 60 dimensions"
status: built
project: word2vec
order: 6
core: false
specs:
  - Approach: Bag-of-words
  - Vocabulary: about 5000 words
  - Embedding size: 60 dimensions
  - Built by hand: Tokenization, dataset, forward and backward pass
links:
  - Code on GitHub|https://github.com/ImVrishank/Word2Vec
---

I built a Word2Vec model from scratch using a bag-of-words approach. The model learns embeddings for a vocabulary of around 5000 words, each represented in 60 dimensions. I implemented everything myself—from tokenization and dataset preparation to the forward and backward passes—focusing on understanding how embeddings are actually learned rather than relying on pre-built libraries.

The model captures semantic relationships by placing words that appear in similar contexts close to one another in the vector space. Training it from the ground up reinforced my understanding of how distributed representations work in NLP and why they are so powerful.

I also wrote a detailed blog explaining the intuition behind Word2Vec, the mathematics of the training process, and my step-by-step implementation. You can check out the full code and write-up here. This project was both challenging and rewarding, and it gave me hands-on insight into representation learning.

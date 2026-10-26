---
title: "BPE tokenizer"
kind: ai
art: bpe
tagline: "The cl100k_base tokenizer, reimplemented"
status: built
project: bpe
order: 7
core: false
specs:
  - Language: Python
  - Target: cl100k_base, as used by GPT-4
  - Covers: Merge rules, vocabulary construction
---

Language models do not read words. They read tokens, and the tokenizer decides what a token is. **Byte-pair encoding (BPE)** is the idea behind most of them, and the `cl100k_base` encoding used by GPT-4 is one of its best-known forms. I rebuilt it from scratch to see where those tokens actually come from.

## How BPE works

1. Start with the smallest units: individual bytes or characters.
2. Count every adjacent pair in the training text, and merge the most frequent pair into one new token.
3. Repeat until the vocabulary reaches the size you want. The ordered list of merges is the **merge rules**, and the set of tokens it produces is the **vocabulary**.
4. To encode new text, split it into the smallest units and replay the merges in the same order.

Common words end up as a single token, rare words break into pieces, and nothing is ever unknown, because anything can fall back to bytes.

## What I built

A from-scratch implementation of the `cl100k_base` tokenizer: subword tokenization, merge rules, and vocabulary construction, without leaning on a tokenizer library. It sits next to my GPT-2, Word2Vec and BrainCells builds, since a model is only as good as the tokens it is fed.

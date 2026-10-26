---
title: "GPT-2 from scratch"
kind: ai
art: gpt2
tagline: "A mini transformer trained on Tiny Shakespeare"
status: built
project: gpt2
order: 8
core: false
specs:
  - Framework: PyTorch
  - Parts: Tokenizer, embeddings, causal multi-head attention, feed-forward
  - Data: Tiny Shakespeare, character level
  - Write-up: 6.2k-word blog
links:
  - Code on GitHub|https://github.com/ImVrishank/NLP
  - Read the full blog|/writing/attention-is-all-you-need/
---

I built a GPT-2 model from scratch using the Tiny Shakespeare dataset. This project is a decoder-only transformer that generates text in Shakespearean English. I implemented key components like tokenization, self-attention, and autoregressive text generation, ensuring the model could learn patterns effectively.

Instead of using pre-built libraries, I wrote everything from the ground up, focusing on understanding each part of the architecture. Training was done on character-level inputs, making it a great exercise in working with sequence models. The model successfully generates Shakespeare-like text, capturing the style and flow of the original dataset.

I also wrote a **detailed 6.2k-word blog** explaining my implementation, which you can find [here](/writing/attention-is-all-you-need/). This project was both challenging and rewarding, reinforcing my understanding of transformers and deep learning.

[GitHub repo](https://github.com/ImVrishank/NLP)

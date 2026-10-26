---
title: "Naive Bayes spam classifier"
kind: ai
art: naive-bayes
tagline: "Classifying spam from word frequencies, with no ML library"
status: built
project: naive-bayes
order: 5.1
core: false
specs:
  - Stack: NumPy, SciPy, Pandas
  - Task: Spam or not spam from word frequencies
  - Core idea: Bayes theorem with independent words
links:
  - Notebook on GitHub|https://github.com/ImVrishank/from_scratch_implementations/blob/main/spam_detector(Naive%20bayes).ipynb
---

I built a **Naïve Bayes spam classifier** from scratch using only **NumPy, SciPy, and Pandas**—no fancy libraries, just the raw math behind one of the classic machine learning algorithms. The goal? To classify emails as **spam or not spam** based on word frequencies.

Naïve Bayes works on the assumption that words appear independently in emails (which isn’t always true, but it’s surprisingly effective). I trained the model on a dataset of spam and ham emails, calculating word probabilities and making predictions based on Bayes’ Theorem.

This project was less about achieving state-of-the-art accuracy and more about **recreating a part of AI history**. It gave me a deeper understanding of probabilistic models and how early spam filters worked. If you're interested, you can check out the full implementation on my **GitHub**.

[GitHub repo](https://github.com/ImVrishank/from_scratch_implementations/blob/main/spam_detector(Naive%20bayes).ipynb)

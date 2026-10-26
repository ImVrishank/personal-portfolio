---
title: "Self-improving voice prompts"
kind: ai
art: bandit
tagline: "Thompson Sampling over four live prompt variants, scored on five rubrics"
status: shipped
order: 9
core: true
specs:
  - Selection: Thompson Sampling, Bayesian
  - Variants: 4 competing prompts on live traffic
  - Scoring: 5 rubrics, clarity to tone
  - Where: Production voice-AI pipeline at Hoogway.ai
---
Live call traffic is routed across prompt variants, every call is graded automatically, and the weak variants are retired and rewritten from the strong ones. The full story is on the resume page.

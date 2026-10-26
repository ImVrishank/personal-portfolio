---
title: "NVIDIA Jetson Nano"
kind: sbc
tagline: "A small GPU board for running vision models at the edge"
status: programmed
project: edge-ai
order: 7
core: true
specs:
  - GPU: 128-core NVIDIA Maxwell
  - CPU: Quad-core ARM Cortex-A57
  - Memory: 4 GB LPDDR4 on the common model
  - I/O: GPIO, I²C, SPI, UART, CSI camera
---
I configured an NVIDIA Jetson Nano from scratch to explore the realities of edge computing. This involved everything from sourcing hardware at a local outlet and flashing the OS with Balena Etcher to managing thermals with an external cooling fan. My primary focus was deploying a real-time object detection pipeline, where I wrote a custom Python wrapper to optimize inference speed directly on the board’s 128-core Maxwell GPU.

To push the hardware limits, I also experimented with running Ollama’s Llama 3.2:3b locally. Although the aging architecture faced memory bottlenecks, the project was a hands-on masterclass in resource optimization and hardware-software integration. It moved AI from the abstraction of a cloud notebook into a physical, power-constrained device.

::figure{src="/media/imported/jetson-nano/1.jpg" alt=""}

::video{src="/media/imported/jetson-nano/2.mp4" poster="/media/imported/jetson-nano/3.jpg"}

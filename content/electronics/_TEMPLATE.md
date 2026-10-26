---
title: "Part name"
kind: board            # board | display | driver | power | sensor | sbc | build | note (free text works too)
tagline: "One line about what it is or why it matters"
status: used           # bench | used | shelf | wishlist
project: sesame        # optional: slug of a project in content/site.json
image: /media/parts/my-part.jpg   # optional photo; delete to use the generated illustration
order: 0               # optional: higher numbers appear first
specs:
  - CPU: Dual-core, 240 MHz
  - Interface: I²C, SPI
  - Supply: 3.3 V
---

<!-- Everything below the front matter is optional. Delete this comment. -->

Your own notes: pinout quirks, what went wrong, what you'd do differently.

::figure{src="/media/parts/bench.jpg" alt="The part on my workbench" caption="On the bench" wide}

```cpp
// A snippet worth keeping
```

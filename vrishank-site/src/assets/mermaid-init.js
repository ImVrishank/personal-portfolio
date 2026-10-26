/* Loads Mermaid only on posts that contain diagrams, and follows the site theme. */
(function () {
  var nodes = document.querySelectorAll('pre.mermaid');
  if (!nodes.length) return;
  var src = Array.prototype.map.call(nodes, function (n) { return n.textContent; });
  function draw(mermaid) {
    var dark = document.documentElement.dataset.theme === 'dark';
    mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'neutral', securityLevel: 'strict' });
    nodes.forEach(function (n, i) { n.textContent = src[i]; n.removeAttribute('data-processed'); });
    mermaid.run({ nodes: nodes });
  }
  import('https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs').then(function (m) {
    var mermaid = m.default;
    draw(mermaid);
    new MutationObserver(function () { draw(mermaid); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }).catch(function () { /* diagram source stays visible as text */ });
})();

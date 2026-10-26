/* Shared Markdown pipeline. Runs in Node (build.mjs) and in the browser (studio preview).
     const md = Markdown.create({ marked, katex, highlight });
     const { html, toc, hasMath, embeds } = md.render(source);
   Extras on top of plain Markdown:
     $inline$ and $$display$$ math (KaTeX), footnotes [^id], heading ids + table of contents,
     code blocks with highlighting and copy button, figures from images with titles,
     component directives:   ::name{attr="value" flag}     and     :::name{attrs} ... :::
   Documented in WRITING.md. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Markdown = factory();
})(this, function () {
  const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';

  function parseAttrs(str = '') {
    const out = {};
    const inner = str.replace(/^\{|\}$/g, '');
    const re = /([a-zA-Z_][\w-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s}]+)))?/g;
    let m;
    while ((m = re.exec(inner))) out[m[1]] = m[2] ?? m[3] ?? m[4] ?? true;
    return out;
  }
  const safeUrl = (u) => /^(https:\/\/|\/|\.\.?\/)/.test(u) && !/^\/\//.test(u);

  function create({ marked, katex, highlight }) {
    const M = new marked.Marked({ gfm: true });
    let st;
    const reset = () => { st = { toc: [], ids: {}, hasMath: false, embeds: false, defs: {}, order: {}, n: 0, refCount: {} }; };
    reset();

    /* ---------- math ---------- */
    const math = (tex, display) => {
      st.hasMath = true;
      if (!katex) return `<code class="math-raw">${esc(tex)}</code>`;
      try { return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' }); }
      catch (e) { return `<code class="math-error">${esc(tex)}</code>`; }
    };

    /* ---------- directive rendering ---------- */
    const caption = (a, extra = '') => (a.caption || extra) ? `<figcaption>${a.caption ? `<span>${esc(a.caption)}</span>` : ''}${extra}</figcaption>` : '';
    const size = (a) => (a.wide ? ' wide' : a.full ? ' full' : '');
    const iframeEmbed = (kind, src, openUrl, openLabel, a, ratio) => {
      st.embeds = true;
      const style = a.height ? `--h:${esc(String(a.height).replace(/[^\d.]/g, ''))}px` : `--ratio:${esc(ratio)}`;
      return `<figure class="embed embed-${kind}${size(a)}" data-src="${esc(src)}" data-title="${esc(a.title || a.caption || openLabel)}" style="${style}">
  <div class="embed-frame"><a class="embed-fallback" href="${esc(openUrl)}" target="_blank" rel="noopener">${esc(openLabel)} ↗</a></div>
  <figcaption>${a.caption ? `<span>${esc(a.caption)}</span>` : '<span></span>'}<a href="${esc(openUrl)}" target="_blank" rel="noopener">${esc(openLabel)} ↗</a></figcaption>
</figure>\n`;
    };

    const DIRECTIVES = {
      desmos(a) {
        const id = String(a.id || '').trim();
        if (!/^[a-z0-9]+$/i.test(id)) return err('desmos needs id="..." (the code at the end of the Desmos calculator URL)');
        const kind = ['3d', 'geometry'].includes(String(a.kind || '').toLowerCase()) ? String(a.kind).toLowerCase() : 'calculator';
        return iframeEmbed('desmos', `https://www.desmos.com/${kind}/${id}?embed`, `https://www.desmos.com/${kind}/${id}`, kind === '3d' ? 'Open in Desmos 3D' : 'Open in Desmos', a, '16/10');
      },
      youtube(a) {
        const id = String(a.id || '').trim();
        if (!/^[\w-]{6,15}$/.test(id)) return err('youtube needs id="..." (the part after v= in the URL)');
        st.embeds = true;
        const start = a.start ? `&start=${parseInt(a.start, 10) || 0}` : '';
        const url = `https://www.youtube.com/watch?v=${id}${a.start ? `&t=${parseInt(a.start, 10) || 0}s` : ''}`;
        return `<figure class="embed embed-youtube${size(a)}" style="--ratio:16/9">
  <div class="embed-frame yt" data-yt="${esc(id)}" data-start="${esc(start)}" data-title="${esc(a.title || a.caption || 'YouTube video')}"><a class="embed-fallback" href="${esc(url)}" target="_blank" rel="noopener">Watch on YouTube ↗</a></div>
  <figcaption>${a.caption ? `<span>${esc(a.caption)}</span>` : '<span></span>'}<a href="${esc(url)}" target="_blank" rel="noopener">Watch on YouTube ↗</a></figcaption>
</figure>\n`;
      },
      vimeo(a) {
        const id = String(a.id || '').trim();
        if (!/^\d+$/.test(id)) return err('vimeo needs id="..." (the number in the URL)');
        return iframeEmbed('vimeo', `https://player.vimeo.com/video/${id}?dnt=1`, `https://vimeo.com/${id}`, 'Watch on Vimeo', a, '16/9');
      },
      observable(a) {
        let nb = String(a.notebook || a.url || '').trim().replace(/^https:\/\/observablehq\.com\/(?:embed\/)?/, '').replace(/[?#].*$/, '');
        if (!/^(@[\w-]+\/[\w-]+|d\/[0-9a-f]+)$/i.test(nb)) return err('observable needs notebook="@user/notebook-name" (or d/<id>)');
        const cells = String(a.cells || '').split(',').map((c) => c.trim()).filter(Boolean).map((c) => `cells=${encodeURIComponent(c)}`).join('&');
        const src = `https://observablehq.com/embed/${nb}${cells ? '?' + cells : ''}`;
        return iframeEmbed('observable', src, `https://observablehq.com/${nb}`, 'Open the notebook', a, a.ratio || '16/10');
      },
      embed(a) {
        const src = String(a.src || '').trim();
        if (!safeUrl(src)) return err('embed needs src="https://..." or a /media/ path');
        let ratio = String(a.ratio || '16/9').replace(/[^\d/.: ]/g, '').replace(':', '/');
        return iframeEmbed('generic', src, src, a.label || 'Open it on its own', a, ratio);
      },
      figure(a) {
        const src = String(a.src || '').trim();
        if (!safeUrl(src)) return err('figure needs src="/media/..." or an https URL');
        return `<figure class="fig${size(a)}"><a href="${esc(src)}" data-lightbox><img src="${esc(src)}" alt="${esc(a.alt || a.caption || '')}" loading="lazy"${a.w && a.h ? ` width="${esc(a.w)}" height="${esc(a.h)}"` : ''}></a>${caption(a)}</figure>\n`;
      },
      video(a) {
        const src = String(a.src || '').trim();
        if (!safeUrl(src)) return err('video needs src="/media/clip.mp4"');
        const attrs = `controls playsinline preload="metadata"${a.poster && safeUrl(a.poster) ? ` poster="${esc(a.poster)}"` : ''}${a.loop ? ' loop' : ''}${a.muted ? ' muted' : ''}`;
        return `<figure class="fig video${size(a)}"><video ${attrs}><source src="${esc(src)}"><a href="${esc(src)}">Download the video</a></video>${caption(a)}</figure>\n`;
      },
      plot(a) {
        const expr = String(a.expr || '').trim();
        if (!expr) return err('plot needs expr="sin(a*x)" (use a="0..5" to add a slider)');
        st.embeds = true;
        const params = {};
        for (const k of ['a', 'b', 'c', 'd', 'k', 'm', 'n', 't']) {
          const v = a[k]; if (typeof v !== 'string') continue;
          const p = v.split('..').map(Number);
          if (p.length >= 2 && p.every((n) => !isNaN(n))) params[k] = { min: p[0], max: p[1], val: p[2] ?? (p[0] + p[1]) / 2, step: (p[1] - p[0]) / 200 };
        }
        const cfg = { expr, xmin: +a.xmin || -10, xmax: +a.xmax || 10, ymin: a.ymin !== undefined ? +a.ymin : null, ymax: a.ymax !== undefined ? +a.ymax : null, params, height: +a.height || 0 };
        return `<figure class="plot${size(a)}" data-plot="${esc(JSON.stringify(cfg))}">
  <div class="plot-frame"><code class="plot-fallback">y = ${esc(expr.split(';').join(', y = '))}</code></div>${caption(a)}
</figure>\n`;
      },
    };
    const err = (msg) => `<p class="md-error">Component error: ${esc(msg)}</p>\n`;

    const CONTAINERS = {
      gallery(a, inner) {
        const items = [...inner.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g)];
        if (!items.length) return err('gallery needs ![alt](/media/x.jpg "caption") lines inside');
        const cols = Math.min(4, Math.max(1, parseInt(a.cols, 10) || (items.length === 2 ? 2 : 3)));
        return `<figure class="gallery${size(a)}" style="--cols:${cols}"><div class="gallery-grid">${items.map(([, alt, src, cap]) =>
          `<figure><a href="${esc(src)}" data-lightbox><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy"></a>${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure>`).join('')}</div>${caption(a)}</figure>\n`;
      },
    };

    /* ---------- marked extensions ---------- */
    M.use({
      renderer: {
        heading({ tokens, depth }) {
          const text = this.parser.parseInline(tokens);
          const plain = tokens.map((t) => t.raw || t.text || '').join('').replace(/\$[^$]*\$/g, '');
          let id = slugify(plain); const n = st.ids[id] = (st.ids[id] || 0) + 1; if (n > 1) id += `-${n}`;
          if (depth === 2 || depth === 3) st.toc.push({ depth, id, text: plain.replace(/[`*_]/g, '').trim() });
          return `<h${depth} id="${id}">${text}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${depth}>\n`;
        },
        code({ text, lang }) {
          const l = (lang || '').split(/\s/)[0];
          if (l === 'mermaid') return `<figure class="mermaid-wrap"><pre class="mermaid">${esc(text)}</pre></figure>
`;
          const body = highlight ? highlight(text, l) : esc(text);
          return `<div class="code"><div class="code-bar"><span>${esc(l || 'text')}</span><button type="button" class="copy" data-copy>Copy</button></div><pre><code${l ? ` class="language-${esc(l)}"` : ''}>${body}</code></pre></div>\n`;
        },
        image({ href, title, text }) {
          const img = `<img src="${esc(href)}" alt="${esc(text)}" loading="lazy">`;
          return title ? `<figure class="fig"><a href="${esc(href)}" data-lightbox>${img}</a><figcaption>${esc(title)}</figcaption></figure>` : img;
        },
        link({ href, title, tokens }) {
          const t = this.parser.parseInline(tokens);
          const ext = /^https?:/.test(href);
          return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}${ext ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
        },
      },
      extensions: [
        {
          name: 'inlineMath', level: 'inline',
          start(src) { const i = src.indexOf('$'); return i < 0 ? undefined : i; },
          tokenizer(src) { const m = /^\$(?![\s$])((?:\\.|[^$\\\n])+?)(?<![\s\\])\$(?!\d)/.exec(src); if (m) return { type: 'inlineMath', raw: m[0], text: m[1] }; },
          renderer(t) { return math(t.text, false); },
        },
        {
          name: 'blockMath', level: 'block',
          start(src) { const i = src.indexOf('$$'); return i < 0 ? undefined : i; },
          tokenizer(src) { const m = /^\$\$[ \t]*\n?([\s\S]+?)\n?[ \t]*\$\$[ \t]*(?:\n|$)/.exec(src); if (m) return { type: 'blockMath', raw: m[0], text: m[1].trim() }; },
          renderer(t) { return `<div class="math-block">${math(t.text, true)}</div>\n`; },
        },
        {
          name: 'footnoteDef', level: 'block',
          start(src) { const m = /(^|\n)\[\^[^\]]+\]:/.exec(src); return m ? m.index + (m[1] ? 1 : 0) : undefined; },
          tokenizer(src) {
            const m = /^\[\^([^\]]+)\]:[ \t]*([^\n]*(?:\n(?:[ \t]{2,}|\t)[^\n]*)*)(?:\n|$)/.exec(src);
            if (m) { st.defs[m[1]] = m[2].replace(/\n[ \t]+/g, ' ').trim(); return { type: 'footnoteDef', raw: m[0] }; }
          },
          renderer() { return ''; },
        },
        {
          name: 'footnoteRef', level: 'inline',
          start(src) { const i = src.indexOf('[^'); return i < 0 ? undefined : i; },
          tokenizer(src) { const m = /^\[\^([^\]\s]+)\]/.exec(src); if (m) return { type: 'footnoteRef', raw: m[0], id: m[1] }; },
          renderer(t) {
            if (!(t.id in st.order)) st.order[t.id] = ++st.n;
            const slug = slugify(t.id), c = st.refCount[t.id] = (st.refCount[t.id] || 0) + 1;
            return `<sup class="fn-ref"><a href="#fn-${slug}" id="fnref-${slug}${c > 1 ? '-' + c : ''}" aria-label="Footnote ${st.order[t.id]}">${st.order[t.id]}</a></sup>`;
          },
        },
        {
          name: 'directive', level: 'block',
          start(src) { const m = /(^|\n):{2,3}[a-z]/.exec(src); return m ? m.index + (m[1] ? 1 : 0) : undefined; },
          tokenizer(src) {
            let m = /^:::([a-z-]+)(\{[^\n]*\})?[ \t]*\n([\s\S]*?)\n:::[ \t]*(?:\n|$)/.exec(src);
            if (m) {
              const token = { type: 'directive', raw: m[0], name: m[1], attrs: parseAttrs(m[2]), inner: m[3], container: true };
              if (m[1] === 'callout') token.tokens = this.lexer.blockTokens(m[3]);
              return token;
            }
            m = /^::([a-z-]+)(\{[^\n]*\})?[ \t]*(?:\n|$)/.exec(src);
            if (m) return { type: 'directive', raw: m[0], name: m[1], attrs: parseAttrs(m[2]), container: false };
          },
          renderer(t) {
            if (t.container) {
              if (t.name === 'callout') {
                const kind = ['note', 'idea', 'warn'].includes(t.attrs.type) ? t.attrs.type : 'note';
                return `<aside class="callout callout-${kind}">${t.attrs.title ? `<strong>${esc(t.attrs.title)}</strong>` : ''}${this.parser.parse(t.tokens)}</aside>\n`;
              }
              const fn = CONTAINERS[t.name];
              return fn ? fn(t.attrs, t.inner) : err(`unknown component :::${t.name}`);
            }
            const fn = DIRECTIVES[t.name];
            return fn ? fn(t.attrs) : err(`unknown component ::${t.name}`);
          },
        },
      ],
    });

    function render(source) {
      reset();
      let html = M.parse(source || '');
      const ids = Object.keys(st.order).sort((a, b) => st.order[a] - st.order[b]);
      if (ids.length) {
        html += `<section class="footnotes" aria-label="Footnotes"><ol>${ids.map((id) => {
          const slug = slugify(id);
          const def = st.defs[id];
          return `<li id="fn-${slug}">${def ? M.parseInline(def) : '<em>Missing footnote text.</em>'} <a class="fn-back" href="#fnref-${slug}" aria-label="Back to text">↩︎</a></li>`;
        }).join('')}</ol></section>`;
      }
      return { html, toc: st.toc, hasMath: st.hasMath, embeds: st.embeds };
    }
    return { render };
  }
  return { create, parseAttrs, slugify };
});

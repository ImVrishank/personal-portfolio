/* Tiny syntax highlighter. No dependencies. Used at build time (build.mjs) and in the studio preview.
   highlight(code, lang) -> HTML string with <span class="tok-*"> wrappers. Unknown languages are just escaped. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Highlight = factory();
})(this, function () {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const words = (s) => new RegExp('^(?:' + s.trim().split(/\s+/).join('|') + ')\\b');

  const C_KW = 'auto break case const constexpr continue default do else enum extern for goto if inline namespace new nullptr operator private protected public return sizeof static struct switch template this typedef union using virtual volatile while class delete try catch throw true false NULL override final explicit noexcept';
  const C_TYPES = 'void int char float double bool long short unsigned signed size_t uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t int64_t String byte boolean string vector map';
  const PY_KW = 'and as assert async await break class continue def del elif else except finally for from global if import in is lambda None nonlocal not or pass raise return try while with yield True False self match case';
  const JS_KW = 'async await break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while yield true false null undefined interface type enum implements readonly as';
  const RUST_KW = 'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while';
  const JAVA_KW = 'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long new package private protected public return short static super switch this throw throws try void volatile while true false null var';
  const SH_KW = 'if then else elif fi for while do done case esac function in return export local echo cd ls cat grep sed awk npm node git sudo apt pip python python3 docker curl mkdir rm cp mv';

  const num = /^(?:0x[0-9a-fA-F_]+|0b[01_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?[fFuUlL]*)/;
  const dq = /^"(?:[^"\\\n]|\\.)*"?/, sq = /^'(?:[^'\\\n]|\\.)*'?/, bt = /^`(?:[^`\\]|\\[\s\S])*`?/;
  const lineSlash = /^\/\/[^\n]*/, block = /^\/\*[\s\S]*?(?:\*\/|$)/, lineHash = /^#[^\n]*/;
  const fnCall = /^[A-Za-z_]\w*(?=\s*\()/;
  const ident = /^[A-Za-z_]\w*/;
  const capIdent = /^[A-Z][A-Za-z0-9_]*/;

  const LANGS = {
    cpp: [['c', lineSlash], ['c', block], ['m', /^#\s*\w+(?:\s*<[^>\n]*>|\s+"[^"\n]*")?/], ['s', dq], ['s', sq], ['n', num], ['k', words(C_KW)], ['t', words(C_TYPES)], ['f', fnCall], ['t', capIdent]],
    py: [['c', lineHash], ['s', /^(?:[rRbBfF]{0,2})(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$))/], ['s', /^(?:[rRbBfF]{0,2})"(?:[^"\\\n]|\\.)*"?/], ['s', /^(?:[rRbBfF]{0,2})'(?:[^'\\\n]|\\.)*'?/], ['n', num], ['m', /^@\w+(?:\.\w+)*/], ['k', words(PY_KW)], ['f', fnCall], ['t', capIdent]],
    js: [['c', lineSlash], ['c', block], ['s', dq], ['s', sq], ['s', bt], ['n', num], ['k', words(JS_KW)], ['f', fnCall], ['t', capIdent]],
    rust: [['c', lineSlash], ['c', block], ['s', dq], ['s', /^'(?:[^'\\\n]|\\.)'/], ['n', num], ['m', /^#!?\[[^\]\n]*\]/], ['k', words(RUST_KW)], ['f', /^[A-Za-z_]\w*!?(?=\s*\()/], ['t', capIdent]],
    java: [['c', lineSlash], ['c', block], ['s', dq], ['s', sq], ['n', num], ['m', /^@\w+/], ['k', words(JAVA_KW)], ['f', fnCall], ['t', capIdent]],
    json: [['p', /^"(?:[^"\\\n]|\\.)*"(?=\s*:)/], ['s', dq], ['n', /^-?\d[\d.eE+-]*/], ['k', /^(?:true|false|null)\b/]],
    yaml: [['c', lineHash], ['n', /^\d{4}-\d{2}-\d{2}/], ['p', /^[ \t-]*[\w.-]+(?=:\s|:$)/], ['s', dq], ['s', sq], ['n', num], ['k', /^(?:true|false|null|yes|no)\b/]],
    bash: [['c', lineHash], ['s', dq], ['s', sq], ['m', /^\$\{?\w+\}?/], ['n', /^\b\d+\b/], ['k', words(SH_KW)], ['p', /^--?[A-Za-z][\w-]*/]],
  };
  const ALIAS = {
    c: 'cpp', h: 'cpp', hpp: 'cpp', 'c++': 'cpp', cc: 'cpp', ino: 'cpp', arduino: 'cpp', cuda: 'cpp',
    python: 'py', py: 'py', micropython: 'py',
    javascript: 'js', js: 'js', jsx: 'js', ts: 'js', tsx: 'js', typescript: 'js', mjs: 'js',
    rs: 'rust', rust: 'rust', java: 'java', kotlin: 'java',
    json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'yaml',
    bash: 'bash', sh: 'bash', shell: 'bash', zsh: 'bash', console: 'bash',
  };

  function highlight(code, lang) {
    const l = String(lang || '').toLowerCase();
    const rules = LANGS[ALIAS[l] || l];
    if (!rules) return esc(code);
    let out = '', i = 0, plain = '';
    const flush = () => { if (plain) { out += esc(plain); plain = ''; } };
    outer: while (i < code.length) {
      const rest = code.slice(i);
      // identifiers that start a word: only try word-based rules at word boundaries
      for (const [cls, re] of rules) {
        const m = rest.match(re);
        if (m && m[0].length) {
          if (/^[A-Za-z_]/.test(m[0]) && i > 0 && /\w/.test(code[i - 1])) continue; // never match mid-word
          flush();
          out += `<span class="tok-${cls}">${esc(m[0])}</span>`;
          i += m[0].length;
          continue outer;
        }
      }
      // consume a whole plain identifier so later rules don't match inside it
      const id = rest.match(ident);
      if (id) { plain += id[0]; i += id[0].length; } else { plain += code[i]; i++; }
    }
    flush();
    return out;
  }
  return { highlight };
});

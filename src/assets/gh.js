/* Shared GitHub helper for the studio pages. Wires the #gh-* settings form (if present) and exposes window.GH.
   commit({ files: [{ path, text | blob }], message, onProgress }) makes ONE commit using the git data API. */
window.GH = (function () {
  const $ = (id) => document.getElementById(id);
  const KEY = 'vas-studio-gh-v1';
  const el = { repo: $('gh-repo'), branch: $('gh-branch'), token: $('gh-token'), remember: $('gh-remember'), status: $('gh-status') };

  if (el.repo) {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      el.repo.value = saved.repo || ''; el.branch.value = saved.branch || 'main';
      if (saved.token) { el.token.value = saved.token; el.remember.checked = true; }
    } catch (e) {}
    const save = () => {
      try { localStorage.setItem(KEY, JSON.stringify({ repo: el.repo.value.trim(), branch: el.branch.value.trim() || 'main', token: el.remember.checked ? el.token.value.trim() : '' })); } catch (e) {}
    };
    ['input', 'change'].forEach((ev) => [el.repo, el.branch, el.token, el.remember].forEach((x) => x.addEventListener(ev, save)));
  }

  const say = (msg, kind = '') => { if (el.status) { el.status.textContent = msg; el.status.className = 'hint ' + kind; } };
  const branch = () => (el.branch.value.trim() || 'main');
  const b64Text = (t) => { const bytes = new TextEncoder().encode(t); let bin = ''; bytes.forEach((b) => (bin += String.fromCharCode(b))); return btoa(bin); };
  const b64Blob = (blob) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1]); r.onerror = reject; r.readAsDataURL(blob); });
  const unb64Text = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

  async function api(pathname, opts = {}) {
    const repo = el.repo.value.trim(), token = el.token.value.trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Enter the repository as owner/name.');
    if (!token) throw new Error('Paste an access token first.');
    const res = await fetch(`https://api.github.com/repos/${repo}${pathname}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
    });
    if (!res.ok) {
      let detail = ''; try { detail = (await res.json()).message; } catch (e) {}
      throw new Error(`GitHub said ${res.status}${detail ? ': ' + detail : ''}`);
    }
    return res.json();
  }

  async function commit({ files, message, onProgress = say }) {
    const br = branch();
    onProgress('Reading the branch…');
    const ref = await api(`/git/ref/heads/${encodeURIComponent(br)}`);
    const head = ref.object.sha;
    const headCommit = await api(`/git/commits/${head}`);
    const entries = [];
    for (const f of files) {
      onProgress(`Uploading ${f.path.split('/').pop()}…`);
      const content = f.blob ? await b64Blob(f.blob) : b64Text(f.text);
      const blob = await api('/git/blobs', { method: 'POST', body: JSON.stringify({ content, encoding: 'base64' }) });
      entries.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const tree = await api('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: headCommit.tree.sha, tree: entries }) });
    const c = await api('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: tree.sha, parents: [head] }) });
    await api(`/git/refs/heads/${encodeURIComponent(br)}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
    return { count: entries.length, branch: br };
  }

  async function readFile(repoPath) {
    const file = await api(`/contents/${repoPath}?ref=${encodeURIComponent(branch())}`);
    return unb64Text(file.content);
  }

  return { api, commit, readFile, say, branch, unb64Text };
})();

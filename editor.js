(function () {
  if (!location.search.includes('edit')) return;

  var REPO = 'Jordine/Jordine.github.io';
  var BRANCH = 'main';
  var fileSha = null;
  var originalRaw = null;

  function getFilePath() {
    var path = location.pathname.replace(/^\//, '').replace(/\/$/, '');
    if (!path) return 'index.html';
    return path + '/index.html';
  }

  function decodeBase64(b64) {
    var bin = atob(b64.replace(/\n/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function encodeBase64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function getToken() {
    var token = localStorage.getItem('gh_token');
    if (!token) {
      token = prompt('GitHub token (contents:write on this repo).\nStored in localStorage. Clear with: localStorage.removeItem("gh_token")');
      if (token) localStorage.setItem('gh_token', token.trim());
    }
    return token;
  }

  async function init() {
    var token = getToken();
    if (!token) return;

    var filePath = getFilePath();

    // Load original file from GitHub
    try {
      var res = await fetch(
        'https://api.github.com/repos/' + REPO + '/contents/' + filePath + '?ref=' + BRANCH,
        { headers: { Authorization: 'token ' + token } }
      );
      if (!res.ok) throw new Error(res.status);
      var data = await res.json();
      originalRaw = decodeBase64(data.content);
      fileSha = data.sha;
    } catch (e) {
      console.error('editor: failed to load file', e);
      return;
    }

    // Make content areas editable
    var main = document.querySelector('main');
    main.querySelectorAll('h1, .tagline, .subtitle, section, .media-card .info, .essay-meta, p, h2, h3, blockquote, ul, ol, table, pre').forEach(function (el) {
      el.contentEditable = 'true';
      el.dataset.editable = '1';
    });

    // Editor bar
    var bar = document.createElement('div');
    bar.id = 'editor-bar';
    bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#111;border-top:1px solid #222;padding:0.5rem 1rem;display:flex;align-items:center;justify-content:space-between;z-index:9999;font-family:"Helvetica Neue",sans-serif;font-size:0.8rem;';

    var label = document.createElement('span');
    label.textContent = 'editing \u00b7 ctrl+s to save';
    label.style.color = '#555';

    var btn = document.createElement('button');
    btn.textContent = 'save';
    btn.style.cssText = 'background:#c4b5fd;color:#000;border:none;padding:0.35rem 1.2rem;border-radius:2px;cursor:pointer;font-size:0.8rem;letter-spacing:0.03em;';

    bar.appendChild(label);
    bar.appendChild(btn);
    document.body.appendChild(bar);

    // Save
    async function save() {
      btn.textContent = 'saving...';
      btn.disabled = true;

      try {
        // Clone main, strip editor artifacts
        var clone = main.cloneNode(true);
        clone.querySelectorAll('[data-editable]').forEach(function (el) {
          el.removeAttribute('contenteditable');
          el.removeAttribute('data-editable');
        });

        var newMain = clone.innerHTML;
        var updated = originalRaw.replace(
          /(<main[^>]*>)([\s\S]*?)(<\/main>)/,
          function (_, open, _content, close) { return open + newMain + close; }
        );

        var res = await fetch(
          'https://api.github.com/repos/' + REPO + '/contents/' + filePath,
          {
            method: 'PUT',
            headers: {
              Authorization: 'token ' + token,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: 'Edit ' + filePath,
              content: encodeBase64(updated),
              sha: fileSha,
              branch: BRANCH
            })
          }
        );

        var result = await res.json();
        if (res.ok) {
          fileSha = result.content.sha;
          originalRaw = updated;
          btn.textContent = 'saved \u2713';
        } else {
          throw new Error(result.message);
        }
      } catch (e) {
        console.error('editor: save failed', e);
        btn.textContent = 'error';
      }

      setTimeout(function () { btn.textContent = 'save'; btn.disabled = false; }, 2000);
    }

    btn.addEventListener('click', save);
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    });
  }

  init();
})();

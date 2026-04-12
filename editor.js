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

  function makeTagRemovable(tag) {
    tag.style.cursor = 'pointer';
    tag.title = 'Click to remove';
    tag.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (confirm('Remove "' + tag.textContent.trim() + '"?')) tag.remove();
    });
  }

  function createAddTagBtn(onAdd) {
    var btn = document.createElement('span');
    btn.className = 'tag-inline';
    btn.textContent = '+';
    btn.style.cssText = 'cursor:pointer;color:#c4b5fd;border-color:#c4b5fd;';
    btn.dataset.editorWidget = '1';
    btn.addEventListener('click', onAdd);
    return btn;
  }

  function initTagEditing() {
    // --- Individual essay pages: tag-inline in .essay-meta ---
    document.querySelectorAll('.essay-meta').forEach(function (meta) {
      meta.querySelectorAll('.tag-inline').forEach(makeTagRemovable);

      var addBtn = createAddTagBtn(function () {
        var name = prompt('Tag name:');
        if (!name || !name.trim()) return;
        var newTag = document.createElement('span');
        newTag.className = 'tag-inline';
        newTag.textContent = name.trim();
        makeTagRemovable(newTag);
        meta.insertBefore(newTag, addBtn);
      });
      meta.appendChild(addBtn);
    });

    // --- Essays index: filter bar ---
    var tagFilter = document.getElementById('tag-filter');
    if (tagFilter) {
      tagFilter.querySelectorAll('.tag').forEach(function (tag) {
        if (tag.dataset.tag === 'all') return;
        var replacement = tag.cloneNode(true);
        tag.parentNode.replaceChild(replacement, tag);
        replacement.style.cursor = 'pointer';
        replacement.title = 'Click to remove from filters';
        replacement.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (confirm('Remove filter "' + replacement.textContent.trim() + '"?')) replacement.remove();
        });
      });

      var addFilterBtn = document.createElement('span');
      addFilterBtn.className = 'tag';
      addFilterBtn.textContent = '+';
      addFilterBtn.style.cssText = 'cursor:pointer;color:#c4b5fd;border-color:#c4b5fd;';
      addFilterBtn.dataset.editorWidget = '1';
      addFilterBtn.addEventListener('click', function () {
        var display = prompt('Tag display name:');
        if (!display || !display.trim()) return;
        var slug = prompt('Tag slug (for data-tags):', display.trim().toLowerCase().replace(/\s+/g, '-'));
        if (!slug || !slug.trim()) return;
        var newTag = document.createElement('span');
        newTag.className = 'tag';
        newTag.dataset.tag = slug.trim();
        newTag.textContent = display.trim();
        newTag.style.cursor = 'pointer';
        newTag.title = 'Click to remove from filters';
        newTag.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (confirm('Remove filter "' + newTag.textContent.trim() + '"?')) newTag.remove();
        });
        tagFilter.insertBefore(newTag, addFilterBtn);
      });
      tagFilter.appendChild(addFilterBtn);
    }

    // --- Essays index: data-tags on essay items ---
    document.querySelectorAll('.essay-item').forEach(function (item) {
      var tags = (item.dataset.tags || '').split(/\s+/).filter(Boolean);
      var container = document.createElement('div');
      container.style.cssText = 'margin-top:0.3rem;display:flex;flex-wrap:wrap;gap:0.3rem;';
      container.dataset.editorWidget = '1';

      function sync() {
        var current = [];
        container.querySelectorAll('.tag-inline:not([data-editor-widget])').forEach(function (p) {
          current.push(p.textContent.trim());
        });
        item.dataset.tags = current.join(' ');
      }

      tags.forEach(function (t) {
        var pill = document.createElement('span');
        pill.className = 'tag-inline';
        pill.textContent = t;
        pill.style.cursor = 'pointer';
        pill.title = 'Click to remove';
        pill.addEventListener('click', function () {
          if (confirm('Remove "' + t + '" from this essay?')) { pill.remove(); sync(); }
        });
        container.appendChild(pill);
      });

      var addBtn = createAddTagBtn(function () {
        var slug = prompt('Tag slug (e.g. "persona", "AI-minds"):');
        if (!slug || !slug.trim()) return;
        var pill = document.createElement('span');
        pill.className = 'tag-inline';
        pill.textContent = slug.trim();
        pill.style.cursor = 'pointer';
        pill.title = 'Click to remove';
        pill.addEventListener('click', function () {
          if (confirm('Remove "' + pill.textContent.trim() + '"?')) { pill.remove(); sync(); }
        });
        container.insertBefore(pill, addBtn);
        sync();
      });
      container.appendChild(addBtn);
      item.appendChild(container);
    });
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
        clone.querySelectorAll('[data-editor-widget]').forEach(function (el) {
          el.remove();
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
        label.textContent = e.message;
        label.style.color = '#f87171';
      }

      setTimeout(function () { btn.textContent = 'save'; btn.disabled = false; }, 2000);
    }

    initTagEditing();
    btn.addEventListener('click', save);
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
      // Ctrl+K: insert/edit link
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        var sel = window.getSelection();
        if (!sel.rangeCount || sel.isCollapsed) return;
        // Check if selection is already a link
        var anchor = sel.anchorNode.parentElement.closest('a');
        var url = prompt('URL:', anchor ? anchor.href : 'https://');
        if (url === null) return;
        if (url === '' && anchor) {
          // Empty URL = remove link
          var text = document.createTextNode(anchor.textContent);
          anchor.parentNode.replaceChild(text, anchor);
        } else if (url) {
          document.execCommand('createLink', false, url);
        }
      }
    });
  }

  init();
})();

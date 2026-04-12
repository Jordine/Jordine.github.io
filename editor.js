(function () {
  if (!location.search.includes('edit')) return;

  var REPO = 'Jordine/Jordine.github.io';
  var BRANCH = 'main';
  var fileSha = null;
  var originalRaw = null;
  var slashMenu = null;

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

  // ---- Link editing ----

  function doLinkEdit() {
    var sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return;
    var anchor = sel.anchorNode.parentElement.closest('a');
    var url = prompt('URL:', anchor ? anchor.href : 'https://');
    if (url === null) return;
    if (url === '' && anchor) {
      var text = document.createTextNode(anchor.textContent);
      anchor.parentNode.replaceChild(text, anchor);
    } else if (url) {
      document.execCommand('createLink', false, url);
    }
  }

  // ---- Tag editing ----

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

  // ---- Slash commands ----

  function showSlashMenu(block) {
    hideSlashMenu();
    var sel = window.getSelection();
    if (!sel.rangeCount) return;
    var rect = sel.getRangeAt(0).getBoundingClientRect();

    slashMenu = document.createElement('div');
    slashMenu.id = 'slash-menu';
    slashMenu.dataset.editorWidget = '1';
    slashMenu.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + (rect.bottom + 4) + 'px;background:#1a1a1a;border:1px solid #333;border-radius:4px;padding:0.25rem 0;z-index:10000;font-size:0.8rem;min-width:160px;';

    var items = [
      { label: 'Paragraph', tag: 'p' },
      { label: 'Heading 2', tag: 'h2' },
      { label: 'Heading 3', tag: 'h3' },
      { label: 'Blockquote', tag: 'blockquote' },
      { label: 'Code block', action: 'code' },
      { label: 'Horizontal rule', action: 'hr' },
    ];

    items.forEach(function (item) {
      var option = document.createElement('div');
      option.textContent = item.label;
      option.style.cssText = 'padding:0.3rem 0.75rem;cursor:pointer;color:#ccc;';
      option.addEventListener('mouseenter', function () { option.style.background = '#333'; });
      option.addEventListener('mouseleave', function () { option.style.background = 'none'; });
      option.addEventListener('mousedown', function (e) {
        e.preventDefault();
        block.textContent = '';
        if (item.action === 'code') {
          var pre = document.createElement('pre');
          var code = document.createElement('code');
          code.innerHTML = '<br>';
          pre.appendChild(code);
          block.replaceWith(pre);
          var r = document.createRange();
          r.setStart(code, 0);
          sel.removeAllRanges();
          sel.addRange(r);
        } else if (item.action === 'hr') {
          var hr = document.createElement('hr');
          var p = document.createElement('p');
          p.innerHTML = '<br>';
          block.replaceWith(hr);
          hr.after(p);
          var r = document.createRange();
          r.setStart(p, 0);
          sel.removeAllRanges();
          sel.addRange(r);
        } else {
          document.execCommand('formatBlock', false, '<' + item.tag + '>');
        }
        hideSlashMenu();
      });
      slashMenu.appendChild(option);
    });

    document.body.appendChild(slashMenu);
  }

  function hideSlashMenu() {
    if (slashMenu) { slashMenu.remove(); slashMenu = null; }
  }

  // ---- Main init ----

  async function init() {
    var token = getToken();
    if (!token) return;

    var filePath = getFilePath();

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

    var main = document.querySelector('main');
    var nav = main.querySelector('nav');
    var footer = main.querySelector('.footer');

    // Zone editing — whole main is editable
    main.contentEditable = 'true';
    main.dataset.editable = '1';
    if (nav) nav.contentEditable = 'false';
    if (footer) footer.contentEditable = 'false';

    // Protect media grid structure (cards editable individually)
    main.querySelectorAll('.media-grid').forEach(function (grid) {
      grid.contentEditable = 'false';
      grid.querySelectorAll('.media-card .info').forEach(function (info) {
        info.contentEditable = 'true';
      });
    });

    // Prevent link navigation in edit mode (except nav links)
    main.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (link && main.contains(link)) {
        if (nav && nav.contains(link)) return;
        e.preventDefault();
      }
    });

    // Make Enter produce <p> tags
    document.execCommand('defaultParagraphSeparator', false, 'p');

    // Enter after headings → new <p> instead of another heading
    main.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        var sel = window.getSelection();
        if (!sel.rangeCount) return;
        var node = sel.anchorNode;
        var block = (node.nodeType === 3 ? node.parentElement : node).closest('h1, h2, h3');
        if (block && main.contains(block)) {
          e.preventDefault();
          var p = document.createElement('p');
          p.innerHTML = '<br>';
          block.after(p);
          var r = document.createRange();
          r.setStart(p, 0);
          sel.removeAllRanges();
          sel.addRange(r);
        }
      }
    });

    // Slash command detection
    main.addEventListener('input', function () {
      var sel = window.getSelection();
      if (!sel.rangeCount) return;
      var node = sel.anchorNode;
      if (node.nodeType !== 3) { hideSlashMenu(); return; }
      var block = node.parentElement.closest('p, h1, h2, h3, div, li, blockquote');
      if (!block) { hideSlashMenu(); return; }
      if (block.textContent.trim() === '/') {
        showSlashMenu(block);
      } else {
        hideSlashMenu();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hideSlashMenu();
    });

    // Bottom padding so content isn't hidden behind bar
    document.body.style.paddingBottom = '3rem';

    // ---- Editor bar ----

    var bar = document.createElement('div');
    bar.id = 'editor-bar';
    bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#111;border-top:1px solid #222;padding:0.4rem 1rem;display:flex;align-items:center;gap:0.75rem;z-index:9999;font-family:"Helvetica Neue",sans-serif;font-size:0.8rem;';

    // Toolbar
    var toolbar = document.createElement('div');
    toolbar.style.cssText = 'display:flex;gap:0.2rem;align-items:center;';
    toolbar.dataset.editorWidget = '1';

    function addBtn(label, title, fn) {
      var b = document.createElement('button');
      b.textContent = label;
      b.title = title;
      b.style.cssText = 'background:#222;color:#ccc;border:1px solid #333;padding:0.2rem 0.45rem;border-radius:2px;cursor:pointer;font-size:0.75rem;min-width:1.8rem;';
      b.addEventListener('mousedown', function (e) {
        e.preventDefault();
        fn();
      });
      toolbar.appendChild(b);
    }

    function addSep() {
      var s = document.createElement('span');
      s.style.cssText = 'width:1px;height:1rem;background:#333;margin:0 0.15rem;';
      toolbar.appendChild(s);
    }

    addBtn('B', 'Bold (Ctrl+B)', function () { document.execCommand('bold'); });
    addBtn('I', 'Italic (Ctrl+I)', function () { document.execCommand('italic'); });
    addBtn('U', 'Underline (Ctrl+U)', function () { document.execCommand('underline'); });
    addSep();
    addBtn('H2', 'Heading 2 (Ctrl+Shift+2)', function () { document.execCommand('formatBlock', false, '<h2>'); });
    addBtn('H3', 'Heading 3 (Ctrl+Shift+3)', function () { document.execCommand('formatBlock', false, '<h3>'); });
    addBtn('P', 'Paragraph (Ctrl+Shift+0)', function () { document.execCommand('formatBlock', false, '<p>'); });
    addSep();
    addBtn('\u{1F517}', 'Link (Ctrl+K)', doLinkEdit);

    var label = document.createElement('span');
    label.textContent = 'ctrl+s save \u00b7 type / for blocks';
    label.style.cssText = 'color:#555;flex:1;text-align:right;';

    var saveBtn = document.createElement('button');
    saveBtn.textContent = 'save';
    saveBtn.style.cssText = 'background:#c4b5fd;color:#000;border:none;padding:0.35rem 1.2rem;border-radius:2px;cursor:pointer;font-size:0.8rem;letter-spacing:0.03em;';

    bar.appendChild(toolbar);
    bar.appendChild(label);
    bar.appendChild(saveBtn);
    document.body.appendChild(bar);

    // ---- Save ----

    async function save() {
      saveBtn.textContent = 'saving...';
      saveBtn.disabled = true;

      try {
        var clone = main.cloneNode(true);
        clone.removeAttribute('contenteditable');
        clone.removeAttribute('data-editable');
        clone.querySelectorAll('[contenteditable]').forEach(function (el) {
          el.removeAttribute('contenteditable');
        });
        clone.querySelectorAll('[data-editable]').forEach(function (el) {
          el.removeAttribute('data-editable');
        });
        clone.querySelectorAll('[data-editor-widget]').forEach(function (el) {
          el.remove();
        });
        clone.querySelectorAll('#slash-menu').forEach(function (el) {
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
          saveBtn.textContent = 'saved \u2713';
        } else {
          throw new Error(result.message);
        }
      } catch (e) {
        console.error('editor: save failed', e);
        saveBtn.textContent = 'error';
        label.textContent = e.message;
        label.style.color = '#f87171';
      }

      setTimeout(function () { saveBtn.textContent = 'save'; saveBtn.disabled = false; }, 2000);
    }

    initTagEditing();
    saveBtn.addEventListener('click', save);

    // ---- Keyboard shortcuts ----

    document.addEventListener('keydown', function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;

      switch (e.key) {
        case 's':
          e.preventDefault();
          save();
          return;
        case 'b':
          e.preventDefault();
          document.execCommand('bold');
          return;
        case 'i':
          e.preventDefault();
          document.execCommand('italic');
          return;
        case 'u':
          e.preventDefault();
          document.execCommand('underline');
          return;
        case 'k':
          e.preventDefault();
          doLinkEdit();
          return;
      }

      // Block type: Ctrl+Shift+2/3/0, delete block: Ctrl+Shift+D
      if (e.shiftKey) {
        var tag = null;
        switch (e.code) {
          case 'Digit2': tag = 'h2'; break;
          case 'Digit3': tag = 'h3'; break;
          case 'Digit0': tag = 'p'; break;
        }
        if (tag) {
          e.preventDefault();
          document.execCommand('formatBlock', false, '<' + tag + '>');
        }
        if (e.code === 'KeyD') {
          e.preventDefault();
          var sel = window.getSelection();
          if (!sel.rangeCount) return;
          var node = sel.anchorNode;
          var block = (node.nodeType === 3 ? node.parentElement : node).closest('p, h1, h2, h3, blockquote, pre, ul, ol, hr, table');
          if (block && main.contains(block) && block !== main) {
            var prev = block.previousElementSibling;
            block.remove();
            if (prev && prev.contentEditable !== 'false') {
              var r = document.createRange();
              r.selectNodeContents(prev);
              r.collapse(false);
              sel.removeAllRanges();
              sel.addRange(r);
            }
          }
        }
      }
    });
  }

  init();
})();

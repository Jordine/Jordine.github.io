/* Site background track — opt-in, persists across page navigations.
 *
 * A plain multi-page site reloads the whole document on every link click, which
 * destroys any <audio>. So we can't keep one element alive across pages. Instead
 * each page carries this tiny player and hands the baton through localStorage:
 * while playing we stash {on, t} (playing? + position); the next page reads it and
 * resumes from roughly where we left off. Never autoplays for a first-time visitor
 * — it only resumes once someone has clicked play. Toggle off and it stays off
 * across pages too.
 *
 * There is an unavoidable ~sub-second gap at each navigation (page load → seek →
 * resume), and some browsers block the resume until the next click if the visitor
 * hasn't built up "media engagement" on the site yet — in that case the button
 * pulses to invite one click. Both are inherent to a static multi-page site; the
 * only way to make it truly seamless would be to turn the site into a single-page
 * app (one shell that swaps content without reloading). Not worth it here.
 */
(function () {
  var KEY = 'jbtrack';
  var SRC = '/treats.mp3';
  var NAME = 'treats';

  function readState() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function writeState(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  var audio = new Audio(SRC);
  audio.loop = true;
  audio.preload = 'none';
  audio.volume = 0.7; // gentle default for a background track; tweak to taste

  var pendingSeek = null;
  audio.addEventListener('loadedmetadata', function () {
    if (pendingSeek != null && isFinite(audio.duration)) {
      try { audio.currentTime = Math.min(pendingSeek, Math.max(0, audio.duration - 0.2)); } catch (e) {}
      pendingSeek = null;
    }
  });

  // --- UI ---
  var style = document.createElement('style');
  style.textContent =
    '#jbtrack{position:fixed;right:14px;bottom:14px;z-index:9999;width:38px;height:38px;' +
    'border-radius:50%;border:1px solid #333;background:#111;color:#bbb;font-size:15px;' +
    'line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;' +
    'padding:0;transition:color .2s,border-color .2s,background .2s;font-family:inherit;}' +
    '#jbtrack:hover{color:#e8e8e8;border-color:#555;}' +
    '#jbtrack.on{color:#8a7fb8;border-color:#5a4f88;}' +
    '#jbtrack.on::after{content:"";position:absolute;width:38px;height:38px;border-radius:50%;' +
    'border:1px solid #5a4f88;animation:jbpulse 2.2s ease-out infinite;pointer-events:none;}' +
    '#jbtrack.blocked{animation:jbnudge 1s ease-in-out infinite;}' +
    '@keyframes jbpulse{0%{transform:scale(1);opacity:.5}100%{transform:scale(1.6);opacity:0}}' +
    '@keyframes jbnudge{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}' +
    '@media (prefers-reduced-motion:reduce){#jbtrack.on::after,#jbtrack.blocked{animation:none}}';
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.id = 'jbtrack';
  btn.type = 'button';
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(btn); });

  var playing = false;
  function paint() {
    btn.classList.toggle('on', playing);
    btn.textContent = playing ? '♪' : '♪'; // ♪
    btn.setAttribute('aria-label', playing ? 'pause the background track' : 'play the background track (' + NAME + ')');
    btn.title = btn.getAttribute('aria-label');
  }

  var lastSave = 0;
  function persist() {
    writeState({ on: playing, t: audio.currentTime || 0 });
  }
  audio.addEventListener('timeupdate', function () {
    var now = Date.now();
    if (playing && now - lastSave > 1000) { lastSave = now; persist(); }
  });
  window.addEventListener('pagehide', persist);

  function play() {
    var p = audio.play();
    if (p && p.then) {
      p.then(function () {
        playing = true; btn.classList.remove('blocked'); paint(); persist();
      }).catch(function () {
        // autoplay blocked on load — wait for a click
        btn.classList.add('blocked');
      });
    } else {
      playing = true; paint(); persist();
    }
  }
  function pause() {
    audio.pause(); playing = false; btn.classList.remove('blocked'); paint(); persist();
  }

  btn.addEventListener('click', function () { playing ? pause() : play(); });
  paint();

  // resume across navigation
  var s = readState();
  if (s.on) {
    pendingSeek = s.t || 0;
    play();
  }
})();

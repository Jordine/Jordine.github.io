/* Site background track — opt-in, persists across page navigations.
 *
 * A plain multi-page site reloads the whole document on every link click, which
 * destroys any <audio>. So we can't keep one element alive across pages. Instead
 * each page carries this tiny player and hands the baton through localStorage:
 * while playing we stash {on, t, track} (playing? + position + track index); the
 * next page reads it and resumes from roughly where we left off. Never autoplays
 * for a first-time visitor — it only resumes once someone has clicked play.
 * Toggle off and it stays off across pages too.
 */
(function () {
  var KEY = 'jbtrack';
  var TRACKS = [
    { src: '/treats.mp3', name: 'treats' },
    { src: '/dawn-of-life.mp3', name: 'Dawn of Life ~ Violet Crumblements' },
    { src: '/yoob-starways.mp3', name: 'yoob the starways' },
    { src: '/yime-stairways.mp3', name: 'yime the stairways' }
  ];

  function readState() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function writeState(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  var currentTrack = 0;
  var audio = new Audio(TRACKS[0].src);
  audio.loop = true;
  audio.preload = 'none';
  audio.volume = 0.7;

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
    '@media (prefers-reduced-motion:reduce){#jbtrack.on::after,#jbtrack.blocked{animation:none}}' +
    '#jbtrack-popup{position:fixed;right:60px;bottom:20px;z-index:9998;' +
    'font-size:0.8rem;color:#8a7fb8;opacity:0;transition:opacity 0.4s ease;pointer-events:none;' +
    'font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;white-space:nowrap;}' +
    '#jbtrack-popup.show{opacity:1;}' +
    '#jbtrack-menu{position:fixed;right:14px;bottom:60px;z-index:9998;' +
    'background:#111;border:1px solid #333;border-radius:4px;padding:0.25rem 0;' +
    'font-size:0.75rem;min-width:180px;display:none;}' +
    '#jbtrack-menu.open{display:block;}' +
    '#jbtrack-menu .track-item{padding:0.4rem 0.75rem;color:#888;cursor:pointer;' +
    'transition:background 0.15s,color 0.15s;}' +
    '#jbtrack-menu .track-item:hover{background:#1a1a1a;color:#ccc;}' +
    '#jbtrack-menu .track-item.active{color:#8a7fb8;}' +
    '#jbtrack-menu .track-item.active::before{content:"♪ ";}'
  ;
  document.head.appendChild(style);

  var popup = document.createElement('div');
  popup.id = 'jbtrack-popup';
  popup.textContent = '♪ ~ ' + TRACKS[0].name + '.mp3';

  var menu = document.createElement('div');
  menu.id = 'jbtrack-menu';
  TRACKS.forEach(function(track, i) {
    var item = document.createElement('div');
    item.className = 'track-item' + (i === 0 ? ' active' : '');
    item.textContent = track.name;
    item.dataset.index = i;
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      selectTrack(parseInt(this.dataset.index));
      menu.classList.remove('open');
    });
    menu.appendChild(item);
  });

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(popup);
    document.body.appendChild(menu);
  });

  var popupTimeout = null;
  function showPopup() {
    popup.textContent = '♪ ~ ' + TRACKS[currentTrack].name + '.mp3';
    popup.classList.add('show');
    if (popupTimeout) clearTimeout(popupTimeout);
    popupTimeout = setTimeout(function () { popup.classList.remove('show'); }, 3000);
  }

  var btn = document.createElement('button');
  btn.id = 'jbtrack';
  btn.type = 'button';
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(btn); });

  var playing = false;
  function paint() {
    btn.classList.toggle('on', playing);
    btn.textContent = '♪';
    btn.setAttribute('aria-label', playing ? 'pause the background track' : 'play the background track (' + TRACKS[currentTrack].name + ')');
    btn.title = btn.getAttribute('aria-label');
    // Update menu active state
    var items = menu.querySelectorAll('.track-item');
    items.forEach(function(item, i) {
      item.classList.toggle('active', i === currentTrack);
    });
  }

  function selectTrack(index) {
    if (index === currentTrack && playing) return;
    var wasPlaying = playing;
    if (playing) {
      audio.pause();
      playing = false;
    }
    currentTrack = index;
    audio.src = TRACKS[index].src;
    audio.load();
    if (wasPlaying) {
      play();
    }
    paint();
    persist();
  }

  var lastSave = 0;
  function persist() {
    writeState({ on: playing, t: audio.currentTime || 0, track: currentTrack });
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
        playing = true; btn.classList.remove('blocked'); paint(); persist(); showPopup();
      }).catch(function () {
        btn.classList.add('blocked');
      });
    } else {
      playing = true; paint(); persist(); showPopup();
    }
  }
  function pause() {
    audio.pause(); playing = false; btn.classList.remove('blocked'); paint(); persist();
  }

  // Click to play/pause, right-click for track menu
  btn.addEventListener('click', function () { playing ? pause() : play(); });
  btn.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    menu.classList.toggle('open');
  });

  // Close menu when clicking elsewhere
  document.addEventListener('click', function (e) {
    if (!menu.contains(e.target) && e.target !== btn) {
      menu.classList.remove('open');
    }
  });

  paint();

  // resume across navigation
  var s = readState();
  if (typeof s.track === 'number' && s.track >= 0 && s.track < TRACKS.length) {
    currentTrack = s.track;
    audio.src = TRACKS[currentTrack].src;
    paint();
  }
  if (s.on) {
    pendingSeek = s.t || 0;
    play();
  }
})();

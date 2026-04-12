// Randomly pick a creature, then load oneko.js with that sprite
(function() {
  var sprites = ["/oneko.gif", "/rivulet.gif", "/clawd.gif"];
  var pick = sprites[Math.floor(Math.random() * sprites.length)];
  var s = document.createElement("script");
  s.src = "/oneko.js";
  s.dataset.cat = pick;
  document.body.appendChild(s);

  // Load inline editor when ?edit is in URL
  if (location.search.includes('edit')) {
    var e = document.createElement("script");
    e.src = "/editor.js";
    document.body.appendChild(e);
  }
})();

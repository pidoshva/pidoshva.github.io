// GitHub profile sync — updates hero name and bio from API
(function () {
  var CACHE_KEY = 'geleus_profile';
  var CACHE_TTL = 3600000; // 1 hour
  var API_URL = 'https://api.github.com/users/pidoshva';

  function getCached() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts > CACHE_TTL) return null;
      return parsed.data;
    } catch (e) { return null; }
  }

  function setCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: data, ts: Date.now() }));
    } catch (e) { /* ignore */ }
  }

  function update(profile) {
    if (profile.name) {
      var h1 = document.querySelector('.hero h1');
      if (h1) h1.textContent = profile.name;
    }
    if (profile.bio) {
      var bio = document.querySelector('.hero .bio');
      if (bio) bio.textContent = profile.bio;
    }
  }

  function init() {
    var cached = getCached();
    if (cached) update(cached);

    fetch(API_URL)
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (profile) {
        setCache(profile);
        update(profile);
      })
      .catch(function () { /* hardcoded HTML stays as fallback */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

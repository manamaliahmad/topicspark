/* TopicSpark v1.2.0 — popup logic: Gemini watches the FULL YouTube video
   (visuals + audio) via fileData and returns 4 next-video topics.
   MODEL PICKER: the model dropdown is filled LIVE from Google's models.list
   endpoint using the user's own key, filtered to generateContent-capable
   models — so retired models (e.g. ones Google discontinued) never appear.
   Key lives in chrome.storage.local (this device only) and is sent ONLY to
   the Google Gemini API, via the x-goog-api-key header. Output is English only. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var DEF = {
    apiKey: '',
    apiBase: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: ''
  };
  var CUSTOM = '__custom__';

  var statusEl = $('status'), resultsEl = $('results'), actionsEl = $('actions');
  var lastTopics = [];

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.className = kind || '';
  }
  function apiBase() {
    return $('apiBase').value.trim() || DEF.apiBase;
  }
  function currentModel() {
    var sel = $('modelSelect');
    if (sel.value === CUSTOM) return $('customModel').value.trim();
    return sel.value;
  }
  function saveSettings() {
    chrome.storage.local.set({
      apiKey: $('apiKey').value.trim(),
      apiBase: apiBase(),
      model: currentModel()
    });
  }
  function addOption(sel, value, text) {
    var o = document.createElement('option');
    o.value = value; o.textContent = text; sel.appendChild(o);
  }
  function onModelChange() {
    var isCustom = $('modelSelect').value === CUSTOM;
    $('customModel').style.display = isCustom ? 'block' : 'none';
    if (!isCustom) saveSettings();
  }

  /* Fill the dropdown from Google's live model list. Returns true on success. */
  async function loadModels(showStatus) {
    var key = $('apiKey').value.trim();
    var sel = $('modelSelect');
    if (!key) {
      sel.innerHTML = '';
      addOption(sel, '', 'Add your API key first, then press Refresh');
      sel.disabled = true;
      $('customModel').style.display = 'none';
      return false;
    }
    if (showStatus) setStatus('Loading available models from Google…');
    try {
      var res = await fetch(apiBase().replace(/\/$/, '') + '?pageSize=100', {
        headers: { 'x-goog-api-key': key }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      var ids = [];
      (data.models || []).forEach(function (m) {
        var methods = m.supportedGenerationMethods || [];
        if (methods.indexOf('generateContent') === -1) return;
        var id = (m.name || '').replace(/^models\//, '');
        if (id && ids.indexOf(id) === -1) ids.push(id);
      });
      if (!ids.length) throw new Error('no usable models returned');
      ids.sort(function (a, b) {
        var fa = a.indexOf('flash') !== -1 ? 0 : 1;
        var fb = b.indexOf('flash') !== -1 ? 0 : 1;
        if (fa !== fb) return fa - fb;
        return a < b ? -1 : (a > b ? 1 : 0);
      });
      var saved = sel.dataset.saved || '';
      sel.innerHTML = '';
      ids.forEach(function (id) { addOption(sel, id, id); });
      addOption(sel, CUSTOM, 'Other (type manually)…');
      sel.disabled = false;
      if (saved && ids.indexOf(saved) !== -1) sel.value = saved;
      else { sel.value = ids[0]; saveSettings(); }
      onModelChange();
      if (showStatus) setStatus('Models loaded — retired models never appear here.', 'ok');
      return true;
    } catch (err) {
      if (showStatus) setStatus('Could not load models (' + err.message + '). Check your key, then press Refresh.', 'err');
      return false;
    }
  }

  /* Init: restore settings, seed the dropdown with the saved model, then
     silently refresh the live list (so a retired saved model is replaced). */
  chrome.storage.local.get(DEF, function (items) {
    $('apiKey').value = items.apiKey || '';
    $('apiBase').value = items.apiBase || DEF.apiBase;
    var sel = $('modelSelect');
    if (items.model) {
      sel.dataset.saved = items.model;
      sel.innerHTML = '';
      addOption(sel, items.model, items.model);
      addOption(sel, CUSTOM, 'Other (type manually)…');
      sel.value = items.model;
    } else {
      sel.innerHTML = '';
      addOption(sel, '', 'Add your API key first, then press Refresh');
      sel.disabled = true;
    }
    if (items.apiKey) loadModels(false);
  });

  $('apiKey').addEventListener('change', function () { saveSettings(); loadModels(false); });
  $('apiBase').addEventListener('change', saveSettings);
  $('modelSelect').addEventListener('change', onModelChange);
  $('customModel').addEventListener('change', saveSettings);
  $('refreshBtn').addEventListener('click', function () { saveSettings(); loadModels(true); });

  function extractVideoId(url) {
    try {
      var u = new URL(url.trim());
      if (u.hostname === 'youtu.be') {
        return u.pathname.slice(1).split('/')[0].split('?')[0] || null;
      }
      if (u.hostname.indexOf('youtube.com') !== -1 || u.hostname.indexOf('music.youtube.com') !== -1) {
        var v = u.searchParams.get('v');
        if (v) return v;
        var m = u.pathname.match(/\/(shorts|embed|live|v)\/([^/?#]+)/);
        if (m) return m[2];
      }
    } catch (e) { /* invalid URL */ }
    return null;
  }

  var PROMPT = 'You are a YouTube growth strategist. Watch this full video carefully '
    + '— visuals, audio, pacing, editing style, and what the audience responds to. '
    + 'Based on everything in the video, suggest exactly 4 best topics for the creator\'s '
    + 'NEXT videos. Each topic: a catchy title, a one-sentence unique angle, and a '
    + 'one-sentence hook explaining why viewers will click. '
    + 'IMPORTANT LANGUAGE RULE: Respond in English ONLY. Even if the video is in Urdu, '
    + 'Hindi, Roman Urdu, or any other language, your entire output must be in English. '
    + 'Never output Roman Urdu, never mix languages. Return JSON only.';

  async function askGemini(base, key, model, watchUrl) {
    var url = base.replace(/\/$/, '') + '/' + model + ':generateContent';
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{
          parts: [
            { fileData: { mimeType: 'video/mp4', fileUri: watchUrl } },
            { text: PROMPT }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                angle: { type: 'STRING' },
                hook: { type: 'STRING' }
              },
              required: ['title', 'angle', 'hook']
            }
          }
        }
      })
    });
    if (!res.ok) {
      var msg = 'Gemini error ' + res.status;
      try {
        var e = await res.json();
        if (e.error && e.error.message) msg += ': ' + e.error.message;
      } catch (err) { /* keep status */ }
      if (res.status === 404) {
        msg += ' (This model is retired. Press Refresh to load the current model list and pick a live model.)';
      } else if (res.status === 400) {
        msg += ' (Gemini may not be able to access this video — it could be private, age-restricted, or unavailable. Try a public video.)';
      }
      throw new Error(msg);
    }
    var data = await res.json();
    var text = (data.candidates && data.candidates[0] && data.candidates[0].content
      && data.candidates[0].content.parts && data.candidates[0].content.parts[0]
      && data.candidates[0].content.parts[0].text) || '';
    return text;
  }

  function parseTopics(raw) {
    var t = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    try {
      var arr = JSON.parse(t);
      if (Array.isArray(arr)) {
        return arr.map(function (it) {
          return {
            title: it.title || it.topic || it.name || 'Untitled topic',
            angle: it.angle || it.why || it.description || '',
            hook: it.hook || it.reason || ''
          };
        });
      }
    } catch (e) { /* fall through to raw display */ }
    return null;
  }

  function copyText(text, btn) {
    function done() {
      if (btn) { var old = btn.textContent; btn.textContent = 'Copied!'; setTimeout(function () { btn.textContent = old; }, 1200); }
    }
    if (navigator.clipboard) { navigator.clipboard.writeText(text).then(done).catch(function () { fallback(); }); }
    else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      ta.remove(); done();
    }
  }

  function renderTopics(topics) {
    lastTopics = topics;
    resultsEl.innerHTML = '';
    topics.forEach(function (t, i) {
      var card = document.createElement('div');
      card.className = 'card';
      var h = document.createElement('h3');
      h.textContent = (i + 1) + '. ' + t.title;
      card.appendChild(h);
      if (t.angle) { var p1 = document.createElement('p'); p1.textContent = t.angle; card.appendChild(p1); }
      if (t.hook) { var p2 = document.createElement('p'); p2.className = 'hook'; p2.textContent = 'Hook: ' + t.hook; card.appendChild(p2); }
      var tools = document.createElement('div');
      tools.className = 'tools';
      var b = document.createElement('button');
      b.className = 'small'; b.textContent = 'Copy topic';
      b.addEventListener('click', function () {
        copyText(t.title + (t.angle ? '\n' + t.angle : '') + (t.hook ? '\nHook: ' + t.hook : ''), b);
      });
      tools.appendChild(b);
      card.appendChild(tools);
      resultsEl.appendChild(card);
    });
    actionsEl.style.display = 'flex';
  }

  $('copyAllBtn').addEventListener('click', function () {
    var all = lastTopics.map(function (t, i) {
      return (i + 1) + '. ' + t.title + (t.angle ? '\n   ' + t.angle : '') + (t.hook ? '\n   Hook: ' + t.hook : '');
    }).join('\n\n');
    copyText(all, $('copyAllBtn'));
  });

  $('extractBtn').addEventListener('click', async function () {
    var btn = $('extractBtn');
    var key = $('apiKey').value.trim();
    var base = apiBase();
    var model = currentModel();
    var url = $('ytUrl').value.trim();
    resultsEl.innerHTML = '';
    actionsEl.style.display = 'none';
    lastTopics = [];

    var videoId = extractVideoId(url);
    if (!videoId) { setStatus('Please paste a valid YouTube URL.', 'err'); return; }
    if (!key) { setStatus('Please add your Gemini API key first. It stays on this device only.', 'err'); return; }
    if (!model) { setStatus('Choose a model first — press Refresh to load the live list from Google.', 'err'); return; }
    saveSettings();
    btn.disabled = true;

    try {
      setStatus('Sending the full video to Gemini (' + model + ')… (watching visuals + audio, English output)');
      var watchUrl = 'https://www.youtube.com/watch?v=' + videoId;
      var raw = await askGemini(base, key, model, watchUrl);
      var topics = parseTopics(raw);
      if (topics && topics.length) {
        renderTopics(topics.slice(0, 4));
        setStatus('Done — 4 topics ready, in English.', 'ok');
      } else {
        var pre = document.createElement('pre');
        pre.className = 'raw';
        pre.textContent = raw || '(empty Gemini response)';
        resultsEl.appendChild(pre);
        setStatus('Gemini did not return JSON — raw answer shown below.', 'ok');
      }
    } catch (err) {
      setStatus(err.message || 'Something went wrong. Check your key and model.', 'err');
    } finally {
      btn.disabled = false;
    }
  });
})();

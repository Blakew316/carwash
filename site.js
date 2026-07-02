/* ShopConnect Pro — site interactivity */
(function () {
  'use strict';

  /* ---------- Footer year + status dot ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
  document.querySelectorAll('[data-status-dot]').forEach(function (el) {
    el.style.background = '#22c55e';
  });

  /* ---------- Mobile nav drawer ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var drawer = document.getElementById('nav-drawer');
  if (toggle && drawer) {
    toggle.addEventListener('click', function () {
      var open = drawer.getAttribute('data-open') === 'true';
      drawer.hidden = open;
      drawer.setAttribute('data-open', String(!open));
      toggle.setAttribute('aria-expanded', String(!open));
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        drawer.hidden = true;
        drawer.setAttribute('data-open', 'false');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
  document.querySelectorAll('.reveal:not(.in)').forEach(function (el) { io.observe(el); });

  /* ---------- Calculator ---------- */
  var PLATFORMS = window.SC_PLATFORMS || [];
  // Known bundled-processor rates (%). Anything else falls back by tier.
  var KNOWN_RATES = {
    'Jobber': 2.90, 'Clio': 2.95, 'HoneyBook': 3.40, 'Housecall Pro': 2.99,
    'QuickBooks Online': 2.99, 'ServiceTitan': 2.90, 'Mindbody': 2.75,
    'Vagaro': 2.75, 'Tekmetric': 2.99, 'FreshBooks': 2.90, 'Odoo': 2.90,
    'Roofr': 3.10, 'SimplePractice': 3.15, 'Fresha': 2.79, 'Wave': 2.90
  };
  var TIER_DEFAULT_RATE = { 1: 2.90, 2: 3.05, 3: 3.20 };
  var TIER_LABEL = { 1: 'Tier 1 · Full integration', 2: 'Tier 2 · Supported', 3: 'Tier 3 · Expansion' };

  var calc = document.querySelector('[data-calc]');
  if (calc) {
    var vol = 30000;
    var platform = { name: 'Jobber', cat: 'Field Service', tier: 1 };

    var slider = calc.querySelector('[data-calc-vol]');
    var volOut = calc.querySelector('[data-calc-vol-out]');
    var tierOut = calc.querySelector('[data-calc-tier-out]');
    var currentRateOut = calc.querySelector('[data-calc-current-rate]');
    var oldOut = calc.querySelector('[data-calc-old]');
    var oldOut2 = calc.querySelector('[data-calc-old-out]');
    var contextOut = calc.querySelector('[data-calc-context]');
    var s30 = calc.querySelector('[data-calc-savings-30]');
    var s100 = calc.querySelector('[data-calc-savings-100]');
    var a30 = calc.querySelector('[data-calc-annual-30]');
    var a100 = calc.querySelector('[data-calc-annual-100]');

    var money = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };

    var rateFor = function (p) { return KNOWN_RATES[p.name] || TIER_DEFAULT_RATE[p.tier] || 3.1; };

    var update = function () {
      var rate = rateFor(platform);
      var old = vol * rate / 100;
      if (volOut) volOut.textContent = money(vol);
      if (slider) slider.style.setProperty('--fill', ((vol - slider.min) / (slider.max - slider.min) * 100) + '%');
      if (tierOut) tierOut.textContent = TIER_LABEL[platform.tier] || TIER_LABEL[3];
      if (currentRateOut) currentRateOut.textContent = rate.toFixed(2) + '% via ' + platform.name;
      if (oldOut) oldOut.textContent = money(old);
      if (oldOut2) oldOut2.textContent = money(old) + '/mo';
      if (contextOut) contextOut.textContent = 'via your current ' + platform.name + ' rate';
      if (s30) s30.textContent = money(old * 0.3);
      if (a30) a30.textContent = money(old * 0.3 * 12) + '/yr';
      if (s100) s100.textContent = money(old);
      if (a100) a100.textContent = money(old * 12) + '/yr';
      // Hidden lead-form fields
      var set = function (sel, val) {
        var el = document.querySelector(sel);
        if (el) el.value = val;
      };
      set('[data-calc-hidden-platform]', platform.name + ' (Tier ' + platform.tier + ')');
      set('[data-calc-hidden-vol]', money(vol) + '/mo');
      set('[data-calc-hidden-rate]', rate.toFixed(2) + '%');
      set('[data-calc-hidden-loss]', money(old) + '/mo');
      set('[data-calc-hidden-r30]', money(old * 0.3) + '/mo');
      set('[data-calc-hidden-r100]', money(old) + '/mo');
      // Quick chip active state
      calc.querySelectorAll('[data-quick-pick]').forEach(function (chip) {
        chip.classList.toggle('active', chip.getAttribute('data-quick-pick') === platform.name);
      });
    };

    var setPlatform = function (name) {
      var row = PLATFORMS.find(function (p) { return p[0].toLowerCase() === name.toLowerCase(); });
      platform = row ? { name: row[0], cat: row[1], tier: row[2] } : { name: name, cat: '', tier: 3 };
      update();
    };

    if (slider) {
      vol = parseInt(slider.value, 10) || 30000;
      slider.addEventListener('input', function () {
        vol = parseInt(slider.value, 10) || 0;
        update();
      });
    }
    calc.querySelectorAll('[data-quick-pick]').forEach(function (chip) {
      chip.addEventListener('click', function () { setPlatform(chip.getAttribute('data-quick-pick')); });
    });

    /* Platform search */
    var search = calc.querySelector('[data-calc-search]');
    var input = calc.querySelector('[data-calc-platform-search]');
    var clearBtn = calc.querySelector('[data-calc-clear]');
    var list = calc.querySelector('[data-calc-list]');
    if (input && list) {
      var renderList = function (q) {
        var ql = q.trim().toLowerCase();
        var matches = PLATFORMS.filter(function (p) {
          return !ql || p[0].toLowerCase().indexOf(ql) !== -1 || p[1].toLowerCase().indexOf(ql) !== -1;
        }).slice(0, 40);
        list.innerHTML = '';
        if (!matches.length) {
          var li = document.createElement('li');
          li.innerHTML = '<span>No match — <strong>tell us and we’ll bridge it</strong></span>';
          li.addEventListener('click', function () { window.location.href = 'contact.html'; });
          list.appendChild(li);
        }
        matches.forEach(function (p) {
          var li = document.createElement('li');
          li.setAttribute('role', 'option');
          li.innerHTML = '<span>' + p[0] + ' <span class="cat">· ' + p[1] + '</span></span>' +
            '<span class="tier-tag' + (p[2] === 1 ? ' t1' : '') + '">Tier ' + p[2] + '</span>';
          li.addEventListener('click', function () {
            setPlatform(p[0]);
            input.value = p[0];
            search.classList.add('has-value');
            list.hidden = true;
          });
          list.appendChild(li);
        });
        list.hidden = false;
      };
      input.addEventListener('input', function () {
        search.classList.toggle('has-value', !!input.value);
        renderList(input.value);
      });
      input.addEventListener('focus', function () { renderList(input.value); });
      document.addEventListener('click', function (e) {
        if (!search.contains(e.target)) list.hidden = true;
      });
      if (clearBtn) clearBtn.addEventListener('click', function () {
        input.value = '';
        search.classList.remove('has-value');
        list.hidden = true;
        input.focus();
      });
    }

    /* Info modal */
    var modal = document.querySelector('[data-calc-info-modal]');
    if (modal) {
      var openModal = function () {
        modal.hidden = false;
        var dialog = modal.querySelector('.calc-info-dialog');
        if (dialog) dialog.focus();
      };
      var closeModal = function () { modal.hidden = true; };
      document.querySelectorAll('[data-calc-info-toggle]').forEach(function (b) {
        b.addEventListener('click', openModal);
      });
      modal.querySelectorAll('[data-calc-info-close]').forEach(function (b) {
        b.addEventListener('click', closeModal);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !modal.hidden) closeModal();
      });
    }

    /* Share */
    var shareBtn = document.querySelector('[data-calc-share]');
    if (shareBtn) {
      var shareLabel = shareBtn.querySelector('[data-calc-share-label]');
      shareBtn.addEventListener('click', function () {
        var rate = rateFor(platform);
        var url = location.origin + location.pathname + '#calc';
        var text = 'I’m paying about ' + money(vol * rate / 100) + '/mo in card fees via ' +
          platform.name + '. ShopConnect Pro would recover ' + money(vol * rate / 100 * 0.3) +
          '–' + money(vol * rate / 100) + '/mo. ' + url;
        var done = function () {
          if (shareLabel) {
            shareLabel.textContent = 'Copied ✓';
            setTimeout(function () { shareLabel.textContent = 'Share this estimate'; }, 2200);
          }
        };
        if (navigator.share) {
          navigator.share({ title: 'ShopConnect Pro estimate', text: text, url: url }).catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(done).catch(function () {});
        }
      });
    }

    /* Lead form (Formspree AJAX) */
    var lead = document.getElementById('calc-lead');
    if (lead) {
      lead.addEventListener('submit', function (e) {
        e.preventDefault();
        var ok = lead.querySelector('.calc-lead-success');
        var err = lead.querySelector('.calc-lead-error');
        var btn = lead.querySelector('[data-calc-lead-btn]');
        if (btn) btn.disabled = true;
        fetch(lead.action, {
          method: 'POST',
          body: new FormData(lead),
          headers: { Accept: 'application/json' }
        }).then(function (res) {
          if (ok) ok.style.display = res.ok ? 'block' : 'none';
          if (err) err.style.display = res.ok ? 'none' : 'block';
        }).catch(function () {
          if (err) err.style.display = 'block';
        }).finally(function () {
          if (btn) btn.disabled = false;
        });
      });
    }

    update();
  }

  /* ---------- Hero demo animation ---------- */
  var demo = document.querySelector('.scp-demo');
  if (demo) {
    var cursor = document.getElementById('scp-cursor');
    var extbtn = document.getElementById('scp-extbtn');
    var panelSub = document.getElementById('scp-panel-sub');
    var readRows = demo.querySelectorAll('.scp-read-row');
    var sendBtn = document.getElementById('scp-send');
    var successFull = document.getElementById('scp-success-full');
    var receiptModal = document.getElementById('scp-receipt-modal');
    var invStatus = document.getElementById('scp-inv-status');
    var pill = invStatus ? invStatus.querySelector('.scp-pill') : null;

    var moveTo = function (el) {
      if (!cursor || !el) return;
      var d = demo.getBoundingClientRect();
      var r = el.getBoundingClientRect();
      cursor.style.left = (r.left - d.left + r.width / 2 - 4) + 'px';
      cursor.style.top = (r.top - d.top + r.height / 2 - 2) + 'px';
    };
    var click = function () {
      if (!cursor) return;
      cursor.classList.add('click');
      setTimeout(function () { cursor.classList.remove('click'); }, 180);
    };

    var reset = function () {
      readRows.forEach(function (r) { r.classList.remove('on'); });
      if (panelSub) panelSub.textContent = 'Reading invoice…';
      if (extbtn) extbtn.classList.remove('lit');
      if (sendBtn) sendBtn.classList.remove('pressed');
      if (successFull) successFull.classList.remove('show');
      if (receiptModal) { receiptModal.classList.remove('show'); receiptModal.setAttribute('aria-hidden', 'true'); }
      if (pill) { pill.textContent = 'Outstanding'; pill.className = 'scp-pill outstanding'; }
    };

    var play = function () {
      reset();
      moveTo(extbtn);
      setTimeout(function () { click(); if (extbtn) extbtn.classList.add('lit'); }, 1000);
      readRows.forEach(function (row, i) {
        setTimeout(function () { row.classList.add('on'); }, 1500 + i * 420);
      });
      setTimeout(function () { if (panelSub) panelSub.textContent = 'Ready to charge'; }, 3000);
      setTimeout(function () { moveTo(sendBtn); }, 3200);
      setTimeout(function () {
        click();
        if (sendBtn) sendBtn.classList.add('pressed');
      }, 4300);
      setTimeout(function () {
        if (successFull) successFull.classList.add('show');
        if (panelSub) panelSub.textContent = 'Synced to software';
      }, 4900);
      setTimeout(function () {
        if (pill) { pill.textContent = 'Paid'; pill.className = 'scp-pill paid'; }
        if (receiptModal) { receiptModal.classList.add('show'); receiptModal.setAttribute('aria-hidden', 'false'); }
      }, 5600);
      setTimeout(play, 9500);
    };

    var demoIO = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        demoIO.disconnect();
        setTimeout(play, 600);
      }
    }, { threshold: 0.3 });
    demoIO.observe(demo);
  }
})();

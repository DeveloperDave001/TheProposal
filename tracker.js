/*
  IKD 2026 Christmas Carol — card 10 renderer
  Loads performance data from the backend (/api/status) and renders the
  report-based tracking section. If the API is unreachable (e.g. opening the
  file directly) it falls back to bundled defaults so the static page still works.
*/

(function () {
  "use strict";

  var DEFAULT_DATA = {
    units: [
      { code: "UNIT A.01", name: "CCW", sub: "The Central Coordinating Wing",
        assignments: [ { name: "General Oversight", pct: 90 }, { name: "Resource Allocation", pct: 75 }, { name: "Strategic Planning", pct: 85 } ] },
      { code: "UNIT A.02", name: "Celeb Teen", sub: "Youth & Creativity",
        assignments: [ { name: "Youth Performance", pct: 60 }, { name: "Creative Content", pct: 45 }, { name: "Youth Engagement", pct: 55 } ] },
      { code: "UNIT A.03", name: "Ambience", sub: "Atmosphere & Design",
        assignments: [ { name: "Venue Decoration", pct: 70 }, { name: "Lighting Setup", pct: 40 }, { name: "Stage Design", pct: 55 } ] },
      { code: "UNIT A.04", name: "Sound Department", sub: "Audio Excellence",
        assignments: [ { name: "Audio Mixing", pct: 80 }, { name: "Equipment Setup", pct: 85 }, { name: "Technical Support", pct: 70 } ] },
      { code: "UNIT A.05", name: "Comms Department", sub: "Internal Coordination",
        assignments: [ { name: "Internal Coordination", pct: 30 }, { name: "Event Communication", pct: 35 }, { name: "Information Desk", pct: 20 } ] },
      { code: "UNIT A.06", name: "Social Media Department", sub: "Online Amplification",
        assignments: [ { name: "Content Creation", pct: 85 }, { name: "Live Coverage", pct: 25 }, { name: "Community Engagement", pct: 60 } ] }
    ],
    reports: [
      { id: 1, department: "CCW", reporter: "Grace A.", date: "02.08.26", time: "09:20:15 AM",
        description: "Contingency plan ratified for the main auditorium." },
      { id: 2, department: "Celeb Teen", reporter: "Joshua E.", date: "02.08.26", time: "10:12:08 AM",
        description: "Rehearsal schedule confirmed with the drama lead." },
      { id: 3, department: "Ambience", reporter: "David O.", date: "02.08.26", time: "11:34:52 AM",
        description: "Decor palette approved; stage build starts next week." },
      { id: 4, department: "Sound Department", reporter: "Michael T.", date: "02.08.26", time: "12:05:37 PM",
        description: "PA system audited; two spare microphones ordered." },
      { id: 5, department: "Comms Department", reporter: "Blessing N.", date: "02.08.26", time: "08:41:20 AM",
        description: "Radio channel plan drafted for event day." },
      { id: 6, department: "Social Media Department", reporter: "Emmanuel K.", date: "02.08.26", time: "11:58:44 AM",
        description: "First promo teaser published across all platforms." }
    ]
  };

  var listEl = document.querySelector(".track-list");
  var masterEl = document.querySelector(".track-master");
  if (!listEl || !masterEl) return;

  var lastJSON = "";
  var scrollTop = 0;

  function avg(pcts) {
    if (!pcts.length) return 0;
    return Math.round(pcts.reduce(function (a, b) { return a + b; }, 0) / pcts.length);
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* seconds of day from "HH:MM:SS AM/PM" */
  function timeKey(t) {
    if (!t) return 0;
    var m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(String(t).trim());
    if (!m) return 0;
    var h = parseInt(m[1], 10) % 12;
    if (/pm/i.test(m[4] || "")) h += 12;
    return h * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3] || 0, 10);
  }

  function fmt12(secs) {
    secs = ((secs % 86400) + 86400) % 86400;
    var h = Math.floor(secs / 3600) % 12; if (h === 0) h = 12;
    var m = Math.floor((secs % 3600) / 60);
    var s = secs % 60;
    return pad(h) + ":" + pad(m) + ":" + pad(s) + (secs < 43200 ? " AM" : " PM");
  }

  function chip(av) {
    if (av >= 85) return ["COMPLETE", "chip-done"];
    if (av >= 60) return ["ON TRACK", "chip-on"];
    if (av >= 35) return ["IN PROGRESS", "chip-wip"];
    return ["AT RISK", "chip-risk"];
  }

  /* sorts DD.MM.YY descending, then 12-hour time descending */
  function sortReports(reports) {
    function key(r) {
      var parts = String(r.date || "").split(".");
      if (parts.length !== 3) return 0;
      var num = parts[2] * 10000 + parts[1] * 100 + parts[0] * 1;
      return isNaN(num) ? 0 : num;
    }
    return reports.slice().sort(function (a, b) {
      var d = key(b) - key(a);
      if (d !== 0) return d;
      return timeKey(b.time) - timeKey(a.time);
    });
  }

  function reportsFor(units, name) {
    return (units.reports || []).filter(function (r) { return r.department === name; });
  }

  function masterCells(data) {
    var overall = avg(data.units.map(function (u) {
      return avg(u.assignments.map(function (a) { return a.pct; }));
    }));
    var sorted = sortReports(data.reports || []);
    var latest = sorted[0];

    var cells = [
      { label: "Overall Readiness", value: overall + "%", bar: overall },
      { label: "Reports Filed", value: String((data.reports || []).length).padStart(2, "0"), bar: null },
      { label: "Last Update", value: latest ? (latest.date + " · " + latest.time) : "—", bar: null,
        timeBase: latest ? timeKey(latest.time) : null, timeDate: latest ? latest.date : null }
    ];

    var frag = document.createDocumentFragment();
    cells.forEach(function (c) {
      var cell = document.createElement("div");
      cell.className = "master-cell";
      var label = document.createElement("span");
      label.className = "master-label";
      label.textContent = c.label;
      var value = document.createElement("span");
      value.className = "master-value";
      value.textContent = c.value;
      if (c.timeBase !== null && c.timeBase !== undefined) {
        value.setAttribute("data-time-base", c.timeBase);
        value.setAttribute("data-time-epoch", String(Date.now()));
        value.setAttribute("data-time-date", c.timeDate || "");
      }
      cell.appendChild(label);
      cell.appendChild(value);
      if (c.bar !== null) {
        var bar = document.createElement("div");
        bar.className = "master-bar";
        var fill = document.createElement("i");
        fill.style.width = c.bar + "%";
        bar.appendChild(fill);
        cell.appendChild(bar);
      }
      frag.appendChild(cell);
    });
    masterEl.textContent = "";
    masterEl.appendChild(frag);
  }

  function rowEl(data, u) {
    var row = document.createElement("article");
    row.className = "track-row";

    var head = document.createElement("header");
    head.className = "track-row-head";

    var code = document.createElement("span");
    code.className = "track-code";
    code.textContent = u.code;

    var h3 = document.createElement("h3");
    h3.textContent = u.name;
    if (u.sub) {
      var em = document.createElement("em");
      em.textContent = u.sub;
      h3.appendChild(em);
    }

    var av = avg(u.assignments.map(function (a) { return a.pct; }));
    var ch = chip(av);
    var chipEl = document.createElement("span");
    chipEl.className = "track-chip " + ch[1];
    chipEl.textContent = ch[0];

    head.appendChild(code);
    head.appendChild(h3);
    head.appendChild(chipEl);
    row.appendChild(head);

    var assign = document.createElement("div");
    assign.className = "track-assign";
    u.assignments.forEach(function (a) {
      var line = document.createElement("div");
      line.className = "assign-line";
      var name = document.createElement("span");
      name.textContent = a.name;
      var bar = document.createElement("span");
      bar.className = "assign-bar";
      var fill = document.createElement("i");
      fill.style.width = Math.max(0, Math.min(100, a.pct)) + "%";
      bar.appendChild(fill);
      var b = document.createElement("b");
      b.textContent = a.pct + "%";
      line.appendChild(name);
      line.appendChild(bar);
      line.appendChild(b);
      assign.appendChild(line);
    });
    row.appendChild(assign);

    var mine = sortReports(reportsFor(data, u.name));
    var foot = document.createElement("footer");
    foot.className = "track-row-foot";
    var lab = document.createElement("span");
    lab.className = "track-latest-label";
    lab.textContent = "Last Report";
    var text = document.createElement("span");
    text.className = "track-latest";
    if (mine.length) {
      text.textContent = mine[0].date + " · " + mine[0].time + " · " + mine[0].reporter;
    } else {
      text.textContent = "No reports filed.";
    }
    foot.appendChild(lab);
    foot.appendChild(text);
    row.appendChild(foot);

    return row;
  }

  function sectionLabel(text, count) {
    var div = document.createElement("div");
    div.className = "track-section";
    var span = document.createElement("span");
    span.className = "track-section-label";
    span.textContent = text;
    div.appendChild(span);
    if (count) {
      var c = document.createElement("span");
      c.className = "track-section-count";
      c.textContent = count;
      div.appendChild(c);
    }
    return div;
  }

  function render(data) {
    scrollTop = listEl.scrollTop;
    listEl.textContent = "";

    listEl.appendChild(sectionLabel("Unit Progress Ledger", null));

    data.units.forEach(function (u) {
      listEl.appendChild(rowEl(data, u));
    });

    listEl.scrollTop = scrollTop;
  }

  function apply(data) {
    masterCells(data);
    render(data);
  }

  function load() {
    fetch("/api/status", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("bad status");
        return r.json();
      })
      .then(function (data) {
        var json = JSON.stringify(data);
        if (json !== lastJSON) {
          lastJSON = json;
          apply(data);
        }
      })
      .catch(function () {
        if (lastJSON !== "") return;
        lastJSON = JSON.stringify(DEFAULT_DATA);
        apply(DEFAULT_DATA);
      });
  }

  load();
  setInterval(load, 10000);

  /* live-tick every reported time: seconds read realistically from the true filing moment */
  function tickTimes() {
    var now = Date.now();
    var els = document.querySelectorAll("[data-time-base]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var base = parseInt(el.getAttribute("data-time-base"), 10) || 0;
      var epoch = parseInt(el.getAttribute("data-time-epoch"), 10) || now;
      var date = el.getAttribute("data-time-date") || "";
      var label = date ? (date + " · " + fmt12(base + Math.floor((now - epoch) / 1000))) : fmt12(base);
      if (el.textContent !== label) el.textContent = label;
    }
  }
  setInterval(tickTimes, 1000);
})();

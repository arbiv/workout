/* =============================================================
   Workout Engine — pure, DOM-free helpers shared by the app and
   its tests. Parses the published-sheet CSV format described in
   index.html and turns it into workout/exercise data, plus a few
   small formatting helpers used by the player UI.
   ============================================================= */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.WorkoutEngine = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function fmt(s) {
    s = Math.max(0, Math.ceil(s));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function repsFor(str, i) {
    const p = String(str || "").split(",").map(x => x.trim()).filter(Boolean);
    return p.length ? p[Math.min(i, p.length - 1)] : "—";
  }

  function estMin(w) {
    let t = 0;
    for (const e of w.exercises)
      t += e.sets * (e.workTime > 0 ? e.workTime : 40) + Math.max(0, e.sets - 1) * e.restSet + e.restAfter;
    return Math.round(t / 60);
  }

  function parseCSV(text) {
    const rows = []; let row = [], field = "", inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.some(x => x.trim() !== "")) rows.push(row);
        row = [];
      } else field += c;
    }
    row.push(field);
    if (row.some(x => x.trim() !== "")) rows.push(row);
    return rows;
  }

  function rowsToWorkouts(rows) {
    if (rows.length < 2) throw new Error("Sheet has no data rows.");
    const head = rows[0].map(h => h.trim().toLowerCase());
    const col = name => head.indexOf(name);
    const iW = col("workout"), iEx = col("exercise");
    if (iW < 0 || iEx < 0) throw new Error('Missing required columns "Workout" and/or "Exercise" in row 1.');
    const iSets = col("sets"), iReps = col("reps"),
          iWt = col("weight"), iWork = col("worktime"), iRs = col("restset"),
          iRa = col("restafter"), iNote = col("note");
    const get = (r, i, d = "") => (i >= 0 && r[i] !== undefined ? String(r[i]).trim() : d);
    const num = (r, i, d) => { const v = parseFloat(get(r, i)); return isNaN(v) ? d : v; };

    const map = new Map();
    for (const r of rows.slice(1)) {
      const wName = get(r, iW);
      const exName = get(r, iEx);
      if (!wName || !exName) continue;
      if (!map.has(wName)) map.set(wName, { name: wName, exercises: [] });
      map.get(wName).exercises.push({
        name: exName,
        sets: Math.max(1, Math.round(num(r, iSets, 3))),
        reps: get(r, iReps, "8") || "8",
        weight: get(r, iWt),
        workTime: Math.max(0, Math.round(num(r, iWork, 0))),
        restSet: Math.max(0, Math.round(num(r, iRs, 30))),
        restAfter: Math.max(0, Math.round(num(r, iRa, 90))),
        note: get(r, iNote),
      });
    }
    const ws = [...map.values()];
    if (ws.length === 0) throw new Error("No workouts found in the sheet.");
    return ws;
  }

  return { esc, fmt, repsFor, estMin, parseCSV, rowsToWorkouts };
});

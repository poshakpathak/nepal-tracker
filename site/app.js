"use strict";

const app = document.getElementById("app");
const cache = {};
const load = (name) => (cache[name] ||= fetch(`d/${name}.json`).then((r) => {
  if (!r.ok) throw new Error(`${name}: ${r.status}`);
  return r.json();
}));
const tryLoad = (name) => load(name).catch(() => { delete cache[name]; return null; });

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (n) => (n == null ? "" : Number(n).toLocaleString("en-US"));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso, year = true) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `<span class="date">${MONTHS[+m[2] - 1]} ${+m[3]}${year ? `, ${m[1]}` : ""}</span>` : esc(iso || "");
};
const CH = { hor: "House of Representatives", na: "National Assembly" };
const CHS = { hor: "House", na: "Nat. Assembly" };
const PARTY_SHORT = {
  "Rastriya Swatantra Party": "RSP", "Nepali Congress": "NC", "Communist Party of Nepal (UML)": "UML",
  "Nepali Communist Party": "NCP", "Shram Sanskriti Party": "SSP", "Rastriya Prajatantra Party": "RPP",
  "Janata Samajwadi Party Nepal": "JSP", "Independent": "Ind.", "Rastriya Janamorcha": "RJM",
};
const short = (p) => PARTY_SHORT[p] || p || "";
const LOW = 60; // attendance below this is flagged

const meter = (a) => (a && a.n ? `<span class="meter${a.pct < LOW ? " low" : ""}"><i style="width:${a.pct}%"></i></span>${a.pct}%` : `<span class="muted">no sittings</span>`);
const mlink = (m) => `<a href="#/member/${m.id}">${esc(m.name)}</a>`;
const seatOf = (m) => (m.el === "proportional" ? `PR list${m.seat ? ` · ${esc(m.seat)}` : ""}` : esc(m.seat || ""));

/* Tooltip for anything with data-tip. */
const tip = document.getElementById("tip");
document.addEventListener("mousemove", (e) => {
  const el = e.target.closest?.("[data-tip]");
  if (!el) { tip.hidden = true; return; }
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  tip.style.left = `${Math.max(4, Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 4))}px`;
  tip.style.top = `${e.clientY + 14}px`;
});

/* Sortable, paged table. cols: {h, v(row) -> html, s(row) -> sort value, num, nw}. */
function table(host, rows, cols, opts = {}) {
  const size = opts.size || 50;
  let page = 0, sort = opts.sort ?? null, dir = opts.dir || 1;
  const draw = () => {
    const data = sort == null ? rows : [...rows].sort((a, b) => {
      const x = cols[sort].s(a), y = cols[sort].s(b);
      if (x == null) return 1;
      if (y == null) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
    const pages = Math.max(1, Math.ceil(data.length / size));
    page = Math.min(page, pages - 1);
    const slice = data.slice(page * size, page * size + size);
    host.innerHTML = `<div class="tablewrap"><table><thead><tr>${cols.map((c, i) =>
      `<th class="${c.s ? "sort" : ""}${c.num ? " num" : ""}" data-i="${i}">${c.h}${sort === i ? (dir > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}</tr></thead>
      <tbody>${slice.map((r) => `<tr>${cols.map((c) => `<td class="${c.num ? "num" : ""}${c.nw ? " nw" : ""}">${c.v(r) ?? ""}</td>`).join("")}</tr>`).join("")
        || `<tr><td colspan="${cols.length}" class="muted">Nothing matches.</td></tr>`}</tbody></table></div>
      <div class="pager"><span>${data.length > size ? `${num(page * size + 1)} to ${num(Math.min(data.length, page * size + size))} of ` : ""}${num(data.length)}</span>
      ${data.length > size ? `<button data-p="-1" ${page ? "" : "disabled"}>Previous</button><button data-p="1" ${page < pages - 1 ? "" : "disabled"}>Next</button>` : ""}</div>`;
  };
  host.onclick = (e) => {
    const th = e.target.closest("th.sort"), btn = e.target.closest("button[data-p]");
    if (th) { const i = +th.dataset.i; if (sort === i) dir = -dir; else { sort = i; dir = cols[i].num ? -1 : 1; } page = 0; draw(); }
    if (btn) { page += +btn.dataset.p; draw(); host.scrollIntoView({ block: "nearest" }); }
  };
  draw();
  return { set(next) { rows = next; page = 0; draw(); } };
}

function hbars(rows) {
  const max = Math.max(...rows.map((r) => r[1]), 1);
  return `<div class="hbar">${rows.map(([label, v, text, t, scale]) =>
    `<span>${label}</span><div class="track" data-tip="${esc(t || text || v)}"><i style="width:${(100 * v) / (scale || max)}%"></i></div><span class="v">${text ?? num(v)}</span>`).join("")}</div>`;
}

const strip = (att) => `<div class="strip">${att.map(([id, date, s, , title]) =>
  `<a href="#/meeting/${id}" aria-label="${esc(title)}"><i class="${s === "p" ? "p" : s === "a" ? "a" : s === "h" || s === "partial" ? "h" : ""}" data-tip="${esc(`${title} · ${s === "p" ? "present" : s === "a" ? "absent" : s || "—"}`)}"></i></a>`).join("")}</div>`;
const legend = `<div class="legend"><span><i class="p"></i>Present</span><span><i class="a"></i>Absent</span><span><i class="h"></i>Partly present</span></div>`;

const billProgress = (b) => {
  const n = b.steps_total || 0, d = b.steps_done || 0;
  if (!n) return "";
  return `<span class="progress" data-tip="${d} of ${n} stages done">${Array.from({ length: n }, (_, i) => `<i class="${i < d ? "d" : i === d ? "c" : ""}"></i>`).join("")}</span>`;
};
const billName = (b) => (b.title ? esc(b.title) : `<span class="ne">${esc(b.title_ne)}</span>`);

/* ------------------------------------------------------------ pages */

async function overview() {
  const [members, sittings, bills, meetings, meta] = await Promise.all([load("members"), load("sittings"), load("bills"), load("meetings"), tryLoad("meta")]);
  const hor = members.filter((m) => m.ch === "hor" && m.house?.n);
  const horSit = sittings.filter((s) => s.ch === "hor");
  const avg = Math.round(hor.reduce((a, m) => a + m.house.pct, 0) / (hor.length || 1));
  const under = hor.filter((m) => m.house.pct < LOW).length;
  const worst = [...hor].sort((a, b) => a.house.pct - b.house.pct).slice(0, 8);
  const cmteMeetings = meetings.filter((m) => /Committee/i.test(m.body || "")).length;
  const moving = [...bills].sort((a, b) => (b.last_action || "").localeCompare(a.last_action || "")).slice(0, 6);
  const passed = bills.filter((b) => /complet|pass|authent/i.test(b.status || "")).length;
  app.innerHTML = `
    <p class="kicker">Federal Parliament · term elected March 2026</p>
    <h1>${num(horSit.length)} sittings. ${num(under)} MPs missed more than ${100 - LOW}% of them.</h1>
    <p class="lede">The House of Representatives has met ${num(horSit.length)} times since it was sworn in on March 26, 2026. The average member was there for ${avg}% of them. Nepal doesn't publish how each MP votes, so attendance, committee work and floor speeches are the best record of what members actually do.</p>
    <div class="tiles">
      <div class="tile"><b>${num(members.length)}</b><span>Members</span><small>${num(members.filter((m) => m.ch === "hor").length)} House · ${num(members.filter((m) => m.ch === "na").length)} National Assembly</small></div>
      <div class="tile"><b>${avg}%</b><span>Average House attendance</span></div>
      <div class="tile hot"><b>${num(under)}</b><span>MPs under ${LOW}%</span><small>of House sittings</small></div>
      <div class="tile"><b>${num(bills.length)}</b><span>Bills on record</span><small>${num(passed)} completed</small></div>
      <div class="tile"><b>${num(cmteMeetings)}</b><span>Committee meetings</span></div>
    </div>
    <div class="grid">
      <section class="sec"><h2>Missing the most sittings</h2>
        <ol class="rank">${worst.map((m) => `<li><span>${mlink(m)}<span class="sub">${m.office ? `<b>${esc(m.office)}</b> · ` : ""}${esc(short(m.party))} · ${seatOf(m)}</span></span><span class="v">${m.house.pct}%</span></li>`).join("")}</ol>
        <p class="small muted">${worst.filter((m) => m.office).length} of these ${worst.length} hold a government office. Ministers are only required in the chamber when their portfolio is on the agenda. <a href="#/attendance">Full attendance ranking →</a></p>
      </section>
      <section class="sec"><h2>Bills that moved last</h2>
        <div class="tablewrap"><table><thead><tr><th>Bill</th><th>Stage</th><th class="num">Last step</th></tr></thead><tbody>
        ${moving.map((b) => `<tr><td><a href="#/bill/${b.id}">${billName(b)}</a><div class="small muted">${esc(b.presented_by || "")}</div></td><td>${billProgress(b)}<div class="small">${esc(b.current_step || "")}</div></td><td class="num">${day(b.last_action)}</td></tr>`).join("")}
        </tbody></table></div>
        <p class="small"><a href="#/bills">All ${num(bills.length)} bills →</a></p>
      </section>
    </div>
    <section class="sec"><h2>Turnout, sitting by sitting</h2>
      <p class="small muted">Share of House members marked present at each sitting, oldest on the left.</p>
      ${turnout(horSit)}
    </section>`;
}

function turnout(sits) {
  const rows = [...sits].reverse();
  return `<div style="display:flex;align-items:flex-end;gap:2px;height:160px;border-bottom:3px solid var(--ink)">${rows.map((s) => {
    const tot = s.in + s.out + s.part, share = tot ? (s.in + s.part / 2) / tot : 0;
    return `<a href="#/meeting/${s.id}" style="flex:1;height:100%;display:flex;align-items:flex-end;min-width:2px"><i data-tip="${esc(`${s.title}: ${s.in} of ${tot} present`)}" style="display:block;width:100%;height:${Math.round(share * 100)}%;background:${share < 0.6 ? "var(--out)" : "var(--in)"}"></i></a>`;
  }).join("")}</div>
  <div class="legend"><span>${day(rows[0]?.date)}</span><span style="margin-left:auto">${day(rows.at(-1)?.date)}</span></div>`;
}

async function membersPage(q) {
  const members = await load("members");
  const parties = [...new Set(members.map((m) => m.party))].sort();
  app.innerHTML = `<p class="kicker">Both houses</p><h1>Members</h1>
    <p class="lede">Every sitting member of the House of Representatives and the National Assembly, with how often they turn up.</p>
    <div class="filters">
      <input type="search" id="q" placeholder="Name, seat or district" value="${esc(q || "")}">
      <select id="ch"><option value="">Both houses</option><option value="hor">House of Representatives</option><option value="na">National Assembly</option></select>
      <select id="pa"><option value="">All parties</option>${parties.map((p) => `<option>${esc(p)}</option>`).join("")}</select>
    </div><div id="t"></div>`;
  const t = table(document.getElementById("t"), members, [
    { h: "Member", v: (m) => `${mlink(m)}${m.office ? ` <span class="tag red">${esc(m.office)}</span>` : ""}<div class="small ne muted">${esc(m.ne || "")}</div>`, s: (m) => m.name },
    { h: "Party", v: (m) => esc(short(m.party)), s: (m) => m.party, nw: true },
    { h: "House", v: (m) => CHS[m.ch] || "", s: (m) => m.ch, nw: true },
    { h: "Seat", v: seatOf, s: (m) => m.seat },
    { h: "Sittings", v: (m) => meter(m.house), s: (m) => m.house?.pct, num: true, nw: true },
    { h: "Committee", v: (m) => meter(m.cmte), s: (m) => m.cmte?.pct, num: true, nw: true },
    { h: "Speeches", v: (m) => num(m.st), s: (m) => m.st, num: true },
  ], { sort: 0 });
  const apply = () => {
    const s = document.getElementById("q").value.trim().toLowerCase();
    const ch = document.getElementById("ch").value, pa = document.getElementById("pa").value;
    t.set(members.filter((m) => (!ch || m.ch === ch) && (!pa || m.party === pa) &&
      (!s || `${m.name} ${m.ne} ${m.seat} ${m.party}`.toLowerCase().includes(s))));
  };
  ["q", "ch", "pa"].forEach((id) => document.getElementById(id).addEventListener("input", apply));
  apply();
}

async function memberPage(id) {
  const m = await tryLoad(`m/${id}`);
  if (!m) { app.innerHTML = `<h1>Not found</h1><p>No member with that id.</p>`; return; }
  const sit = m.att.filter((r) => r[3] === "h"), cm = m.att.filter((r) => r[3] === "c");
  const missed = sit.filter((r) => r[2] === "a");
  const bio = Object.entries(m.bio || {}).filter(([, v]) => v);
  app.innerHTML = `
    <div class="profile">${m.photo ? `<img src="${esc(m.photo)}" alt="" onerror="this.remove()">` : ""}
      <div><p class="kicker">${m.office ? `${esc(m.office)} · ` : ""}${esc(CH[m.ch] || "")}</p>
      <h1 class="long">${esc(m.name)}<span class="ne">${esc(m.ne || "")}</span></h1>
      <p><span class="tag">${esc(m.party || "")}</span> <span class="tag line">${m.el === "proportional" ? "Proportional list" : "Elected directly"}</span></p></div>
    </div>
    <div class="tiles">
      <div class="tile${m.house?.pct < LOW ? " hot" : ""}"><b>${m.house?.n ? `${m.house.pct}%` : "–"}</b><span>Sittings attended</span><small>${m.house ? `${m.house.in} of ${m.house.n}` : ""}</small></div>
      <div class="tile"><b>${m.cmte?.n ? `${m.cmte.pct}%` : "–"}</b><span>Committee meetings</span><small>${m.cmte ? `${m.cmte.in} of ${m.cmte.n}` : ""}</small></div>
      <div class="tile"><b>${num(m.statements.length)}</b><span>Floor statements</span></div>
      <div class="tile"><b>${num(m.cm.length)}</b><span>Committees</span></div>
    </div>
    <div class="grid">
      <section class="sec"><h2>Every sitting</h2>${sit.length ? strip(sit) + legend : `<p class="muted">No sittings recorded.</p>`}
        ${missed.length ? `<h3 style="margin-top:18px">Missed (${missed.length})</h3><p class="small">${missed.map((r) => `<a href="#/meeting/${r[0]}">${day(r[1])}</a>`).join(" · ")}</p>` : ""}
        ${cm.length ? `<h2 style="margin-top:28px">Committee meetings</h2>${strip(cm)}` : ""}
      </section>
      <section class="sec"><h2>Profile</h2>
        <dl class="facts">
          <dt>Seat</dt><dd>${seatOf(m) || "–"}</dd>
          ${m.edu ? `<dt>Education</dt><dd>${esc(m.edu)}</dd>` : ""}
          ${m.start ? `<dt>Sworn in</dt><dd>${day(m.start)}</dd>` : ""}
          ${m.cm.length ? `<dt>Committees</dt><dd>${m.cm.map(esc).join("<br>")}</dd>` : ""}
          ${bio.map(([k, v]) => `<dt>${esc(k)}</dt><dd class="ne">${esc(v).replace(/\n/g, "<br>")}</dd>`).join("")}
        </dl>
        ${(m.terms || []).length > 1 ? `<h3>Earlier terms</h3><p class="small">${m.terms.slice(1).map((t) => `${esc(t.years)}: ${esc(t.org)}`).join("<br>")}</p>` : ""}
      </section>
    </div>
    <section class="sec"><h2>Floor statements</h2>
      ${m.statements.length ? `<div class="tablewrap"><table><thead><tr><th>Occasion</th><th>When</th><th></th></tr></thead><tbody>${m.statements.map((s) =>
        `<tr><td>${esc(s.kind)}${s.text ? `<div class="small ne">${esc(s.text.slice(0, 400))}${s.text.length > 400 ? "…" : ""}</div>` : ""}</td><td>${esc(s.context)}</td><td class="nw">${s.video ? `<a href="${esc(s.video)}" target="_blank" rel="noopener">Watch</a>` : ""}</td></tr>`).join("")}</tbody></table></div>`
        : `<p class="muted">None recorded yet.</p>`}
    </section>
    <p class="small muted">Source: <a href="https://digital.parliament.gov.np/members/${esc(m.id)}" target="_blank" rel="noopener">this member's page on the parliament portal</a>.</p>`;
}

async function attendance() {
  const [members, sittings] = await Promise.all([load("members"), load("sittings")]);
  app.innerHTML = `<p class="kicker">Who shows up</p><h1>Attendance</h1>
    <p class="lede">Each MP's attendance as the Parliament Secretariat records it. A partial attendance counts as half. Ministers are only required in the chamber when their portfolio is up, which pulls their numbers down.</p>
    <div class="filters"><button data-ch="hor" class="on">House</button><button data-ch="na">National Assembly</button></div>
    <div class="grid"><section class="sec"><h2>Lowest</h2><ol class="rank" id="lo"></ol></section>
    <section class="sec"><h2>Highest</h2><ol class="rank" id="hi"></ol></section></div>
    <section class="sec"><h2>Turnout by sitting</h2><div id="tu"></div></section>`;
  const draw = (ch) => {
    const rows = members.filter((m) => m.ch === ch && m.house?.n).sort((a, b) => a.house.pct - b.house.pct || a.house.in - b.house.in);
    const li = (m) => `<li><span>${mlink(m)}<span class="sub">${m.office ? `<b>${esc(m.office)}</b> · ` : ""}${esc(short(m.party))} · ${m.house.in} of ${m.house.n} sittings</span></span><span class="v">${m.house.pct}%</span></li>`;
    document.getElementById("lo").innerHTML = rows.slice(0, 15).map(li).join("");
    document.getElementById("hi").innerHTML = [...rows].reverse().slice(0, 15).map(li).join("");
    document.getElementById("tu").innerHTML = turnout(sittings.filter((s) => s.ch === ch));
    app.querySelectorAll("button[data-ch]").forEach((b) => b.classList.toggle("on", b.dataset.ch === ch));
  };
  app.querySelectorAll("button[data-ch]").forEach((b) => b.addEventListener("click", () => draw(b.dataset.ch)));
  draw("hor");
}

async function billsPage() {
  const bills = await load("bills");
  app.innerHTML = `<p class="kicker">Legislation</p><h1>Bills</h1>
    <p class="lede">Every bill on the parliament portal and how far it has got, from registration to the President's signature. Titles are in English where the portal's summary gives one.</p>
    <div class="filters"><input type="search" id="q" placeholder="Search bills"></div><div id="t"></div>`;
  const t = table(document.getElementById("t"), bills, [
    { h: "No.", v: (b) => num(b.number), s: (b) => b.number, num: true },
    { h: "Bill", v: (b) => `<a href="#/bill/${b.id}">${billName(b)}</a><div class="small muted">${esc(b.presented_by || "")}</div>`, s: (b) => b.title || b.title_ne },
    { h: "Status", v: (b) => `<span class="tag${/progress/i.test(b.status) ? " line" : ""}">${esc(b.status || "")}</span>`, s: (b) => b.status, nw: true },
    { h: "Progress", v: (b) => `${billProgress(b)}<div class="small">${esc(b.current_step || "")}</div>`, s: (b) => b.steps_done },
    { h: "Registered", v: (b) => day(b.registered), s: (b) => b.registered, nw: true },
    { h: "Last step", v: (b) => day(b.last_action), s: (b) => b.last_action, nw: true },
  ], { sort: 5, dir: -1 });
  document.getElementById("q").addEventListener("input", (e) => {
    const s = e.target.value.trim().toLowerCase();
    t.set(bills.filter((b) => !s || `${b.title} ${b.title_ne} ${b.presented_by} ${b.ministry_ne}`.toLowerCase().includes(s)));
  });
}

function summaryHtml(text) {
  const paras = esc(text || "").split("\n").filter(Boolean);
  const p = (x) => x.map((t) => `<p>${t}</p>`).join("");
  return `<div class="prose small">${p(paras.slice(0, 2))}${paras.length > 2 ? `<details><summary>Read the full summary</summary>${p(paras.slice(2))}</details>` : ""}</div>`;
}

async function billPage(id) {
  const b = await tryLoad(`b/${id}`);
  if (!b) { app.innerHTML = `<h1>Not found</h1>`; return; }
  let house = null;
  const steps = b.steps.map((s) => {
    const head = s.house !== house ? `<li class="house">${esc(s.house || "")}</li>` : "";
    house = s.house;
    return `${head}<li class="${esc(s.state)}"><span>${esc(s.step)}${s.docs.map((d) => ` <a class="small" href="${esc(d)}" target="_blank" rel="noopener">PDF</a>`).join("")}</span><span class="nw">${s.date ? day(s.date) : ""}</span></li>`;
  }).join("");
  app.innerHTML = `<p class="kicker">Bill no. ${num(b.number)} · ${esc(b.origin || "")}</p>
    <h1 class="long">${b.title ? esc(b.title) : ""}<span class="ne">${esc(b.title_ne)}</span></h1>
    <p>${[b.status, ...(b.tags || [])].map((t, i) => `<span class="tag${i ? " line" : " red"}">${esc(t)}</span>`).join(" ")}</p>
    <div class="grid" style="margin-top:24px">
      <section class="sec"><h2>Where it stands</h2>
        <dl class="facts"><dt>Presented by</dt><dd>${esc(b.presented_by || "–")}</dd><dt>Ministry</dt><dd class="ne">${esc(b.ministry_ne || "–")}</dd>
        <dt>Registered</dt><dd>${day(b.registered)}</dd><dt>Current step</dt><dd>${esc(b.current_step || "–")}</dd><dt>In process</dt><dd>${num(b.days_in_process)} days</dd></dl>
        <ul class="journey">${steps}</ul></section>
      <section class="sec"><h2>What it does</h2>${summaryHtml(b.summary)}
        <p class="small muted">Summary from the parliament portal. ${b.pdf ? `<a href="${esc(b.pdf)}" target="_blank" rel="noopener">Read the bill (PDF, Nepali)</a>.` : ""}</p></section>
    </div>`;
}

async function meetingsPage() {
  const meetings = await load("meetings");
  const bodies = [...new Set(meetings.map((m) => m.body).filter(Boolean))].sort();
  app.innerHTML = `<p class="kicker">Sittings and committees</p><h1>Meetings</h1>
    <p class="lede">House and National Assembly sittings and committee meetings, with the agenda and who turned up.</p>
    <div class="filters"><input type="search" id="q" placeholder="Search agendas and committees">
    <select id="b"><option value="">All bodies</option>${bodies.map((b) => `<option>${esc(b)}</option>`).join("")}</select></div><div id="t"></div>`;
  const t = table(document.getElementById("t"), meetings, [
    { h: "Date", v: (m) => day(m.date), s: (m) => m.date, nw: true },
    { h: "Meeting", v: (m) => `<a href="#/meeting/${m.id}">${esc(m.title)}</a>${m.agenda ? `<div class="small ne">${esc(m.agenda.slice(0, 160))}${m.agenda.length > 160 ? "…" : ""}</div>` : ""}`, s: (m) => m.title },
    { h: "Length", v: (m) => esc(m.duration || ""), nw: true },
    { h: "Present", v: (m) => (m.members ? `${m.present} of ${m.members}` : ""), s: (m) => (m.members ? m.present / m.members : null), num: true, nw: true },
  ], { sort: 0, dir: -1 });
  const apply = () => {
    const s = document.getElementById("q").value.trim().toLowerCase(), b = document.getElementById("b").value;
    t.set(meetings.filter((m) => (!b || m.body === b) && (!s || `${m.title} ${m.agenda} ${m.chair}`.toLowerCase().includes(s))));
  };
  ["q", "b"].forEach((x) => document.getElementById(x).addEventListener("input", apply));
}

async function meetingPage(id) {
  const [g, members] = await Promise.all([tryLoad(`g/${id}`), load("members")]);
  if (!g) { app.innerHTML = `<h1>Not found</h1><p>This meeting hasn't been loaded yet.</p>`; return; }
  const by = Object.fromEntries(members.map((m) => [m.id, m]));
  const absent = g.attendance.filter((a) => a.status !== "present");
  const person = (a) => { const m = by[a.member]; return `<span class="${a.status === "present" ? "p" : "a"}">${m ? mlink(m) : esc(a.member)} <span class="muted small">${esc(short(m?.party))}</span></span>`; };
  app.innerHTML = `<p class="kicker">${esc(g.body || "Meeting")} · ${day(g.date)}</p><h1 class="long">${esc(g.title)}</h1>
    <div class="tiles"><div class="tile"><b>${g.members ? Math.round((100 * g.present) / g.members) : "–"}%</b><span>Present</span><small>${num(g.present)} of ${num(g.members)}</small></div>
    <div class="tile${absent.length ? " hot" : ""}"><b>${num(absent.length)}</b><span>Absent</span></div>
    <div class="tile"><b>${esc(g.duration || "–")}</b><span>Length</span><small>${esc(g.start || "")}${g.end ? ` to ${esc(g.end)}` : ""}</small></div></div>
    ${g.agenda ? `<section class="sec"><h2>Agenda</h2><p class="quote ne">${esc(g.agenda)}</p>${g.chair ? `<p class="small">Chaired by ${esc(g.chair)}</p>` : ""}</section>` : ""}
    ${g.minutes ? `<section class="sec"><h2>Minutes</h2><p class="ne">${esc(g.minutes)}</p></section>` : ""}
    <section class="sec"><h2>Absent</h2><div class="people">${absent.map(person).join("") || `<span class="muted">Nobody.</span>`}</div></section>
    <section class="sec"><h2>Present</h2><div class="people">${g.attendance.filter((a) => a.status === "present").map(person).join("")}</div></section>
    <p class="small muted"><a href="https://digital.parliament.gov.np/baithak-detail/${esc(id)}" target="_blank" rel="noopener">This meeting on the parliament portal</a>${g.recording ? ` · <a href="${esc(g.recording)}" target="_blank" rel="noopener">Recording</a>` : ""}</p>`;
}

async function partiesPage() {
  const parties = await load("parties");
  const sec = (ch) => {
    const rows = parties.filter((p) => p.ch === ch).sort((a, b) => b.members - a.members);
    return `<section class="sec"><h2>${CH[ch]}</h2>
      <h3>Seats</h3>${hbars(rows.map((p) => [esc(p.party), p.members, num(p.members)]))}
      <h3 style="margin-top:22px">Sittings attended, all members combined</h3>${hbars(rows.map((p) => [esc(short(p.party)), p.n ? (100 * p.in) / p.n : 0, p.n ? `${Math.round((100 * p.in) / p.n)}%` : "–", `${num(p.in)} of ${num(p.n)} member-sittings`, 100]))}
      <h3 style="margin-top:22px">Committee meetings attended</h3>${hbars(rows.map((p) => [esc(short(p.party)), p.cn ? (100 * p.cin) / p.cn : 0, p.cn ? `${Math.round((100 * p.cin) / p.cn)}%` : "–", `${num(p.cin)} of ${num(p.cn)}`, 100]))}
      <h3 style="margin-top:22px">Women members</h3>${hbars(rows.map((p) => [esc(short(p.party)), p.members ? (100 * p.women) / p.members : 0, `${p.women} of ${p.members}`, null, 100]))}
    </section>`;
  };
  app.innerHTML = `<p class="kicker">By party</p><h1>Parties</h1><p class="lede">How each party's members show up, counted across every member and every sitting.</p><div class="grid">${sec("hor")}${sec("na")}</div>`;
}

function about() {
  app.innerHTML = `<p class="kicker">Method</p><h1>About this tracker</h1><div class="prose">
    <p>This site follows what members of Nepal's Federal Parliament do: whether they attend sittings and committee meetings, what they say on the floor, and how bills move through both houses.</p>
    <p>All data comes from the Federal Parliament's public portal, <a href="https://digital.parliament.gov.np" target="_blank" rel="noopener">digital.parliament.gov.np</a>, and is refreshed every evening, Nepal time. The portal records attendance from members' digital log-ins. A partial attendance counts as half, the same way the portal calculates it.</p>
    <p><b>No votes.</b> Nepal's parliament decides almost everything by voice vote. When a division is called, only the totals are published, never the names. So unlike trackers for other legislatures, this one can't show how each member voted.</p>
    <p><b>Ministers.</b> At least one minister must be present for House business, so ministers usually attend only when their portfolio is on the agenda. Their attendance is lower for that reason.</p>
    <p><b>Language.</b> Names, parties and summaries are in English where the portal provides them. Agendas, minutes and some bill titles are only published in Nepali, and are shown as published.</p>
    <p>The code and data are open on <a href="https://github.com/poshakpathak/nepal-tracker" target="_blank" rel="noopener">GitHub</a>.</p></div>`;
}

/* ------------------------------------------------------------ router */

const routes = [
  [/^#?\/?$/, overview], [/^#\/members(?:\?q=(.*))?$/, (q) => membersPage(q && decodeURIComponent(q))], [/^#\/member\/([\w-]+)$/, memberPage],
  [/^#\/attendance$/, attendance], [/^#\/bills$/, billsPage], [/^#\/bill\/([\w-]+)$/, billPage],
  [/^#\/meetings$/, meetingsPage], [/^#\/meeting\/([\w-]+)$/, meetingPage], [/^#\/parties$/, partiesPage], [/^#\/about$/, about],
];
async function route() {
  const h = location.hash || "#/";
  const sect = h.split("/")[1] || "";
  const alias = { member: "members", bill: "bills", meeting: "meetings" };
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", (a.getAttribute("href").split("/")[1] || "") === (alias[sect] || sect)));
  for (const [re, fn] of routes) {
    const m = re.exec(h);
    if (m) {
      try { await fn(...m.slice(1)); } catch (e) { app.innerHTML = `<h1>Something broke</h1><p class="muted">${esc(e.message)}</p>`; }
      window.scrollTo(0, 0);
      return;
    }
  }
  app.innerHTML = `<h1>Not found</h1>`;
}
addEventListener("hashchange", route);
document.getElementById("find").addEventListener("keydown", (e) => {
  if (e.key === "Enter") location.hash = `#/members?q=${encodeURIComponent(e.target.value)}`;
});
tryLoad("meta").then((m) => {
  if (!m?.updated) return;
  const d = new Date(m.updated);
  document.getElementById("updated").textContent = `Updated ${d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`;
  document.getElementById("dateline").textContent = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
});
route();

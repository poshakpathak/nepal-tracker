"use strict";

const app = document.getElementById("app");
const cache = {};
const load = (name) => (cache[name] ||= fetch(`d/${name}.json`).then((r) => {
  if (!r.ok) throw new Error(`${name}: ${r.status}`);
  return r.json();
}));
const tryLoad = (name) => load(name).catch(() => { delete cache[name]; return null; });

/* Language: English by default, Nepali when chosen (remembered per browser, or ?lang=ne). */
let NE = (() => {
  const q = new URLSearchParams(location.search).get("lang");
  if (q) return q === "ne";
  try { return localStorage.getItem("lang") === "ne"; } catch { return false; }
})();
const L = (en, ne) => (NE ? ne : en);
const DIGITS = "०१२३४५६७८९";
const dev = (s) => String(s).replace(/\d/g, (d) => DIGITS[d]);

/* Fixed terms the portal publishes only in English. */
const DICT = {
  "House of Representatives": "प्रतिनिधि सभा", "National Assembly": "राष्ट्रिय सभा", "Joint Parliament": "संयुक्त संसद",
  "House of Representatives Committee": "प्रतिनिधि सभा समिति", "National Assembly Committee": "राष्ट्रिय सभा समिति",
  "Joint Parliament Committee": "संयुक्त समिति", "Special Committee": "विशेष समिति",
  "Prime Minister": "प्रधानमन्त्री", "Minister": "मन्त्री", "Speaker": "सभामुख", "Deputy Speaker": "उपसभामुख",
  "Chairperson": "अध्यक्ष", "Vice Chairperson": "उपाध्यक्ष",
  "Completed": "पूरा भएको", "In progress": "प्रक्रियामा", "Amendment": "संशोधन", "Finance Bill": "आर्थिक विधेयक",
  "Government Bill": "सरकारी विधेयक", "Ordinance Replacement Bill": "अध्यादेश प्रतिस्थापन विधेयक", "Ordinary Bill": "साधारण विधेयक", "Original": "मूल",
  "Bill Registration": "विधेयक दर्ता", "Bill Distribution": "विधेयक वितरण", "Bill Presentation": "विधेयक प्रस्तुत",
  "Theoretical Discussion": "सैद्धान्तिक छलफल", "Notice of Amendment": "संशोधनको सूचना", "Notice of Opposition": "विरोधको सूचना",
  "Clause-by-Clause Discussion in House": "सदनमा दफावार छलफल", "Clause-by-Clause Discussion in Committee": "समितिमा दफावार छलफल",
  "Committee Report Presentation and Discussion": "समितिको प्रतिवेदन प्रस्तुति र छलफल", "Bill Passed": "विधेयक पारित",
  "Forwarded to the National Assembly with a Message": "सन्देशसहित राष्ट्रिय सभामा पठाइएको",
  "Forwarded to the House of Representatives with a Message": "सन्देशसहित प्रतिनिधि सभामा पठाइएको",
  "Bill Tabled with Message / Bill Distributed": "सन्देशसहित पेश / विधेयक वितरण", "Bill Tabled with Message": "सन्देशसहित पेश",
  "General Discussion on the Bill": "विधेयकमाथि सामान्य छलफल",
  "Returned to the House of Representatives with a Message": "सन्देशसहित प्रतिनिधि सभामा फिर्ता",
  "Returned to the National Assembly with a Message": "सन्देशसहित राष्ट्रिय सभामा फिर्ता",
  "Re-passed after Accepting or Rejecting the Amendments": "संशोधन स्वीकार वा अस्वीकार गरी पुनः पारित",
  "Bill Authentication By Speaker": "सभामुखद्वारा प्रमाणीकरण", "Sent to President Office for Certification": "प्रमाणीकरणका लागि राष्ट्रपति कार्यालयमा पठाइएको",
  "Certified By President": "राष्ट्रपतिबाट प्रमाणीकरण",
  "Emergency Time": "आकस्मिक समय", "Special Hour": "विशेष समय", "Zero Hour": "शून्य समय", "Others": "अन्य", "Other": "अन्य",
  "Bill Discussion": "विधेयकमाथि छलफल", "Agenda not available yet": "कार्यसूची अझै उपलब्ध छैन", "Answers to questions": "प्रश्नको जवाफ",
  "Political Biography": "राजनीतिक परिचय", "Previous Experience": "अघिल्लो अनुभव", "Awards and Honors": "पुरस्कार र सम्मान",
  "Current Affiliation": "हालको आबद्धता", "Additional Information": "थप जानकारी",
  "Committee for Legislation Management": "विधायन व्यवस्थापन समिति", "Finance Committee": "अर्थ समिति",
  "Federalism Strengthening and National Concerns Committee": "संघीयता सबलीकरण तथा राष्ट्रिय सरोकार समिति",
  "Parliamentary Hearing Committee (Joint)": "संसदीय सुनुवाइ समिति (संयुक्त)",
  "International Relations and Tourism Committee (IRTC)": "अन्तर्राष्ट्रिय सम्बन्ध तथा पर्यटन समिति",
  "Agriculture and Natural Resources Committee": "कृषि तथा प्राकृतिक स्रोत समिति",
  "Development, Economic Affairs and Good Governance Committee": "विकास, आर्थिक मामिला तथा सुशासन समिति",
  "Industry, Commerce, Labour and Consumer Welfare Committee": "उद्योग, वाणिज्य, श्रम तथा उपभोक्ता हित समिति",
  "Public Accounts Committee": "सार्वजनिक लेखा समिति", "Law, Justice and Human Rights Committee": "कानुन, न्याय तथा मानव अधिकार समिति",
  "Women and Social Affairs Committee": "महिला तथा सामाजिक समिति", "Public Policy and Delegated Legislation Committee": "सार्वजनिक नीति तथा प्रत्यायोजित व्यवस्थापन समिति",
  "Education, Health and Information Technology Committee": "शिक्षा, स्वास्थ्य तथा सूचना प्रविधि समिति",
  "Infrastructure Development Committee": "पूर्वाधार विकास समिति", "State Affairs and Good Governance Committee": "राज्यव्यवस्था तथा सुशासन समिति",
  "Education Committee": "शिक्षा समिति",
  "Committee for Monitoring and Evaluation of the Implementation of the Directive Principles, Policies and Obligations of the State (Joint)": "राज्यका निर्देशक सिद्धान्त, नीति र दायित्वको कार्यान्वयन अनुगमन तथा मूल्याङ्कन समिति (संयुक्त)",
};
const tr = (s) => (NE && s ? DICT[s] || DICT[String(s).trim()] || s : s);
const MONTHS_NE = ["जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन", "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/* Meeting titles: "House of Representatives Meeting - 2 April 2026", "Finance Committee - Meeting 12". */
const mtitle = (t) => {
  if (!NE || !t) return t;
  let m = /^(House of Representatives|National Assembly|Joint Parliament) Meeting - (\d+) (\w+) (\d{4})(.*)$/.exec(t);
  if (m) return `${DICT[m[1]]} बैठक - ${MONTHS_NE[MONTHS_LONG.indexOf(m[3])] || m[3]} ${m[2]}, ${m[4]}${m[5].replace("(meeting", "(बैठक")}`;
  m = /^(.*) - Meeting (\d+)$/.exec(t);
  if (m) return `${DICT[m[1]] || m[1]} - बैठक ${m[2]}`;
  return t;
};
const PARTY_SHORT_NE = {
  "Rastriya Swatantra Party": "रास्वपा", "Nepali Congress": "कांग्रेस", "Communist Party of Nepal (UML)": "एमाले",
  "Nepali Communist Party": "नेकपा", "Shram Sanskriti Party": "श्रम संस्कृति", "Rastriya Prajatantra Party": "राप्रपा",
  "Janata Samajwadi Party Nepal": "जसपा नेपाल", "Independent": "स्वतन्त्र", "Rastriya Janamorcha": "राष्ट्रिय जनमोर्चा", "No party": "दलबाहेक",
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (n) => (n == null ? "" : Number(n).toLocaleString("en-US"));
const pct = (n) => `${n}%`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso, year = true) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `<span class="date">${(NE ? MONTHS_NE : MONTHS)[+m[2] - 1]} ${+m[3]}${year ? `, ${m[1]}` : ""}</span>` : esc(iso || "");
};
const CH = { hor: "House of Representatives", na: "National Assembly" };
const CHS = { hor: "House", na: "Nat. Assembly" };
const chName = (c) => L(CH[c] || "", DICT[CH[c]] || "");
const chShort = (c) => L(CHS[c] || "", { hor: "प्रतिनिधि सभा", na: "राष्ट्रिय सभा" }[c] || "");
const PARTY_SHORT = {
  "Rastriya Swatantra Party": "RSP", "Nepali Congress": "NC", "Communist Party of Nepal (UML)": "UML",
  "Nepali Communist Party": "NCP", "Shram Sanskriti Party": "SSP", "Rastriya Prajatantra Party": "RPP",
  "Janata Samajwadi Party Nepal": "JSP", "Independent": "Ind.", "Rastriya Janamorcha": "RJM",
};
const short = (p) => (NE ? PARTY_SHORT_NE[p] : PARTY_SHORT[p]) || p || "";
const partyName = (m) => (NE ? m.pne || m.party : m.party) || "";
const nm = (m) => (NE ? m.ne || m.name : m.name);
const office = (m) => (m.office ? esc(tr(m.office)) : "");
const LOW = 60; // attendance below this is flagged

/* Machine translation: English first, the Nepali original one click away. */
const MT_TIP = "Machine translation from the Nepali original. Names and figures can come out wrong.";
const mtTag = `<span class="mt" data-tip="${MT_TIP}">Machine translation</span>`;
const isNe = (t) => /[\u0900-\u097f]/.test(t || "");
const nl = (t) => esc(t).replace(/\n/g, "<br>");
const bilingual = (en, ne, cls = "") => (en && !NE
  ? `<div class="${cls}">${nl(en)}</div><details class="orig"><summary>${mtTag} · Nepali original</summary><div class="ne">${nl(ne)}</div></details>`
  : `<div class="ne ${cls}">${nl(ne)}</div>`);
const dur = (d) => (NE && d ? d.replace(/\bhr\b/g, "घण्टा").replace(/\bmin\b/g, "मिनेट") : d);
const plural = (n, w, wne) => (NE ? `${num(n)} ${wne}` : `${num(n)} ${w}${n === 1 ? "" : "s"}`);
const clip = (t, n) => (t.length > n ? `${t.slice(0, n)}…` : t);

const meter = (a) => (a && a.n ? `<span class="meter${a.pct < LOW ? " low" : ""}"><i style="width:${a.pct}%"></i></span>${a.pct}%` : `<span class="muted">${L("no sittings", "बैठक छैन")}</span>`);
const mlink = (m) => `<a href="#/member/${m.id}">${esc(nm(m))}</a>`;
const seatName = (m) => esc((NE ? m.seat_ne || m.seat : m.seat) || "");
const seatOf = (m) => (m.el === "proportional" ? `${L("PR list", "समानुपातिक")}${m.seat ? ` · ${seatName(m)}` : ""}` : seatName(m));

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
        || `<tr><td colspan="${cols.length}" class="muted">${L("Nothing matches.", "केही भेटिएन।")}</td></tr>`}</tbody></table></div>
      <div class="pager"><span>${data.length > size ? `${num(page * size + 1)} ${L("to", "देखि")} ${num(Math.min(data.length, page * size + size))}, ${L("of", "जम्मा")} ` : ""}${num(data.length)}</span>
      ${data.length > size ? `<button data-p="-1" ${page ? "" : "disabled"}>${L("Previous", "अघिल्लो")}</button><button data-p="1" ${page < pages - 1 ? "" : "disabled"}>${L("Next", "अर्को")}</button>` : ""}</div>`;
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
  `<a href="#/meeting/${id}" aria-label="${esc(title)}"><i class="${s === "p" ? "p" : s === "a" ? "a" : s === "h" || s === "partial" ? "h" : ""}" data-tip="${esc(`${mtitle(title)} · ${s === "p" ? L("present", "उपस्थित") : s === "a" ? L("absent", "अनुपस्थित") : s || "—"}`)}"></i></a>`).join("")}</div>`;
const legend = () => `<div class="legend"><span><i class="p"></i>${L("Present", "उपस्थित")}</span><span><i class="a"></i>${L("Absent", "अनुपस्थित")}</span><span><i class="h"></i>${L("Partly present", "आंशिक उपस्थित")}</span></div>`;

const billProgress = (b) => {
  const n = b.steps_total || 0, d = b.steps_done || 0;
  if (!n) return "";
  return `<span class="progress" data-tip="${L(`${d} of ${n} stages done`, `${n} मध्ये ${d} चरण पूरा`)}">${Array.from({ length: n }, (_, i) => `<i class="${i < d ? "d" : i === d ? "c" : ""}"></i>`).join("")}</span>`;
};
const billName = (b) => (NE ? `<span class="ne">${esc(b.title_ne)}</span>` : b.title ? esc(b.title) : b.title_mt ? `${esc(b.title_mt)} <span class="mt" data-tip="${MT_TIP}">MT</span>` : `<span class="ne">${esc(b.title_ne)}</span>`);

function monthBars(months) {
  if (!months?.length) return "";
  return `<div style="display:flex;align-items:flex-end;gap:6px;height:120px;border-bottom:3px solid var(--ink);margin-top:8px">${months.map(([k, n, p]) => {
    const share = n ? p / n : 0;
    return `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%;align-items:center"><b class="small">${Math.round(share * 100)}%</b><i data-tip="${esc(L(`${k}: ${p} of ${n} sittings`, `${k}: ${n} मध्ये ${p} बैठक`))}" style="display:block;width:100%;max-width:46px;height:${Math.round(share * 100)}%;background:${share < LOW / 100 ? "var(--out)" : "var(--in)"}"></i></div>`;
  }).join("")}</div><div style="display:flex;gap:6px;margin-top:6px">${months.map(([k]) => `<span class="small" style="flex:1;text-align:center;font-weight:700">${(NE ? MONTHS_NE : MONTHS)[+k.slice(5) - 1]}</span>`).join("")}</div>`;
}
const streakText = (m) => (m.streak >= 2 ? L(`Has missed the last <b>${m.streak}</b> sittings in a row, since ${day(m.streak_from)}.`, `${day(m.streak_from)} देखि लगातार पछिल्ला <b>${m.streak}</b> बैठकमा अनुपस्थित।`) : "");

/* Topic chips; labels come from topics.json, loaded once. */
let TOPIC = {};
const topicName = (t) => (TOPIC[t] ? L(TOPIC[t].label, TOPIC[t].ne) : t);
const chips = (ids) => (ids?.length ? `<span class="chips">${ids.map((t) => `<a class="chip" href="#/topic/${t}">${esc(topicName(t))}</a>`).join("")}</span>` : "");

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
    <p class="kicker">${L("Federal Parliament · term elected March 2026", "सङ्घीय संसद · फागुन २०८२ मा निर्वाचित")}</p>
    <h1>${L(`${num(horSit.length)} sittings. ${num(under)} MPs missed more than ${100 - LOW}% of them.`, `${num(horSit.length)} बैठक। ${num(under)} सांसद ${100 - LOW}% भन्दा बढीमा अनुपस्थित।`)}</h1>
    <p class="lede">${L(`The House of Representatives has met ${num(horSit.length)} times since it was sworn in on March 26, 2026. The average member was there for ${avg}% of them. Nepal doesn't publish how each MP votes, so attendance, committee work and floor speeches are the best record of what members actually do.`,
      `प्रतिनिधि सभाको शपथ भएदेखि ${num(horSit.length)} पटक बैठक बसेको छ। औसत सदस्य तीमध्ये ${avg}% मा उपस्थित भए। नेपालमा कुन सांसदले कसरी मत दिए भन्ने सार्वजनिक हुँदैन, त्यसैले उपस्थिति, समितिको काम र सदनमा बोलेका कुरा नै सांसदले के गर्छन् भन्ने सबैभन्दा राम्रो अभिलेख हो।`)}</p>
    <div class="tiles">
      <div class="tile"><b>${num(members.length)}</b><span>${L("Members", "सदस्य")}</span><small>${num(members.filter((m) => m.ch === "hor").length)} ${L("House", "प्रतिनिधि सभा")} · ${num(members.filter((m) => m.ch === "na").length)} ${L("National Assembly", "राष्ट्रिय सभा")}</small></div>
      <div class="tile"><b>${avg}%</b><span>${L("Average House attendance", "प्रतिनिधि सभामा औसत उपस्थिति")}</span></div>
      <div class="tile hot"><b>${num(under)}</b><span>${L(`MPs under ${LOW}%`, `${LOW}% भन्दा कम उपस्थित सांसद`)}</span><small>${L("of House sittings", "प्रतिनिधि सभा बैठकमा")}</small></div>
      <div class="tile"><b>${num(bills.length)}</b><span>${L("Bills on record", "दर्ता विधेयक")}</span><small>${num(passed)} ${L("completed", "पूरा")}</small></div>
      <div class="tile"><b>${num(cmteMeetings)}</b><span>${L("Committee meetings", "समिति बैठक")}</span></div>
    </div>
    <div class="grid">
      <section class="sec"><h2>${L("Missing the most sittings", "सबैभन्दा धेरै बैठकमा अनुपस्थित")}</h2>
        <ol class="rank">${worst.map((m) => `<li><span>${mlink(m)}<span class="sub">${m.office ? `<b>${office(m)}</b> · ` : ""}${esc(short(m.party))} · ${seatOf(m)}</span></span><span class="v">${m.house.pct}%</span></li>`).join("")}</ol>
        <p class="small muted">${L(`${worst.filter((m) => m.office).length} of these ${worst.length} hold a government office. Ministers are only required in the chamber when their portfolio is on the agenda.`, `यी ${worst.length} मध्ये ${worst.filter((m) => m.office).length} जना सरकारी पदमा छन्। मन्त्रीको मन्त्रालयसँग सम्बन्धित कार्यसूची हुँदा मात्र सदनमा उपस्थित हुनुपर्छ।`)} <a href="#/attendance">${L("Full attendance ranking →", "पूरा उपस्थिति सूची →")}</a></p>
      </section>
      <section class="sec"><h2>${L("Bills that moved last", "हालै अघि बढेका विधेयक")}</h2>
        <div class="tablewrap"><table><thead><tr><th>${L("Bill", "विधेयक")}</th><th>${L("Stage", "चरण")}</th><th class="num">${L("Last step", "अन्तिम चरण")}</th></tr></thead><tbody>
        ${moving.map((b) => `<tr><td><a href="#/bill/${b.id}">${billName(b)}</a><div class="small muted">${esc(NE ? "" : b.presented_by || "")}</div></td><td>${billProgress(b)}<div class="small">${esc(tr(b.current_step) || "")}</div></td><td class="num">${day(b.last_action)}</td></tr>`).join("")}
        </tbody></table></div>
        <p class="small"><a href="#/bills">${L(`All ${num(bills.length)} bills →`, `सबै ${num(bills.length)} विधेयक →`)}</a></p>
      </section>
    </div>
    <section class="sec"><h2>${L("Turnout, sitting by sitting", "हरेक बैठकको उपस्थिति")}</h2>
      <p class="small muted">${L("Share of House members marked present at each sitting, oldest on the left.", "हरेक बैठकमा उपस्थित प्रतिनिधि सभा सदस्यको अनुपात, पुरानो बायाँतिर।")}</p>
      ${turnout(horSit)}
    </section>`;
}

function turnout(sits) {
  const rows = [...sits].reverse();
  return `<div style="display:flex;align-items:flex-end;gap:2px;height:160px;border-bottom:3px solid var(--ink)">${rows.map((s) => {
    const tot = s.in + s.out + s.part, share = tot ? (s.in + s.part / 2) / tot : 0;
    return `<a href="#/meeting/${s.id}" style="flex:1;height:100%;display:flex;align-items:flex-end;min-width:2px"><i data-tip="${esc(L(`${s.title}: ${s.in} of ${tot} present`, `${mtitle(s.title)}: ${tot} मध्ये ${s.in} उपस्थित`))}" style="display:block;width:100%;height:${Math.round(share * 100)}%;background:${share < 0.6 ? "var(--out)" : "var(--in)"}"></i></a>`;
  }).join("")}</div>
  <div class="legend"><span>${day(rows[0]?.date)}</span><span style="margin-left:auto">${day(rows.at(-1)?.date)}</span></div>`;
}

async function membersPage(q) {
  const members = await load("members");
  const parties = [...new Set(members.map((m) => m.party))].sort();
  app.innerHTML = `<p class="kicker">${L("Both houses", "दुवै सदन")}</p><h1>${L("Members", "सदस्य")}</h1>
    <p class="lede">${L("Every sitting member of the House of Representatives and the National Assembly, with how often they turn up.", "प्रतिनिधि सभा र राष्ट्रिय सभाका सबै बहालवाला सदस्य, र उनीहरू कति पटक उपस्थित हुन्छन्।")}</p>
    <div class="filters">
      <input type="search" id="q" placeholder="${L("Name, seat or district", "नाम, क्षेत्र वा जिल्ला")}" value="${esc(q || "")}">
      <select id="ch"><option value="">${L("Both houses", "दुवै सदन")}</option><option value="hor">${chName("hor")}</option><option value="na">${chName("na")}</option></select>
      <select id="pa"><option value="">${L("All parties", "सबै दल")}</option>${parties.map((p) => `<option value="${esc(p)}">${esc(NE ? members.find((m) => m.party === p)?.pne || p : p)}</option>`).join("")}</select>
    </div><div id="t"></div>`;
  const t = table(document.getElementById("t"), members, [
    { h: L("Member", "सदस्य"), v: (m) => `${mlink(m)}${m.office ? ` <span class="tag red">${office(m)}</span>` : ""}${NE ? "" : `<div class="small ne muted">${esc(m.ne || "")}</div>`}`, s: (m) => nm(m) },
    { h: L("Party", "दल"), v: (m) => esc(short(m.party)), s: (m) => m.party, nw: true },
    { h: L("House", "सदन"), v: (m) => chShort(m.ch), s: (m) => m.ch, nw: true },
    { h: L("Seat", "क्षेत्र"), v: seatOf, s: (m) => m.seat },
    { h: L("Sittings", "बैठक"), v: (m) => meter(m.house), s: (m) => m.house?.pct, num: true, nw: true },
    { h: L("Committee", "समिति"), v: (m) => meter(m.cmte), s: (m) => m.cmte?.pct, num: true, nw: true },
    { h: L("Speeches", "भाषण"), v: (m) => num(m.st), s: (m) => m.st, num: true },
  ], { sort: 0 });
  const apply = () => {
    const s = document.getElementById("q").value.trim().toLowerCase();
    const ch = document.getElementById("ch").value, pa = document.getElementById("pa").value;
    t.set(members.filter((m) => (!ch || m.ch === ch) && (!pa || m.party === pa) &&
      (!s || `${m.name} ${m.ne} ${m.seat} ${m.seat_ne} ${m.party} ${m.pne}`.toLowerCase().includes(s))));
  };
  ["q", "ch", "pa"].forEach((id) => document.getElementById(id).addEventListener("input", apply));
  apply();
}

/* How a directly elected member won their seat, from the Election Commission. */
function raceHtml(m) {
  const r = m.race;
  if (!r) return "";
  const max = r.field[0]?.[2] || 1;
  const bg = [[L("Age at the election", "निर्वाचनताका उमेर"), r.age], [L("Education", "शिक्षा"), NE ? r.qualification_ne || r.qualification : r.qualification], [L("Studied at", "अध्ययन संस्था"), r.institution]].filter(([, v]) => v);
  const size = r.margin_pct < 3 ? ["a narrow", "सानो"] : r.margin_pct > 20 ? ["a wide", "ठूलो"] : ["a", ""];
  return `<section class="sec"><h2>${L("The 2026 election", "२०८२ को निर्वाचन")}</h2>
    <p class="lede" style="margin-bottom:18px">${L(`Won ${esc(m.seat)} with <b>${num(r.votes)}</b> votes, ${r.share}% of the ${num(r.total)} cast for ${r.n} candidates, ${size[0]} lead of <b>${num(r.margin)}</b> over the runner-up.`,
      `${seatName(m)} बाट <b>${num(r.votes)}</b> मतसहित विजयी, ${r.n} उम्मेदवारले पाएको ${num(r.total)} मतको ${r.share}%। उपविजेताभन्दा <b>${num(r.margin)}</b> मतको ${size[1]} अन्तर।`)}</p>
    <div class="grid"><div>${r.field.map(([name, party, votes, won, partyNe]) => `<div class="cand${won ? " won" : ""}"><div>${won ? `<b>${esc(nm(m))}</b>` : `<span class="ne">${esc(name)}</span>`}<span class="small muted"> · ${esc(NE ? partyNe || party : party)}</span></div>
        <div class="bar"><i style="width:${(100 * votes) / max}%"></i><span>${num(votes)}</span></div></div>`).join("")}
      ${r.n > r.field.length ? `<p class="small muted">${L(`and ${r.n - r.field.length} more candidates.`, `र अरू ${r.n - r.field.length} उम्मेदवार।`)}</p>` : ""}</div>
      <div>${bg.length || r.experience ? `<h3>${L("What they told the Election Commission", "निर्वाचन आयोगमा बुझाएको विवरण")}</h3><dl class="facts">${bg.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}
        ${r.experience ? `<dt>${L("Experience", "अनुभव")}</dt><dd>${bilingual(r.experience_en, r.experience)}</dd>` : ""}</dl>` : ""}</div></div>
    <p class="small muted">${L("Source:", "स्रोत:")} <a href="https://result.election.gov.np/ElectionResultCentral2082.aspx" target="_blank" rel="noopener">${L("Election Commission, Nepal", "निर्वाचन आयोग, नेपाल")}</a>. ${L("Background details are as each candidate filed them.", "विवरण उम्मेदवार आफैँले बुझाए अनुसार।")}</p></section>`;
}

async function memberPage(id) {
  const m = await tryLoad(`m/${id}`);
  if (!m) { app.innerHTML = `<h1>${L("Not found", "भेटिएन")}</h1>`; return; }
  const sit = m.att.filter((r) => r[3] === "h"), cm = m.att.filter((r) => r[3] === "c");
  const missed = sit.filter((r) => r[2] === "a");
  const bio = Object.entries(m.bio || {}).filter(([, v]) => v);
  app.innerHTML = `
    <div class="profile">${m.photo ? `<img src="${esc(m.photo)}" alt="" onerror="this.remove()">` : ""}
      <div><p class="kicker">${m.office ? `${office(m)} · ` : ""}${chName(m.ch)}</p>
      <h1 class="long">${esc(nm(m))}${NE ? "" : `<span class="ne">${esc(m.ne || "")}</span>`}</h1>
      <p><span class="tag">${esc(partyName(m))}</span> <span class="tag line">${m.el === "proportional" ? L("Proportional list", "समानुपातिक") : m.el === "direct" ? L("Elected directly", "प्रत्यक्ष निर्वाचित") : m.prov ? L("Elected by the province", "प्रदेशबाट निर्वाचित") : L("Nominated", "मनोनीत")}</span></p></div>
    </div>
    <div class="tiles">
      <div class="tile${m.house?.pct < LOW ? " hot" : ""}"><b>${m.house?.n ? `${m.house.pct}%` : "–"}</b><span>${L("Sittings attended", "सदन बैठकमा उपस्थिति")}</span><small>${m.house ? L(`${m.house.in} of ${m.house.n}`, `${m.house.n} मध्ये ${m.house.in}`) : ""}</small></div>
      <div class="tile"><b>${m.cmte?.n ? `${m.cmte.pct}%` : "–"}</b><span>${L("Committee meetings", "समिति बैठक")}</span><small>${m.cmte ? L(`${m.cmte.in} of ${m.cmte.n}`, `${m.cmte.n} मध्ये ${m.cmte.in}`) : ""}</small></div>
      <div class="tile"><b>${num(m.statements.length)}</b><span>${L("Floor statements", "सदनमा बोलेको")}</span></div>
      <div class="tile"><b>${num(m.cm.length)}</b><span>${L("Committees", "समिति")}</span></div>
    </div>
    <div class="grid">
      <section class="sec"><h2>${L("Every sitting", "हरेक बैठक")}</h2>${streakText(m) ? `<p class="quote">${streakText(m)}</p>` : ""}${m.longest >= 3 ? `<p class="small">${L(`Longest run of missed sittings: <b>${m.longest}</b>, starting ${day(m.longest_from)}.`, `लगातार सबैभन्दा लामो अनुपस्थिति: <b>${m.longest}</b> बैठक, ${day(m.longest_from)} देखि।`)}</p>` : ""}${sit.length ? strip(sit) + legend() : `<p class="muted">${L("No sittings recorded.", "कुनै बैठक अभिलेखमा छैन।")}</p>`}
        ${missed.length ? `<h3 style="margin-top:18px">${L("Missed", "अनुपस्थित")} (${missed.length})</h3><p class="small">${missed.map((r) => `<a href="#/meeting/${r[0]}">${day(r[1])}</a>`).join(" · ")}</p>` : ""}
        ${m.months?.length ? `<h2 style="margin-top:28px">${L("Month by month", "महिनागत")}</h2>${monthBars(m.months)}` : ""}
        ${cm.length ? `<h2 style="margin-top:28px">${L("Committee meetings", "समिति बैठक")}</h2>${strip(cm)}` : ""}
      </section>
      <section class="sec"><h2>${L("Profile", "परिचय")}</h2>
        <dl class="facts">
          <dt>${L("Seat", "क्षेत्र")}</dt><dd>${seatOf(m) || "–"}</dd>
          ${m.edu ? `<dt>${L("Education", "शिक्षा")}</dt><dd>${esc(m.edu)}</dd>` : ""}
          ${m.start ? `<dt>${L("Sworn in", "शपथ")}</dt><dd>${day(m.start)}</dd>` : ""}
          ${m.cm.length ? `<dt>${L("Committees", "समिति")}</dt><dd>${m.cm.map((c) => esc(tr(c))).join("<br>")}</dd>` : ""}
          ${bio.map(([k, v]) => `<dt>${esc(tr(k))}</dt><dd>${bilingual(m.bio_en?.[k], v)}</dd>`).join("")}
        </dl>
        ${(m.terms || []).length > 1 ? `<h3>${L("Earlier terms", "अघिल्ला कार्यकाल")}</h3><p class="small">${m.terms.slice(1).map((t) => `${esc(t.years)}: ${esc(t.org)}`).join("<br>")}</p>` : ""}
      </section>
    </div>
    ${raceHtml(m)}
    <section class="sec"><h2>${L("Floor statements", "सदनमा बोलेका कुरा")}</h2>${m.topics?.length ? `<p class="small"><b>${L("Spoke on:", "बोलेका विषय:")}</b> ${m.topics.map(([t, n]) => `<a class="chip" href="#/topic/${t}">${esc(topicName(t))} <b>${n}</b></a>`).join("")}</p>` : ""}
      ${m.statements.length ? `<div class="tablewrap"><table><thead><tr><th>${L("Occasion", "प्रसङ्ग")}</th><th>${L("When", "कहिले")}</th><th></th></tr></thead><tbody>${m.statements.map((s) =>
        `<tr><td>${s.kind_en && !NE ? `${esc(s.kind_en)} <span class="mt" data-tip="${MT_TIP}">MT</span>` : `<span class="${isNe(s.kind) ? "ne" : ""}">${esc(tr(s.kind))}</span>`}${s.text ? (s.text_en && !NE ? `<div class="small">${esc(clip(s.text_en, 400))} ${mtTag}</div><details class="orig small"><summary>Nepali original</summary><div class="ne">${nl(s.text)}</div></details>` : `<div class="small ne">${esc(clip(s.text, 400))}</div>`) : ""}</td><td>${esc(NE ? String(s.context || "").replace(/^(House of Representatives|National Assembly)/, (x) => DICT[x])
          .replace(/(\d+)(?:st|nd|rd|th) (\w{3})\w* (\d{4})/, (x, d, mo, y) => { const i = MONTHS.indexOf(mo); return i < 0 ? x : `${MONTHS_NE[i]} ${d}, ${y}`; }) : s.context)}</td><td class="nw">${s.video ? `<a href="${esc(s.video)}" target="_blank" rel="noopener">${L("Watch", "हेर्नुहोस्")}</a>` : ""}</td></tr>`).join("")}</tbody></table></div>`
        : `<p class="muted">${L("None recorded yet.", "अहिलेसम्म अभिलेख छैन।")}</p>`}
    </section>
    <p class="small muted">${L("Source:", "स्रोत:")} <a href="https://digital.parliament.gov.np/members/${esc(m.id)}" target="_blank" rel="noopener">${L("this member's page on the parliament portal", "संसदको पोर्टलमा यो सदस्यको पृष्ठ")}</a>.</p>`;
}

async function attendance() {
  const [members, sittings] = await Promise.all([load("members"), load("sittings")]);
  app.innerHTML = `<p class="kicker">${L("Who shows up", "को आउँछन्")}</p><h1>${L("Attendance", "उपस्थिति")}</h1>
    <p class="lede">${L("Each MP's attendance as the Parliament Secretariat records it. A partial attendance counts as half. Ministers are only required in the chamber when their portfolio is up, which pulls their numbers down.", "संसद सचिवालयको अभिलेख अनुसार हरेक सांसदको उपस्थिति। आंशिक उपस्थितिलाई आधा गनिएको छ। मन्त्रीले आफ्नो मन्त्रालयको विषय हुँदा मात्र सदनमा आउनुपर्ने भएकाले उनीहरूको उपस्थिति कम देखिन्छ।")}</p>
    <div class="filters"><button data-ch="hor" class="on">${chShort("hor")}</button><button data-ch="na">${chName("na")}</button></div>
    <div class="grid"><section class="sec"><h2>${L("Lowest", "सबैभन्दा कम")}</h2><ol class="rank" id="lo"></ol></section>
    <section class="sec"><h2>${L("Highest", "सबैभन्दा बढी")}</h2><ol class="rank" id="hi"></ol></section></div>
    <section class="sec"><h2>${L("Absent right now", "अहिले लगातार अनुपस्थित")}</h2><p class="small muted">${L("Members who have missed three or more sittings in a row, up to the latest one.", "पछिल्लो बैठकसम्म लगातार तीन वा बढी बैठकमा अनुपस्थित सदस्य।")}</p><ol class="rank" id="st"></ol></section>
    <section class="sec"><h2>${L("Turnout by sitting", "बैठकअनुसार उपस्थिति")}</h2><div id="tu"></div></section>`;
  const draw = (ch) => {
    const rows = members.filter((m) => m.ch === ch && m.house?.n).sort((a, b) => a.house.pct - b.house.pct || a.house.in - b.house.in);
    const li = (m) => `<li><span>${mlink(m)}<span class="sub">${m.office ? `<b>${office(m)}</b> · ` : ""}${esc(short(m.party))} · ${L(`${m.house.in} of ${m.house.n} sittings`, `${m.house.n} मध्ये ${m.house.in} बैठक`)}</span></span><span class="v">${m.house.pct}%</span></li>`;
    document.getElementById("lo").innerHTML = rows.slice(0, 15).map(li).join("");
    document.getElementById("hi").innerHTML = [...rows].reverse().slice(0, 15).map(li).join("");
    document.getElementById("tu").innerHTML = turnout(sittings.filter((s) => s.ch === ch));
    const st = members.filter((m) => m.ch === ch && m.streak >= 3).sort((a, b) => b.streak - a.streak);
    document.getElementById("st").innerHTML = st.map((m) => `<li><span>${mlink(m)}<span class="sub">${m.office ? `<b>${office(m)}</b> · ` : ""}${esc(short(m.party))} · ${L("since", "देखि")} ${day(m.streak_from)}</span></span><span class="v">${m.streak}</span></li>`).join("") || `<li class="muted">${L("Nobody.", "कोही छैन।")}</li>`;
    app.querySelectorAll("button[data-ch]").forEach((b) => b.classList.toggle("on", b.dataset.ch === ch));
  };
  app.querySelectorAll("button[data-ch]").forEach((b) => b.addEventListener("click", () => draw(b.dataset.ch)));
  draw("hor");
}

async function billsPage() {
  const bills = await load("bills");
  app.innerHTML = `<p class="kicker">${L("Legislation", "कानून निर्माण")}</p><h1>${L("Bills", "विधेयक")}</h1>
    <p class="lede">${L("Every bill on the parliament portal and how far it has got, from registration to the President's signature. Titles are in English where the portal's summary gives one.", "संसदको पोर्टलमा रहेका सबै विधेयक, र दर्तादेखि राष्ट्रपतिको प्रमाणीकरणसम्म ती कहाँ पुगे।")}</p>
    <div class="filters"><input type="search" id="q" placeholder="${L("Search bills", "विधेयक खोज्नुहोस्")}"></div><div id="t"></div>`;
  const t = table(document.getElementById("t"), bills, [
    { h: L("No.", "क्र.सं."), v: (b) => num(b.number), s: (b) => b.number, num: true },
    { h: L("Bill", "विधेयक"), v: (b) => `<a href="#/bill/${b.id}">${billName(b)}</a>${NE ? "" : `<div class="small muted">${esc(b.presented_by || "")}</div>`}`, s: (b) => (NE ? b.title_ne : b.title || b.title_ne) },
    { h: L("Status", "अवस्था"), v: (b) => `<span class="tag${/progress/i.test(b.status) ? " line" : ""}">${esc(tr(b.status) || "")}</span>`, s: (b) => b.status, nw: true },
    { h: L("Progress", "प्रगति"), v: (b) => `${billProgress(b)}<div class="small">${esc(tr(b.current_step) || "")}</div>`, s: (b) => b.steps_done },
    { h: L("Registered", "दर्ता"), v: (b) => day(b.registered), s: (b) => b.registered, nw: true },
    { h: L("Last step", "अन्तिम चरण"), v: (b) => day(b.last_action), s: (b) => b.last_action, nw: true },
  ], { sort: 5, dir: -1 });
  document.getElementById("q").addEventListener("input", (e) => {
    const s = e.target.value.trim().toLowerCase();
    t.set(bills.filter((b) => !s || `${b.title} ${b.title_mt} ${b.title_ne} ${b.presented_by} ${b.ministry_ne}`.toLowerCase().includes(s)));
  });
}

function summaryHtml(text) {
  const paras = esc(text || "").split("\n").filter(Boolean);
  const p = (x) => x.map((t) => `<p>${t}</p>`).join("");
  return `<div class="prose small">${p(paras.slice(0, 2))}${paras.length > 2 ? `<details><summary>${L("Read the full summary", "पूरा सारांश पढ्नुहोस्")}</summary>${p(paras.slice(2))}</details>` : ""}</div>`;
}

async function billPage(id) {
  const b = await tryLoad(`b/${id}`);
  if (!b) { app.innerHTML = `<h1>${L("Not found", "भेटिएन")}</h1>`; return; }
  let house = null;
  const steps = b.steps.map((s) => {
    const head = s.house !== house ? `<li class="house">${esc(tr(s.house) || "")}</li>` : "";
    house = s.house;
    return `${head}<li class="${esc(s.state)}"><span>${esc(tr(s.step))}${s.docs.map((d) => ` <a class="small" href="${esc(d)}" target="_blank" rel="noopener">PDF</a>`).join("")}</span><span class="nw">${s.date ? day(s.date) : ""}</span></li>`;
  }).join("");
  app.innerHTML = `<p class="kicker">${L("Bill no.", "विधेयक नं.")} ${num(b.number)} · ${esc(tr(b.origin) || "")}</p>
    <h1 class="long">${NE ? `<span class="ne" style="font-size:1em;display:inline">${esc(b.title_ne)}</span>` : `${b.title ? esc(b.title) : b.title_mt ? esc(b.title_mt) : ""}<span class="ne">${esc(b.title_ne)}</span>`}</h1>${!NE && !b.title && b.title_mt ? `<p>${mtTag}</p>` : ""}
    <p>${[b.status, ...(b.tags || [])].map((t, i) => `<span class="tag${i ? " line" : " red"}">${esc(tr(t))}</span>`).join(" ")} ${chips((await load("bills")).find((x) => x.id === b.id)?.topics)}</p>
    <div class="grid" style="margin-top:24px">
      <section class="sec"><h2>${L("Where it stands", "अहिलेको अवस्था")}</h2>
        <dl class="facts"><dt>${L("Presented by", "प्रस्तुतकर्ता")}</dt><dd>${esc(b.presented_by || "–")}</dd><dt>${L("Ministry", "मन्त्रालय")}</dt><dd class="ne">${esc(b.ministry_ne || "–")}</dd>
        <dt>${L("Registered", "दर्ता")}</dt><dd>${day(b.registered)}</dd><dt>${L("Current step", "हालको चरण")}</dt><dd>${esc(tr(b.current_step) || "–")}</dd><dt>${L("In process", "प्रक्रियामा")}</dt><dd>${num(b.days_in_process)} ${L("days", "दिन")}</dd></dl>
        <ul class="journey">${steps}</ul></section>
      <section class="sec"><h2>${L("What it does", "विधेयकले के गर्छ")}</h2>${summaryHtml(NE ? b.summary_ne || b.summary : b.summary)}
        <p class="small muted">${L("Summary from the parliament portal.", "सारांश संसदको पोर्टलबाट।")} ${b.pdf ? `<a href="${esc(b.pdf)}" target="_blank" rel="noopener">${L("Read the bill (PDF, Nepali)", "विधेयक पढ्नुहोस् (PDF)")}</a>.` : ""}</p></section>
    </div>`;
}

async function meetingsPage() {
  const meetings = await load("meetings");
  const bodies = [...new Set(meetings.map((m) => m.body).filter(Boolean))].sort();
  app.innerHTML = `<p class="kicker">${L("Sittings and committees", "सदन र समिति")}</p><h1>${L("Meetings", "बैठक")}</h1>
    <p class="lede">${L("House and National Assembly sittings and committee meetings, with the agenda and who turned up.", "प्रतिनिधि सभा, राष्ट्रिय सभा र समितिका बैठक, कार्यसूची र को उपस्थित भए।")}</p>
    <div class="filters"><input type="search" id="q" placeholder="${L("Search agendas and committees", "कार्यसूची वा समिति खोज्नुहोस्")}">
    <select id="b"><option value="">${L("All bodies", "सबै")}</option>${bodies.map((b) => `<option value="${esc(b)}">${esc(tr(b))}</option>`).join("")}</select></div><div id="t"></div>`;
  const t = table(document.getElementById("t"), meetings, [
    { h: L("Date", "मिति"), v: (m) => day(m.date), s: (m) => m.date, nw: true },
    { h: L("Meeting", "बैठक"), v: (m) => `<a href="#/meeting/${m.id}">${esc(mtitle(m.title))}</a>${m.agenda_en && !NE ? `<div class="small">${esc(clip(m.agenda_en, 160))}</div>` : m.agenda ? `<div class="small ne">${esc(clip(tr(m.agenda), 160))}</div>` : ""}`, s: (m) => m.title },
    { h: L("Length", "अवधि"), v: (m) => esc(dur(m.duration) || ""), nw: true },
    { h: L("Present", "उपस्थित"), v: (m) => (m.members ? L(`${m.present} of ${m.members}`, `${m.members} मध्ये ${m.present}`) : ""), s: (m) => (m.members ? m.present / m.members : null), num: true, nw: true },
  ], { sort: 0, dir: -1 });
  const apply = () => {
    const s = document.getElementById("q").value.trim().toLowerCase(), b = document.getElementById("b").value;
    t.set(meetings.filter((m) => (!b || m.body === b) && (!s || `${m.title} ${m.agenda} ${m.agenda_en} ${m.chair}`.toLowerCase().includes(s))));
  };
  ["q", "b"].forEach((x) => document.getElementById(x).addEventListener("input", apply));
}

async function meetingPage(id) {
  const [g, members] = await Promise.all([tryLoad(`g/${id}`), load("members")]);
  if (!g) { app.innerHTML = `<h1>${L("Not found", "भेटिएन")}</h1>`; return; }
  const by = Object.fromEntries(members.map((m) => [m.id, m]));
  const absent = g.attendance.filter((a) => a.status !== "present");
  const person = (a) => { const m = by[a.member]; return `<span class="${a.status === "present" ? "p" : "a"}">${m ? mlink(m) : esc(a.member)} <span class="muted small">${esc(short(m?.party))}</span></span>`; };
  app.innerHTML = `<p class="kicker">${esc(tr(g.body) || L("Meeting", "बैठक"))} · ${day(g.date)}</p><h1 class="long">${esc(mtitle(g.title))}</h1>${g.topics?.length ? `<p>${chips(g.topics)}</p>` : ""}
    <div class="tiles"><div class="tile"><b>${g.members ? Math.round((100 * g.present) / g.members) : "–"}%</b><span>${L("Present", "उपस्थित")}</span><small>${L(`${num(g.present)} of ${num(g.members)}`, `${num(g.members)} मध्ये ${num(g.present)}`)}</small></div>
    <div class="tile${absent.length ? " hot" : ""}"><b>${num(absent.length)}</b><span>${L("Absent", "अनुपस्थित")}</span></div>
    <div class="tile"><b>${esc(dur(g.duration) || "–")}</b><span>${L("Length", "अवधि")}</span><small>${esc(g.start || "")}${g.end ? ` ${L("to", "देखि")} ${esc(g.end)}` : ""}</small></div></div>
    ${g.agenda ? `<section class="sec"><h2>${L("Agenda", "कार्यसूची")}</h2><div class="quote">${bilingual(g.agenda_en, g.agenda)}</div>${g.chair ? `<p class="small">${L("Chaired by", "अध्यक्षता:")} ${esc(g.chair)}</p>` : ""}</section>` : ""}
    ${g.minutes ? `<section class="sec"><h2>${L("Minutes", "निर्णय/माइन्युट")}</h2>${bilingual(g.minutes_en, g.minutes, "prose")}</section>` : ""}
    <section class="sec"><h2>${L("Absent", "अनुपस्थित")}</h2><div class="people">${absent.map(person).join("") || `<span class="muted">${L("Nobody.", "कोही छैन।")}</span>`}</div></section>
    <section class="sec"><h2>${L("Present", "उपस्थित")}</h2><div class="people">${g.attendance.filter((a) => a.status === "present").map(person).join("")}</div></section>
    <p class="small muted"><a href="https://digital.parliament.gov.np/baithak-detail/${esc(id)}" target="_blank" rel="noopener">${L("This meeting on the parliament portal", "संसदको पोर्टलमा यो बैठक")}</a>${g.recording ? ` · <a href="${esc(g.recording)}" target="_blank" rel="noopener">${L("Recording", "रेकर्डिङ")}</a>` : ""}</p>`;
}

async function partiesPage() {
  const parties = await load("parties");
  const sec = (ch) => {
    const rows = parties.filter((p) => p.ch === ch).sort((a, b) => b.members - a.members);
    const of = (a, b) => L(`${num(a)} of ${num(b)}`, `${num(b)} मध्ये ${num(a)}`);
    return `<section class="sec"><h2>${chName(ch)}</h2>
      <h3>${L("Seats", "सिट")}</h3>${hbars(rows.map((p) => [esc(NE ? short(p.party) : p.party), p.members, num(p.members)]))}
      <h3 style="margin-top:22px">${L("Sittings attended, all members combined", "सबै सदस्यको जम्मा बैठक उपस्थिति")}</h3>${hbars(rows.map((p) => [esc(short(p.party)), p.n ? (100 * p.in) / p.n : 0, p.n ? `${Math.round((100 * p.in) / p.n)}%` : "–", of(p.in, p.n), 100]))}
      <h3 style="margin-top:22px">${L("Committee meetings attended", "समिति बैठक उपस्थिति")}</h3>${hbars(rows.map((p) => [esc(short(p.party)), p.cn ? (100 * p.cin) / p.cn : 0, p.cn ? `${Math.round((100 * p.cin) / p.cn)}%` : "–", of(p.cin, p.cn), 100]))}
      <h3 style="margin-top:22px">${L("Women members", "महिला सदस्य")}</h3>${hbars(rows.map((p) => [esc(short(p.party)), p.members ? (100 * p.women) / p.members : 0, of(p.women, p.members), null, 100]))}
    </section>`;
  };
  app.innerHTML = `<p class="kicker">${L("By party", "दलअनुसार")}</p><h1>${L("Parties", "दल")}</h1><p class="lede">${L("How each party's members show up, counted across every member and every sitting.", "हरेक दलका सदस्य कति उपस्थित हुन्छन्, सबै सदस्य र सबै बैठक जोडेर।")}</p><div class="grid">${sec("hor")}${sec("na")}</div>`;
}

async function weekPage(wk) {
  const [weeks, members, bills] = await Promise.all([load("weeks"), load("members"), load("bills")]);
  if (!weeks.length) { app.innerHTML = `<h1>${L("No weeks yet", "अहिलेसम्म केही छैन")}</h1>`; return; }
  const i = wk ? weeks.findIndex((w) => w.week === wk) : 0;
  const w = weeks[Math.max(0, i)];
  const by = Object.fromEntries(members.map((m) => [m.id, m]));
  const bb = Object.fromEntries(bills.map((b) => [b.id, b]));
  const end = new Date(`${w.week}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 6);
  const prev = weeks[i + 1], next = weeks[i - 1];
  const steps = {};
  w.steps.forEach(([id, step, date]) => (steps[id] ||= []).push([step, date]));
  const missed = w.missed_all.map((id) => by[id]).filter(Boolean);
  const headline = w.sittings.length
    ? L(`${w.sittings.length} sitting${w.sittings.length > 1 ? "s" : ""}, ${w.turnout}% turnout${missed.length ? `, ${missed.length} MPs absent all week` : ""}.`,
      `${w.sittings.length} बैठक, ${w.turnout}% उपस्थिति${missed.length ? `, ${missed.length} सांसद हप्ताभर अनुपस्थित` : ""}।`)
    : w.committee ? L(`No sittings. ${w.committee} committee meetings.`, `सदन बैठक भएन। ${w.committee} समिति बैठक।`) : L("A quiet week.", "शान्त हप्ता।");
  app.innerHTML = `<p class="kicker">${L("The week", "हप्ता")} · ${day(w.week, false)} ${L("to", "देखि")} ${day(end.toISOString())}</p><h1>${headline}</h1>
    <div class="filters">${prev ? `<a href="#/week/${prev.week}">← ${L("Week of", "हप्ता:")} ${day(prev.week)}</a>` : ""}<span style="flex:1"></span>${next ? `<a href="#/week/${next.week}">${L("Week of", "हप्ता:")} ${day(next.week)} →</a>` : ""}</div>
    <div class="tiles"><div class="tile"><b>${w.sittings.length}</b><span>${L("Sittings", "सदन बैठक")}</span></div>
      <div class="tile"><b>${w.turnout ?? "–"}${w.turnout != null ? "%" : ""}</b><span>${L("Turnout", "उपस्थिति")}</span></div>
      <div class="tile"><b>${w.committee}</b><span>${L("Committee meetings", "समिति बैठक")}</span></div>
      <div class="tile"><b>${Object.keys(steps).length}</b><span>${L("Bills that moved", "अघि बढेका विधेयक")}</span></div>
      <div class="tile${missed.length ? " hot" : ""}"><b>${missed.length}</b><span>${L("Absent all week", "हप्ताभर अनुपस्थित")}</span></div></div>
    <div class="grid">
      <section class="sec"><h2>${L("Sittings", "सदन बैठक")}</h2>${w.sittings.length ? `<ul class="journey">${w.sittings.map((s) => `<li class="completed"><a href="#/meeting/${s.id}">${esc(mtitle(s.title))}</a><span>${L(`${s.in} of ${s.n}`, `${s.n} मध्ये ${s.in}`)}</span></li>`).join("")}</ul>` : `<p class="muted">${L("None this week.", "यो हप्ता भएन।")}</p>`}</section>
      <section class="sec"><h2>${L("Bills that moved", "अघि बढेका विधेयक")}</h2>${Object.keys(steps).length ? `<ul class="journey">${Object.entries(steps).map(([id, st]) => `<li class="current"><span><a href="#/bill/${id}">${bb[id] ? billName(bb[id]) : esc(id)}</a><span class="small muted" style="display:block">${st.map((x) => esc(tr(x[0]))).join(" · ")}</span></span><span></span></li>`).join("")}</ul>` : `<p class="muted">${L("No bill changed stage.", "कुनै विधेयकको चरण बदलिएन।")}</p>`}</section>
    </div>
    ${missed.length ? `<section class="sec"><h2>${L("Missed every sitting this week", "यो हप्ताका सबै बैठकमा अनुपस्थित")}</h2><div class="people">${missed.map((m) => `<span class="a">${mlink(m)} <span class="muted small">${esc(short(m.party))}${m.office ? ` · ${office(m)}` : ""}</span></span>`).join("")}</div></section>` : ""}
    ${signup()}
    <p class="small muted">${L("Follow every week with the", "हरेक हप्ता पछ्याउन")} <a href="feed.xml">${L("RSS feed", "RSS फिड")}</a>.</p>`;
}

/* Weekly email via Buttondown; hidden until a newsletter name is set. */
const NEWSLETTER = "";
const signup = () => (NEWSLETTER ? `<section class="sec signup"><h2>${L("Get the week by email", "हप्ताको सार इमेलमा")}</h2>
  <p class="small">${L("One email every week: sittings, turnout, bills that moved and who was absent. Unsubscribe any time.", "हरेक हप्ता एउटा इमेल: बैठक, उपस्थिति, अघि बढेका विधेयक र को अनुपस्थित रहे। जुनसुकै बेला बन्द गर्न सकिन्छ।")}</p>
  <form action="https://buttondown.com/api/emails/embed-subscribe/${NEWSLETTER}" method="post" target="_blank" class="filters">
    <input type="email" name="email" required placeholder="${L("Your email", "तपाईंको इमेल")}" aria-label="${L("Your email", "तपाईंको इमेल")}"><button type="submit">${L("Subscribe", "सदस्य बन्नुहोस्")}</button></form></section>` : "");

/* District map: colour each district by its directly elected MPs' attendance. */
const PROV_EN = ["", "Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpaschim"];
const PROV_NE = ["", "कोशी", "मधेश", "बागमती", "गण्डकी", "लुम्बिनी", "कर्णाली", "सुदूरपश्चिम"];
const PROV = new Proxy([], { get: (_, i) => (NE ? PROV_NE : PROV_EN)[i] });
const bin = (pct) => (pct == null ? 0 : pct < LOW ? 1 : pct < 75 ? 2 : pct < 90 ? 3 : 4);
let geo;
async function mapPage(sel) {
  const [members, places] = await Promise.all([load("members"), tryLoad("places")]);
  const dn = (name) => (NE ? places?.[name] || name : name);
  geo ||= await fetch("districts.json").then((r) => r.json());
  sel = sel && decodeURIComponent(sel);
  const by = {};
  for (const d of geo.districts) by[d.name] = { ...d, fptp: [], pr: [] };
  for (const m of members) {
    if (!m.dist || !by[m.dist]) continue;
    by[m.dist][m.el === "direct" ? "fptp" : "pr"].push(m);
  }
  for (const d of Object.values(by)) {
    const att = d.fptp.filter((m) => m.house?.n);
    const n = att.reduce((a, m) => a + m.house.n, 0), p = att.reduce((a, m) => a + (m.house.pct * m.house.n) / 100, 0);
    d.pct = n ? Math.round((100 * p) / n) : null;
    d.fptp.sort((a, b) => (a.seat || "").localeCompare(b.seat || "", "en", { numeric: true }));
  }
  const names = Object.keys(by).sort((a, b) => dn(a).localeCompare(dn(b), NE ? "ne" : "en"));
  app.innerHTML = `<p class="kicker">${L("Find your MP", "आफ्नो सांसद खोज्नुहोस्")}</p><h1>${L("Map", "नक्सा")}</h1>
    <p class="lede">${L("Each district is shaded by how often its directly elected House members attend sittings, all of its constituencies taken together. Pick a district to see who represents it.", "हरेक जिल्लाको रङ त्यहाँका प्रत्यक्ष निर्वाचित सांसदहरूको सदन बैठक उपस्थितिअनुसार छ, सबै निर्वाचन क्षेत्र जोडेर। कसले प्रतिनिधित्व गर्छ हेर्न जिल्ला छान्नुहोस्।")}</p>
    <div class="filters"><select id="dsel"><option value="">${L("Choose a district", "जिल्ला छान्नुहोस्")}</option>${names.map((n) => `<option value="${esc(n)}"${n === sel ? " selected" : ""}>${esc(dn(n))}</option>`).join("")}</select></div>
    <div class="mapwrap"><svg viewBox="0 0 ${geo.w} ${geo.h}" class="map" role="img" aria-label="${L("Map of Nepal's 77 districts", "नेपालका ७७ जिल्लाको नक्सा")}">
      ${geo.districts.map((d) => {
        const x = by[d.name];
        return `<a href="#/map/${encodeURIComponent(d.name)}" aria-label="${esc(dn(d.name))}"><path d="${d.d}" class="b${bin(x.pct)}${d.name === sel ? " sel" : ""}" data-tip="${esc(L(`${d.name}: ${x.pct == null ? "no record yet" : `${x.pct}% attendance`} · ${x.fptp.length} seat${x.fptp.length === 1 ? "" : "s"}`, `${dn(d.name)}: ${x.pct == null ? "अभिलेख छैन" : `${x.pct}% उपस्थिति`} · ${x.fptp.length} क्षेत्र`))}"/></a>`;
      }).join("")}
      ${sel && by[sel] ? `<path d="${by[sel].d}" class="selo"/>` : ""}
    </svg>
    <div class="legend maplegend"><span><i class="b1"></i>${L(`Under ${LOW}%`, `${LOW}% भन्दा कम`)}</span><span><i class="b2"></i>${L(`${LOW} to 74%`, `${LOW} देखि ७४%`)}</span><span><i class="b3"></i>${L("75 to 89%", "७५ देखि ८९%")}</span><span><i class="b4"></i>${L("90% and up", "९०% वा बढी")}</span><span><i class="b0"></i>${L("No record", "अभिलेख छैन")}</span></div></div>
    <div id="dist"></div>`;
  document.getElementById("dsel").addEventListener("change", (e) => { location.hash = e.target.value ? `#/map/${encodeURIComponent(e.target.value)}` : "#/map"; });
  const host = document.getElementById("dist");
  const li = (m, sub) => `<li><span>${mlink(m)}<span class="sub">${m.office ? `<b>${office(m)}</b> · ` : ""}${sub}</span></span><span class="v">${m.house?.n ? `${m.house.pct}%` : "–"}</span></li>`;
  if (!sel || !by[sel]) {
    const ranked = Object.values(by).filter((d) => d.pct != null).sort((a, b) => a.pct - b.pct);
    const row = (d) => `<li><span><a href="#/map/${encodeURIComponent(d.name)}">${esc(dn(d.name))}</a><span class="sub">${PROV[d.province]} · ${L(`${d.fptp.length} seat${d.fptp.length === 1 ? "" : "s"}`, `${d.fptp.length} क्षेत्र`)}</span></span><span class="v">${d.pct}%</span></li>`;
    const close = members.filter((m) => m.won).sort((a, b) => a.won.margin - b.won.margin).slice(0, 10);
    const tight = `<section class="sec"><h2>${L("Closest races of 2026", "२०८२ का सबैभन्दा कडा प्रतिस्पर्धा")}</h2><p class="small muted">${L("Seats won by the smallest number of votes.", "सबैभन्दा कम मतान्तरले जितिएका क्षेत्र।")}</p><ol class="rank">${close.map((m) => `<li><span>${mlink(m)}<span class="sub">${seatName(m)} · ${esc(short(m.party))}</span></span><span class="v">${num(m.won.margin)}</span></li>`).join("")}</ol></section>`;
    host.innerHTML = `${tight}<div class="grid"><section class="sec"><h2>${L("Lowest districts", "सबैभन्दा कम उपस्थिति भएका जिल्ला")}</h2><ol class="rank">${ranked.slice(0, 10).map(row).join("")}</ol></section>
      <section class="sec"><h2>${L("Highest districts", "सबैभन्दा बढी उपस्थिति भएका जिल्ला")}</h2><ol class="rank">${[...ranked].reverse().slice(0, 10).map(row).join("")}</ol></section></div>`;
    return;
  }
  const d = by[sel];
  const na = members.filter((m) => m.ch === "na" && m.prov === d.province);
  host.innerHTML = `<section class="sec"><p class="kicker">${esc(PROV[d.province])} ${L("Province", "प्रदेश")}</p><h2 class="big">${esc(dn(sel))}</h2>
    <p>${d.pct == null ? L("No attendance recorded yet.", "अहिलेसम्म उपस्थिति अभिलेख छैन।") : L(`Its ${d.fptp.length === 1 ? "MP was" : `${d.fptp.length} MPs were`} present at <b>${d.pct}%</b> of House sittings.`, `यहाँका ${d.fptp.length} सांसद सदनका <b>${d.pct}%</b> बैठकमा उपस्थित भए।`)}${d.fptp.some((m) => m.office) ? L(" Ministers and the Speaker are counted too, and ministers only need to attend when their portfolio is up.", " मन्त्री र सभामुख पनि गनिएका छन्; मन्त्रीले आफ्नो विषय हुँदा मात्र उपस्थित हुनुपर्छ।") : ""}</p></section>
    <div class="grid"><section class="sec"><h2>${L("Constituency MPs", "निर्वाचन क्षेत्रका सांसद")}</h2><ol class="rank">${d.fptp.map((m) => li(m, `${seatName(m)} · ${esc(short(m.party))}`)).join("") || `<li class="muted">${L("None listed.", "छैन।")}</li>`}</ol></section>
    <section class="sec"><h2>${L("From the party lists", "समानुपातिकबाट")}</h2><p class="small muted">${L(`Proportional members whose home district is ${esc(sel)}. They represent the whole country.`, `गृह जिल्ला ${esc(dn(sel))} भएका समानुपातिक सदस्य। उनीहरू सिङ्गो देशको प्रतिनिधित्व गर्छन्।`)}</p><ol class="rank">${d.pr.map((m) => li(m, esc(short(m.party)))).join("") || `<li class="muted">${L("None.", "छैन।")}</li>`}</ol></section></div>
    <section class="sec"><h2>${L(`National Assembly, ${esc(PROV[d.province])}`, `राष्ट्रिय सभा, ${esc(PROV[d.province])}`)}</h2><p class="small muted">${L("Elected by the province as a whole.", "सिङ्गो प्रदेशबाट निर्वाचित।")}</p><ol class="rank">${na.map((m) => li(m, esc(short(m.party)))).join("") || `<li class="muted">${L("None listed.", "छैन।")}</li>`}</ol></section>`;
}

async function topicsPage() {
  const topics = await load("topics");
  const max = Math.max(...topics.map((t) => t.statements), 1);
  app.innerHTML = `<p class="kicker">${L("What they talk about", "उनीहरू केबारे बोल्छन्")}</p><h1>${L("Topics", "विषय")}</h1>
    <p class="lede">${L("Bills, meeting agendas and floor statements sorted into policy areas by keyword. Most statements are published only as video, so a statement is counted only when its occasion or transcript says what it was about.", "विधेयक, बैठकका कार्यसूची र सदनमा बोलिएका कुरालाई मुख्य शब्दका आधारमा नीतिगत विषयमा छुट्याइएको छ। धेरैजसो भाषण भिडियोमा मात्र प्रकाशित हुने भएकाले प्रसङ्ग वा लिखित पाठले विषय खुलाएको भाषण मात्र गनिएको छ।")}</p>
    <div class="topicgrid">${[...topics].sort((a, b) => b.statements + b.meetings - a.statements - a.meetings).map((t) => `
      <a class="topiccard" href="#/topic/${t.id}"><b>${esc(L(t.label, t.ne))}</b>
        <span class="track"><i style="width:${(100 * t.statements) / max}%"></i></span>
        <small>${plural(t.statements, "statement", "भाषण")} · ${plural(t.meetings, "meeting", "बैठक")} · ${plural(t.bills.length, "bill", "विधेयक")}</small></a>`).join("")}</div>`;
}

async function topicPage(id) {
  const [topics, members, bills, meetings] = await Promise.all([load("topics"), load("members"), load("bills"), load("meetings")]);
  const t = topics.find((x) => x.id === id);
  if (!t) { app.innerHTML = `<h1>${L("Not found", "भेटिएन")}</h1>`; return; }
  const by = Object.fromEntries(members.map((m) => [m.id, m]));
  const bb = Object.fromEntries(bills.map((b) => [b.id, b]));
  const gm = Object.fromEntries(meetings.map((m) => [m.id, m]));
  app.innerHTML = `<p class="kicker"><a href="#/topics" style="color:inherit">${L("Topics", "विषय")}</a></p><h1>${esc(L(t.label, t.ne))}</h1>
    <div class="tiles"><div class="tile"><b>${num(t.statements)}</b><span>${L("Floor statements", "सदनमा बोलेको")}</span><small>${L(`by ${num(t.speakers_n)} members`, `${num(t.speakers_n)} सदस्यले`)}</small></div>
      <div class="tile"><b>${num(t.meetings)}</b><span>${L("Meetings", "बैठक")}</span></div><div class="tile"><b>${num(t.bills.length)}</b><span>${L("Bills", "विधेयक")}</span></div></div>
    <div class="grid">
      <section class="sec"><h2>${L("Who speaks on it most", "यसबारे सबैभन्दा धेरै बोल्ने")}</h2>${t.speakers.length ? `<ol class="rank">${t.speakers.map(([mid, n]) => { const m = by[mid]; return m ? `<li><span>${mlink(m)}<span class="sub">${m.office ? `<b>${office(m)}</b> · ` : ""}${esc(short(m.party))}</span></span><span class="v">${n}</span></li>` : ""; }).join("")}</ol>
        <p class="small muted">${L("Ministers speak when presenting their bills, so they lead most topics.", "मन्त्रीले आफ्ना विधेयक प्रस्तुत गर्दा बोल्ने भएकाले धेरैजसो विषयमा उनीहरू अगाडि छन्।")}</p>` : `<p class="muted">${L("No statements tagged yet.", "अहिलेसम्म कुनै भाषण छैन।")}</p>`}</section>
      <section class="sec"><h2>${L("Bills", "विधेयक")}</h2>${t.bills.length ? `<ol class="rank">${t.bills.map((bid) => { const b = bb[bid]; return b ? `<li><span><a href="#/bill/${b.id}">${billName(b)}</a><span class="sub">${esc(tr(b.current_step || b.status) || "")}</span></span><span class="v">${billProgress(b)}</span></li>` : ""; }).join("")}</ol>` : `<p class="muted">${L("None.", "छैन।")}</p>`}</section>
    </div>
    <section class="sec"><h2>${L("Recent meetings", "हालका बैठक")}</h2>${t.recent.length ? `<div class="tablewrap"><table><tbody>${t.recent.map((gid) => { const m = gm[gid]; return m ? `<tr><td class="nw">${day(m.date)}</td><td><a href="#/meeting/${m.id}">${esc(mtitle(m.title))}</a>${m.agenda_en && !NE ? `<div class="small">${esc(clip(m.agenda_en, 200))}</div>` : m.agenda ? `<div class="small ne">${esc(clip(m.agenda, 200))}</div>` : ""}</td></tr>` : ""; }).join("")}</tbody></table></div>` : `<p class="muted">${L("None.", "छैन।")}</p>`}</section>
    <p class="small muted">${L("Topics are assigned by keyword, from the English text where there is one. Some items will be in the wrong place or missing.", "विषय मुख्य शब्दका आधारमा छुट्याइएको हो, त्यसैले केही गलत ठाउँमा वा छुटेका हुन सक्छन्।")}</p>`;
}

function about() {
  if (NE) {
    app.innerHTML = `<p class="kicker">विधि</p><h1>यो ट्र्याकरबारे</h1><div class="prose">
    <p>यो साइटले नेपालको सङ्घीय संसदका सदस्यले के गर्छन् भनेर पछ्याउँछ: उनीहरू सदन र समितिका बैठकमा आउँछन् कि आउँदैनन्, सदनमा के बोल्छन्, र विधेयक दुवै सदनमा कसरी अघि बढ्छन्।</p>
    <p>सबै तथ्याङ्क सङ्घीय संसदको सार्वजनिक पोर्टल <a href="https://digital.parliament.gov.np" target="_blank" rel="noopener">digital.parliament.gov.np</a> बाट लिइएको हो र हरेक साँझ अद्यावधिक हुन्छ। पोर्टलले सदस्यको डिजिटल हाजिरीबाट उपस्थिति राख्छ। आंशिक उपस्थितिलाई पोर्टलले जस्तै आधा गनिएको छ।</p>
    <p><b>मतदान छैन।</b> नेपालको संसदले लगभग सबै निर्णय ध्वनिमतबाट गर्छ। मत विभाजन हुँदा पनि जम्मा सङ्ख्या मात्र सार्वजनिक हुन्छ, नाम होइन। त्यसैले यो साइटले कुन सदस्यले कसरी मत दिए भनेर देखाउन सक्दैन।</p>
    <p><b>मन्त्री।</b> सदनको कामका लागि कम्तीमा एक मन्त्री उपस्थित हुनुपर्छ, त्यसैले मन्त्रीहरू प्रायः आफ्नो मन्त्रालयको विषय हुँदा मात्र आउँछन्। उनीहरूको उपस्थिति कम देखिनुको कारण यही हो।</p>
    <p><b>भाषा।</b> यो नेपाली संस्करणमा कार्यसूची, निर्णय, भाषण र परिचय पोर्टलमा प्रकाशित मूल नेपालीमै छन्। केही समिति र विधेयकका चरणका नाम पोर्टलले अङ्ग्रेजीमा मात्र दिने भएकाले यहाँ अनुवाद गरिएको छ; केही नाम अझै अङ्ग्रेजीमै रहन सक्छन्। मिति ईस्वी संवत्‌मा छन्।</p>
    <p><b>निर्वाचन परिणाम।</b> मत सङ्ख्या र विजयी उम्मेदवारले बुझाएको उमेर, शिक्षा र अनुभव निर्वाचन आयोगको <a href="https://result.election.gov.np/ElectionResultCentral2082.aspx" target="_blank" rel="noopener">२०८२ को परिणाम</a> बाट लिइएको हो। आयोगले उम्मेदवारको सम्पत्ति विवरण सार्वजनिक गर्दैन।</p>
    <p><b>नक्सा।</b> जिल्लाको सिमाना Saugat Acharya को <a href="https://github.com/mesaugat/geoJSON-Nepal" target="_blank" rel="noopener">geoJSON-Nepal</a> (MIT) बाट लिइएको हो।</p>
    <p>कोड र तथ्याङ्क <a href="https://github.com/poshakpathak/nepal-tracker" target="_blank" rel="noopener">GitHub</a> मा खुला छन्।</p></div>`;
    return;
  }
  app.innerHTML = `<p class="kicker">Method</p><h1>About this tracker</h1><div class="prose">
    <p>This site follows what members of Nepal's Federal Parliament do: whether they attend sittings and committee meetings, what they say on the floor, and how bills move through both houses.</p>
    <p>All data comes from the Federal Parliament's public portal, <a href="https://digital.parliament.gov.np" target="_blank" rel="noopener">digital.parliament.gov.np</a>, and is refreshed every evening, Nepal time. The portal records attendance from members' digital log-ins. A partial attendance counts as half, the same way the portal calculates it.</p>
    <p><b>No votes.</b> Nepal's parliament decides almost everything by voice vote. When a division is called, only the totals are published, never the names. So unlike trackers for other legislatures, this one can't show how each member voted.</p>
    <p><b>Ministers.</b> At least one minister must be present for House business, so ministers usually attend only when their portfolio is on the agenda. Their attendance is lower for that reason.</p>
    <p><b>Language.</b> The whole site is also available in Nepali (the button at the top). Names, parties and bill summaries are in English where the portal provides them. Agendas, minutes, floor statements, member biographies and a few bill titles are only published in Nepali. Those are machine-translated with Meta's open <a href="https://ai.meta.com/research/no-language-left-behind/" target="_blank" rel="noopener">NLLB-200</a> model (CC BY-NC 4.0) and marked <span class="mt">Machine translation</span>. The Nepali original is always one click away, and it is the authoritative text.</p>
    <p><b>Election results.</b> Vote counts and each winner's stated age, education and experience come from the Election Commission's <a href="https://result.election.gov.np/ElectionResultCentral2082.aspx" target="_blank" rel="noopener">2082 results</a>, matched to members by constituency. The Commission does not publish candidates' asset declarations, so this site can't show them.</p>
    <p><b>Map.</b> District boundaries come from <a href="https://github.com/mesaugat/geoJSON-Nepal" target="_blank" rel="noopener">geoJSON-Nepal</a> by Saugat Acharya (MIT licence), simplified for the web. A district's shade is the combined attendance of its directly elected House members. Proportional members are listed under their home district, and National Assembly members under their province.</p>
    <p>The code and data are open on <a href="https://github.com/poshakpathak/nepal-tracker" target="_blank" rel="noopener">GitHub</a>.</p></div>`;
}

const PSTATUS = {
  passed: ["Passed", "पारित"], bill: ["Bill in Parliament", "संसदमा विधेयक"], lapsed: ["Ordinance lapsed", "अध्यादेश निष्क्रिय"],
  deadline: ["Deadline passed", "समयसीमा नाघ्यो"], none: ["Nothing yet", "अहिलेसम्म केही छैन"],
};
async function promisesPage() {
  const d = await load("pledges");
  const order = ["passed", "bill", "lapsed", "deadline", "none"];
  const ps = (id) => d.pledges.filter((p) => p.party === id);
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\.|^english\.|^en\./, ""); } catch { return ""; } };
  const card = (p) => `<li class="pl ps-${p.status}"><span class="pst">${L(...PSTATUS[p.status])}</span>
      <div><p class="plt">${esc(L(p.en, p.ne))}</p><p class="small muted">${esc(L(p.note, p.note_ne))}</p>
      <p class="small">${p.bill ? `<a href="#/bill/${p.bill}">${esc(L(p.bill_title || p.bill_title_ne, p.bill_title_ne || p.bill_title))}</a> · ` : ""}<a href="${esc(p.source)}" target="_blank" rel="noopener" class="muted">${L("Source", "स्रोत")}: ${esc(host(p.source))}</a></p></div></li>`;
  app.innerHTML = `<p class="kicker">${L("Manifestos of March 2026", "फागुन २०८२ का घोषणापत्र")}</p><h1>${L("Promises", "वाचा")}</h1>
    <p class="lede">${L("What the parties promised that needs Parliament to act, and what the record shows so far. A pledge tied to a bill moves to <b>Passed</b> on its own when that bill completes. Everything else is checked by hand", "संसदले काम गर्नुपर्ने गरी दलहरूले गरेका वाचा, र अहिलेसम्मको अभिलेख। विधेयकसँग जोडिएको वाचा त्यो विधेयक पारित हुनासाथ आफैँ <b>पारित</b> मा सर्छ। बाँकी हातैले जाँचिन्छ")}, ${L("last on", "पछिल्लो पटक")} ${day(d.checked)}.</p>
    <div class="plkey">${order.map((k) => `<span class="ps-${k}"><i></i>${L(...PSTATUS[k])}</span>`).join("")}</div>
    ${d.parties.map((pt) => { const list = ps(pt.id).sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status)); return `
    <section class="sec"><div class="plhead"><div><h2>${esc(L(pt.name, pt.ne))}</h2><p class="small muted">${esc(L(pt.role, pt.role_ne))}</p></div>
      <div class="plstrip" aria-label="${list.length}">${list.map((p) => `<i class="ps-${p.status}" title="${esc(L(...PSTATUS[p.status]))}"></i>`).join("")}</div></div>
      <ol class="pls">${list.map(card).join("")}</ol></section>`; }).join("")}
    <p class="small muted" style="max-width:720px">${esc(L(d.targets.en, d.targets.ne))} ${L("Pledge wording is paraphrased from news coverage of each manifesto. Opposition parties rarely pass bills, so their pledges mostly show <b>Nothing yet</b>; they're here so the record is complete.", "वाचाका शब्द घोषणापत्रबारेका समाचारबाट लिइएका हुन्। विपक्षी दलले विरलै विधेयक पारित गर्छन्, त्यसैले तिनका वाचा प्रायः <b>अहिलेसम्म केही छैन</b> मा छन्; अभिलेख पूरा होस् भनेर राखिएका हुन्।")}</p>`;
}

/* ------------------------------------------------------------ router */

const routes = [
  [/^#?\/?$/, overview], [/^#\/members(?:\?q=(.*))?$/, (q) => membersPage(q && decodeURIComponent(q))], [/^#\/member\/([\w-]+)$/, memberPage],
  [/^#\/attendance$/, attendance], [/^#\/bills$/, billsPage], [/^#\/bill\/([\w-]+)$/, billPage],
  [/^#\/meetings$/, meetingsPage], [/^#\/meeting\/([\w-]+)$/, meetingPage], [/^#\/parties$/, partiesPage], [/^#\/week(?:\/(\d{4}-\d{2}-\d{2}))?$/, weekPage], [/^#\/map(?:\/(.+))?$/, mapPage], [/^#\/topics$/, topicsPage], [/^#\/topic\/([\w-]+)$/, topicPage], [/^#\/promises$/, promisesPage], [/^#\/about$/, about],
];
async function route() {
  if (!Object.keys(TOPIC).length) TOPIC = Object.fromEntries(((await tryLoad("topics")) || []).map((t) => [t.id, t]));
  const h = location.hash || "#/";
  const sect = h.split("/")[1] || "";
  const alias = { member: "members", bill: "bills", meeting: "meetings", topic: "topics" };
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", (a.getAttribute("href").split("/")[1] || "") === (alias[sect] || sect)));
  for (const [re, fn] of routes) {
    const m = re.exec(h);
    if (m) {
      try { await fn(...m.slice(1)); } catch (e) { app.innerHTML = `<h1>${L("Something broke", "केही गडबड भयो")}</h1><p class="muted">${esc(e.message)}</p>`; }
      if (NE) devanagari(app);
      window.scrollTo(0, 0);
      return;
    }
  }
  app.innerHTML = `<h1>Not found</h1>`;
}
/* Nepali mode: Devanagari digits in text (not in links or inputs), and the page chrome. */
function devanagari(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) if (/\d/.test(n.nodeValue)) n.nodeValue = dev(n.nodeValue);
  root.querySelectorAll("[data-tip]").forEach((e) => { e.dataset.tip = dev(e.dataset.tip); });
}
const chrome = () => {
  document.documentElement.lang = NE ? "ne" : "en";
  document.title = L("Nepal Parliament Tracker", "नेपाल संसद ट्र्याकर");
  document.querySelectorAll("[data-ne]").forEach((e) => { e.dataset.en ??= e.textContent; e.textContent = NE ? e.dataset.ne : e.dataset.en; });
  const f = document.getElementById("find");
  f.dataset.en ??= f.placeholder; f.placeholder = NE ? f.dataset.nePlaceholder : f.dataset.en;
  document.getElementById("lang").textContent = NE ? "English" : "नेपालीमा";
  document.getElementById("lang").lang = NE ? "en" : "ne";
  stamp();
};
document.getElementById("lang").addEventListener("click", () => {
  NE = !NE;
  try { localStorage.setItem("lang", NE ? "ne" : "en"); } catch { /* private mode */ }
  chrome();
  route();
});
addEventListener("hashchange", route);
document.getElementById("find").addEventListener("keydown", (e) => {
  if (e.key === "Enter") location.hash = `#/members?q=${encodeURIComponent(e.target.value)}`;
});
function stamp() {
  tryLoad("meta").then((m) => {
    if (!m?.updated) return;
    const d = new Date(m.updated);
    if (NE) {  // Nepal time, written out by hand so it doesn't depend on the browser's locale data
      const n = new Date(d.getTime() + 345 * 60000);
      const WD = ["आइतबार", "सोमबार", "मङ्गलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"];
      const date = `${MONTHS_NE[n.getUTCMonth()]} ${n.getUTCDate()}, ${n.getUTCFullYear()}`;
      document.getElementById("updated").textContent = dev(`अद्यावधिक: ${date}, ${n.getUTCHours()}:${String(n.getUTCMinutes()).padStart(2, "0")} (नेपाली समय)`);
      document.getElementById("dateline").textContent = dev(`${WD[n.getUTCDay()]}, ${date}`);
      return;
    }
    document.getElementById("updated").textContent = `Updated ${d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`;
    document.getElementById("dateline").textContent = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  });
}
chrome();
route();

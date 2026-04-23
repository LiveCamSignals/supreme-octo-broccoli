#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const WM = 'T2CSW';
const API = `https://chaturbate.com/api/public/affiliates/onlinerooms/?wm=${WM}&client_ip=request_ip&limit=500`;
const OUT = path.resolve('dist');
const TAG_DIR = path.join(OUT, 'tag');
const NUM_TAG_PAGES = 99;

const SITE_NAME = 'CamIndex';
const SITE_DESC = 'Live cam room index, sorted by tag. Compare viewers, HD streams, languages, and locations across thousands of live broadcasters in one dense, scannable table.';
const SITE_URL = 'https://livecamsignals.github.io/supreme-octo-broccoli'; // set to your github pages URL when known

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function slugTag(t) {
  return String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function fmtNum(n) {
  if (n == null) return '';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k';
  return String(n);
}

function fmtDuration(sec) {
  if (!sec || sec < 0) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function genderLabel(g) {
  return ({ f: 'Female', m: 'Male', c: 'Couple', t: 'Trans', s: 'Couple' })[g] || 'Other';
}

function revshareUrl(room) {
  if (room.chat_room_url_revshare) return room.chat_room_url_revshare;
  return `https://chaturbate.com/in/?tour=LQps&campaign=${WM}&track=default&room=${encodeURIComponent(room.username)}`;
}

const CSS = `
:root{
  --bg:#0a0a0b;--panel:#111114;--panel2:#16161a;--row:#0f0f12;--rowAlt:#131317;
  --border:#23232a;--text:#e6e6ea;--mute:#8a8a93;--accent:#ff5a3c;--accent2:#ffae42;
  --link:#7cc4ff;--ok:#3ddc84;--warn:#ffae42;--bad:#ff5a5a;
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--text);font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:var(--link);text-decoration:none}
a:hover{text-decoration:underline}
header{background:var(--panel);border-bottom:1px solid var(--border);padding:10px 16px}
header .row{display:flex;align-items:center;gap:14px;flex-wrap:wrap;max-width:1600px;margin:0 auto}
header h1{margin:0;font-size:18px;letter-spacing:.5px}
header h1 a{color:var(--text)}
header .tag{color:var(--accent);font-weight:600}
header .age{margin-left:auto;font-size:11px;color:var(--accent2);border:1px solid var(--accent2);padding:2px 6px;border-radius:3px;letter-spacing:.5px}
nav.tags{background:var(--panel2);border-bottom:1px solid var(--border);padding:8px 16px;font-size:12px}
nav.tags .wrap{max-width:1600px;margin:0 auto;display:flex;flex-wrap:wrap;gap:6px 10px}
nav.tags a{color:var(--mute)}
nav.tags a:hover{color:var(--link)}
nav.tags strong{color:var(--text);margin-right:8px}
.intro{max-width:1600px;margin:0 auto;padding:14px 16px;color:var(--mute);font-size:13px}
.intro h2{color:var(--text);margin:0 0 6px;font-size:15px}
main{max-width:1600px;margin:0 auto;padding:0 8px 40px}
table{width:100%;border-collapse:collapse;font-size:12.5px;background:var(--panel)}
thead th{position:sticky;top:0;background:var(--panel2);color:var(--mute);text-align:left;font-weight:600;
  padding:7px 8px;border-bottom:1px solid var(--border);white-space:nowrap;cursor:pointer;user-select:none}
thead th .arr{opacity:.4;margin-left:3px}
thead th.sorted .arr{opacity:1;color:var(--accent)}
tbody tr{border-bottom:1px solid var(--border)}
tbody tr:nth-child(odd){background:var(--row)}
tbody tr:nth-child(even){background:var(--rowAlt)}
tbody tr:hover{background:#1d1d24}
td{padding:6px 8px;vertical-align:middle;white-space:nowrap}
td.subj{white-space:normal;max-width:520px;color:var(--mute);font-size:12px}
td.name a{font-weight:600;color:var(--text)}
td.name a:hover{color:var(--link)}
td.num{font-family:var(--mono);text-align:right}
td.cta a{display:inline-block;background:var(--accent);color:#0a0a0b;font-weight:700;padding:5px 10px;border-radius:3px;font-size:12px}
td.cta a:hover{background:var(--accent2);text-decoration:none}
.badge{display:inline-block;font-size:10px;padding:1px 5px;border-radius:2px;border:1px solid var(--border);color:var(--mute);margin-left:4px;font-family:var(--mono)}
.badge.hd{color:var(--ok);border-color:#1f5c3a}
.badge.new{color:var(--accent2);border-color:#5c4720}
.badge.g-f{color:#ff7eb6;border-color:#5c2742}
.badge.g-m{color:#7cc4ff;border-color:#1f4a6b}
.badge.g-c{color:#c084fc;border-color:#4b2470}
.badge.g-t{color:#fbbf24;border-color:#5c4720}
.controls{display:flex;gap:8px;align-items:center;padding:10px 8px;flex-wrap:wrap}
.controls input,.controls select{background:var(--panel2);color:var(--text);border:1px solid var(--border);padding:6px 8px;border-radius:3px;font:inherit}
.controls input{flex:1;min-width:200px;max-width:400px}
.controls .count{color:var(--mute);font-size:12px;margin-left:auto}
footer{max-width:1600px;margin:30px auto 0;padding:20px 16px;color:var(--mute);font-size:11px;border-top:1px solid var(--border);line-height:1.6}
footer h3{color:var(--text);margin:18px 0 6px;font-size:13px}
footer p{margin:6px 0}
footer a{color:var(--mute);text-decoration:underline}
.empty{padding:40px;text-align:center;color:var(--mute)}
@media(max-width:900px){
  td.subj{max-width:240px}
  .hide-sm{display:none}
}
`;

const JS = `
(function(){
  const tbody = document.querySelector('table tbody');
  if(!tbody) return;
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const search = document.getElementById('q');
  const genderSel = document.getElementById('g');
  const countEl = document.getElementById('count');
  const ths = document.querySelectorAll('thead th[data-sort]');
  let sortKey=null, sortDir=1;

  function update(){
    const q = (search.value||'').toLowerCase();
    const g = genderSel.value;
    let shown=0;
    for(const r of rows){
      const matchQ = !q || r.dataset.search.includes(q);
      const matchG = !g || r.dataset.gender===g;
      const ok = matchQ && matchG;
      r.style.display = ok ? '' : 'none';
      if(ok) shown++;
    }
    countEl.textContent = shown + ' of ' + rows.length + ' rooms';
  }
  search.addEventListener('input', update);
  genderSel.addEventListener('change', update);

  ths.forEach(th=>{
    th.addEventListener('click', ()=>{
      const k = th.dataset.sort;
      if(sortKey===k) sortDir=-sortDir; else { sortKey=k; sortDir=th.dataset.dir==='asc'?1:-1; }
      ths.forEach(t=>t.classList.remove('sorted'));
      th.classList.add('sorted');
      const sorted = rows.slice().sort((a,b)=>{
        const av=a.dataset[k], bv=b.dataset[k];
        const an=parseFloat(av), bn=parseFloat(bv);
        if(!isNaN(an)&&!isNaN(bn)) return (an-bn)*sortDir;
        return String(av).localeCompare(String(bv))*sortDir;
      });
      const frag = document.createDocumentFragment();
      sorted.forEach(r=>frag.appendChild(r));
      tbody.appendChild(frag);
    });
  });
  update();
})();
`;

function renderHead(title, desc, canonical, tagNav) {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="rating" content="adult">
<meta name="RATING" content="RTA-5042-1996-1400-1577-RTA">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<style>${CSS}</style>
</head><body>`;
}

function renderHeader(currentTag) {
  return `<header><div class="row">
<h1><a href="${currentTag ? '../../index.html' : 'index.html'}">${SITE_NAME}</a>${currentTag ? ` <span style="color:var(--mute);font-weight:400">/</span> <span class="tag">#${esc(currentTag)}</span>` : ''}</h1>
<span class="age">18+ ADULTS ONLY</span>
</div></header>`;
}

function renderTagNav(allTags, current, prefix) {
  const top = allTags.slice(0, 60);
  return `<nav class="tags"><div class="wrap"><strong>Browse tags:</strong>
${top.map(t => {
    const active = t.slug === current;
    return active
      ? `<span style="color:var(--accent);font-weight:600">#${esc(t.slug)}</span>`
      : `<a href="${prefix}tag/${esc(t.slug)}.html">#${esc(t.slug)}</a>`;
  }).join('')}
<a href="${prefix}index.html#all-tags" style="color:var(--link);margin-left:8px">all tags →</a>
</div></nav>`;
}

function renderControls() {
  return `<div class="controls">
<input id="q" type="search" placeholder="Filter by name, tag, location, language…">
<select id="g">
  <option value="">All genders</option>
  <option value="f">Female</option>
  <option value="m">Male</option>
  <option value="c">Couple</option>
  <option value="t">Trans</option>
</select>
<span class="count" id="count"></span>
</div>`;
}

function renderTable(rooms) {
  if (!rooms.length) return `<div class="empty">No live rooms found for this tag right now. Check back shortly — broadcasters come online around the clock.</div>`;
  const head = `<thead><tr>
<th data-sort="viewers" data-dir="desc" class="sorted">Viewers <span class="arr">▼</span></th>
<th data-sort="name" data-dir="asc">Broadcaster <span class="arr">↕</span></th>
<th data-sort="gender" data-dir="asc" class="hide-sm">Gender <span class="arr">↕</span></th>
<th data-sort="age" data-dir="asc" class="hide-sm">Age <span class="arr">↕</span></th>
<th data-sort="country" data-dir="asc" class="hide-sm">Country <span class="arr">↕</span></th>
<th data-sort="lang" data-dir="asc" class="hide-sm">Language <span class="arr">↕</span></th>
<th data-sort="online" data-dir="desc" class="hide-sm">Online <span class="arr">↕</span></th>
<th data-sort="followers" data-dir="desc" class="hide-sm">Followers <span class="arr">↕</span></th>
<th>Topic / Tags</th>
<th>Watch</th>
</tr></thead>`;
  const body = rooms.map(r => {
    const url = revshareUrl(r);
    const gender = r.gender || '';
    const tags = (r.tags || []).slice(0, 6);
    const search = [r.username, r.display_name, r.country, r.location, r.spoken_languages, ...(r.tags || []), r.room_subject].filter(Boolean).join(' ').toLowerCase();
    return `<tr
data-search="${esc(search)}"
data-gender="${esc(gender)}"
data-viewers="${r.num_users || 0}"
data-followers="${r.num_followers || 0}"
data-age="${r.age || 0}"
data-online="${r.seconds_online || 0}"
data-name="${esc((r.username || '').toLowerCase())}"
data-country="${esc(r.country || '')}"
data-lang="${esc(r.spoken_languages || '')}">
<td class="num"><strong>${fmtNum(r.num_users)}</strong></td>
<td class="name"><a href="${esc(url)}" rel="nofollow sponsored noopener" target="_blank">${esc(r.display_name || r.username)}</a>
  ${r.is_hd ? '<span class="badge hd">HD</span>' : ''}
  ${r.is_new ? '<span class="badge new">NEW</span>' : ''}
</td>
<td class="hide-sm"><span class="badge g-${esc(gender)}">${esc(genderLabel(gender))}</span></td>
<td class="num hide-sm">${r.age || ''}</td>
<td class="hide-sm">${esc(r.country || '')}</td>
<td class="hide-sm">${esc((r.spoken_languages || '').split('/')[0] || '')}</td>
<td class="num hide-sm">${esc(fmtDuration(r.seconds_online))}</td>
<td class="num hide-sm">${fmtNum(r.num_followers)}</td>
<td class="subj">${esc((r.room_subject || '').slice(0, 140))}<br>${tags.map(t => `<a href="../tag/${esc(slugTag(t))}.html" style="color:var(--mute);font-size:11px">#${esc(t)}</a>`).join(' ')}</td>
<td class="cta"><a href="${esc(url)}" rel="nofollow sponsored noopener" target="_blank">Open Cam →</a></td>
</tr>`;
  }).join('\n');
  return `<table>${head}<tbody>${body}</tbody></table>`;
}

function renderFooter(allTagsLink) {
  return `<footer>
<h3>About this index</h3>
<p>${SITE_NAME} is an independent, automatically-generated directory of public live cam rooms from Chaturbate.com. Data is refreshed at build time from Chaturbate's public affiliate API. Listings, viewer counts, tags, and broadcaster information are pulled directly from that feed and may change at any moment. Clicking any listing opens the broadcaster's room on Chaturbate.com in a new tab.</p>

<h3>Affiliate disclosure</h3>
<p>${SITE_NAME} participates in the Chaturbate Affiliate Program. All outbound links on this site are affiliate links. If you sign up, purchase tokens, or become a paying member through one of our links, we may earn a revenue-share commission from Chaturbate at no additional cost to you. We are an independent third party and are not owned, operated, or endorsed by Chaturbate, Multi Media LLC, or any of its affiliates. All trademarks are the property of their respective owners.</p>

<h3>18 U.S.C. § 2257 compliance statement</h3>
<p>${SITE_NAME} is not a producer (primary or secondary) of any of the visual content found on this website or on the third-party sites linked from it. With respect to records as per 18 U.S.C. § 2257 for any and all visual content found on this site, please direct your request to the site for which the content was produced. ${SITE_NAME} hosts no images, video, or live streams; we link to publicly listed rooms on Chaturbate.com, which maintains its own 2257 records.</p>

<h3>Adults only — 18+ / 21+ where required</h3>
<p>This website and the sites it links to contain sexually explicit material intended solely for consenting adults. By accessing this site you affirm under penalty of perjury that you are at least 18 years of age (or 21 where required by your jurisdiction), that viewing such material is legal in your community, and that you wish to view such material for your own personal use. If any of these conditions do not apply, you must leave this site immediately.</p>

<p>Parents: ${SITE_NAME} is labeled with the Restricted To Adults (RTA) website label to better enable parental filtering. For more information about protecting minors online see <a href="https://www.rtalabel.org/" rel="nofollow noopener" target="_blank">RTALabel.org</a>, <a href="https://www.asacp.org/" rel="nofollow noopener" target="_blank">ASACP.org</a>, and tools such as <a href="https://www.netnanny.com/" rel="nofollow noopener" target="_blank">Net Nanny</a> or <a href="https://www.cybersitter.com/" rel="nofollow noopener" target="_blank">CyberSitter</a>.</p>

<h3>No solicitation, no underage content</h3>
<p>${SITE_NAME} has a zero-tolerance policy against any form of child sexual abuse material (CSAM) and against non-consensual content. All broadcasters appearing in listings have been age-verified by Chaturbate.com under its own broadcaster verification and 18 U.S.C. § 2257 procedures. If you believe any link on this site points to material that violates this policy, report it immediately to Chaturbate's compliance team and to the <a href="https://report.cybertip.org/" rel="nofollow noopener" target="_blank">National Center for Missing &amp; Exploited Children</a>.</p>

<h3>Data &amp; privacy</h3>
<p>${SITE_NAME} is a static site. We do not run analytics, set cookies, or collect any personally identifiable information from visitors of this site. Outbound clicks open Chaturbate.com, which has its own <a href="https://chaturbate.com/privacy/" rel="nofollow noopener" target="_blank">privacy policy</a> and <a href="https://chaturbate.com/terms/" rel="nofollow noopener" target="_blank">terms of service</a>. Affiliate attribution (campaign code <code>${WM}</code>) is appended to outbound URLs so Chaturbate can credit referrals to this site.</p>

<h3>DMCA</h3>
<p>${SITE_NAME} does not host any user-uploaded media. All visual content visible after clicking an outbound link is hosted by Chaturbate.com. DMCA notices for content displayed on Chaturbate must be sent to Chaturbate's designated DMCA agent, per the procedure published at <a href="https://chaturbate.com/dmca/" rel="nofollow noopener" target="_blank">chaturbate.com/dmca</a>.</p>

<p style="margin-top:18px;color:#555">${esc(SITE_NAME)} · static directory · built ${new Date().toISOString().slice(0, 10)} · ${allTagsLink ? `<a href="${allTagsLink}">all tags</a> · ` : ''}<a href="https://chaturbate.com/affiliates/in/?campaign=${WM}" rel="nofollow sponsored noopener" target="_blank">become an affiliate</a></p>
</footer>`;
}

async function main() {
  console.log('Fetching API…');
  const res = await fetch(API);
  const json = await res.json();
  const rooms = json.results || [];
  console.log(`Got ${rooms.length} rooms`);

  // tag aggregation
  const tagMap = new Map();
  for (const r of rooms) {
    for (const t of (r.tags || [])) {
      const slug = slugTag(t);
      if (!slug) continue;
      if (!tagMap.has(slug)) tagMap.set(slug, { slug, rooms: [], totalViewers: 0 });
      const e = tagMap.get(slug);
      if (!e.rooms.includes(r)) {
        e.rooms.push(r);
        e.totalViewers += r.num_users || 0;
      }
    }
  }
  const allTagsSorted = Array.from(tagMap.values()).sort((a, b) => b.rooms.length - a.rooms.length);
  console.log(`Unique tags: ${allTagsSorted.length}`);

  // pick top NUM_TAG_PAGES tags
  const tagPages = allTagsSorted.slice(0, NUM_TAG_PAGES);
  console.log(`Generating ${tagPages.length} tag pages + 1 index = ${tagPages.length + 1} pages`);

  // clean output
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(TAG_DIR, { recursive: true });

  // ----- INDEX -----
  const indexRooms = rooms.slice().sort((a, b) => (b.num_users || 0) - (a.num_users || 0));
  const indexTitle = `${SITE_NAME} — Live Cam Room Index by Tag (${rooms.length.toLocaleString()} rooms, ${allTagsSorted.length} tags)`;
  const indexDesc = SITE_DESC;

  const allTagsHtml = `<section id="all-tags" style="max-width:1600px;margin:30px auto 0;padding:0 16px">
<h2 style="font-size:15px;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:8px">All ${allTagsSorted.length} live tags</h2>
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:4px 14px;font-size:12px;padding:12px 0;font-family:var(--mono)">
${allTagsSorted.map(t => `<a href="tag/${esc(t.slug)}.html" style="color:${tagPages.includes(t) ? 'var(--link)' : 'var(--mute)'}">#${esc(t.slug)} <span style="color:#444">(${t.rooms.length})</span></a>`).join('')}
</div>
</section>`;

  const indexHtml = renderHead(indexTitle, indexDesc, '') +
    renderHeader(null) +
    renderTagNav(allTagsSorted, null, '') +
    `<section class="intro">
<h2>Live cam room index — sorted, tagged, and revshare-linked</h2>
<p>${esc(SITE_DESC)} Currently indexing <strong>${rooms.length.toLocaleString()} live rooms</strong> across <strong>${allTagsSorted.length} tags</strong>. Tap any column header to re-sort. Filter by name, country, language, or tag. All outbound links open the broadcaster's chat room on Chaturbate.com.</p>
</section>` +
    `<main>` +
    renderControls() +
    renderTable(indexRooms) +
    `</main>` +
    allTagsHtml +
    renderFooter(null) +
    `<script>${JS}</script></body></html>`;

  fs.writeFileSync(path.join(OUT, 'index.html'), indexHtml);

  // ----- TAG PAGES -----
  for (const t of tagPages) {
    const tagRooms = t.rooms.slice().sort((a, b) => (b.num_users || 0) - (a.num_users || 0));
    const title = `#${t.slug} live cams — ${tagRooms.length} rooms, ${t.totalViewers.toLocaleString()} viewers · ${SITE_NAME}`;
    const desc = `Live broadcasters tagged #${t.slug} on Chaturbate, sorted by viewer count. ${tagRooms.length} rooms currently online with a combined ${t.totalViewers.toLocaleString()} viewers. Compare HD streams, languages, and locations in one dense table.`;

    const related = allTagsSorted
      .filter(other => other.slug !== t.slug)
      .map(other => {
        const overlap = other.rooms.filter(r => tagRooms.includes(r)).length;
        return { ...other, overlap };
      })
      .filter(o => o.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 24);

    const relatedHtml = related.length ? `<section style="max-width:1600px;margin:24px auto 0;padding:0 16px">
<h2 style="font-size:14px;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:6px">Related tags</h2>
<div style="display:flex;flex-wrap:wrap;gap:6px 12px;padding:10px 0;font-size:12px;font-family:var(--mono)">
${related.map(o => `<a href="${esc(o.slug)}.html" style="color:var(--link)">#${esc(o.slug)} <span style="color:#555">(${o.overlap})</span></a>`).join('')}
</div></section>` : '';

    const html = renderHead(title, desc, '', t.slug) +
      renderHeader(t.slug) +
      renderTagNav(allTagsSorted, t.slug, '../') +
      `<section class="intro">
<h2>#${esc(t.slug)} live cams</h2>
<p>${tagRooms.length} broadcasters currently live with the <strong>#${esc(t.slug)}</strong> tag, drawing a combined <strong>${t.totalViewers.toLocaleString()} concurrent viewers</strong>. Sorted by viewers by default. Click any column header to re-sort, or use the filter to narrow by country, language, or keyword. Listings update each time the site is rebuilt — broadcasters come online and offline constantly.</p>
</section>` +
      `<main>` +
      renderControls() +
      renderTable(tagRooms.map(r => ({ ...r }))) +
      `</main>` +
      relatedHtml +
      renderFooter('../index.html#all-tags') +
      `<script>${JS}</script></body></html>`;

    fs.writeFileSync(path.join(TAG_DIR, `${t.slug}.html`), html);
  }

  // ----- sitemap, robots, README -----
  const urls = ['index.html', ...tagPages.map(t => `tag/${t.slug}.html`)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `<url><loc>${SITE_URL}/${u}</loc><changefreq>hourly</changefreq><priority>${u === 'index.html' ? '1.0' : '0.7'}</priority></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap);

  fs.writeFileSync(path.join(OUT, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${SITE_URL || ''}/sitemap.xml\n`);

  // RTA label file (some scanners look for it)
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

  fs.writeFileSync(path.join(OUT, 'README.md'),
    `# ${SITE_NAME}\n\nStatic adult cam directory generated from the Chaturbate public affiliate API.\n\n## Deploy to GitHub Pages\n\n1. Create a new repository on GitHub.\n2. Copy the contents of this \`dist/\` folder into the repo root (or push as-is and set Pages source to \`/dist\`).\n3. In repo Settings → Pages, choose the branch and folder, then save.\n4. Update \`SITE_URL\` in \`generate.mjs\` to your Pages URL and rebuild for correct sitemap/canonical URLs.\n\n## Rebuild\n\n\`\`\`bash\nnode generate.mjs\n\`\`\`\n\nRegenerates ${urls.length} pages from the live API. All outbound links use revshare campaign code \`${WM}\`.\n`);

  console.log(`Done. Wrote ${urls.length} pages to ${OUT}/`);
}

main().catch(e => { console.error(e); process.exit(1); });

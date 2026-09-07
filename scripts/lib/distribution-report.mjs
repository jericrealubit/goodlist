/**
 * Pure aggregation + rendering for the user-distribution report.
 *
 * Kept free of side effects and credentials so it can be exercised directly.
 * `buildDistribution` mirrors `src/lib/geo/distribution.ts` exactly — the
 * in-app screen and this report must never disagree on the same input.
 */
const NOT_AVAILABLE = 'Not available';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryName = (code) => {
  if (!code) return 'Not shared';
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};

/**
 * Folds flat rows into a Country > Region > City tree.
 * Mirrors `src/lib/geo/distribution.ts` so the HTML and the in-app screen
 * present identical numbers from identical input.
 */
export function buildDistribution(rows) {
  let totalUsers = 0;
  let notSharedUsers = 0;
  const countries = new Map();

  for (const row of rows) {
    const count = row.user_count;
    totalUsers += count;

    if (!row.region_code) {
      notSharedUsers += count;
      continue;
    }

    const regionLabel = row.region ?? NOT_AVAILABLE;
    const kind = row.city ? 'city' : row.time_zone ? 'timezone' : 'unknown';
    const cityLabel = row.city ?? row.time_zone ?? NOT_AVAILABLE;

    const regions = countries.get(row.region_code) ?? new Map();
    countries.set(row.region_code, regions);
    const cities = regions.get(regionLabel) ?? new Map();
    regions.set(regionLabel, cities);

    const existing = cities.get(cityLabel);
    if (existing) existing.userCount += count;
    else cities.set(cityLabel, { label: cityLabel, kind, userCount: count });
  }

  const byCountDesc = (a, b) => b.userCount - a.userCount;

  const countryNodes = [...countries.entries()]
    .map(([code, regions]) => {
      const regionNodes = [...regions.entries()]
        .map(([label, cities]) => {
          const cityNodes = [...cities.values()].sort(byCountDesc);
          return {
            label,
            approximate: label !== NOT_AVAILABLE,
            userCount: cityNodes.reduce((s, c) => s + c.userCount, 0),
            cities: cityNodes,
          };
        })
        .sort(byCountDesc);
      return {
        code,
        name: countryName(code),
        userCount: regionNodes.reduce((s, r) => s + r.userCount, 0),
        regions: regionNodes,
      };
    })
    .sort(byCountDesc);

  const sharedUsers = totalUsers - notSharedUsers;
  return {
    generatedAt: new Date().toISOString(),
    totalUsers,
    sharedUsers,
    notSharedUsers,
    coverage: totalUsers === 0 ? 0 : sharedUsers / totalUsers,
    countries: countryNodes,
  };
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function renderHtml(d) {
  const max = d.countries[0]?.userCount ?? 1;
  const pct = (n) => `${Math.max(0.5, (n / max) * 100).toFixed(1)}%`;
  const generated = new Date(d.generatedAt).toUTCString();

  const countryRows = d.countries
    .map(
      (c) => `
      <details class="country">
        <summary>
          <div class="row">
            <span class="name">${esc(c.name)}</span>
            <span class="count">${c.userCount}</span>
          </div>
          <div class="track"><div class="fill" style="width:${pct(c.userCount)}"></div></div>
        </summary>
        <div class="breakdown">
          ${c.regions
            .map(
              (r) => `
            <div class="region">
              <div class="row sub">
                <span>${esc(r.label)}${r.approximate ? ' <span class="tag">approx.</span>' : ''}</span>
                <span class="count">${r.userCount}</span>
              </div>
              ${r.cities
                .map(
                  (city) => `
                <div class="row city">
                  <span>${esc(city.label)}${city.kind === 'timezone' ? ' <span class="tag">time zone</span>' : ''}</span>
                  <span class="count">${city.userCount}</span>
                </div>`,
                )
                .join('')}
            </div>`,
            )
            .join('')}
        </div>
      </details>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Goodlist — User Distribution</title>
<style>
  :root{--bg:#fff;--fg:#111;--muted:#60646C;--line:#DEE1E6;--card:#F7F7F9;--bar:#072655;--track:#E0E1E6}
  @media (prefers-color-scheme:dark){:root{--bg:#0b0b0c;--fg:#f4f4f5;--muted:#a1a1aa;--line:#2a2a2e;--card:#161618;--bar:#5C8AE6;--track:#2E3135}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .wrap{max-width:820px;margin:0 auto;padding:40px 20px 72px}
  h1{font-size:1.6rem;margin:0 0 4px;letter-spacing:-.02em}
  .sub{color:var(--muted);font-size:.875rem}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:28px 0}
  .stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;text-align:center}
  .stat b{display:block;font-size:1.8rem;font-weight:650;letter-spacing:-.02em}
  .stat span{color:var(--muted);font-size:.8rem}
  details.country{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:10px}
  summary{cursor:pointer;list-style:none}
  summary::-webkit-details-marker{display:none}
  .row{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
  .name{font-weight:600}
  .count{color:var(--muted);font-variant-numeric:tabular-nums;flex:none}
  .track{height:6px;border-radius:99px;background:var(--track);margin-top:8px;overflow:hidden}
  .fill{height:100%;border-radius:99px;background:var(--bar)}
  .breakdown{margin-top:14px;padding-top:12px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:14px}
  .row.sub{font-size:.9rem}
  .row.city{font-size:.85rem;color:var(--muted);padding-left:16px;margin-top:3px}
  .tag{font-size:.72rem;color:var(--muted);border:1px solid var(--line);border-radius:99px;padding:1px 6px;margin-left:4px;white-space:nowrap}
  .note{margin-top:36px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:.85rem}
  .note h2{font-size:.95rem;color:var(--fg);margin:0 0 8px}
  .note p{margin:0 0 10px}
</style>
</head>
<body>
<div class="wrap">
  <h1>User distribution</h1>
  <p class="sub">Goodlist · generated ${esc(generated)}</p>

  <div class="stats">
    <div class="stat"><b>${d.totalUsers}</b><span>Total users</span></div>
    <div class="stat"><b>${d.countries.length}</b><span>Countries</span></div>
    <div class="stat"><b>${Math.round(d.coverage * 100)}%</b><span>Located</span></div>
  </div>

  ${countryRows || '<p class="sub">No one has shared a region yet.</p>'}

  ${
    d.notSharedUsers > 0
      ? `<details class="country"><summary><div class="row"><span class="name">Not shared</span><span class="count">${d.notSharedUsers}</span></div></summary><div class="breakdown"><p class="sub" style="margin:0">Sharing turned off, or not reported yet. Counted, never located.</p></div></details>`
      : ''
  }

  <div class="note">
    <h2>How to read this</h2>
    <p><strong>Country is exact.</strong> It comes from the Region setting on the device — not GPS, and not an IP lookup.</p>
    <p><strong>State and city are approximate.</strong> They are inferred from the device time zone, the only sub-national signal available without a location permission. A zone like <code>America/Los_Angeles</code> spans several states, so a state appears only where the zone narrows it down, and a city only where the zone is itself a single city (Singapore, Hong Kong). Everything else falls back to the raw time zone, which is factual.</p>
    <p>Located covers ${d.sharedUsers} of ${d.totalUsers} accounts. Counts only — this report contains no user identifiers.</p>
  </div>
</div>
</body>
</html>`;
}


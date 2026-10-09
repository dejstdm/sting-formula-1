import './style.css';
import './results.css';

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const number = (value) => typeof value === 'number' && Number.isFinite(value);
const fmt = (value) => number(value) ? value.toFixed(1) : '—';
const median = (values) => {
  const sorted = values.filter(number).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null;
};
const passed = (race) => [race.avgFps, race.p95, race.over34Pct].every(number) && race.avgFps >= 50 && race.p95 <= 25 && race.over34Pct <= 2;
const modeLabel = (r) => `${r.mode === 'manual' ? 'Play' : r.mode === 'stress' ? 'Stress' : r.mode === 'auto' ? 'Auto' : r.mode} / saver ${r.batterySaver ? 'ON' : 'OFF'}`;
const badge = (text, kind) => `<span class="badge ${kind}">${text}</span>`;
const phoneName = (r) => {
  if ((!r.label || /^K, Android 10(?:\.0)?$/.test(r.label)) && r.device?.model) {
    return `${r.device.model}, ${r.device.platform || 'Android'}${r.device.osVersion ? ` ${r.device.osVersion}` : ''}`;
  }
  return r.label || 'Unnamed device';
};
const dimensions = (value) => Array.isArray(value) ? value.join(' × ') : null;
const measured = (value, unit) => number(value) ? `${value} ${unit}` : null;
const detailsButton = (id) => `<button class="details-toggle" type="button" aria-expanded="false" aria-controls="${id}">Device details</button>`;
function deviceDetails(r, id, columns) {
  const d = r.device || {};
  const fields = [
    ['Model', d.model], ['OS', [d.platform, d.osVersion].filter(Boolean).join(' ')],
    ['Browser', d.browser], ['GPU', d.gpuRenderer], ['GPU vendor', d.gpuVendor], ['WebGL', d.webgl],
    ['CPU logical cores', d.cores], ['Browser-reported memory', measured(d.memoryGB, 'GB')],
    ['Screen', dimensions(d.screen)], ['Viewport', dimensions(d.viewport)], ['Pixel density', measured(d.dpr, '×')],
    ['Estimated refresh rate', measured(d.refreshHz, 'Hz')], ['Render resolution', measured(r.render?.resolution, '×')],
    ['Rendered megapixels', measured(r.render?.mpx, 'Mpx')],
    ['Network', d.network?.type], ['Network downlink estimate', measured(d.network?.downlinkMbps, 'Mbps')],
    ['Network RTT estimate', measured(d.network?.rttMs, 'ms')],
    ['Battery', r.battery ? `${r.battery.start}% → ${r.battery.end}%${r.battery.charging ? ' (charging)' : ''}` : null],
    ['Time to first byte', measured(r.load?.ttfbMs, 'ms')], ['Page load', measured(r.load?.loadedMs, 'ms')],
    ['Transferred', measured(r.load?.transferKB, 'KB')],
  ];
  return `<tr id="${id}" class="device-details-row" hidden><td colspan="${columns}"><section class="device-details" aria-label="${esc(phoneName(r))} device details"><h3>${esc(phoneName(r))}</h3><dl>${fields.map(([name, value]) => `<div><dt>${name}</dt><dd>${esc(value == null || value === '' ? 'Not reported' : value)}</dd></div>`).join('')}</dl><p>Details from the latest race in this row. Memory, refresh rate and network values are browser estimates. Some browsers do not report every field.</p></section></td></tr>`;
}
let reports = [];

function render() {
  const filtered = reports.filter((r) => ($('#mode').value === 'all' || r.mode === $('#mode').value) && ($('#saver').value === 'all' || r.batterySaver === ($('#saver').value === 'on')));
  const valid = filtered.filter((r) => !r.interrupted);
  const groups = new Map();
  for (const r of valid) {
    const key = JSON.stringify([phoneName(r), r.device?.model, r.device?.platform, r.device?.osVersion, r.device?.screen, r.mode, r.batterySaver, r.build]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const rows = [...groups.values()].map((runs, index) => {
    const r = runs[0];
    const id = `summary-details-${index}`;
    const race = { avgFps: median(runs.map((x) => x.race.avgFps)), p95: median(runs.map((x) => x.race.p95)), over34Pct: median(runs.map((x) => x.race.over34Pct)) };
    const complete = Object.values(race).every(number);
    return `<tr><th scope="row">${esc(phoneName(r))}${detailsButton(id)}</th><td>${esc(modeLabel(r))}</td><td class="build">${esc(r.build || '—')}</td><td>${runs.length}</td><td class="metric">${fmt(race.avgFps)}</td><td>${fmt(race.p95)}</td><td>${fmt(race.over34Pct)}%</td><td>${fmt(median(runs.map((x) => x.finish?.avgFps)))}</td><td>${!complete ? badge('INCOMPLETE', 'neutral') : passed(race) ? badge('PASS', 'pass') : badge('BELOW TARGET', 'fail')}</td></tr>${deviceDetails(r, id, 9)}`;
  });
  $('#summary').innerHTML = rows.join('') || '<tr><td colspan="9">No completed tests for these filters.</td></tr>';
  $('#recent').innerHTML = filtered.slice(0, 100).map((r, index) => {
    const id = `recent-details-${index}`;
    const date = new Date(r.at);
    const at = Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
    return `<tr><td>${esc(at)}</td><th scope="row">${esc(phoneName(r))}${detailsButton(id)}</th><td>${esc(modeLabel(r))}</td><td class="build">${esc(r.build || '—')}</td><td class="metric">${fmt(r.race.avgFps)}</td><td>${fmt(r.race.p95)}</td><td>${fmt(r.race.worst)}</td><td>${fmt(r.finish?.avgFps)}</td><td>${fmt(r.input?.avgMs)}</td><td>${r.interrupted ? badge('INTERRUPTED', 'neutral') : passed(r.race) ? badge('PASS', 'pass') : badge('BELOW TARGET', 'fail')}</td></tr>${deviceDetails(r, id, 10)}`;
  }).join('') || '<tr><td colspan="10">No races for these filters yet. Run a device test to add results.</td></tr>';
  $('#totals').innerHTML = `<div><strong>${valid.length}</strong><span>completed races</span></div><div><strong>${new Set(valid.map(phoneName)).size}</strong><span>device labels</span></div><div><strong>${valid.filter((r) => passed(r.race)).length}</strong><span>races on target</span></div><div><strong>${filtered.length - valid.length}</strong><span>interrupted races</span></div>`;
}

async function refresh() {
  $('#refresh').disabled = true;
  $('#load-status').textContent = 'Loading results…';
  try {
    const response = await fetch('/api/device-results', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load results.');
    if (!Array.isArray(data.reports)) throw new Error('Invalid results response.');
    reports = [...new Map(data.reports.map((r) => [r.id, r])).values()].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    render();
    $('#results').hidden = false;
    $('#load-status').textContent = `Updated ${new Date(data.updatedAt).toLocaleTimeString()}. ${reports.length} stored races${reports.length >= data.limit ? ' · showing the latest 2,000' : ''}. Latest races table shows up to 100 matching runs.`;
  } catch (error) {
    $('#load-status').textContent = `${error.message} ${$('#results').hidden ? '' : 'Previously loaded results remain below.'}`;
  } finally {
    $('#refresh').disabled = false;
  }
}

$('#refresh').addEventListener('click', refresh);
$('#results').addEventListener('click', (event) => {
  const button = event.target.closest('.details-toggle');
  if (!button) return;
  const row = document.getElementById(button.getAttribute('aria-controls'));
  row.hidden = !row.hidden;
  button.setAttribute('aria-expanded', String(!row.hidden));
});
$('#mode').addEventListener('change', render);
$('#saver').addEventListener('change', render);
void refresh();

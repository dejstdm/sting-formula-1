import '@fontsource/anton/400.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
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
let reports = [];

function render() {
  const filtered = reports.filter((r) => ($('#mode').value === 'all' || r.mode === $('#mode').value) && ($('#saver').value === 'all' || r.batterySaver === ($('#saver').value === 'on')));
  const valid = filtered.filter((r) => !r.interrupted);
  const groups = new Map();
  for (const r of valid) {
    const key = JSON.stringify([r.label, r.mode, r.batterySaver, r.build]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const rows = [...groups.values()].map((runs) => {
    const r = runs[0];
    const race = { avgFps: median(runs.map((x) => x.race.avgFps)), p95: median(runs.map((x) => x.race.p95)), over34Pct: median(runs.map((x) => x.race.over34Pct)) };
    const complete = Object.values(race).every(number);
    return `<tr><th scope="row">${esc(r.label || 'Unnamed device')}</th><td>${esc(modeLabel(r))}</td><td class="build">${esc(r.build || '—')}</td><td>${runs.length}</td><td class="metric">${fmt(race.avgFps)}</td><td>${fmt(race.p95)}</td><td>${fmt(race.over34Pct)}%</td><td>${fmt(median(runs.map((x) => x.finish?.avgFps)))}</td><td>${!complete ? badge('INCOMPLETE', 'neutral') : passed(race) ? badge('PASS', 'pass') : badge('BELOW TARGET', 'fail')}</td></tr>`;
  });
  $('#summary').innerHTML = rows.join('') || '<tr><td colspan="9">No completed tests for these filters.</td></tr>';
  $('#recent').innerHTML = filtered.slice(0, 100).map((r) => {
    const date = new Date(r.at);
    const at = Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
    return `<tr><td>${esc(at)}</td><th scope="row">${esc(r.label || 'Unnamed device')}</th><td>${esc(modeLabel(r))}</td><td class="build">${esc(r.build || '—')}</td><td class="metric">${fmt(r.race.avgFps)}</td><td>${fmt(r.race.p95)}</td><td>${fmt(r.race.worst)}</td><td>${fmt(r.finish?.avgFps)}</td><td>${fmt(r.input?.avgMs)}</td><td>${r.interrupted ? badge('INTERRUPTED', 'neutral') : passed(r.race) ? badge('PASS', 'pass') : badge('BELOW TARGET', 'fail')}</td></tr>`;
  }).join('') || '<tr><td colspan="10">No races for these filters yet. Run a device test to add results.</td></tr>';
  $('#totals').innerHTML = `<div><strong>${valid.length}</strong><span>completed races</span></div><div><strong>${new Set(valid.map((r) => r.label || 'Unnamed device')).size}</strong><span>device labels</span></div><div><strong>${valid.filter((r) => passed(r.race)).length}</strong><span>races on target</span></div><div><strong>${filtered.length - valid.length}</strong><span>interrupted races</span></div>`;
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
$('#mode').addEventListener('change', render);
$('#saver').addEventListener('change', render);
void refresh();

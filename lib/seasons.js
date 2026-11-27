// Season helpers. Temperate (4 seasons, north/south hemisphere) or tropical (dry/wet).
export const LABEL = { spring: '🌱 Spring', summer: '☀️ Summer', fall: '🍂 Fall', winter: '❄️ Winter', dry: '🌤 Dry season', wet: '🌧 Rainy season' };
const M = {
  north: { spring: [2, 3, 4], summer: [5, 6, 7], fall: [8, 9, 10], winter: [11, 0, 1] },
  south: { spring: [8, 9, 10], summer: [11, 0, 1], fall: [2, 3, 4], winter: [5, 6, 7] },
  tropical: { dry: [10, 11, 0, 1, 2, 3], wet: [4, 5, 6, 7, 8, 9] },
};
export function getPrefs() {
  try { return { mode: localStorage.getItem('hc_mode') || 'temperate', hemi: localStorage.getItem('hc_hemi') || 'north' }; }
  catch { return { mode: 'temperate', hemi: 'north' }; }
}
export function setPrefs(p) { try { localStorage.setItem('hc_mode', p.mode); localStorage.setItem('hc_hemi', p.hemi); } catch {} }
export const seasonList = p => (p.mode === 'tropical' ? ['dry', 'wet'] : ['spring', 'summer', 'fall', 'winter']);
const monthsOf = (s, p) => (p.mode === 'tropical' ? M.tropical[s] : M[p.hemi][s]);
export function currentSeason(p, d = new Date()) { return seasonList(p).find(s => monthsOf(s, p).includes(d.getMonth())); }
export const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// The occurrence of a season that is happening now or comes next: {start, end, year}
export function occurrence(season, p, today = new Date()) {
  const ms = monthsOf(season, p), first = ms[0], last = ms[ms.length - 1];
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let y = t.getFullYear() - 1; y <= t.getFullYear() + 1; y++) {
    const start = new Date(y, first, 1), end = new Date(last < first ? y + 1 : y, last + 1, 0);
    if (end >= t) return { start, end, year: y };
  }
}

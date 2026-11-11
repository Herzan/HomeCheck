const f = d => d.replaceAll('-', '');
export function buildICS(events) {
  const body = events.map((e, i) => `BEGIN:VEVENT\nUID:hc-${i}-${e.date}@homecheck\nDTSTAMP:${f(new Date().toISOString().slice(0,10))}T000000Z\nDTSTART;VALUE=DATE:${f(e.date)}\nSUMMARY:${e.title}\nBEGIN:VALARM\nTRIGGER:-P1D\nACTION:DISPLAY\nDESCRIPTION:${e.title}\nEND:VALARM\nEND:VEVENT`).join('\n');
  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//HomeCheck//EN\n${body}\nEND:VCALENDAR`;
}
export function download(name, text, type = 'text/calendar') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
}

export const MONTH_ABBR = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];
export const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie"];

function atMidnight(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** Lunes (00:00) de la semana actual, desplazada por `offset` semanas (offset<=0). */
export function mondayForOffset(offset: number, base: Date = new Date()) {
  const d = atMidnight(base);
  const day = d.getDay(); // 0=Dom..6=Sáb
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday + offset * 7);
  return d;
}

export function weekdayDates(monday: Date) {
  return WEEKDAY_SHORT.map((short, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return { short, date: dt, dnum: dt.getDate(), mon: MONTH_ABBR[dt.getMonth()] };
  });
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function todayMidnight() {
  return atMidnight(new Date());
}

type CalendarSlot = { start: string; end: string; available: boolean };

const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

export function availableBookingTimes(
  slots: CalendarSlot[],
  minimumMinutes: number,
  date: string,
  now: number,
  selectedStart = "",
) {
  const ordered = [...slots].sort((a, b) => minutes(a.start) - minutes(b.start));
  const endsFrom = (start: string) => {
    const ends: string[] = [];
    let cursor = minutes(start);
    for (const slot of ordered) {
      if (minutes(slot.start) < cursor) continue;
      if (!slot.available || minutes(slot.start) !== cursor) break;
      cursor = minutes(slot.end);
      if (cursor - minutes(start) >= minimumMinutes) ends.push(slot.end);
    }
    return ends;
  };
  const starts = ordered
    .filter((slot) =>
      slot.available &&
      new Date(`${date}T${slot.start.slice(0, 5)}:00+07:00`).getTime() > now &&
      endsFrom(slot.start).length > 0,
    )
    .map((slot) => slot.start);
  return {
    starts,
    ends: starts.includes(selectedStart) ? endsFrom(selectedStart) : [],
  };
}

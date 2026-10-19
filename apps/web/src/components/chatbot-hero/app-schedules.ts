import { WEEKDAYS, type AppSchedules, type TimeRange, type Weekday, type WeekSchedule } from '../../states/local/chatbot-params/state.ts';

// The range every day starts with when an app is restricted.
export const DEFAULT_RANGE: TimeRange = { start: '08:00', end: '20:00' };

// The grid's resolution: a day is SLOTS_PER_DAY cells of SLOT_MINUTES.
export const SLOT_MINUTES = 30;
export const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES;
// "HH:MM" can't say 24:00: a range to the end of the day ends at 23:59.
const END_OF_DAY = '23:59';


const toMinutes = (time: string): number => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

const pad = (value: number): string => String(value).padStart(2, '0');

// The time a slot starts at ("HH:MM"); the day's end is END_OF_DAY.
export const slotTime = (slot: number): string =>
  slot >= SLOTS_PER_DAY ? END_OF_DAY : `${pad(Math.floor((slot * SLOT_MINUTES) / 60))}:${pad((slot * SLOT_MINUTES) % 60)}`;

// Which of a day's slots its ranges enable: those whose start falls in a range,
// so a range off the grid (e.g. 08:15) is rounded to it.
export const toSlots = (ranges: TimeRange[] = []): boolean[] =>
  Array.from({ length: SLOTS_PER_DAY }, (_, slot) =>
    ranges.some(({ start, end }) => toMinutes(start) <= slot * SLOT_MINUTES && slot * SLOT_MINUTES < toMinutes(end)),
  );

// A day's enabled slots as ranges, one per run of consecutive slots.
export const toRanges = (slots: boolean[]): TimeRange[] => {
  const ranges: TimeRange[] = [];
  for (let slot = 0; slot < slots.length; slot++) {
    if (!slots[slot] || slots[slot - 1]) continue;
    let end = slot;
    while (slots[end]) end++;
    ranges.push({ start: slotTime(slot), end: slotTime(end) });
  }
  return ranges;
};

// Every day enabled with the default range: where a newly restricted app starts.
export const defaultWeek = (): WeekSchedule =>
  Object.fromEntries(WEEKDAYS.map((day) => [day, [{ ...DEFAULT_RANGE }]]));

// The schedules rounded to the grid's slots, so what the modal shows (and
// sends) is what the grid can draw: a range kept from before (e.g. 08:15) or
// overlapping ones come out as whole, separate slots.
export const toGrid = (schedules: AppSchedules): AppSchedules =>
  Object.fromEntries(
    Object.entries(schedules).map(([app, week]) => [
      app,
      Object.fromEntries(
        WEEKDAYS.map((day) => [day, toRanges(toSlots(week[day]))] as const).filter(([, ranges]) => ranges.length),
      ),
    ]),
  );

// The schedules of the given apps only (an app taken off the allowed list
// takes its schedule with it), each day's ranges in order and empty days left out.
export const cleanSchedules = (schedules: AppSchedules, apps: string[]): AppSchedules =>
  Object.fromEntries(
    apps
      .filter((app) => schedules[app])
      .map((app) => [
        app,
        Object.fromEntries(
          WEEKDAYS.filter((day) => schedules[app][day]?.length).map((day) => [
            day,
            [...schedules[app][day]!].sort((a, b) => toMinutes(a.start) - toMinutes(b.start)),
          ]),
        ),
      ]),
  );

const rangesKey = (ranges: TimeRange[] = []): string => ranges.map(({ start, end }) => `${start}-${end}`).join(',');

// A week's days grouped by identical ranges, in the order each group first
// appears (Sunday first); the days blocked all day make a group with no ranges.
export const groupDays = (week: WeekSchedule): { days: Weekday[]; ranges: TimeRange[] }[] => {
  const groups = new Map<string, { days: Weekday[]; ranges: TimeRange[] }>();
  for (const day of WEEKDAYS) {
    const key = rangesKey(week[day]);
    const group = groups.get(key);
    if (group) group.days.push(day);
    else groups.set(key, { days: [day], ranges: week[day] ?? [] });
  }
  return [...groups.values()];
};

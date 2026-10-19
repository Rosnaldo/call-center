import { describe, it, expect } from 'vitest';
import { SLOTS_PER_DAY, cleanSchedules, defaultWeek, slotTime, toGrid, toRanges, toSlots } from '../app-schedules.ts';

const slotsOn = (...ranges: [number, number][]) =>
  Array.from({ length: SLOTS_PER_DAY }, (_, slot) => ranges.some(([from, to]) => slot >= from && slot < to));

describe('app schedules grid', () => {
  it('names each slot by its start, and the end of the day as 23:59', () => {
    expect(slotTime(0)).toBe('00:00');
    expect(slotTime(17)).toBe('08:30');
    expect(slotTime(SLOTS_PER_DAY)).toBe('23:59');
  });

  it('turns ranges into slots and back', () => {
    const ranges = [{ start: '08:00', end: '12:30' }, { start: '14:00', end: '23:59' }];
    expect(toSlots(ranges)).toEqual(slotsOn([16, 25], [28, 48]));
    expect(toRanges(toSlots(ranges))).toEqual(ranges);
    expect(toRanges(slotsOn())).toEqual([]);
    expect(toRanges(slotsOn([0, 48]))).toEqual([{ start: '00:00', end: '23:59' }]);
  });

  it('rounds ranges off the grid and merges overlapping ones', () => {
    expect(
      toGrid({ 'com.whatsapp': { mon: [{ start: '08:15', end: '10:00' }, { start: '09:00', end: '11:00' }], tue: [] } }),
    ).toEqual({ 'com.whatsapp': { mon: [{ start: '08:30', end: '11:00' }] } });
  });

  it('keeps only the given apps, with days in order and empty days left out', () => {
    const schedules = {
      'com.whatsapp': {
        mon: [{ start: '14:00', end: '18:00' }, { start: '08:00', end: '12:00' }],
        tue: [],
      },
      'com.removed': defaultWeek(),
    };
    expect(cleanSchedules(schedules, ['com.whatsapp', 'com.spotify.music'])).toEqual({
      'com.whatsapp': { mon: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
    });
  });
});

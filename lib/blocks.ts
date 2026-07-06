// Shared logic for schedule blocks (mid-day breaks / time-off windows).
// A block is a chunk of time REMOVED from an otherwise-open working day.
// It is EITHER recurring (day_of_week set) OR one-off (date set), never both.
// This module is the single source of truth for the overlap rule — both the
// customer slot picker and the server booking action import from here.

export interface ScheduleBlock {
  day_of_week: number | null; // 0..6, set for recurring breaks
  date: string | null; // 'YYYY-MM-DD', set for one-off blocks
  start_time: string; // 'HH:MM' or 'HH:MM:SS'
  end_time: string;
  reason?: string | null;
}

// Minutes since midnight for an 'HH:MM' or 'HH:MM:SS' string.
const toMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// A slot of length `slotLen` starting at `slotStart` ('HH:MM') is blocked when it
// overlaps any block, using half-open intervals [start, end):
//   slotStart < block.end AND slotStart + slotLen > block.start
export function isSlotBlocked(
  slotStart: string,
  blocks: ScheduleBlock[],
  slotLen = 20
): boolean {
  const s = toMinutes(slotStart);
  const e = s + slotLen;
  return blocks.some(
    (b) => s < toMinutes(b.end_time) && e > toMinutes(b.start_time)
  );
}

// The blocks that apply to a given date: recurring rows matching the weekday,
// plus one-off rows matching the exact date.
export function blocksForDate(
  all: ScheduleBlock[],
  dateStr: string,
  weekday: number
): ScheduleBlock[] {
  return all.filter(
    (b) => b.day_of_week === weekday || b.date === dateStr
  );
}

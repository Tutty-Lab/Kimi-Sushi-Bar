import type { Shift } from "../types";

/** Paid overlap with an interval; an unpaid break never counts as staffing. */
export function paidOverlap(shift: Shift, from: number, to: number): number {
  const start = Math.max(from, shift.startMinutes);
  const end = Math.min(to, shift.endMinutes);
  if (end <= start) return 0;
  const pauseStart = shift.pauseStartMinutes ?? shift.endMinutes - shift.pauseMinutes;
  const pause = Math.max(0, Math.min(end, pauseStart + shift.pauseMinutes) - Math.max(start, pauseStart));
  return Math.min(shift.paidMinutes, Math.max(0, end - start - pause));
}

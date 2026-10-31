import type { Schedule } from "../types";
import { datesOfMonth, parseIsoDate, weekdayKeyOf } from "./demand";
import { monthlyTargetMinutesFor } from "./contract";
import { publicHolidays } from "./holidays";
import { paidOverlap } from "./paidTime";
import { coveragePoints, staffAt, weightedDailyTargets } from "./staffing";
import type { StoreConfig } from "./stores";
import { resolveDay } from "./workHours";

export const AUDIT_WINDOWS = [
  { label: "10–14", from: 600, to: 840 },
  { label: "16–18", from: 960, to: 1080 },
  { label: "18–20", from: 1080, to: 1200 },
  { label: "20–đóng cửa", from: 1200, to: 1440 },
] as const;

export function auditSchedule(schedule: Schedule, store: StoreConfig) {
  const holidays = publicHolidays(schedule.year);
  const overrides = Object.fromEntries(schedule.dateOverrides.map(o => [o.date, o]));
  const employees = new Map(schedule.employees.map(e => [e.id, e]));
  const paidShifts = schedule.shifts.filter(s => employees.has(s.employeeId) && !employees.get(s.employeeId)!.ownerSupport);
  const resolved = datesOfMonth(schedule.year, schedule.month).map(date => ({
    date, ...resolveDay(schedule.workHours, date, holidays, overrides),
  }));
  const openDates = resolved.filter(d => !d.closed).map(d => d.date);
  const targetMinutes = schedule.employees.filter(e => !e.ownerSupport)
    .reduce((sum, e) => sum + monthlyTargetMinutesFor(e, openDates, schedule.workHours), 0);
  const openMinutesFor = (date: string) => resolved.find(d => d.date === date)!.blocks
    .reduce((sum, b) => sum + b.endMinutes - b.startMinutes, 0);
  // A monthly contract has one monthly denominator; it is not re-normalized
  // against hours already assigned in each boundary week.
  const targets = weightedDailyTargets(openDates, targetMinutes / 60,
    date => weekdayKeyOf(parseIsoDate(date)), openMinutesFor, store.dayWeights);
  const days = resolved.map(day => {
    const weekday = weekdayKeyOf(parseIsoDate(day.date));
    const onDay = paidShifts.filter(s => s.date === day.date);
    const windows = AUDIT_WINDOWS.map(window => {
      let openMinutes = 0, uncoveredMinutes = 0, ownerOnlyMinutes = 0;
      let minStaff = Infinity, maxStaff = 0, minEmployees = Infinity, maxEmployees = 0;
      for (const block of day.closed ? [] : day.blocks) {
        const from = Math.max(window.from, block.startMinutes), to = Math.min(window.to, block.endMinutes);
        if (to <= from) continue;
        const points = coveragePoints(onDay, from, to);
        for (let i = 0; i < points.length - 1; i++) {
          const start = points[i], duration = points[i + 1] - start;
          const present = staffAt(onDay, employees, start);
          const paid = present.filter(e => !e.ownerSupport).length;
          openMinutes += duration;
          minStaff = Math.min(minStaff, paid); maxStaff = Math.max(maxStaff, paid);
          minEmployees = Math.min(minEmployees, paid); maxEmployees = Math.max(maxEmployees, paid);
          if (!paid) uncoveredMinutes += duration;
          if (!paid && present.some(e => e.ownerSupport)) ownerOnlyMinutes += duration;
        }
      }
      return { label: window.label, openMinutes, uncoveredMinutes, ownerOnlyMinutes,
        minStaff: openMinutes ? minStaff : 0, maxStaff,
        minEmployees: openMinutes ? minEmployees : 0, maxEmployees };
    });
    return { date: day.date, weekday, closed: day.closed, weight: store.dayWeights[weekday],
      openMinutes: day.closed ? 0 : openMinutesFor(day.date),
      paidMinutes: onDay.reduce((sum, s) => sum + s.paidMinutes, 0),
      targetMinutes: (targets.get(day.date) ?? 0) * 60, windows };
  });
  const weekdays = Object.entries(store.dayWeights).map(([weekday, weight]) => {
    const matches = days.filter(d => !d.closed && d.weekday === weekday);
    return { weekday: weekday as typeof days[number]["weekday"], weight, days: matches.length,
      totalMinutes: matches.reduce((sum, d) => sum + d.paidMinutes, 0),
      averageMinutes: matches.length ? matches.reduce((sum, d) => sum + d.paidMinutes, 0) / matches.length : 0,
      targetAverageMinutes: matches.length ? matches.reduce((sum, d) => sum + d.targetMinutes, 0) / matches.length : 0 };
  });
  const minijobs = schedule.employees.filter(e => !e.ownerSupport && e.employmentType === "MINIJOB").map(e => {
    const shifts = paidShifts.filter(s => s.employeeId === e.id);
    const totalMinutes = shifts.reduce((sum, s) => sum + s.paidMinutes, 0);
    const peakMinutes = shifts.reduce((sum, s) => sum + paidOverlap(s, 1080, 1200), 0);
    return { id: e.id, name: e.name, totalMinutes, peakMinutes, outsidePeakMinutes: totalMinutes - peakMinutes };
  });
  return { year: schedule.year, month: schedule.month, targetMinutes,
    assignedMinutes: paidShifts.reduce((sum, s) => sum + s.paidMinutes, 0),
    uncoveredMinutes: days.reduce((sum, d) => sum + d.windows.reduce((n, w) => n + w.uncoveredMinutes, 0), 0),
    days, weekdays, minijobs };
}

import type { DemandBand } from "./staffing";
// ============================================================================
// Einstieg in die Dienstplan-Erstellung. Geplant wird ausschließlich über
// Wochenverträge – die eigentliche Logik steht in weeklyScheduler.ts. Dieser
// Wrapper hält die Signatur für den Hook und die Tests stabil.
// ============================================================================

import type { Employee, Shift } from "../types";
import type { OverrideMap, WorkHoursConfig } from "./workHours";
import type { StaffingRule } from "./staffing";
import type { WeekdayKey } from "./demand";
import { datesOfMonth } from "./demand";
import { publicHolidays } from "./holidays";
import { resolveDay } from "./workHours";
import { calculatePause } from "./time";
import { checkShifts } from "./shiftChecks";
import { validateSchedule } from "./validation";
import { generateWeeklySchedule } from "./weeklyScheduler";

export type GenerateInput = {
  year: number;
  month: number; // 1-basiert
  /** Arbeitszeit-Fenster je Wochentag + Feiertag. */
  workHours: WorkHoursConfig;
  /** Ausnahmen für einzelne Daten (geschlossen / abweichende Zeiten). */
  overrides?: OverrideMap;
  employees: Employee[];
  /** Feiertage als ISO-Set; Standard: Feiertage in Bayern des Jahres. */
  holidays?: Set<string>;
  /** Nicht verwendet (der Wochenplaner ist deterministisch); bleibt für die Signatur. */
  seed?: string;
  /** Besetzungsregeln dieser Filiale. */
  rules?: readonly StaffingRule[];
  /** Tagesgewichte dieser Filiale. */
  weights?: Record<WeekdayKey, number>;
  demandProfile?: readonly DemandBand[];
  /** Tage, an denen jemand schon im anderen Laden arbeitet. */
  blockedDays?: Record<string, readonly string[]>;
  /** Kennung der Filiale (interner Cache). */
  storeTag?: string;
};

export function generateSchedule(input: GenerateInput): Shift[] {
  let shifts = generateWeeklySchedule(input);
  // Preserve exact monthly minutes after the coarse scheduling search.
  const holidays = input.holidays ?? publicHolidays(input.year);
  const dates = datesOfMonth(input.year,input.month);
  for (const employee of input.employees) {
    if (employee.ownerSupport || employee.fixedShift || employee.weeklyHours != null) continue;
    const remainder = employee.targetMinutes - shifts.filter(s=>s.employeeId===employee.id).reduce((n,s)=>n+s.paidMinutes,0);
    if (remainder <= 0 || remainder >= 30) continue;
    for (const shift of shifts.filter(s=>s.employeeId===employee.id)) {
      const paidMinutes=shift.paidMinutes+remainder;
      const pauseMinutes=calculatePause(paidMinutes);
      const extra=remainder+pauseMinutes-shift.pauseMinutes;
      const block=resolveDay(input.workHours,shift.date,holidays,input.overrides).blocks.find(b=>shift.startMinutes>=b.startMinutes&&shift.endMinutes<=b.endMinutes);
      if (!block) continue;
      let accepted=false;
      for (const earlier of [false,true]) {
        const next={...shift,paidMinutes,pauseMinutes,startMinutes:shift.startMinutes-(earlier?extra:0),endMinutes:shift.endMinutes+(earlier?0:extra)};
        if(next.startMinutes<block.startMinutes||next.endMinutes>block.endMinutes) continue;
        const candidate=shifts.map(s=>s===shift?next:s);
        const schedule={...input,companyName:"Kimi Sushi Bar",address:"",dateOverrides:Object.values(input.overrides??{}),shifts:candidate};
        if(checkShifts(schedule).get(`${employee.id}#${shift.date}`)?.some(i=>i.hard)) continue;
        if(validateSchedule(input.employees,candidate,input.year,dates,input.workHours).errors.some(e=>e.severity!=="warning")) continue;
        shifts=candidate; accepted=true; break;
      }
      if(accepted) break;
    }
  }
  return shifts;
}

import { expect,it } from "vitest";
import { initialScheduleFor, STORES } from "../stores";
import { generateSchedule } from "../scheduler";
import { serviceCoverage } from "../serviceCoverage";
import { resolveDay } from "../workHours";
import { publicHolidays } from "../holidays";
import { validateSchedule } from "../validation";
import { checkShifts } from "../shiftChecks";
import { auditSchedule } from "../scheduleAudit";
import { datesOfMonth } from "../demand";
it("Kimi defaults, split opening hours and owner coverage",()=>{
 const s=initialScheduleFor(STORES[0]);
 expect(STORES[0].dayWeights).toEqual({monday:0,tuesday:1,wednesday:1,thursday:1,friday:1.5,saturday:1.5,sunday:1});
 expect(s.month).toBe(10);
 expect(s.employees.filter(e=>!e.ownerSupport).map(e=>e.targetMinutes)).toEqual([10800,2604,2604,2604,2604]);
 const h=publicHolidays(2026);
 expect(h.has("2026-10-31")).toBe(true);
 expect(h.has("2026-11-01")).toBe(false);
 expect(resolveDay(s.workHours,"2026-10-31",h).blocks[1].endMinutes).toBe(1320);
 expect(resolveDay(s.workHours,"2026-10-26",h).closed).toBe(true);
 expect(serviceCoverage(s).requiredEmptyMinutes).toBeGreaterThan(0);
});
it("October quotas, legal limits, minijob peak preference",()=>{
 const store=STORES[0],s=initialScheduleFor(store);
 const shifts=generateSchedule({...s,rules:store.staffingRules,weights:store.dayWeights,demandProfile:store.demandProfile,storeTag:store.id});
 for(const e of s.employees.filter(e=>!e.ownerSupport)) {
  const assigned=shifts.filter(t=>t.employeeId===e.id).reduce((n,t)=>n+t.paidMinutes,0);
  console.log(e.name,assigned/60);
  expect(assigned).toBeLessThanOrEqual(e.targetMinutes);
  expect(e.targetMinutes-assigned).toBe(e.targetMinutes % 30);
 }
 expect(shifts.some(t=>t.employeeId==="kimi-owner")).toBe(false);
 const audit=auditSchedule({...s,shifts},store);
 console.log("October daily hours",audit.days.map(d=>d.paidMinutes/60).join(", "));
 expect(shifts.every(t=>[t.startMinutes,t.endMinutes,t.paidMinutes,t.pauseMinutes,t.pauseStartMinutes??0].every(n=>n%30===0))).toBe(true);
 expect(audit.days.filter(d=>!d.closed).every(d=>d.windows.filter(w=>w.openMinutes).every(w=>w.minEmployees>=1))).toBe(true);
 expect(serviceCoverage({...s,shifts}).requiredEmptyMinutes).toBe(0);
 const errors=validateSchedule(s.employees,shifts,2026,datesOfMonth(2026,10),s.workHours).errors.filter(e=>e.severity!=="warning");
 expect(errors).toEqual([]);
 const mini=shifts.filter(t=>t.employeeId!=="kimi-1");
 const peak=mini.reduce((n,t)=>n+Math.max(0,Math.min(t.endMinutes,1200)-Math.max(t.startMinutes,1080)),0);
 expect(peak/mini.reduce((n,t)=>n+t.paidMinutes,0)).toBeGreaterThan(0.4);
},60000);

for(let month=1;month<=12;month++) it(`Kimi 2026/${month}: half-hour quotas and valid split shifts`,()=>{
 const store=STORES[0],s={...initialScheduleFor(store),month};
 const shifts=generateSchedule({...s,rules:store.staffingRules,weights:store.dayWeights,demandProfile:store.demandProfile,storeTag:store.id});
 for(const e of s.employees.filter(e=>!e.ownerSupport)) expect(shifts.filter(t=>t.employeeId===e.id).reduce((n,t)=>n+t.paidMinutes,0),e.name).toBe(Math.floor(e.targetMinutes/30)*30);
 expect([...checkShifts({...s,shifts}).values()].flat().filter(i=>i.hard)).toEqual([]);
 expect(serviceCoverage({...s,shifts}).requiredEmptyMinutes).toBe(0);
},30000);

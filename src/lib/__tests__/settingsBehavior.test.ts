import {expect,it} from "vitest";
import type {Employee} from "../../types";
import {draftFrom,draftToEmployee,employeeDraftErrors} from "../../components/EmployeesTab";
import {initialScheduleFor,STORES} from "../stores";
import {generateSchedule} from "../scheduler";
import {checkShifts} from "../shiftChecks";
import {parseIsoDate,weekdayKeyOf} from "../demand";
const store=STORES[0];
const base={...initialScheduleFor(store),year:2027,month:1};
const worker:Employee={id:"probe",name:"Probe",employmentType:"MINIJOB",targetMinutes:1200,station:"SERVICE"};
function plan(patch:Partial<Employee>={}, rules=store.staffingRules) {
 const employee={...worker,...patch};
 const schedule={...base,employees:[employee,...base.employees.filter(e=>e.ownerSupport)]};
 const shifts=generateSchedule({...schedule,rules,weights:store.dayWeights,demandProfile:store.demandProfile});
 return {...schedule,shifts};
}
it("fixed shift cannot cross closing time or lunch closure",()=>{
 for(const fixedShift of [{startMinutes:390,endMinutes:870},{startMinutes:600,endMinutes:900}]) {
  expect(plan({fixedShift}).shifts).toEqual([]);
 }
});
it("fixed valid shift keeps exact start/end",()=>{
 const s=plan({fixedShift:{startMinutes:600,endMinutes:840}});
 expect(s.shifts.length).toBeGreaterThan(0);
 expect(s.shifts.every(t=>t.startMinutes===600&&t.endMinutes===840)).toBe(true);
});
it("days off, date limits, leave and maximum days are enforced together",()=>{
 const s=plan({availableWeekdays:["friday","saturday"],startDate:"2027-01-08",endDate:"2027-01-23",unavailableRanges:[{startDate:"2027-01-15",endDate:"2027-01-16"}],maxDaysPerWeek:1});
 expect(s.shifts.length).toBeGreaterThan(0);
 for(const t of s.shifts){expect(t.date>="2027-01-08"&&t.date<="2027-01-23").toBe(true);expect(["friday","saturday"]).toContain(weekdayKeyOf(parseIsoDate(t.date)));expect(t.date<"2027-01-15"||t.date>"2027-01-16").toBe(true);}
 expect([...checkShifts(s).values()].flat().filter(i=>i.hard)).toEqual([]);
});
it("hard shift window applies to exact fractional monthly hours",()=>{
 const s=plan({targetMinutes:2604,shiftWindow:{startMinutes:1080,endMinutes:1200}});
 expect(s.shifts.every(t=>t.startMinutes>=1080&&t.endMinutes<=1200)).toBe(true);
 expect(s.shifts.reduce((n,t)=>n+t.paidMinutes,0)).toBeLessThanOrEqual(2604);
});
it("holiday-duty setting schedules an eligible opening holiday",()=>{expect(plan({requiredOnHolidays:true}).shifts.some(t=>t.date==="2027-01-01")).toBe(true);});
it("salary/rate are saved without changing hours or generated shifts",()=>{
 const employee=draftToEmployee({...draftFrom(worker),hours:"20",monthlySalary:"603",hourlyRate:"15"});
 expect(employee.monthlySalary).toBe(603);expect(employee.hourlyRate).toBe(15);expect(employee.targetMinutes).toBe(1200);
 const normal=plan().shifts,paid=plan(employee).shifts;
 const comparable=(shifts:typeof normal)=>shifts.map(({date,startMinutes,endMinutes,paidMinutes})=>({date,startMinutes,endMinutes,paidMinutes}));
 expect(comparable(normal)).toEqual(comparable(paid));
});
it("spread preference changes workdays when a shift-length range is provided",()=>{
 const days=(s:ReturnType<typeof plan>)=>new Set(s.shifts.map(t=>t.date)).size;
 const compact=plan({targetMinutes:2604,shiftHours:{min:2,max:6}},[]),spread=plan({targetMinutes:2604,shiftHours:{min:2,max:6},spreadEvenly:true},[]);
 expect(days(spread)).toBeGreaterThan(days(compact));
});
it("preferred window moves working minutes into that window",()=>{
 const s=plan({targetMinutes:1200,preferredWindows:[{days:["tuesday","wednesday","thursday","friday","saturday","sunday"],startMinutes:1080,endMinutes:1200}]});
 const peak=s.shifts.reduce((n,t)=>n+Math.max(0,Math.min(t.endMinutes,1200)-Math.max(t.startMinutes,1080)),0);
 expect(peak/s.shifts.reduce((n,t)=>n+t.paidMinutes,0)).toBeGreaterThan(0.6);
});

it("incomplete or conflicting popup settings cannot be silently saved",()=>{
 const draft=draftFrom(worker);
 expect(employeeDraftErrors(draft,base.workHours)).toEqual([]);
 for(const patch of [
 {daysOff:["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as typeof draft.daysOff},
 {shiftMin:"6",shiftMax:"2"},{shiftMin:"2",shiftMax:""},
 {windows:[{days:[] as typeof draft.daysOff,start:"18:00",end:"20:00"}]},
 {startDate:"2027-01-20",endDate:"2027-01-10"},
 {fixed:true,fixedStart:"10:00",fixedEnd:"16:00"},
 {monthlySalary:"-1"},{hourlyRate:"0"},
 {unavailableRanges:[{startDate:"2027-01-20",endDate:""}]}
 ]) expect(employeeDraftErrors({...draft,...patch},base.workHours).length).toBeGreaterThan(0);
});

import {expect,it} from "vitest";
import {mkdirSync,writeFileSync} from "node:fs";
import {initialScheduleFor,STORES} from "../stores";
import {generateSchedule} from "../scheduler";
import {auditSchedule} from "../scheduleAudit";
import {buildStundenzettelPdf} from "../pdf";
import {hourStatsFor} from "../surchargeHours";
import {minutesOutsidePreferred} from "../preferredWindows";
import {validateSchedule} from "../validation";
import type {Shift} from "../../types";
const shift=(patch:Partial<Shift>={}):Shift=>({id:"s",employeeId:"e",date:"2027-01-01",startMinutes:1080,endMinutes:1320,pauseMinutes:0,paidMinutes:240,shiftType:"LATE",generated:true,...patch});
it("paid night/preference hours exclude pauses and merge overlapping windows",()=>{
 const s=shift({startMinutes:1080,endMinutes:1320,pauseMinutes:30,pauseStartMinutes:1200,paidMinutes:210});
 expect(hourStatsFor([s],"e",[s.date])).toEqual({total:210,night:90,sunday:0});
 expect(minutesOutsidePreferred([{days:["friday"],startMinutes:1080,endMinutes:1200},{days:["friday"],startMinutes:1140,endMinutes:1230}],"friday",s)).toBe(90);
 const sun=shift({date:"2027-01-03"});
 expect(hourStatsFor([sun],"e",[sun.date])).toEqual({total:240,night:0,sunday:240});
});
it("even one minute over a monthly quota is an error",()=>{
 const e={id:"e",name:"E",employmentType:"MINIJOB" as const,targetMinutes:239};
 expect(validateSchedule([e],[shift()],2027,["2027-01-01"]).errors.some(e=>e.rule==="contract-max")).toBe(true);
});
it("January 2027 audit reconciles exact hours, staffing and PDF summaries",async()=>{
 const store=STORES[0],base={...initialScheduleFor(store),year:2027,month:1};
 const shifts=generateSchedule({...base,rules:store.staffingRules,weights:store.dayWeights,demandProfile:store.demandProfile,storeTag:store.id});
 const schedule={...base,shifts},audit=auditSchedule(schedule,store);
 expect(audit.assignedMinutes).toBe(21120);expect(audit.targetMinutes).toBe(21216);
 expect(audit.days.reduce((sum,d)=>sum+d.paidMinutes,0)).toBe(audit.assignedMinutes);
 expect(audit.days.reduce((sum,d)=>sum+d.targetMinutes,0)).toBeCloseTo(audit.targetMinutes);
 expect(audit.uncoveredMinutes).toBe(0);
 expect(shifts.every(s=>[s.startMinutes,s.endMinutes,s.paidMinutes,s.pauseMinutes,s.pauseStartMinutes??0].every(n=>n%30===0))).toBe(true);
 expect(audit.days.filter(d=>!d.closed).every(d=>d.windows.filter(w=>w.openMinutes).every(w=>w.minEmployees>=1))).toBe(true);

 expect(audit.weekdays.find(d=>d.weekday==="friday")!.weight).toBe(1.5);
 expect(audit.weekdays.find(d=>d.weekday==="saturday")!.weight).toBe(1.5);
 expect(audit.weekdays.find(d=>d.weekday==="sunday")!.weight).toBe(1);
 expect(audit.minijobs.reduce((n,e)=>n+e.peakMinutes,0)/audit.minijobs.reduce((n,e)=>n+e.totalMinutes,0)).toBeGreaterThan(0.4);
 const employees=base.employees.filter(e=>!e.ownerSupport);
 const pdf=await buildStundenzettelPdf(schedule,employees);
 expect(pdf.getNumberOfPages()).toBe(6);
 for(let i=0;i<employees.length;i++){
  const page=(pdf.internal.pages as unknown as Record<number,string[]>)[i+2].join("\n");
  expect(page).toContain("Gesamtstunden");expect(page).toContain("Nachtstunden");expect(page).toContain("Sonntagsstunden");
  expect(page).not.toContain("Nacht ab 20 Uhr ohne Sonntage");
 }
 if(process.env.WRITE_KIMI_AUDIT){
  mkdirSync("reports",{recursive:true});mkdirSync("output/pdf",{recursive:true});
  writeFileSync("reports/kimi-2027-01.json",JSON.stringify({audit,schedule},null,2));
  writeFileSync("output/pdf/kimi-2027-01-timesheets.pdf",Buffer.from(pdf.output("arraybuffer")));
  console.log(JSON.stringify({weekdays:audit.weekdays,minijobs:audit.minijobs},null,2));
 }
},30000);
it("audit detects missing owners and distinguishes owner-only coverage",()=>{
 const store=STORES[0],base={...initialScheduleFor(store),year:2027,month:1};
 const withOwner=auditSchedule(base,store);
 expect(withOwner.uncoveredMinutes).toBeGreaterThan(0);
 expect(withOwner.days.flatMap(d=>d.windows).reduce((sum,w)=>sum+w.ownerOnlyMinutes,0)).toBeGreaterThan(0);
 expect(auditSchedule({...base,employees:base.employees.filter(e=>!e.ownerSupport)},store).uncoveredMinutes).toBeGreaterThan(0);
});

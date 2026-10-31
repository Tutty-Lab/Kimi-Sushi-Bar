import { expect,it } from "vitest";
import { draftFrom,draftToEmployee } from "../../components/EmployeesTab";
import { kimiEmployees } from "../restaurantData";

it("edits monthly hours independently of monthly salary",()=>{
 const original=kimiEmployees()[0];
 const next=draftToEmployee({...draftFrom(original),hours:"123,5"});
 expect(next.targetMinutes).toBe(7410);
 expect(next.monthlySalary).toBe(original.monthlySalary);
 expect(next.weeklyHours).toBeUndefined();
 expect(next.station).toBe("SERVICE");
});
it("converts an existing weekly quota to the displayed monthly hours",()=>{
 const original={...kimiEmployees()[0],weeklyHours:30};
 const draft=draftFrom(original,{},8100);
 expect(draft.hours).toBe("135");
 const saved=draftToEmployee(draft);
 expect(saved.targetMinutes).toBe(8100);
 expect(saved.weeklyHours).toBeUndefined();
});
it("keeps monthly hours independent of salary settings",()=>{
 const original={...kimiEmployees()[0],quotaSource:"salary" as const};
 const next=draftToEmployee({...draftFrom(original),hours:"100",monthlySalary:"1390",hourlyRate:"13,9"});
 expect(next.targetMinutes).toBe(6000);
 expect(next.quotaSource).toBe("hours");
 expect(next.monthlySalary).toBe(1390);
});
it("exposes and clears a previously hidden hard shift window",()=>{
 const employee={...kimiEmployees()[1],shiftWindow:{startMinutes:1080,endMinutes:1290}};
 const draft=draftFrom(employee);
 expect(draft.windowStart).toBe("18:00");
 expect(draftToEmployee({...draft,windowStart:"17:00"}).shiftWindow).toEqual({startMinutes:1020,endMinutes:1290});
 expect(draftToEmployee({...draft,limited:false}).shiftWindow).toBeUndefined();
});

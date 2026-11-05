import { expect,it } from "vitest";
import { draftFrom,draftToEmployee,employeeDraftErrors,salaryQuotaMinutes } from "../../components/EmployeesTab";
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
it("salary mode derives monthly hours from monthly salary ÷ hourly rate",()=>{
 const original={...kimiEmployees()[0],quotaSource:"salary" as const};
 const draft={...draftFrom(original),monthlySalary:"1700",hourlyRate:"13,60",hours:"999"};
 expect(salaryQuotaMinutes(draft)).toBe(7500);
 expect(employeeDraftErrors(draft)).toEqual([]);
 const next=draftToEmployee(draft);
 expect(next.targetMinutes).toBe(7500);
 expect(next.quotaSource).toBe("salary");
 expect(next.monthlySalary).toBe(1700);
 expect(next.hourlyRate).toBe(13.6);
 expect(draftFrom({id:"x",...next}).quotaSource).toBe("salary");
});
it("salary mode blocks saving without salary or with a non-positive rate",()=>{
 const draft={...draftFrom(),name:"Test",quotaSource:"salary" as const};
 expect(salaryQuotaMinutes({...draft,monthlySalary:""})).toBeNull();
 expect(employeeDraftErrors({...draft,monthlySalary:""})).toContain("Nhập lương tháng (số từ 0 trở lên).");
 expect(employeeDraftErrors({...draft,monthlySalary:"1000",hourlyRate:"0"})).toContain("Lương giờ phải lớn hơn 0.");
});
it("hours mode saves typed hours and keeps the previous monthly salary",()=>{
 const original={...kimiEmployees()[0],quotaSource:"salary" as const};
 const draft={...draftFrom(original),quotaSource:"hours" as const,hours:"80,5"};
 expect(employeeDraftErrors(draft)).toEqual([]);
 const next=draftToEmployee(draft);
 expect(next.targetMinutes).toBe(4830);
 expect(next.quotaSource).toBe("hours");
 expect(next.monthlySalary).toBe(original.monthlySalary);
 expect(next.hourlyRate).toBe(original.hourlyRate);
 expect(draftFrom({id:"x",...next}).quotaSource).toBe("hours");
 expect(employeeDraftErrors({...draft,hours:"-1"})).toContain("Giờ/tháng phải là số từ 0 trở lên.");
});
it("legacy employees without quotaSource open by salary presence; owner is always 0h",()=>{
 const {quotaSource:_q,...legacy}=kimiEmployees()[0];
 expect(draftFrom(legacy).quotaSource).toBe("salary");
 expect(draftFrom({...legacy,monthlySalary:undefined}).quotaSource).toBe("hours");
 const owner={...draftFrom(),name:"Chủ",ownerSupport:true,monthlySalary:""};
 expect(employeeDraftErrors(owner)).toEqual([]);
 expect(draftToEmployee(owner).targetMinutes).toBe(0);
});
it("exposes and clears a previously hidden hard shift window",()=>{
 const employee={...kimiEmployees()[1],shiftWindow:{startMinutes:1080,endMinutes:1290}};
 const draft=draftFrom(employee);
 expect(draft.windowStart).toBe("18:00");
 expect(draftToEmployee({...draft,windowStart:"17:00"}).shiftWindow).toEqual({startMinutes:1020,endMinutes:1290});
 expect(draftToEmployee({...draft,limited:false}).shiftWindow).toBeUndefined();
});

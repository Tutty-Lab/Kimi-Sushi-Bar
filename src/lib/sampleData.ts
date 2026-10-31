import type { Employee } from "../types";
export function makeEmployee(id:string,name:string,employmentType:Employee["employmentType"],targetHours:number):Employee {
 return {id,name,employmentType,targetMinutes:Math.round(targetHours*60)};
}

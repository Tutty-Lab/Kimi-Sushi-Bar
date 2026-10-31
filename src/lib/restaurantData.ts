import type { Employee } from "../types";
import { makeEmployee } from "./sampleData";
const WEEKDAY_ORDER = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;
export const restaurantOwner = (): Employee => ({ id: "kimi-owner", name: "Chủ quán", employmentType: "VOLLZEIT", station: "SERVICE", targetMinutes: 0, ownerSupport: true });
export function kimiEmployees(): Employee[] {
 const names = ["Hiep Hoang", "Thi Thuy Linh Nguyen", "Thi Huong Linh Nguyen", "Thi Nhan Nguyen", "Quang Trung Khuat"];
 return names.map((name,i): Employee => ({ ...makeEmployee(`kimi-${i+1}`,name,i===0?"VOLLZEIT":"MINIJOB",i===0?180:43.4), station:"SERVICE", quotaSource:"hours", monthlySalary:i===0?3900:603, hourlyRate:i===0?21.67:13.90,
 preferredWindows:i===0?undefined:[{days:[...WEEKDAY_ORDER],startMinutes:1080,endMinutes:1200}] })).concat(restaurantOwner());
}

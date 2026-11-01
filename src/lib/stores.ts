import type { Employee, Schedule } from "../types";
import type { WeekdayKey } from "./demand";
import { type DemandBand, type StaffingRule, clip } from "./staffing";
import { DEFAULT_WORK_HOURS, type WorkHoursConfig } from "./workHours";
import { kimiEmployees } from "./restaurantData";
export type StoreConfig = { id:string; name:string; shortName:string; address:string; sampleEmployees:()=>Employee[]; workHours?:WorkHoursConfig; notes?:string; demandProfile?:readonly DemandBand[]; dayWeights:Record<WeekdayKey,number>; staffingRules:readonly StaffingRule[] };
const day = (late=1290) => [{startMinutes:600,endMinutes:840},{startMinutes:960,endMinutes:late}];
export const KIMI_HOURS: WorkHoursConfig = {
 perWeekday:{monday:[],tuesday:day(),wednesday:day(),thursday:day(),friday:day(1320),saturday:day(1320),sunday:day()},
 holiday:day(), closedWeekdays:{monday:true,tuesday:false,wednesday:false,thursday:false,friday:false,saturday:false,sunday:false}
};
const rules: readonly StaffingRule[] = [
 {priority:"required",label:"Có nhân viên suốt giờ mở cửa",when:"Toàn bộ giờ mở cửa",minStaff:1,maxStaff:Infinity,scaled:false,who:e=>!e.ownerSupport,windows:blocks=>blocks},
 {priority:"preparation",label:"Minijob cao điểm",when:"18:00–20:00",minStaff:1,maxStaff:Infinity,scaled:false,who:e=>e.employmentType==="MINIJOB",windows:clip(1080,1200)}
];
export const STORES: StoreConfig[] = [{id:"kimi-sushi",name:"Kimi Sushi Bar",shortName:"Kimi Sushi",address:"Zschochernstr. 16, 07545 Gera",sampleEmployees:kimiEmployees,workHours:KIMI_HOURS,staffingRules:rules,
 demandProfile:[{startMinutes:600,endMinutes:840,level:0.5,label:"Buổi trưa ít khách"},{startMinutes:960,endMinutes:1080,level:1,label:"Đầu tối"},{startMinutes:1080,endMinutes:1200,level:2,label:"Cao điểm"},{startMinutes:1200,endMinutes:1320,level:0.8,label:"Cuối tối"}],
 dayWeights:{monday:0,tuesday:1,wednesday:1,thursday:1.5,friday:1.5,saturday:1.5,sunday:1},
 notes:"Thứ 2 nghỉ. Thứ 3–CN 10:00–14:00, 16:00–21:30; thứ 6–7 đến 22:00. Chủ luôn làm cùng, bắt buộc ít nhất 1 nhân viên ngoài chủ suốt giờ mở cửa. Không chia bồi/bếp. Giờ hợp đồng nhập theo tháng; minijob ưu tiên 18:00–20:00, ngày đông thứ 5–7. Ngày lễ theo giờ của thứ tương ứng; Giáng sinh chỉnh từng năm trong ngày ngoại lệ."}];
export const DEFAULT_STORE_ID = STORES[0].id;

/** Merkt sich die zuletzt gewählte Filiale auf diesem Gerät. */
const STORE_KEY = "kimi-sushi-app:store";

export function loadStoreId(): string {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved && STORES.some((s) => s.id === saved)) return saved;
  } catch {
    /* ignorieren */
  }
  return DEFAULT_STORE_ID;
}

export function saveStoreId(id: string): void {
  try {
    localStorage.setItem(STORE_KEY, id);
  } catch {
    /* ignorieren */
  }
}

export function storeById(id: string): StoreConfig {
  return STORES.find((s) => s.id === id) ?? STORES[0];
}

/**
 * Ältere Stände (gespeichert, bevor Nieu 37 dazukam) kennen noch keinen
 * personKey. Dann erkennt „Tạo lịch làm việc" nicht, dass Bá Việt Nguyen im
 * Shin und im Nieu derselbe Mensch ist, und plant ihn am selben Tag in beiden
 * Läden. Fehlt der personKey, übernimmt ein Mitarbeiter mit derselben id und
 * demselben Namen wie in der Startbelegschaft personKey und – nur in diesem
 * einen Schritt – auch maxDaysPerWeek. Danach steht der personKey im Stand, und
 * ein später geleertes „tối đa … ngày/tuần" bleibt leer. Löst man die
 * Verbindung im Tab Nhân viên, steht dort "" statt nichts.
 */
export function withSharedPersonDefaults(employees: Employee[], store: StoreConfig): Employee[] {
  const starters = new Map(store.sampleEmployees().map((e) => [e.id, e]));
  return employees.map((employee) => {
    const starter = starters.get(employee.id);
    // "" = im Tab Nhân viên bewusst gelöst – dann nicht wieder verbinden.
    if (employee.personKey !== undefined || !starter?.personKey || starter.name !== employee.name) return employee;
    return {
      ...employee,
      personKey: starter.personKey,
      maxDaysPerWeek: employee.maxDaysPerWeek ?? starter.maxDaysPerWeek,
    };
  });
}

/** Startstand einer Filiale: September 2026 mit der Belegschaft aus der Angabe. */
export function initialScheduleFor(store: StoreConfig): Schedule {
  return {
    companyName: store.name,
    address: store.address,
    year: 2026,
    month: 10,
    workHours: structuredClone(store.workHours ?? DEFAULT_WORK_HOURS),
    dateOverrides: [],
    employees: store.sampleEmployees(),
    shifts: [],
  };
}

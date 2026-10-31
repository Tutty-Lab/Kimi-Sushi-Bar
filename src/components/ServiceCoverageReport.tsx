import type { Schedule } from "../types";
import { serviceCoverage } from "../lib/serviceCoverage";
export function ServiceCoverageReport({schedule}:{schedule:Schedule}) {
 const r=serviceCoverage(schedule);
 return <details className="rounded-lg border p-3 text-sm"><summary>Phủ giờ mở cửa: thiếu {(r.requiredEmptyMinutes/60).toFixed(1)} giờ</summary><p>Chủ quán luôn làm cùng. Ít nhất 1 người trong toàn bộ giờ mở cửa. Minijob ưu tiên 18:00–20:00; không chia bộ phận.</p></details>;
}

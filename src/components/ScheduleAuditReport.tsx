import { useMemo } from "react";
import type { Schedule } from "../types";
import { AUDIT_WINDOWS, auditSchedule } from "../lib/scheduleAudit";
import { WEEKDAY_SHORT_VI } from "../lib/demand";
import type { StoreConfig } from "../lib/stores";

const hours = (minutes: number) => (minutes / 60).toLocaleString("de-DE", { maximumFractionDigits: 2 });
const cell = "border border-slate-200 px-2 py-1.5 text-right whitespace-nowrap";

export function ScheduleAuditReport({ schedule, store }: { schedule: Schedule; store: StoreConfig }) {
  const report = useMemo(() => auditSchedule(schedule, store), [schedule, store]);
  const ownerOnly = report.days.reduce((sum, d) => sum + d.windows.reduce((n, w) => n + w.ownerOnlyMinutes, 0), 0);
  return <details className="mb-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
    <summary className="cursor-pointer font-medium">
      Tổng giờ & độ phủ · {hours(report.assignedMinutes)} / {hours(report.targetMinutes)}h · thiếu người {hours(report.uncoveredMinutes)}h
    </summary>
    <div className="mt-3 space-y-4">
      <p>Giờ công chỉ tính nhân viên. Độ phủ chỉ tính nhân viên ngoài chủ, trừ giờ nghỉ. Bắt buộc ít nhất 1 nhân viên suốt giờ mở cửa. Chủ đứng một mình {hours(ownerOnly)}h trong tháng. Số nhân sự dưới đây là ít nhất–đông nhất trong từng khung.</p>
      <p>Mục tiêu ngày = giờ định mức tháng × (hệ số ngày × phút mở cửa) ÷ tổng hệ số có trọng số của tháng. Đây là mục tiêu mềm; ca, ngày nghỉ, giờ hợp đồng có thể làm giờ thực tế lệch.</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <caption className="mb-2 text-left font-semibold">Hệ số và giờ bình quân mỗi ngày</caption>
          <thead><tr><th className={cell}>Ngày</th><th className={cell}>Hệ số</th><th className={cell}>Số ngày mở</th><th className={cell}>Mục tiêu h/ngày</th><th className={cell}>Đã xếp h/ngày</th><th className={cell}>Tổng h</th></tr></thead>
          <tbody>{report.weekdays.map(d => <tr key={d.weekday}><th className={cell}>{WEEKDAY_SHORT_VI[d.weekday]}</th><td className={cell}>{d.weight}</td><td className={cell}>{d.days}</td><td className={cell}>{hours(d.targetAverageMinutes)}</td><td className={cell}>{hours(d.averageMinutes)}</td><td className={cell}>{hours(d.totalMinutes)}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <caption className="mb-2 text-left font-semibold">Giờ từng ngày · nhân viên từng khung (không tính chủ)</caption>
          <thead><tr><th className={cell}>Ngày</th><th className={cell}>Hệ số</th><th className={cell}>Mục tiêu h</th><th className={cell}>Đã xếp h</th>{AUDIT_WINDOWS.map(w => <th key={w.label} className={cell}>{w.label}</th>)}<th className={cell}>Chỉ có chủ h</th></tr></thead>
          <tbody>{report.days.map(d => <tr key={d.date} className={d.closed ? "bg-slate-50 text-slate-400" : ""}>
            <th className={cell}>{d.date} · {WEEKDAY_SHORT_VI[d.weekday]}</th><td className={cell}>{d.weight}</td><td className={cell}>{hours(d.targetMinutes)}</td><td className={cell}>{hours(d.paidMinutes)}</td>
            {d.windows.map(w => <td key={w.label} className={`${cell} ${w.uncoveredMinutes ? "bg-rose-50 text-rose-700" : ""}`} title={`${w.minEmployees}–${w.maxEmployees} nhân viên, không tính chủ; chỉ có chủ ${hours(w.ownerOnlyMinutes)}h; thiếu người ${hours(w.uncoveredMinutes)}h`}>
              {w.openMinutes ? `${w.minStaff}–${w.maxStaff}` : "Đóng"}
            </td>)}<td className={cell}>{hours(d.windows.reduce((sum, w) => sum + w.ownerOnlyMinutes, 0))}</td>
          </tr>)}</tbody>
          <tfoot><tr className="font-semibold"><th className={cell} colSpan={2}>Tổng tháng</th><td className={cell}>{hours(report.targetMinutes)}</td><td className={cell}>{hours(report.assignedMinutes)}</td><td className={cell} colSpan={AUDIT_WINDOWS.length}>Thiếu người {hours(report.uncoveredMinutes)}h</td><td className={cell}>{hours(ownerOnly)}</td></tr></tfoot>
        </table>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <caption className="mb-2 text-left font-semibold">Minijob · ưu tiên mềm 18–20h</caption>
          <thead><tr><th className={cell}>Nhân viên</th><th className={cell}>Tổng h</th><th className={cell}>18–20h</th><th className={cell}>Ngoài cao điểm h</th><th className={cell}>Tỷ lệ cao điểm</th></tr></thead>
          <tbody>{report.minijobs.map(e => <tr key={e.id}><th className={cell}>{e.name}</th><td className={cell}>{hours(e.totalMinutes)}</td><td className={cell}>{hours(e.peakMinutes)}</td><td className={cell}>{hours(e.outsidePeakMinutes)}</td><td className={cell}>{e.totalMinutes ? Math.round(e.peakMinutes / e.totalMinutes * 100) : 0}%</td></tr>)}</tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Cài đặt nhân viên áp dụng khi tạo lại lịch. Khung giờ ưu tiên, độ dài ca, rải đều là luật mềm; ngày nghỉ, giới hạn khung giờ, ca cố định là giới hạn cứng. Chỉnh nhân viên giữ lịch đã tạo để tránh thay ca ngoài ý muốn.</p>
    </div>
  </details>;
}

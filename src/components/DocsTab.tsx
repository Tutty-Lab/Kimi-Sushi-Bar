import type { StoreConfig } from "../lib/stores";
import { minutesToTime } from "../lib/time";
import { WEEKDAY_LABELS_VI, type WeekdayKey } from "../lib/demand";
export function DocsTab({ stores }: { stores: StoreConfig[] }) {
  return <div className="space-y-4">
    {stores.map(store => <section key={store.id} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <h2 className="font-semibold">{store.name}</h2><p>{store.address}</p><p className="text-sm">{store.notes}</p>
      <ul className="text-sm space-y-2">{(Object.keys(store.workHours!.perWeekday) as WeekdayKey[]).map(day =>
        <li key={day}>{WEEKDAY_LABELS_VI[day]}: {store.workHours!.closedWeekdays[day] ? "Nghỉ" : store.workHours!.perWeekday[day].map(b => `${minutesToTime(b.startMinutes)}–${minutesToTime(b.endMinutes)}`).join(" / ")}</li>)}</ul>
      <p className="text-sm">Ngày lễ: theo giờ của thứ tương ứng. PDF để trống Gesamt, Nacht và Sonntag để tự điền.</p>
    </section>)}
    <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm space-y-2">
      <h2 className="font-semibold">Lương và giờ tham khảo</h2>
      <p>5 nhân viên: 180h + 4 × 43,4h = 353,6h/tháng. Tổng Brutto 6.312 €. Chủ luôn làm cùng, không tính vào hợp đồng hay độ phủ bắt buộc. Mỗi khung mở cửa phải có ít nhất 1 nhân viên ngoài chủ.</p>
      <p>Chia giờ trên toàn tháng, không khóa giờ từng tuần. Chỉ xếp bước 0,5h; phần lẻ dưới 0,5h của mỗi nhân viên để lại, không vượt định mức. Minijob ưu tiên 18–20h; ngày đông thứ 6–7. Ca gãy theo giờ mở cửa, 14–16h không tính công. Giáng sinh cấu hình ngoại lệ từng năm.</p>
      <p>PDF Stundenzettel: trước mỗi bảng có 1 tờ thông số; để trống Gesamtstunden, Nachtstunden và Sonntagsstunden để điền tay.</p>
    </section>
  </div>;
}

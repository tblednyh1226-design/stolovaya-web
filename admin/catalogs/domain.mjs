export const kinds = Object.freeze(["dishes","warehouses","employees"]);
export function trimText(value, max=500) { return String(value??"").trim().slice(0,max); }
export function validateEmployee(draft) {
  const name=trimText(draft.fullName,180);
  if (name.length<5 || !name.includes(" ")) return "Укажите полное ФИО";
  if (!["admin","buffet"].includes(draft.role)) return "Выберите должность";
  const points=Array.isArray(draft.points)?draft.points:[];
  if (draft.role==="buffet" && !points.length) return "Назначьте буфетчику хотя бы одну точку";
  if (draft.role==="admin" && points.length) return "Администратору не назначают точки буфетчика";
  if (new Set(points).size!==points.length) return "Точки не должны повторяться";
  return null;
}
export function employeeRole(row) {
  return Array.isArray(row.roles)&&row.roles.includes("admin") ? "admin" : "buffet";
}
export function employeePointCodes(row) {
  return Array.isArray(row.points) ? row.points.map(x=>x.pointCode).filter(Boolean) : [];
}
export function summarizeIikoPreview(kind,rows) {
  if (!["warehouses","dishes"].includes(kind)||!Array.isArray(rows)) throw new Error("Неизвестный справочник");
  let valid=0,invalid=0;
  const ids = new Set();
  for(const item of rows) {
    const id=trimText(item?.id,70),name=trimText(item?.name,500);
    if(!id||!name||ids.has(id)) {invalid++;continue;}
    ids.add(id);valid++;
  }
  return {valid,invalid,requiresManualWarehouseMapping:kind==="warehouses"};
}

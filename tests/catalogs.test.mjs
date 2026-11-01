import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateEmployee,employeeRole,employeePointCodes,summarizeIikoPreview } from "../admin/catalogs/domain.mjs";
const here=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.join(here,"../admin/catalogs/catalogs.js"),"utf8");
const html=fs.readFileSync(path.join(here,"../admin/catalogs/index.html"),"utf8");
test("warehouse refresh must not rebind point identities",()=>{
 assert.deepEqual(summarizeIikoPreview("warehouses",[
  {id:"a",name:"Бухара Кухня"},{id:"b",name:"Бухара раздача"}
 ]),{valid:2,invalid:0,requiresManualWarehouseMapping:true});
});
test("reject missing or duplicated iiko identities",()=>{
 assert.deepEqual(summarizeIikoPreview("dishes",[
  {id:"a",name:"Бефстроганов"},{id:"a",name:"Дубликат"},{id:"",name:"Без ID"},
  {id:"b",name:"Выпечка"}
 ]),{valid:2,invalid:2,requiresManualWarehouseMapping:false});
});
test("buffet point assignment enforced",()=>{
 assert.equal(validateEmployee({fullName:"Иванов Иван Иванович",role:"buffet",points:[]}),
  "Назначьте буфетчику хотя бы одну точку");
 assert.equal(validateEmployee({fullName:"Иванов Иван Иванович",role:"buffet",points:["BUKHARA","BUKHARA"]}),
  "Точки не должны повторяться");
 assert.equal(validateEmployee({fullName:"Иванов Иван Иванович",role:"buffet",points:["BUKHARA"]}),null);
});
test("admin does not use buffet point association",()=>{
 assert.equal(validateEmployee({fullName:"Иванов Иван Иванович",role:"admin",points:["PRAVDA"]}),
  "Администратору не назначают точки буфетчика");
 assert.equal(validateEmployee({fullName:"Иванов Иван Иванович",role:"admin",points:[]}),null);
});
test("employee role and historic point association",()=>{
 assert.equal(employeeRole({roles:["admin"]}),"admin");
 assert.deepEqual(employeePointCodes({points:[{pointCode:"PRAVDA"},{pointCode:"REDMOND"}]}),["PRAVDA","REDMOND"]);
});
test("frontend has no fallback access to production",()=>{
 assert.ok(!source.includes("https://rgluzdxikpagugpmusbp.supabase.co"));
 assert.ok(source.includes("STOLOVAYA_CATALOGS_CONFIG"));
 assert.ok(source.includes('sessionStorage.getItem("stolovaya:catalog-admin")'));
 assert.ok(!source.includes("SUPABASE_SERVICE_ROLE_KEY"));
 assert.ok(!html.includes("sb_publishable_"));
});

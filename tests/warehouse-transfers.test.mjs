import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync("admin/warehouse-transfers/transfers.js","utf8");
const admin=fs.readFileSync("admin/admin.js","utf8");
const catalogs=fs.readFileSync("admin/catalogs/catalogs.js","utf8");
const closing=fs.readFileSync("admin/closing-audit/audit.js","utf8");
test("warehouse transfer UI has explicit direction and iiko identity",()=>{
 assert.ok(source.includes("p_from_iiko_id:from.value"));
 assert.ok(source.includes("p_to_iiko_id:to.value"));
 assert.ok(source.includes("catalog_admin_record_stock_transfer"));
 assert.ok(source.includes("p_request_key:state.requestKey"));
 assert.ok(source.includes("p_business_date:date.value"));
});
test("kitchen inventory is not banned from receipt or issue",()=>{
 assert.ok(source.includes("Любой склад iiko может быть отправителем и получателем"));
 assert.ok(!source.includes('purpose!=="sales"'));
 assert.ok(!source.includes('purpose!=="kitchen"'));
 assert.ok(!catalogs.includes("кухни исключены"));
 assert.ok(!closing.includes('p.purpose!=="sales"'));
 assert.ok(catalogs.includes("state.points=(r.rows||[]).filter(x=>x.isActive)"));
});
test("warehouse transfers require owner-admin authentication and manual confirmation",()=>{
 assert.ok(source.includes('sessionStorage.getItem("stolovaya:catalog-admin")'));
 assert.ok(source.includes("window.confirm"));
 assert.ok(source.includes("state.requestKey=crypto.randomUUID()"));
 assert.ok(!source.includes("admin_send_generated_document_to_iiko"));
 assert.ok(!source.includes("https://rgluzdxikpagugpmusbp.supabase.co"));
 assert.ok(source.includes("!cfg.rpcBase.includes(")||source.includes("!config.rpcBase.includes("));
 assert.ok(admin.includes('href="warehouse-transfers/"'));
});
test("all catalog items can be discovered through pagination",()=>{
 assert.ok(source.includes("offset<5000;offset+=200"));
 assert.ok(source.includes("state.dishes=all.filter(x=>x.isActive)"));
});

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const js=fs.readFileSync("admin/closing-audit/audit.js","utf8");
const html=fs.readFileSync("admin/closing-audit/index.html","utf8");
test("new admin reconciliation is read-only",()=>{
 assert.ok(js.includes("catalog_admin_closing_reconciliation"));
 assert.ok(js.includes("catalog_admin_realization_preview_v2"));
 assert.ok(js.includes("catalog_admin_warehouse_mappings"));
 assert.ok(!js.includes("catalog_admin_apply_iiko"));
 assert.ok(!js.includes("admin_send_generated_document_to_iiko"));
 assert.ok(!js.includes("SUPABASE_SERVICE_ROLE_KEY"));
 assert.ok(html.includes("audit.js"));
});
test("isolated staging only and no URL fallback to production",()=>{
 assert.ok(js.includes("STOLOVAYA_CATALOGS_CONFIG"));
 assert.ok(js.includes('!config.rpcBase.includes("rgluzdxikpagugpmusbp.supabase.co")'));
 assert.ok(js.includes('sessionStorage.getItem("stolovaya:catalog-admin")'));
 assert.ok(js.includes('timeZone:"Europe/Moscow"'));
});
test("kitchen, stock and iiko mismatches are shown",()=>{
 for(const name of ["fromKitchen","moved","thawed","available","leftover","sold","mismatchCount","legacySold","existingIikoId"])
   assert.ok(js.includes(name),name);
});

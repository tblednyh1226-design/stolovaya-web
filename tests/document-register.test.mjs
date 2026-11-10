import{test}from"node:test";
import assert from"node:assert/strict";
import fs from"node:fs";
const src=fs.readFileSync("admin/document-register/register.js","utf8");
const css=fs.readFileSync("admin/document-register/register.css","utf8");
const html=fs.readFileSync("admin/document-register/index.html","utf8");
const admin=fs.readFileSync("admin/admin.js","utf8");
test("dense journal is a row table rather than stacked document cards",()=>{
 assert.ok(src.includes('E("table",null,"register")'));
 assert.ok(css.includes("border-collapse:collapse"));
 assert.ok(src.includes('["Дата","Документ","Со склада","На склад","Статус"]'));
 assert.ok(src.includes("state.selected"));
 assert.ok(src.includes("detailView()"));
 assert.ok(admin.includes('href="document-register/"'));
});
test("staging journal NEVER falls back to production RPC",()=>{
 assert.ok(src.includes("STOLOVAYA_CATALOGS_CONFIG"));
 assert.ok(src.includes('!cfg.rpcBase.includes("rgluzdxikpagugpmusbp.supabase.co")'));
 assert.ok(src.includes('sessionStorage.getItem("stolovaya:catalog-admin")'));
 assert.ok(!src.includes('https://rgluzdxikpagugpmusbp.supabase.co/rest/v1/rpc'));
 assert.ok(!src.includes("sb_secret_"));
});
test("soft deletion and restore are real actions, not direct SQL or physical delete",()=>{
 assert.ok(src.includes("catalog_admin_document_links_v2")||src.includes("catalog_admin_document_detail_v2"));
 assert.ok(src.includes("catalog_admin_mark_document_deleted_v2"));
 assert.ok(src.includes("catalog_admin_restore_document_v2"));
 assert.ok(src.includes("window.confirm")||src.includes("confirm("));
 assert.ok(src.includes("Пометить на удаление"));
 assert.ok(src.includes("Снять пометку"));
 assert.ok(src.includes("check.links"));
 assert.ok(!src.includes('rpc("delete"'));
});
test("real iiko operations disabled until integration is tested",()=>{
 assert.ok(src.includes("send.disabled=true"));
 assert.ok(src.includes("edit.disabled=true"));
 assert.ok(src.includes("Отправить в iiko"));
 assert.ok(html.includes("register.js"));
});

test("marked-for-deletion documents visibly show a red crossed icon in list and detail",()=>{
 assert.ok(src.includes('"doc-icon"+(d.marked?" is-marked":"")'));
 assert.ok(src.includes('icon.setAttribute("aria-label",d.marked?"Помечен на удаление":"Документ")'));
 assert.ok(src.includes('detailIcon.setAttribute("aria-label",d.marked?"Помечен на удаление":"Документ")'));
 assert.ok(css.includes(".doc-icon.is-marked::after{content:'×'"));
 assert.ok(css.includes("background:#c92f31"));
 assert.ok(src.includes('status[d.status]||d.status'));
});

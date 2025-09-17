"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const index = require("./index.js");
const loadIncomingApplications = async (pageNo, pageSize, currentUserId) => {
  const offset = (pageNo - 1) * pageSize;
  const where = currentUserId ? "WHERE target_id = ?" : "";
  const params = currentUserId ? [currentUserId, pageSize, offset] : [pageSize, offset];
  const rows = await index.queryAll(`
    SELECT * FROM contact_applications
    ${where}
    ORDER BY last_apply_time DESC
    LIMIT ? OFFSET ?
  `, params);
  const totalRow = await index.queryAll(`SELECT COUNT(1) AS total FROM contact_applications ${where}`, currentUserId ? [currentUserId] : []);
  return { list: rows, total: totalRow[0]?.total || 0 };
};
const loadOutgoingApplications = async (pageNo, pageSize, currentUserId) => {
  const offset = (pageNo - 1) * pageSize;
  const where = currentUserId ? "WHERE apply_user_id = ?" : "";
  const params = currentUserId ? [currentUserId, pageSize, offset] : [pageSize, offset];
  const rows = await index.queryAll(`
    SELECT * FROM contact_applications
    ${where}
    ORDER BY last_apply_time DESC
    LIMIT ? OFFSET ?
  `, params);
  const totalRow = await index.queryAll(`SELECT COUNT(1) AS total FROM contact_applications ${where}`, currentUserId ? [currentUserId] : []);
  return { list: rows, total: totalRow[0]?.total || 0 };
};
const approveIncoming = async (ids) => {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => "?").join(",");
  const sql = `UPDATE contact_applications SET status = 1 WHERE id IN (${placeholders})`;
  return index.sqliteRun(sql, ids);
};
const rejectIncoming = async (ids) => {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => "?").join(",");
  const sql = `UPDATE contact_applications SET status = 2 WHERE id IN (${placeholders})`;
  return index.sqliteRun(sql, ids);
};
const cancelOutgoing = async (ids) => {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => "?").join(",");
  const sql = `UPDATE contact_applications SET status = 3 WHERE id IN (${placeholders})`;
  return index.sqliteRun(sql, ids);
};
const insertApplication = async (applyUserId, targetId, remark) => {
  const sql = `INSERT INTO contact_applications (apply_user_id, target_id, contact_type, status, apply_info, last_apply_time)
               VALUES (?, ?, 0, 0, ?, ?)`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return index.sqliteRun(sql, [applyUserId, targetId, remark || "", now]);
};
exports.approveIncoming = approveIncoming;
exports.cancelOutgoing = cancelOutgoing;
exports.insertApplication = insertApplication;
exports.loadIncomingApplications = loadIncomingApplications;
exports.loadOutgoingApplications = loadOutgoingApplications;
exports.rejectIncoming = rejectIncoming;

"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const index = require("./index.js");
const loadBlacklist = async (pageNo, pageSize) => {
  const offset = (pageNo - 1) * pageSize;
  const rows = await index.queryAll(
    `SELECT * FROM blacklist ORDER BY create_time DESC LIMIT ? OFFSET ?`,
    [pageSize, offset]
  );
  const totalRow = await index.queryAll(`SELECT COUNT(1) AS total FROM blacklist`, []);
  return { list: rows, total: totalRow[0]?.total || 0 };
};
const removeFromBlacklist = async (userIds) => {
  if (!userIds.length) return 0;
  const placeholders = userIds.map(() => "?").join(",");
  const sql = `DELETE FROM blacklist WHERE target_id IN (${placeholders})`;
  return index.sqliteRun(sql, userIds);
};
exports.loadBlacklist = loadBlacklist;
exports.removeFromBlacklist = removeFromBlacklist;

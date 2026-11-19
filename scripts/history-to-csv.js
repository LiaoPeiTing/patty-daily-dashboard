// 把 data/history.json 轉成 data/history.csv，給 Google 試算表的 IMPORTDATA 讀取。
// 用法（在 patty-daily-dashboard 資料夾內）：node scripts/history-to-csv.js
// 規則：
//   1. 每個台股資料日（tw_date）只輸出一列；同一天有兩筆時保留最早寫入的那筆（與 history.html 相同）。
//   2. 依台股資料日由舊到新排序。
//   3. 抓不到的值（null）輸出成空白，不補任何數字。
//   4. 只輸出下方欄位表裡的市場數據，任何其他欄位一律不輸出。
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'data', 'history.json');
const OUT = path.join(ROOT, 'data', 'history.csv');

const COLS = [
  ['tw_date', '日期'],
  ['taiex', '加權指數'],
  ['turnover', '成交金額(億)'],
  ['inst_total', '三大法人合計(億)'],
  ['foreign', '外資(億)'],
  ['trust', '投信(億)'],
  ['dealer', '自營商(億)'],
  ['vix', 'VIX'],
  ['cnn', 'CNN恐貪'],
  ['margin_ratio', '融資維持率(%)'],
  ['margin_ratio_ex_etf', '融資維持率扣除ETF(%)'],
  ['margin_balance', '融資餘額(億)'],
  ['brent', '布蘭特'],
  ['wti', 'WTI'],
  ['y2', '美債2年(%)'],
  ['y10', '美債10年(%)'],
  ['y30', '美債30年(%)'],
  ['be10', '10年通膨預期(%)'],
  ['be30', '30年通膨預期(%)'],
  ['dxy', '美元指數'],
  ['usdjpy', '美元日圓'],
  ['usdtwd', '美元台幣'],
];

const rows = JSON.parse(fs.readFileSync(SRC, 'utf8'));
if (!Array.isArray(rows)) throw new Error('history.json 不是陣列');

const seen = new Set();
const picked = rows
  .filter(r => r && r.date)
  .map((r, i) => ({ r, i, day: r.tw_date || r.date }))
  .sort((a, b) => (a.r.date < b.r.date ? -1 : a.r.date > b.r.date ? 1 : a.i - b.i))
  .filter(x => (seen.has(x.day) ? false : seen.add(x.day)))
  .sort((a, b) => (a.day < b.day ? -1 : 1));

const cell = v => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

const lines = [COLS.map(c => c[1]).join(',')];
for (const { r, day } of picked) {
  lines.push(COLS.map(([k]) => cell(k === 'tw_date' ? day : r[k])).join(','));
}

const tmp = OUT + '.tmp';
fs.writeFileSync(tmp, lines.join('\n') + '\n', 'utf8');
fs.renameSync(tmp, OUT);
console.log(`history.csv：${picked.length} 個交易日（${picked[0].day} ～ ${picked[picked.length - 1].day}），來源 ${rows.length} 筆`);

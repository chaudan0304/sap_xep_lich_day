import XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

let tinCount = 0;
let cnCount = 0;
const tinSlots = [];
const cnSlots = [];

['1', '2', '3.', '4', '5'].forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  if (!ws) return;
  const sData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  
  // Find class columns
  const headerRow = sData[5] || [];
  const classCols = {};
  for (let c = 0; c < headerRow.length; c++) {
    const text = String(headerRow[c] || '').trim();
    if (/^[1-5]A[1-5]$/.test(text)) {
      classCols[text] = c;
    }
  }

  // Row mapping for days & periods
  for (let r = 7; r < sData.length; r++) {
    const row = sData[r];
    if (!row) continue;
    
    // Find which class has Tin or Công nghệ
    Object.entries(classCols).forEach(([className, colIdx]) => {
      const subCell = String(row[colIdx] || '').trim();
      const teacherCell = String(row[colIdx + 1] || '').trim();
      
      if (subCell.includes('Tin')) {
        tinCount++;
        tinSlots.push({ sheet: sheetName, row: r, class: className, subject: subCell, teacher: teacherCell });
      } else if (subCell.includes('Công nghệ') || subCell === 'CN') {
        cnCount++;
        cnSlots.push({ sheet: sheetName, row: r, class: className, subject: subCell, teacher: teacherCell });
      }
    });
  }
});

console.log(`TỔNG SỐ TIẾT TIN HỌC: ${tinCount}`);
console.log('Tin học slots:', tinSlots);
console.log(`\nTỔNG SỐ TIẾT CÔNG NGHỆ: ${cnCount}`);
console.log('Công nghệ slots:', cnSlots);

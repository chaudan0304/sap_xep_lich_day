import XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

// Check Phân công chuyên môn for Tin and Công nghệ
const pcSheet = wb.Sheets['Phân công chuyên môn'];
const pcData = XLSX.utils.sheet_to_json(pcSheet, { header: 1, defval: '' });

console.log('--- PHÂN CÔNG CHUYÊN MÔN: TIN & CÔNG NGHỆ ---');
for (let i = 8; i < pcData.length; i++) {
  const row = pcData[i];
  if (!row || !row[1]) continue;
  const name = row[1];
  const task = row[2];
  const tinCol = row[6]; // let's see which column has Tin or CN
  if (task.includes('Tin') || task.includes('Công nghệ') || name.includes('Đàn') || name.includes('Hòa')) {
    console.log(`${name} | Nhiệm vụ: ${task} | Row data:`, JSON.stringify(row.slice(0, 16)));
  }
}

// Check in sheets 1..5 for cells with "Tin" vs "Công nghệ" or "CN"
['1', '2', '3.', '4', '5'].forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  if (!ws) return;
  const sData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`\n--- SHEET ${sheetName} ---`);
  for (let r = 7; r < sData.length; r++) {
    const row = sData[r];
    if (!row) continue;
    row.forEach((cell, cIdx) => {
      const cellStr = String(cell).trim();
      if (cellStr.includes('Công nghệ') || cellStr === 'CN' || cellStr.includes('Tin')) {
        console.log(`Row ${r}, Col ${cIdx}: "${cellStr}" | Next cell: "${row[cIdx + 1] || ''}"`);
      }
    });
  }
});

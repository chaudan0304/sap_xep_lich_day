import XLSX from 'xlsx';
import fs from 'fs';

const file1 = 'public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx';
const buf = fs.readFileSync(file1);
const wb = XLSX.read(buf, { type: 'buffer' });

console.log('Sheets in workbook:', wb.SheetNames);

wb.SheetNames.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log('\n======================================================');
  console.log('SHEET:', sheetName, 'Rows count:', data.length);
  console.log('======================================================');
  for (let r = 0; r < Math.min(25, data.length); r++) {
    const row = data[r];
    if (row && row.some(cell => cell !== '')) {
      console.log(`Row ${r}:`, JSON.stringify(row.slice(0, 14)));
    }
  }
});

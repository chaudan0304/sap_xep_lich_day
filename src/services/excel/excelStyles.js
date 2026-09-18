// src/services/excel/excelStyles.js
// Bảng mã màu, định dạng đường viền và helper lưu file Excel

export const BORDER_THIN = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
};

export const BORDER_HEADER = {
  top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
  left: { style: 'thin', color: { argb: 'FF3B82F6' } },
  bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
  right: { style: 'thin', color: { argb: 'FF3B82F6' } }
};

export const FILL_NAVY_HEADER = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A8A' } // Deep Navy Blue
};

export const FILL_BLUE_HEADER = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF2563EB' } // Royal Blue
};

export const FILL_MORNING = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE0E7FF' } // Soft Indigo Light
};

export const FILL_AFTERNOON = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFEDD5' } // Soft Amber Light
};

export const FILL_LUNCH = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF1F5F9' } // Soft Slate
};

export const FILL_ZEBRA = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8FAFC' }
};

export const FILL_WHITE = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFFFF' }
};

/**
 * Hàm lưu file tải về trình duyệt với ExcelJS
 */
export const saveExcelJSWorkbook = async (workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

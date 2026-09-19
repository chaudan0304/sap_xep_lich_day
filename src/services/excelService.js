// src/services/excelService.js
// Trung tâm Xử lý Nhập & Xuất File Excel (Facade kết nối các module chuyên biệt)
// Giữ nguyên 100% public API để đảm bảo tính tương thích ngược cho toàn bộ ứng dụng

import { parseExcelWorkbook, mapSubjectCodeAndRoom, resolveTeacher, getTeacherShortName } from './excelParser.js';
import { validateParsedExcelData } from './excelValidator.js';
import { mapParsedExcelToAppModel } from './excelMapper.js';

// Export các hàm helper từ parser
export { mapSubjectCodeAndRoom, resolveTeacher, getTeacherShortName };

// Export chức năng tải file Excel mẫu
export { downloadExcelTemplate } from './excel/excelTemplate.js';

// Export các chức năng xuất Excel ma trận, lớp học, giáo viên, danh bạ
export { exportMasterTimetable } from './excel/excelExporterMaster.js';
export { exportClassTimetables } from './excel/excelExporterClass.js';
export { exportTeacherTimetables } from './excel/excelExporterTeacher.js';
export { exportTeacherDirectory } from './excel/excelExporterDirectory.js';

/**
 * Nhập Excel với preview & đối soát validation
 * @param {File} file - File Excel tải lên từ người dùng
 * @returns {Promise<Object>} Kết quả phân tích và dữ liệu ánh xạ
 */
export const importExcelWithPreview = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const buffer = new Uint8Array(e.target.result);
        const parsed = await parseExcelWorkbook(buffer);
        const validation = validateParsedExcelData(parsed);
        const mappedData = mapParsedExcelToAppModel(parsed);

        resolve({
          success: true,
          isValid: validation.isValid,
          previewData: parsed,
          errors: validation.errors,
          warnings: validation.warnings,
          summary: validation.summary,
          data: mappedData
        });
      } catch (err) {
        console.error('Lỗi trong importExcelWithPreview:', err);
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Nhập dữ liệu Excel trực tiếp
 * @param {File} file
 * @returns {Promise<Object>}
 */
export const importExcelData = async (file) => {
  return await importExcelWithPreview(file);
};

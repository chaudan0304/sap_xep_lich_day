// tests/excelExporterMaster.test.js
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { 
  getSignatureColumnRanges, 
  renderMatrixHelper, 
  exportMasterTimetable 
} from '../src/services/excel/excelExporterMaster.js';
import { getDefaultSampleData, initializeEmptyTimetable } from '../src/data/sampleData.js';

describe('excelExporterMaster: Quản lý vùng merge chữ ký & Xuất ma trận TKB', () => {
  describe('getSignatureColumnRanges: Tính toán phạm vi cột chữ ký an toàn', () => {
    it('đảm bảo không bao giờ chồng lấn (leftEnd < rightStart) với các giá trị totalCols từ 4 đến 50', () => {
      const testCols = [4, 5, 6, 7, 8, 9, 10, 15, 23, 30, 50];
      testCols.forEach(totalCols => {
        const ranges = getSignatureColumnRanges(totalCols);
        const { leftStart, leftEnd, rightStart, rightEnd } = ranges;

        expect(leftStart).toBeGreaterThanOrEqual(1);
        expect(leftEnd).toBeGreaterThanOrEqual(leftStart);
        expect(rightStart).toBeGreaterThan(leftEnd); // Bắt buộc rightStart > leftEnd để không chồng lấn
        expect(rightEnd).toBeGreaterThanOrEqual(rightStart);
        expect(rightEnd).toBeLessThanOrEqual(totalCols);
      });
    });

    it('tính toán chính xác cho trường hợp 2 lớp (totalCols = 7 - trường hợp lỗi ban đầu)', () => {
      const { leftStart, leftEnd, rightStart, rightEnd } = getSignatureColumnRanges(7);
      expect(leftStart).toBe(2);
      expect(leftEnd).toBe(3); // Cột 2..3
      expect(rightStart).toBe(5); // Cột 5..7
      expect(rightEnd).toBe(7);
      // Cột 4 là khoảng trống ở giữa, hoàn toàn không chồng lấn
      expect(leftEnd).toBeLessThan(rightStart);
    });

    it('tính toán chính xác cho trường hợp 1 lớp (totalCols = 5)', () => {
      const { leftStart, leftEnd, rightStart, rightEnd } = getSignatureColumnRanges(5);
      expect(leftStart).toBe(2);
      expect(leftEnd).toBe(2);
      expect(rightStart).toBe(4);
      expect(rightEnd).toBe(5);
      expect(leftEnd).toBeLessThan(rightStart);
    });

    it('tính toán chính xác cho trường hợp nhiều lớp (totalCols = 23)', () => {
      const { leftStart, leftEnd, rightStart, rightEnd } = getSignatureColumnRanges(23);
      expect(leftStart).toBe(2);
      expect(leftEnd).toBe(4); // Cột 2..4
      expect(rightStart).toBe(20); // Cột 20..23
      expect(rightEnd).toBe(23);
      expect(leftEnd).toBeLessThan(rightStart);
    });

    it('xử lý an toàn với các trường hợp biên totalCols nhỏ (< 4)', () => {
      const r1 = getSignatureColumnRanges(1);
      expect(r1.leftStart).toBe(1);
      expect(r1.rightEnd).toBe(1);

      const r3 = getSignatureColumnRanges(3);
      expect(r3.leftStart).toBe(1);
      expect(r3.rightEnd).toBe(3);
    });
  });

  describe('renderMatrixHelper: Xuất sheet ma trận với số lượng lớp khác nhau', () => {
    const makeMockClasses = (count) => {
      return Array.from({ length: count }, (_, i) => ({
        id: `LOP_${i + 1}`,
        name: `Lớp ${i + 1}A`,
        grade: Math.min(5, Math.floor(i / 2) + 1)
      }));
    };

    const runRenderAndVerify = async (classCount) => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(`Test_${classCount}_Classes`);
      const classes = makeMockClasses(classCount);
      const timetable = {};
      classes.forEach(c => {
        timetable[c.id] = {
          2: { 1: { subjectId: 'TOAN', teacherId: 'GV01' } }
        };
      });

      expect(() => {
        renderMatrixHelper(
          ws, 
          classes, 
          `Test ${classCount} Lớp`, 
          timetable, 
          new Map(), 
          {}, 
          { name: 'Trường Test', principal: 'Hiệu Trưởng Test' }
        );
      }).not.toThrow();

      // Kiểm tra ghi ra buffer và đọc lại bằng ExcelJS
      const buffer = await wb.xlsx.writeBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);

      const reloadedWb = new ExcelJS.Workbook();
      await expect(reloadedWb.xlsx.load(buffer)).resolves.toBeDefined();
    };

    it('hoạt động chuẩn xác khi có 1 lớp (totalCols = 5)', async () => {
      await runRenderAndVerify(1);
    });

    it('hoạt động chuẩn xác khi có 2 lớp (totalCols = 7, khắc phục lỗi crash)', async () => {
      await runRenderAndVerify(2);
    });

    it('hoạt động chuẩn xác khi có 3 lớp (totalCols = 9)', async () => {
      await runRenderAndVerify(3);
    });

    it('hoạt động chuẩn xác khi có 10 lớp (totalCols = 23)', async () => {
      await runRenderAndVerify(10);
    });

    it('hoạt động chuẩn xác khi có 23 lớp', async () => {
      await runRenderAndVerify(23);
    });
  });

  describe('exportMasterTimetable: Xuất toàn trường với dữ liệu mẫu sampleData.js', () => {
    it('xuất trơn tru toàn trường và từng khối (mỗi khối đúng 2 lớp) không có ngoại lệ merge', async () => {
      const sample = getDefaultSampleData();
      const timetable = initializeEmptyTimetable(sample.classes);

      // Điền một số tiết mẫu
      timetable['1A1'][2][1] = { subjectId: 'HDTN', teacherId: 'GV01' };
      timetable['1A2'][2][1] = { subjectId: 'HDTN', teacherId: 'GV02' };
      timetable['2A1'][2][1] = { subjectId: 'TOAN', teacherId: 'GV03' };

      const wb = await exportMasterTimetable(
        timetable, 
        sample.classes, 
        sample.teachers, 
        sample.subjects, 
        sample.schoolInfo
      );

      expect(wb).toBeDefined();
      expect(wb.worksheets.length).toBe(6); // 1 sheet TKB_Toan_Truong + 5 sheet Khoi_1..5

      // Xác nhận sheet toàn trường và các sheet khối 1..5
      const sheetNames = wb.worksheets.map(w => w.name);
      expect(sheetNames).toContain('TKB_Toan_Truong');
      expect(sheetNames).toContain('Khoi_1');
      expect(sheetNames).toContain('Khoi_2');
      expect(sheetNames).toContain('Khoi_3');
      expect(sheetNames).toContain('Khoi_4');
      expect(sheetNames).toContain('Khoi_5');

      const buffer = await wb.xlsx.writeBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);

      const reloadedWb = new ExcelJS.Workbook();
      await reloadedWb.xlsx.load(buffer);
      expect(reloadedWb.worksheets.length).toBe(6);
    });
  });
});

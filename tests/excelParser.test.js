import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { normalizeStr, mapSubjectCodeAndRoom, parseExcelWorkbook } from '../src/services/excelParser.js';

describe('excelParser: Xử lý chuỗi & Ánh xạ môn học từ Excel', () => {
  it('chuẩn hóa chuỗi tiếng Việt Unicode NFC và loại bỏ khoảng trắng', () => {
    expect(normalizeStr('  Toán   Học  ')).toBe('Toán Học');
    expect(normalizeStr(null)).toBe('');
    expect(normalizeStr(undefined)).toBe('');
  });

  it('ánh xạ chính xác các môn học và phòng học chuyên dụng', () => {
    // Tin học -> Phòng tin học
    const tin = mapSubjectCodeAndRoom('Tin học');
    expect(tin.subjectId).toBe('TIN_HOC');
    expect(tin.roomId).toBe('PHONG_TIN_HOC');

    // Chào cờ -> Sân trường
    const chaoCo = mapSubjectCodeAndRoom('Chào cờ');
    expect(chaoCo.subjectId).toBe('HDTN');
    expect(chaoCo.roomId).toBe('SAN_TRUONG');

    // Thể dục / GDTC -> Sân thể chất
    const theDuc = mapSubjectCodeAndRoom('GDTC');
    expect(theDuc.subjectId).toBe('THE_DUC');
    expect(theDuc.roomId).toBe('SAN_THE_CHAT');

    // Môn văn hóa bình thường -> Phòng học
    const toan = mapSubjectCodeAndRoom('Toán');
    expect(toan.subjectId).toBe('TOAN');
    expect(toan.roomId).toBe('LOP_HOC');

    const van = mapSubjectCodeAndRoom('Tiếng Việt');
    expect(van.subjectId).toBe('TIENG_VIET');
    expect(van.roomId).toBe('LOP_HOC');
  });

  it('parseExcelWorkbook đọc chính xác dữ liệu từ workbook ExcelJS', async () => {
    const wb = new ExcelJS.Workbook();
    const wsGV = wb.addWorksheet('Danh_Sach_Giao_Vien');
    wsGV.addRow(['Mã GV', 'Họ và Tên', 'Tên TKB (Viết tắt)', 'Tổ Chuyên Môn', 'Chủ Nhiệm', 'Số Điện Thoại', 'Email', 'Số Tiết Tối Đa / Ngày']);
    wsGV.addRow(['GV_01', 'Nguyễn Văn A', 'Nguyễn A', 'Tổ 1', 'Lớp 1A1', '0901234567', 'a@school.edu.vn', '7']);

    const wsLop = wb.addWorksheet('Danh_Sach_Lop');
    wsLop.addRow(['Mã Lớp', 'Tên Lớp', 'Khối', 'Mã GVCN', 'Phòng Học Chính', 'Sĩ Số']);
    wsLop.addRow(['1A1', 'Lớp 1A1', '1', 'GV_01', 'P.101', '35']);

    const buffer = await wb.xlsx.writeBuffer();
    const parsed = await parseExcelWorkbook(buffer);

    expect(parsed.format).toBe('TEMPLATE_FORMAT');
    expect(parsed.teachers.length).toBe(1);
    expect(parsed.teachers[0].name).toBe('Nguyễn Văn A');
    expect(parsed.teachers[0].homeroomClassId).toBe('1A1');
    expect(parsed.classes.length).toBe(1);
    expect(parsed.classes[0].id).toBe('1A1');
  });

  it('đọc và ánh xạ thành công file TKB thực tế nhiều sheet', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { validateParsedExcelData } = await import('../src/services/excelValidator.js');
    const { mapParsedExcelToAppModel } = await import('../src/services/excelMapper.js');

    const filePath = path.resolve('public/data/TKB thực hiện từ tuần 01 (chính thức).xlsx');
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      const parsed = await parseExcelWorkbook(buffer);
      expect(parsed.format).toBe('REAL_SCHOOL_MULTISHEET');
      expect(parsed.classes.length).toBe(23);
      expect(parsed.teachers.length).toBe(43);

      const validation = validateParsedExcelData(parsed);
      expect(validation.summary).toBeDefined();

      const mapped = mapParsedExcelToAppModel(parsed);
      expect(mapped.classes.length).toBe(23);
      expect(mapped.teachers.length).toBe(43);
      expect(Object.keys(mapped.timetable).length).toBe(23);
    }
  });
});


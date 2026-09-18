// tests/excelParser.test.js
import { describe, it, expect } from 'vitest';
import { normalizeStr, mapSubjectCodeAndRoom } from '../src/services/excelParser.js';

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
});

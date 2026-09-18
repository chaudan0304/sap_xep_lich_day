// tests/autoScheduler.test.js
import { describe, it, expect } from 'vitest';
import { solveTimetable } from '../src/services/autoScheduler.js';
import { 
  SAMPLE_CLASSES, 
  SAMPLE_TEACHERS, 
  SAMPLE_ROOMS, 
  generateSampleAssignments, 
  initializeEmptyTimetable 
} from '../src/data/sampleData.js';
import { DEFAULT_GRADE_QUOTAS } from '../src/constants/defaultCurriculum.js';
import { checkAllConflicts } from '../src/services/conflictDetector.js';

describe('autoScheduler: Thuật toán Xếp Thời Khóa Biểu Tự Động', () => {
  const quotas = JSON.parse(JSON.stringify(DEFAULT_GRADE_QUOTAS));
  const classes = [...SAMPLE_CLASSES];
  const teachers = [...SAMPLE_TEACHERS];
  const rooms = [...SAMPLE_ROOMS];
  const assignments = generateSampleAssignments(classes, quotas, teachers);

  it('xếp thành công toàn bộ số tiết được yêu cầu cho toàn trường', () => {
    const emptyTimetable = initializeEmptyTimetable(classes);
    const result = solveTimetable(classes, assignments, teachers, rooms, emptyTimetable, {
      mode: 'FULL_RESET'
    });

    expect(result).toBeDefined();
    expect(result.timetable).toBeDefined();
    expect(result.totalPlaced).toBeGreaterThan(0);
    expect(result.unassignedCount).toBe(0);
    expect(result.totalPlaced).toBe(result.totalNeeded);
  });

  it('hỗ trợ xếp lịch theo từng lớp mục tiêu (targetClassIds)', () => {
    const emptyTimetable = initializeEmptyTimetable(classes);
    const result = solveTimetable(classes, assignments, teachers, rooms, emptyTimetable, {
      mode: 'FULL_RESET',
      targetClassIds: ['3A1']
    });

    expect(result.totalPlaced).toBe(32); // Lớp 3A1 có 32 tiết/tuần
    expect(result.unassignedCount).toBe(0);
    
    // Các lớp khác vẫn rỗng
    classes.filter(c => c.id !== '3A1').forEach(c => {
      for (let d = 2; d <= 6; d++) {
        for (let p = 1; p <= 7; p++) {
          expect(result.timetable[c.id][d][p]).toBeNull();
        }
      }
    });
  });

  it('chế độ FILL_UNASSIGNED giữ nguyên các tiết đã xếp trước đó', () => {
    const partialTimetable = initializeEmptyTimetable(classes);
    partialTimetable['4A1'][2][2] = {
      subjectId: 'TOAN',
      teacherId: 'GV07',
      roomId: 'LOP_HOC',
      isLocked: false
    };

    const result = solveTimetable(classes, assignments, teachers, rooms, partialTimetable, {
      mode: 'FILL_UNASSIGNED',
      targetClassIds: ['4A1']
    });

    const slot = result.timetable['4A1'][2][2];
    expect(slot).toBeDefined();
    expect(slot.subjectId).toBe('TOAN');
    expect(slot.teacherId).toBe('GV07');
  });

  it('chế độ FULL_RESET bảo toàn tuyệt đối các tiết đã khóa (isLocked = true)', () => {
    const initialTimetable = initializeEmptyTimetable(classes);
    
    // Cố định tiết Chào cờ Sáng Thứ 2 (day 2, period 1) cho lớp 1A1
    initialTimetable['1A1'][2][1] = {
      subjectId: 'HDTN',
      teacherId: 'GV01',
      roomId: 'LOP_HOC',
      isLocked: true
    };

    const result = solveTimetable(classes, assignments, teachers, rooms, initialTimetable, {
      mode: 'FULL_RESET'
    });

    const lockedSlot = result.timetable['1A1'][2][1];
    expect(lockedSlot).toBeDefined();
    expect(lockedSlot.subjectId).toBe('HDTN');
    expect(lockedSlot.teacherId).toBe('GV01');
    expect(lockedSlot.isLocked).toBe(true);
  });
});


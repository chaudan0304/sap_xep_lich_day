import { describe, it, expect } from 'vitest';
import { solveTimetable } from '../src/services/autoScheduler.js';
import { checkAllConflicts } from '../src/services/conflictDetector.js';
import { 
  SAMPLE_CLASSES, 
  SAMPLE_TEACHERS, 
  SAMPLE_ROOMS, 
  generateSampleAssignments, 
  initializeEmptyTimetable 
} from '../src/data/sampleData.js';
import { DEFAULT_GRADE_QUOTAS } from '../src/constants/defaultCurriculum.js';

describe('autoScheduler: Thuật toán Xếp Thời Khóa Biểu Tự Động', () => {
  const quotas = JSON.parse(JSON.stringify(DEFAULT_GRADE_QUOTAS));
  const classes = [...SAMPLE_CLASSES];
  const teachers = [...SAMPLE_TEACHERS];
  const rooms = [...SAMPLE_ROOMS];
  const assignments = generateSampleAssignments(classes, quotas, teachers);
  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  it('xếp lịch tối đa các tiết và đảm bảo 100% ràng buộc cứng (chiều Thứ 4, buổi nghỉ GV, 0 conflict error)', () => {
    const emptyTimetable = initializeEmptyTimetable(classes);
    const result = solveTimetable(classes, assignments, teachers, rooms, emptyTimetable, {
      mode: 'FULL_RESET'
    });

    expect(result).toBeDefined();
    expect(result.timetable).toBeDefined();
    expect(result.totalPlaced).toBeGreaterThan(250);
    expect(result.totalPlaced + result.unassignedCount).toBe(result.totalNeeded);

    // 1. Ràng buộc cứng: Chiều Thứ 4 (day 4, periods 5..7) tuyệt đối không có tiết
    classes.forEach(c => {
      for (let p = 5; p <= 7; p++) {
        expect(result.timetable[c.id][4][p]).toBeNull();
      }
    });

    // 2. Ràng buộc cứng: Không xếp vào buổi giáo viên đã đăng ký nghỉ (offSessions)
    classes.forEach(c => {
      for (let d = 2; d <= 6; d++) {
        for (let p = 1; p <= 7; p++) {
          const slot = result.timetable[c.id][d][p];
          if (slot?.teacherId) {
            const t = teacherMap.get(slot.teacherId);
            const sessionKey = p <= 4 ? `${d}_morning` : `${d}_afternoon`;
            expect(t?.offSessions || []).not.toContain(sessionKey);
          }
        }
      }
    });

    // 3. Ràng buộc cứng: Không có xung đột mức độ error
    const conflicts = checkAllConflicts(result.timetable, assignments, teachers, rooms, classes);
    const errorConflicts = conflicts.filter(c => c.severity === 'error');
    expect(errorConflicts.length).toBe(0);
  });

  it('hỗ trợ xếp lịch theo từng lớp mục tiêu (targetClassIds)', () => {
    const emptyTimetable = initializeEmptyTimetable(classes);
    const result = solveTimetable(classes, assignments, teachers, rooms, emptyTimetable, {
      mode: 'FULL_RESET',
      targetClassIds: ['3A1']
    });

    expect(result.totalPlaced).toBeGreaterThan(25);
    expect(result.totalPlaced + result.unassignedCount).toBe(32); // Tổng nhu cầu lớp 3A1 là 32 tiết
    
    // Chiều Thứ 4 của lớp 3A1 không có tiết
    for (let p = 5; p <= 7; p++) {
      expect(result.timetable['3A1'][4][p]).toBeNull();
    }

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


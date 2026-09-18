// tests/conflictDetector.test.js
import { describe, it, expect } from 'vitest';
import { checkAllConflicts, CONFLICT_TYPES } from '../src/services/conflictDetector.js';
import { 
  SAMPLE_CLASSES, 
  SAMPLE_TEACHERS, 
  SAMPLE_ROOMS, 
  generateSampleAssignments, 
  initializeEmptyTimetable 
} from '../src/data/sampleData.js';
import { DEFAULT_GRADE_QUOTAS } from '../src/constants/defaultCurriculum.js';

describe('conflictDetector: Phát hiện Xung đột & Ràng buộc Thời Khóa Biểu', () => {
  const quotas = JSON.parse(JSON.stringify(DEFAULT_GRADE_QUOTAS));
  const classes = [...SAMPLE_CLASSES];
  const teachers = [...SAMPLE_TEACHERS];
  const rooms = [...SAMPLE_ROOMS];
  const assignments = generateSampleAssignments(classes, quotas, teachers);

  it('phát hiện chính xác khi 1 giáo viên bị trùng giờ dạy ở 2 lớp cùng lúc', () => {
    const timetable = initializeEmptyTimetable(classes);
    
    // Xếp GV11 cùng dạy Tiếng Anh vào Sáng Thứ 2 Tiết 1 ở cả 1A1 và 1A2
    timetable['1A1'][2][1] = {
      subjectId: 'TIENG_ANH',
      teacherId: 'GV11',
      roomId: 'LOP_HOC',
      isLocked: false
    };
    timetable['1A2'][2][1] = {
      subjectId: 'TIENG_ANH',
      teacherId: 'GV11',
      roomId: 'LOP_HOC',
      isLocked: false
    };

    const conflicts = checkAllConflicts(timetable, assignments, teachers, rooms, classes);
    const teacherConflicts = conflicts.filter(c => c.type === CONFLICT_TYPES.TEACHER_DOUBLE_BOOKING);
    
    expect(teacherConflicts.length).toBeGreaterThan(0);
    expect(teacherConflicts[0].teacherId).toBe('GV11');
    expect(teacherConflicts[0].day).toBe(2);
    expect(teacherConflicts[0].period).toBe(1);
  });

  it('phát hiện trùng phòng chức năng độc quyền (Phòng Tin Học)', () => {
    const timetable = initializeEmptyTimetable(classes);

    // Xếp cả 1A1 và 1A2 vào PHONG_TIN_HOC cùng lúc (Thứ 3 Tiết 2)
    timetable['1A1'][3][2] = {
      subjectId: 'TIN_HOC',
      teacherId: 'GV13',
      roomId: 'PHONG_TIN_HOC',
      roomType: 'PHONG_TIN_HOC'
    };
    timetable['1A2'][3][2] = {
      subjectId: 'TIN_HOC',
      teacherId: 'GV14',
      roomId: 'PHONG_TIN_HOC',
      roomType: 'PHONG_TIN_HOC'
    };

    const conflicts = checkAllConflicts(timetable, assignments, teachers, rooms, classes);
    const roomConflicts = conflicts.filter(c => c.type === CONFLICT_TYPES.ROOM_DOUBLE_BOOKING);

    expect(roomConflicts.length).toBeGreaterThan(0);
    expect(roomConflicts[0].roomType).toBe('PHONG_TIN_HOC');
  });

  it('cho phép nhiều lớp học cùng lúc ở Sân Thể Chất vì allowMultiple = true', () => {
    const timetable = initializeEmptyTimetable(classes);

    // Xếp cả 1A1 (GV15) và 1A2 (GV16) cùng học ở SAN_THE_CHAT vào Thứ 2 Tiết 3
    timetable['1A1'][2][3] = {
      subjectId: 'THE_DUC',
      teacherId: 'GV15',
      roomId: 'SAN_THE_CHAT',
      roomType: 'SAN_THE_CHAT'
    };
    timetable['1A2'][2][3] = {
      subjectId: 'THE_DUC',
      teacherId: 'GV16',
      roomId: 'SAN_THE_CHAT',
      roomType: 'SAN_THE_CHAT'
    };

    const conflicts = checkAllConflicts(timetable, assignments, teachers, rooms, classes);
    const roomConflicts = conflicts.filter(c => c.type === CONFLICT_TYPES.ROOM_DOUBLE_BOOKING);

    // Không được báo lỗi trùng phòng cho sân thể chất
    expect(roomConflicts.length).toBe(0);
  });

  it('cảnh báo khi giáo viên bị xếp vào buổi đăng ký nghỉ (offSessions)', () => {
    const timetable = initializeEmptyTimetable(classes);

    // GV02 đăng ký nghỉ Chiều Thứ 4 ('4_afternoon')
    // Xếp vào Thứ 4 Tiết 3 (buổi sáng) thì không lỗi, nhưng xếp vào buổi chiều (Tiết 5) thì phải cảnh báo
    timetable['1A2'][4][5] = {
      subjectId: 'TOAN',
      teacherId: 'GV02',
      roomId: 'LOP_HOC'
    };

    const conflicts = checkAllConflicts(timetable, assignments, teachers, rooms, classes);
    const offSessionConflicts = conflicts.filter(c => c.type === CONFLICT_TYPES.TEACHER_OFF_SESSION);

    expect(offSessionConflicts.length).toBeGreaterThan(0);
    expect(offSessionConflicts[0].teacherId).toBe('GV02');
  });
});

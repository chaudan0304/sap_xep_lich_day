// src/services/autoScheduler.js
// Thuật toán Tự động Xếp Thời khóa biểu Thông minh (CSP + Heuristic Solver)

import { checkAllConflicts } from './conflictDetector.js';

export const solveTimetable = (
  classes, 
  assignments, 
  teachers, 
  rooms, 
  currentTimetable = {}, 
  options = {}
) => {
  const {
    mode = 'FILL_UNASSIGNED', // 'FILL_UNASSIGNED' (Chỉ xếp các môn/tiết chưa xếp) | 'FULL_RESET' (Xếp mới toàn bộ)
    category = 'ALL', // 'ALL' | 'SPECIALIZED' | 'CORE' | 'ELECTIVE'
    selectedSubjectIds = null, // Mảng mã môn được chọn cụ thể (nếu có)
    targetClassIds = null // Mảng mã lớp được chọn cụ thể (nếu có)
  } = options;

  // 1. Tạo bản sao thời khóa biểu khởi tạo theo chế độ
  const timetable = {};
  classes.forEach(cls => {
    timetable[cls.id] = {};
    for (let day = 2; day <= 6; day++) {
      timetable[cls.id][day] = {};
      for (let period = 1; period <= 7; period++) {
        const existing = currentTimetable[cls.id]?.[day]?.[period];
        if (mode === 'FILL_UNASSIGNED') {
          // Giữ nguyên 100% tất cả các tiết đã xếp trước đó
          if (existing && existing.subjectId) {
            timetable[cls.id][day][period] = { ...existing };
          } else {
            timetable[cls.id][day][period] = null;
          }
        } else {
          // FULL_RESET: Chỉ giữ lại các tiết có isLocked = true
          if (existing && existing.isLocked) {
            timetable[cls.id][day][period] = { ...existing };
          } else {
            timetable[cls.id][day][period] = null;
          }
        }
      }
    }
  });

  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  // Định nghĩa nhóm môn học
  const specializedSubjectIds = ['TIENG_ANH', 'TIN_HOC', 'THE_DUC', 'AM_NHAC', 'MY_THUAT', 'DAO_DUC', 'GD_CONG_DAN_SO'];
  const coreSubjectIds = ['TOAN', 'TIENG_VIET', 'TNXH', 'LS_DL', 'KHOA_HOC', 'HDTN', 'DOC_THU_VIEN', 'HD_CUNG_CO'];
  const electiveSubjectIds = ['TU_CHON'];

  // 2. Tính toán danh sách các tiết cần xếp cho từng lớp
  const lessonsToPlace = [];
  const classesToProcess = targetClassIds && targetClassIds.length > 0 
    ? classes.filter(c => targetClassIds.includes(c.id)) 
    : classes;

  classesToProcess.forEach(cls => {
    const classAssignments = assignments.filter(a => a.classId === cls.id);

    // Đếm các tiết đã có trong thời khóa biểu của lớp này
    const placedCounts = {};
    for (let day = 2; day <= 6; day++) {
      for (let period = 1; period <= 7; period++) {
        const slot = timetable[cls.id][day][period];
        if (slot && slot.subjectId) {
          placedCounts[slot.subjectId] = (placedCounts[slot.subjectId] || 0) + 1;
        }
      }
    }

    classAssignments.forEach(asg => {
      // Lọc theo phân loại môn (category)
      if (category === 'SPECIALIZED') {
        const isSpec = specializedSubjectIds.includes(asg.subjectId) || (asg.roomType && asg.roomType !== 'LOP_HOC' && asg.roomType !== 'SAN_TRUONG');
        if (!isSpec) return;
      } else if (category === 'CORE') {
        if (!coreSubjectIds.includes(asg.subjectId)) return;
      } else if (category === 'ELECTIVE') {
        if (!electiveSubjectIds.includes(asg.subjectId)) return;
      }

      // Lọc theo danh sách môn được chọn cụ thể (nếu có)
      if (selectedSubjectIds && selectedSubjectIds.length > 0) {
        if (!selectedSubjectIds.includes(asg.subjectId)) return;
      }

      // Tính số tiết còn thiếu cần xếp bù
      const alreadyPlaced = placedCounts[asg.subjectId] || 0;
      const needed = Math.max(0, asg.weeklyPeriods - alreadyPlaced);

      if (needed <= 0) return;

      // Xác định độ ưu tiên (Heuristic Constraint Priority)
      // Môn phòng chức năng + GV bộ môn dạy nhiều lớp có độ ưu tiên cao nhất
      let priority = 10;
      const isSpecializedRoom = asg.roomType && asg.roomType !== 'LOP_HOC' && asg.roomType !== 'SAN_TRUONG';
      const isSpecialistTeacher = !teachers.find(t => t.id === asg.teacherId)?.isHomeroom;

      if (isSpecializedRoom && isSpecialistTeacher) {
        priority = 100; // Tin học, Thể dục, Ngoại ngữ
      } else if (isSpecialistTeacher) {
        priority = 80;  // Âm nhạc, Mỹ thuật
      } else if (asg.subjectId === 'TOAN' || asg.subjectId === 'TIENG_VIET') {
        priority = 60;  // Toán, Tiếng Việt chính khóa
      } else if (asg.subjectId === 'TU_CHON') {
        priority = 10;  // Tự chọn / Ôn luyện xếp sau cùng
      } else {
        priority = 40;  // Đạo đức, TNXH, Khoa học...
      }

      for (let i = 0; i < needed; i++) {
        lessonsToPlace.push({
          classId: cls.id,
          grade: cls.grade,
          subjectId: asg.subjectId,
          teacherId: asg.teacherId,
          roomType: asg.roomType || 'LOP_HOC',
          allowDouble: asg.allowDouble || false,
          maxMorning: asg.maxMorning ?? 5,
          maxAfternoon: asg.maxAfternoon ?? 4,
          priority: priority + Math.random() * 2 // Thêm chút ngẫu nhiên để tránh lặp vị trí
        });
      }
    });
  });

  // Sắp xếp các tiết theo thứ tự ưu tiên giảm dần
  lessonsToPlace.sort((a, b) => b.priority - a.priority);

  // 3. Hàm kiểm tra hợp lệ khi gán tiết vào ô (day, period)
  const isFeasible = (classId, day, period, lesson) => {
    // Không ghi đè lên ô đã có tiết
    if (timetable[classId][day][period] !== null) return false;

    // Chiều Thứ 4 nghỉ (day 4 = Thứ Tư, period > 4 = buổi chiều)
    if (day === 4 && period > 4) return false;

    // Ràng buộc buổi Sáng / Chiều
    const isMorning = period <= 4;
    if (isMorning && lesson.maxMorning === 0) return false;
    if (!isMorning && lesson.maxAfternoon === 0) return false;

    // Kiểm tra số tiết cùng môn trong ngày của lớp này (Tránh dồn 3 tiết cùng môn trong 1 ngày)
    let subjectDayCount = 0;
    for (let p = 1; p <= 7; p++) {
      if (timetable[classId][day][p]?.subjectId === lesson.subjectId) {
        subjectDayCount++;
      }
    }
    const maxPerDayAllowed = (lesson.subjectId === 'TIENG_VIET' || lesson.subjectId === 'TU_CHON') ? 2 : 1;
    if (subjectDayCount >= maxPerDayAllowed) return false;

    // Kiểm tra Buổi nghỉ của Giáo viên
    const teacher = teacherMap.get(lesson.teacherId);
    if (teacher && teacher.offSessions && teacher.offSessions.length > 0) {
      const sessionKey = isMorning ? `${day}_morning` : `${day}_afternoon`;
      if (teacher.offSessions.includes(sessionKey)) return false;
    }

    // Kiểm tra Trùng giờ Giáo viên ở các lớp khác
    if (lesson.teacherId) {
      for (const otherClass of classes) {
        if (otherClass.id === classId) continue;
        const otherSlot = timetable[otherClass.id][day][period];
        if (otherSlot && otherSlot.teacherId === lesson.teacherId) {
          return false;
        }
      }
    }

    // Kiểm tra Trùng Phòng chức năng ở các lớp khác (Bỏ qua nếu phòng cho phép nhiều lớp học cùng lúc: SAN_THE_CHAT, SAN_TRUONG, hoặc allowMultiple)
    if (lesson.roomType && lesson.roomType !== 'LOP_HOC' && lesson.roomType !== 'SAN_TRUONG' && lesson.roomType !== 'SAN_THE_CHAT') {
      const roomObj = rooms?.find(r => r.id === lesson.roomType);
      if (!roomObj?.allowMultiple) {
        for (const otherClass of classes) {
          if (otherClass.id === classId) continue;
          const otherSlot = timetable[otherClass.id][day][period];
          if (otherSlot && (otherSlot.roomId === lesson.roomType || otherSlot.roomType === lesson.roomType)) {
            return false;
          }
        }
      }
    }

    return true;
  };

  // 4. Tiến hành gán các tiết vào bảng (Greedy Placement + Backtrack Fallback)
  const unassigned = [];

  lessonsToPlace.forEach(lesson => {
    // Tạo danh sách các ứng viên (Day, Period)
    const candidateSlots = [];

    // Ưu tiên xếp buổi sáng cho các môn chính khóa
    const isAcademic = ['TOAN', 'TIENG_VIET', 'TIENG_ANH', 'KHOA_HOC', 'LS_DL'].includes(lesson.subjectId);
    
    // Tạo thứ tự duyệt ngày (Xáo trộn nhẹ để phân tán đều trong tuần)
    const days = [2, 3, 4, 5, 6].sort(() => Math.random() - 0.5);

    days.forEach(day => {
      // Xác định thứ tự tiết
      const periods = isAcademic 
        ? [1, 2, 3, 4, 5, 6, 7] 
        : (lesson.subjectId === 'TU_CHON' ? [5, 6, 7, 1, 2, 3, 4] : [2, 3, 4, 5, 6, 1, 7]);

      periods.forEach(period => {
        if (isFeasible(lesson.classId, day, period, lesson)) {
          // Tính điểm ưu tiên cho slot
          let slotScore = 0;
          if (isAcademic && period <= 4) slotScore += 10;
          if (lesson.subjectId === 'THE_DUC' && period !== 5) slotScore += 5; // Tránh Thể dục ngay đầu giờ chiều
          if (lesson.subjectId === 'TU_CHON' && period >= 5) slotScore += 15;

          candidateSlots.push({ day, period, score: slotScore + Math.random() });
        }
      });
    });

    if (candidateSlots.length > 0) {
      // Chọn slot có điểm cao nhất
      candidateSlots.sort((a, b) => b.score - a.score);
      const chosen = candidateSlots[0];

      timetable[lesson.classId][chosen.day][chosen.period] = {
        subjectId: lesson.subjectId,
        teacherId: lesson.teacherId,
        roomId: lesson.roomType || 'LOP_HOC',
        roomType: lesson.roomType,
        isLocked: false
      };
    } else {
      // Fallback: Duyệt lại toàn bộ các ô (day, period) còn trống trong tuần qua isFeasible
      // Tuyệt đối không hạ thấp hay nới lỏng các ràng buộc cứng
      const fallbackSlots = [];
      for (let day = 2; day <= 6; day++) {
        for (let period = 1; period <= 7; period++) {
          if (timetable[lesson.classId][day][period] === null) {
            if (isFeasible(lesson.classId, day, period, lesson)) {
              let slotScore = 0;
              if (isAcademic && period <= 4) slotScore += 10;
              if (lesson.subjectId === 'THE_DUC' && period !== 5) slotScore += 5;
              if (lesson.subjectId === 'TU_CHON' && period >= 5) slotScore += 15;
              fallbackSlots.push({ day, period, score: slotScore + Math.random() });
            }
          }
        }
      }

      if (fallbackSlots.length > 0) {
        fallbackSlots.sort((a, b) => b.score - a.score);
        const chosen = fallbackSlots[0];
        timetable[lesson.classId][chosen.day][chosen.period] = {
          subjectId: lesson.subjectId,
          teacherId: lesson.teacherId,
          roomId: lesson.roomType || 'LOP_HOC',
          roomType: lesson.roomType,
          isLocked: false
        };
      } else {
        // Chỉ khi isFeasible không tìm được bất kỳ ô hợp lệ nào trong tuần mới đưa vào unassigned
        unassigned.push(lesson);
      }
    }
  });

  // 5. Kiểm tra lại toàn bộ xung đột sau khi xếp
  const conflicts = checkAllConflicts(timetable, assignments, teachers, rooms, classes);

  return {
    success: unassigned.length === 0 && conflicts.filter(c => c.severity === 'error').length === 0,
    timetable,
    totalPlaced: lessonsToPlace.length - unassigned.length,
    totalNeeded: lessonsToPlace.length,
    unassignedCount: unassigned.length,
    unassignedLessons: unassigned,
    conflicts
  };
};

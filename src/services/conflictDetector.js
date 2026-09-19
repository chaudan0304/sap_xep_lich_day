// src/services/conflictDetector.js
// Module kiểm tra và phát hiện xung đột thời gian thực
// Cung cấp thông tin chi tiết: Tiết nào, Buổi nào, Lớp nào, Ai trùng và Nguyên nhân

import { DAYS_OF_WEEK, PERIODS } from '../constants/defaultCurriculum.js';
import { SUBJECTS } from '../constants/subjects.js';

export const CONFLICT_TYPES = {
  TEACHER_DOUBLE_BOOKING: 'TEACHER_DOUBLE_BOOKING',
  ROOM_DOUBLE_BOOKING: 'ROOM_DOUBLE_BOOKING',
  TEACHER_OFF_SESSION: 'TEACHER_OFF_SESSION',
  TEACHER_MAX_DAILY: 'TEACHER_MAX_DAILY',
  SUBJECT_QUOTA_EXCEEDED: 'SUBJECT_QUOTA_EXCEEDED',
  SESSION_MISMATCH: 'SESSION_MISMATCH'
};

const getPeriodInfo = (periodId) => {
  const p = PERIODS.find(item => item.id === periodId);
  if (p) {
    return {
      name: p.name,
      session: p.session === 'morning' ? 'Sáng' : 'Chiều',
      time: p.time,
      fullName: `${p.name} (${p.session === 'morning' ? 'Sáng' : 'Chiều'}${p.time ? ` - ${p.time}` : ''})`
    };
  }
  const isMorning = periodId <= 4;
  return {
    name: isMorning ? `Tiết ${periodId}` : `Tiết ${periodId - 4}`,
    session: isMorning ? 'Sáng' : 'Chiều',
    time: '',
    fullName: isMorning ? `Tiết ${periodId} (Sáng)` : `Tiết ${periodId - 4} (Chiều)`
  };
};

const getDayName = (dayId) => {
  const d = DAYS_OF_WEEK.find(item => item.id === dayId);
  return d ? d.name : `Thứ ${dayId}`;
};

/**
 * Quét toàn bộ thời khóa biểu để tìm tất cả các vi phạm
 */
export const checkAllConflicts = (timetable = {}, assignments = [], teachers = [], rooms = [], classes = []) => {
  const conflicts = [];
  const teacherMap = new Map((teachers || []).map(t => [t.id, t]));

  // 1. Kiểm tra Trùng giờ Giáo viên & Trùng Phòng chức năng theo từng (Thứ, Tiết)
  for (let day = 2; day <= 6; day++) {
    for (let period = 1; period <= 7; period++) {
      const pInfo = getPeriodInfo(period);
      const dayName = getDayName(day);

      // teacherId -> [{ classId, className, subjectId, subjectName, slot }]
      const teacherOccupancy = new Map();
      // roomId -> [{ classId, className, subjectId, subjectName, slot }]
      const roomOccupancy = new Map();

      classes.forEach(cls => {
        const slot = timetable[cls.id]?.[day]?.[period];
        if (!slot || !slot.subjectId) return;

        // Cảnh báo nếu có tiết vào chiều Thứ 4 (toàn trường nghỉ chiều Thứ 4)
        if (day === 4 && period > 4) {
          const subObj = SUBJECTS[slot.subjectId] || { name: slot.subjectRaw || slot.subjectId };
          conflicts.push({
            type: 'wed_afternoon',
            severity: 'error',
            day,
            period,
            classId: cls.id,
            className: cls.name,
            teacherId: slot.teacherId,
            subjectId: slot.subjectId,
            message: `⚠️ Lớp ${cls.name} có tiết ${subObj.name || slot.subjectId} vào chiều Thứ 4 (Tiết ${period}) — Chiều Thứ 4 toàn trường nghỉ!`
          });
        }

        const subObj = SUBJECTS[slot.subjectId] || { name: slot.subjectRaw || slot.subjectId };
        const slotInfo = {
          classId: cls.id,
          className: cls.name,
          subjectId: slot.subjectId,
          subjectName: subObj.name || slot.subjectId,
          slot
        };

        // Ghi nhận Giáo viên
        if (slot.teacherId) {
          const currentList = teacherOccupancy.get(slot.teacherId) || [];
          currentList.push(slotInfo);
          teacherOccupancy.set(slot.teacherId, currentList);
        }

        // Ghi nhận Phòng chức năng (chỉ xét phòng chuyên dụng thực tế của trường: PHONG_TIN_HOC)
        const roomType = slot.roomId || slot.roomType;
        const isIgnoredRoom = !roomType || roomType === 'LOP_HOC' || roomType === 'SAN_TRUONG' || roomType === 'PHONG_NGOAI_NGU' || roomType === 'PHONG_AM_NHAC' || roomType === 'PHONG_MY_THUAT';
        if (!isIgnoredRoom) {
          const currentList = roomOccupancy.get(roomType) || [];
          currentList.push(slotInfo);
          roomOccupancy.set(roomType, currentList);
        }

        // Kiểm tra Buổi nghỉ của Giáo viên
        const teacher = teacherMap.get(slot.teacherId);
        if (teacher && teacher.offSessions && teacher.offSessions.length > 0) {
          const sessionKey = period <= 4 ? `${day}_morning` : `${day}_afternoon`;
          if (teacher.offSessions.includes(sessionKey)) {
            const sessionName = pInfo.session;
            conflicts.push({
              id: `off_${day}_${period}_${cls.id}_${teacher.id}`,
              type: CONFLICT_TYPES.TEACHER_OFF_SESSION,
              severity: 'warning',
              title: 'Giáo viên dạy vào buổi đăng ký nghỉ',
              classId: cls.id,
              className: cls.name,
              day,
              dayName,
              period,
              periodName: pInfo.fullName,
              session: sessionName,
              time: pInfo.time,
              teacherId: teacher.id,
              teacherName: teacher.name,
              teacherCode: teacher.code || teacher.name,
              subjectId: slot.subjectId,
              subjectName: subObj.name || slot.subjectId,
              message: `Đăng ký nghỉ: ${teacher.name} (${teacher.code}) đăng ký nghỉ ${sessionName} ${dayName}, nhưng bị xếp dạy lớp ${cls.name} (môn ${subObj.name}) tại ${pInfo.fullName}`
            });
          }
        }
      });

      // Báo lỗi trùng giờ giáo viên
      teacherOccupancy.forEach((slotList, teacherId) => {
        if (slotList.length > 1) {
          const teacher = teacherMap.get(teacherId);
          const teacherName = teacher ? teacher.name : (slotList[0]?.slot?.teacherRaw || teacherId);
          const teacherCode = teacher?.code || teacherId;
          const classNames = slotList.map(s => s.className).join(', ');
          const classDetails = slotList.map(s => `${s.className} (${s.subjectName})`).join(' ⚡ ');

          slotList.forEach(item => {
            const otherClasses = slotList.filter(s => s.classId !== item.classId).map(s => s.className).join(', ');
            conflicts.push({
              id: `teacher_dup_${day}_${period}_${item.classId}_${teacherId}`,
              type: CONFLICT_TYPES.TEACHER_DOUBLE_BOOKING,
              severity: 'error',
              title: 'Trùng giờ dạy giáo viên',
              classId: item.classId,
              className: item.className,
              day,
              dayName,
              period,
              periodName: pInfo.fullName,
              session: pInfo.session,
              time: pInfo.time,
              teacherId,
              teacherName,
              teacherCode,
              subjectId: item.subjectId,
              subjectName: item.subjectName,
              conflictingClassIds: slotList.map(s => s.classId),
              conflictingClasses: slotList.map(s => ({ classId: s.classId, className: s.className, subjectName: s.subjectName })),
              conflictingClassNames: classNames,
              message: `Trùng giờ: Giáo viên ${teacherName} (${teacherCode}) đang dạy đồng thời ${classDetails} vào ${dayName}, ${pInfo.fullName} (trùng với ${otherClasses})`
            });
          });
        }
      });

      // Báo lỗi trùng phòng chức năng
      roomOccupancy.forEach((slotList, roomType) => {
        if (slotList.length > 1) {
          const roomObj = rooms.find(r => r.id === roomType);
          const isMultiClassRoom = roomObj?.allowMultiple || roomType === 'SAN_THE_CHAT' || roomType === 'SAN_TRUONG';
          if (isMultiClassRoom) return;

          const roomName = roomObj ? roomObj.name : roomType;
          const roomCode = roomObj?.code || roomType;
          const classNames = slotList.map(s => s.className).join(', ');
          const classDetails = slotList.map(s => `${s.className} (${s.subjectName})`).join(' ⚡ ');

          slotList.forEach(item => {
            const otherClasses = slotList.filter(s => s.classId !== item.classId).map(s => s.className).join(', ');
            conflicts.push({
              id: `room_dup_${day}_${period}_${item.classId}_${roomType}`,
              type: CONFLICT_TYPES.ROOM_DOUBLE_BOOKING,
              severity: 'error',
              title: 'Trùng phòng chức năng',
              classId: item.classId,
              className: item.className,
              day,
              dayName,
              period,
              periodName: pInfo.fullName,
              session: pInfo.session,
              time: pInfo.time,
              roomType,
              roomName,
              roomCode,
              subjectId: item.subjectId,
              subjectName: item.subjectName,
              conflictingClassIds: slotList.map(s => s.classId),
              conflictingClasses: slotList.map(s => ({ classId: s.classId, className: s.className, subjectName: s.subjectName })),
              conflictingClassNames: classNames,
              message: `Trùng phòng: ${roomName} (${roomCode}) đang bị trùng bởi các lớp ${classDetails} vào ${dayName}, ${pInfo.fullName} (trùng với ${otherClasses})`
            });
          });
        }
      });
    }
  }



  // 3. Kiểm tra Thừa số tiết so với phân công của từng lớp
  classes.forEach(cls => {
    const classAssignments = (assignments || []).filter(a => a.classId === cls.id);
    const cleanClassName = (cls.name || '').trim().toLowerCase().startsWith('lớp') ? cls.name.trim() : `Lớp ${cls.name.trim()}`;

    // Thu thập chi tiết từng slot đã xếp theo subjectId
    const placedSlotsBySubject = {};

    for (let day = 2; day <= 6; day++) {
      for (let period = 1; period <= 7; period++) {
        const slot = timetable[cls.id]?.[day]?.[period];
        if (slot && slot.subjectId) {
          if (!placedSlotsBySubject[slot.subjectId]) {
            placedSlotsBySubject[slot.subjectId] = [];
          }
          const pInfo = getPeriodInfo(period);
          const tObj = teacherMap.get(slot.teacherId);
          placedSlotsBySubject[slot.subjectId].push({
            day,
            period,
            dayName: getDayName(day),
            periodName: pInfo.name || `Tiết ${period}`,
            session: pInfo.session,
            time: pInfo.time,
            teacherId: slot.teacherId,
            teacherName: tObj?.name || slot.teacherRaw || '',
            teacherCode: tObj?.code || tObj?.shortName || ''
          });
        }
      }
    }

    classAssignments.forEach(asg => {
      const slots = placedSlotsBySubject[asg.subjectId] || [];
      const placed = slots.length;

      if (placed > asg.weeklyPeriods) {
        const subObj = SUBJECTS[asg.subjectId] || { name: asg.subjectId, shortName: asg.subjectId };
        const excess = placed - asg.weeklyPeriods;

        // Tìm giáo viên phụ trách môn này trong bảng phân công
        const assignedTeacher = teacherMap.get(asg.teacherId);
        const teacherName = assignedTeacher ? assignedTeacher.name : (asg.teacherId ? asg.teacherId : 'Chưa phân công');
        const teacherCode = assignedTeacher?.code || assignedTeacher?.shortName || '';

        // Gom nhóm các tiết theo Thứ để tạo chuỗi tóm tắt rõ ràng
        // Ví dụ: Thứ 2 (Tiết 1, Tiết 2) • Thứ 3 (Tiết 1) • Thứ 4 (Tiết 2) • Thứ 5 (Tiết 1, Tiết 2)
        const slotsByDay = {};
        slots.forEach(s => {
          if (!slotsByDay[s.dayName]) slotsByDay[s.dayName] = [];
          slotsByDay[s.dayName].push(s.periodName);
        });
        const slotSummaryText = Object.entries(slotsByDay)
          .map(([dName, pList]) => `${dName} (${pList.join(', ')})`)
          .join(' • ');

        conflicts.push({
          id: `quota_exceeded_${cls.id}_${asg.subjectId}`,
          type: CONFLICT_TYPES.SUBJECT_QUOTA_EXCEEDED,
          severity: 'warning',
          title: 'Xếp vượt số tiết phân công',
          classId: cls.id,
          className: cleanClassName,
          subjectId: asg.subjectId,
          subjectName: subObj.name || asg.subjectId,
          subjectShortName: subObj.shortName || subObj.name || asg.subjectId,
          subjectColor: subObj.color || '#4f46e5',
          placed,
          weeklyPeriods: asg.weeklyPeriods,
          excessPeriods: excess,
          teacherId: asg.teacherId,
          teacherName,
          teacherCode,
          placedSlots: slots,
          slotSummary: slotSummaryText,
          message: `${cleanClassName}: Môn ${subObj.name} đã xếp ${placed} tiết (vượt mức phân công ${asg.weeklyPeriods} tiết/tuần, thừa ${excess} tiết). Các tiết đang xếp: ${slotSummaryText}`
        });
      }
    });
  });

  return conflicts;
};

/**
 * Kiểm tra nhanh xem 1 ô cụ thể có thể đặt môn học này vào không
 */
export const validateSlotPlacement = (
  timetable,
  classId,
  day,
  period,
  subjectId,
  teacherId,
  roomType,
  teachers,
  classes,
  rooms
) => {
  const pInfo = getPeriodInfo(period);
  const dayName = getDayName(day);

  // 2. Kiểm tra xem giáo viên có đang dạy lớp khác vào đúng tiết này không
  if (teacherId) {
    for (const otherClass of classes) {
      if (otherClass.id === classId) continue;
      const otherSlot = timetable[otherClass.id]?.[day]?.[period];
      if (otherSlot && otherSlot.teacherId === teacherId) {
        const teacher = teachers.find(t => t.id === teacherId);
        const tName = teacher ? teacher.name : 'Giáo viên';
        const tCode = teacher?.code || '';
        return { 
          valid: false, 
          reason: `Trùng giờ: ${tName} (${tCode}) đang dạy tại lớp ${otherClass.name} vào ${dayName} ${pInfo.fullName}` 
        };
      }
    }
  }

  // 3. Kiểm tra xem phòng chức năng có đang bị lớp khác sử dụng không
  const isIgnoredRoom = !roomType || roomType === 'LOP_HOC' || roomType === 'SAN_TRUONG' || roomType === 'SAN_THE_CHAT' || roomType === 'PHONG_NGOAI_NGU' || roomType === 'PHONG_AM_NHAC' || roomType === 'PHONG_MY_THUAT';
  if (!isIgnoredRoom) {
    const roomObj = rooms?.find(r => r.id === roomType);
    if (!roomObj?.allowMultiple) {
      for (const otherClass of classes) {
        if (otherClass.id === classId) continue;
        const otherSlot = timetable[otherClass.id]?.[day]?.[period];
        if (otherSlot && (otherSlot.roomId === roomType || otherSlot.roomType === roomType)) {
          const rName = roomObj ? roomObj.name : roomType;
          return { 
            valid: false, 
            reason: `Trùng phòng: Phòng [${rName}] đang được lớp ${otherClass.name} sử dụng vào ${dayName} ${pInfo.fullName}` 
          };
        }
      }
    }
  }

  // 4. Kiểm tra buổi nghỉ của GV
  if (teacherId) {
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher && teacher.offSessions && teacher.offSessions.length > 0) {
      const sessionKey = period <= 4 ? `${day}_morning` : `${day}_afternoon`;
      if (teacher.offSessions.includes(sessionKey)) {
        return {
          valid: true,
          isWarning: true,
          reason: `Lưu ý: ${teacher.name} đã đăng ký nghỉ ${pInfo.session} ${dayName}`
        };
      }
    }
  }

  return { valid: true };
};

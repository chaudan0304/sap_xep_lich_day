// src/constants/defaultCurriculum.js
// Khung phân phối chương trình Tiểu học chuẩn GDPT 2018 (32 tiết/tuần)
// Cấu hình định mức chính xác 32 tiết/tuần cho tất cả các khối (Khối 1 đến Khối 5) theo dữ liệu thực tế nhà trường

export const DEFAULT_GRADE_QUOTAS = {
  1: {
    grade: 1,
    gradeName: 'Khối 1',
    targetWeeklyPeriods: 32,
    subjects: [
      { subjectId: 'TIENG_VIET', weeklyPeriods: 12, maxMorning: 8, maxAfternoon: 4, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TOAN', weeklyPeriods: 3, maxMorning: 3, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIENG_ANH', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TNXH', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'THE_DUC', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'SAN_THE_CHAT' },
      { subjectId: 'DAO_DUC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'AM_NHAC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'MY_THUAT', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'HDTN', weeklyPeriods: 3, maxMorning: 2, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIN_HOC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'PHONG_TIN_HOC' },
      { subjectId: 'DOC_THU_VIEN', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'HD_CUNG_CO', weeklyPeriods: 2, maxMorning: 0, maxAfternoon: 2, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'GD_CONG_DAN_SO', weeklyPeriods: 1, maxMorning: 0, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' }
    ]
  },
  2: {
    grade: 2,
    gradeName: 'Khối 2',
    targetWeeklyPeriods: 32,
    subjects: [
      { subjectId: 'TIENG_VIET', weeklyPeriods: 10, maxMorning: 7, maxAfternoon: 3, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TOAN', weeklyPeriods: 5, maxMorning: 4, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIENG_ANH', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TNXH', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'THE_DUC', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'SAN_THE_CHAT' },
      { subjectId: 'DAO_DUC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'AM_NHAC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'MY_THUAT', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'HDTN', weeklyPeriods: 3, maxMorning: 2, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIN_HOC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'PHONG_TIN_HOC' },
      { subjectId: 'DOC_THU_VIEN', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'HD_CUNG_CO', weeklyPeriods: 2, maxMorning: 0, maxAfternoon: 2, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'GD_CONG_DAN_SO', weeklyPeriods: 1, maxMorning: 0, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' }
    ]
  },
  3: {
    grade: 3,
    gradeName: 'Khối 3',
    targetWeeklyPeriods: 32,
    subjects: [
      { subjectId: 'TIENG_VIET', weeklyPeriods: 7, maxMorning: 5, maxAfternoon: 2, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TOAN', weeklyPeriods: 5, maxMorning: 4, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIENG_ANH', weeklyPeriods: 4, maxMorning: 2, maxAfternoon: 2, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TNXH', weeklyPeriods: 2, maxMorning: 1, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'CONG_NGHE', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIN_HOC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'PHONG_TIN_HOC' },
      { subjectId: 'THE_DUC', weeklyPeriods: 2, maxMorning: 1, maxAfternoon: 1, allowDouble: false, roomType: 'SAN_THE_CHAT' },
      { subjectId: 'DAO_DUC', weeklyPeriods: 1, maxMorning: 0, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'AM_NHAC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'MY_THUAT', weeklyPeriods: 1, maxMorning: 0, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'HDTN', weeklyPeriods: 3, maxMorning: 2, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'DOC_THU_VIEN', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'HD_CUNG_CO', weeklyPeriods: 2, maxMorning: 1, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'GD_CONG_DAN_SO', weeklyPeriods: 1, maxMorning: 0, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' }
    ]
  },
  4: {
    grade: 4,
    gradeName: 'Khối 4',
    targetWeeklyPeriods: 32,
    subjects: [
      { subjectId: 'TIENG_VIET', weeklyPeriods: 7, maxMorning: 5, maxAfternoon: 2, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TOAN', weeklyPeriods: 5, maxMorning: 3, maxAfternoon: 2, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIENG_ANH', weeklyPeriods: 4, maxMorning: 3, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'LS_DL', weeklyPeriods: 4, maxMorning: 2, maxAfternoon: 2, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'CONG_NGHE', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIN_HOC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'PHONG_TIN_HOC' },
      { subjectId: 'THE_DUC', weeklyPeriods: 2, maxMorning: 1, maxAfternoon: 1, allowDouble: false, roomType: 'SAN_THE_CHAT' },
      { subjectId: 'DAO_DUC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'AM_NHAC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'MY_THUAT', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'HDTN', weeklyPeriods: 3, maxMorning: 2, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'DOC_THU_VIEN', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'GD_CONG_DAN_SO', weeklyPeriods: 1, maxMorning: 0, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' }
    ]
  },
  5: {
    grade: 5,
    gradeName: 'Khối 5',
    targetWeeklyPeriods: 32,
    subjects: [
      { subjectId: 'TIENG_VIET', weeklyPeriods: 7, maxMorning: 5, maxAfternoon: 2, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TOAN', weeklyPeriods: 5, maxMorning: 3, maxAfternoon: 2, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIENG_ANH', weeklyPeriods: 4, maxMorning: 3, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'LS_DL', weeklyPeriods: 4, maxMorning: 2, maxAfternoon: 2, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'CONG_NGHE', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIN_HOC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'PHONG_TIN_HOC' },
      { subjectId: 'THE_DUC', weeklyPeriods: 2, maxMorning: 1, maxAfternoon: 1, allowDouble: false, roomType: 'SAN_THE_CHAT' },
      { subjectId: 'DAO_DUC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'AM_NHAC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'MY_THUAT', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'HDTN', weeklyPeriods: 3, maxMorning: 2, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'DOC_THU_VIEN', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'GD_CONG_DAN_SO', weeklyPeriods: 1, maxMorning: 0, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' }
    ]
  }
};

export const DAYS_OF_WEEK = [
  { id: 2, name: 'Thứ Hai', shortName: 'T2' },
  { id: 3, name: 'Thứ Ba', shortName: 'T3' },
  { id: 4, name: 'Thứ Tư', shortName: 'T4' },
  { id: 5, name: 'Thứ Năm', shortName: 'T5' },
  { id: 6, name: 'Thứ Sáu', shortName: 'T6' }
];

export const PERIODS = [
  { id: 1, name: 'Tiết 1', session: 'morning', time: '07:30 - 08:05', sessionLabel: 'Sáng - Tiết 1' },
  { id: 2, name: 'Tiết 2', session: 'morning', time: '08:15 - 08:50', sessionLabel: 'Sáng - Tiết 2' },
  { id: 3, name: 'Tiết 3', session: 'morning', time: '09:10 - 09:45', sessionLabel: 'Sáng - Tiết 3' },
  { id: 4, name: 'Tiết 4', session: 'morning', time: '09:55 - 10:30', sessionLabel: 'Sáng - Tiết 4' },
  { id: 5, name: 'Tiết 5', session: 'afternoon', time: '14:00 - 14:35', sessionLabel: 'Chiều - Tiết 1' },
  { id: 6, name: 'Tiết 6', session: 'afternoon', time: '14:45 - 15:20', sessionLabel: 'Chiều - Tiết 2' },
  { id: 7, name: 'Tiết 7', session: 'afternoon', time: '15:30 - 16:05', sessionLabel: 'Chiều - Tiết 3' }
];

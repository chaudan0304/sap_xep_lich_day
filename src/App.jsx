// src/App.jsx
// Auto-sync: gradeQuotas -> assignments -> studio
import React, { useState, useMemo, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { TeacherDirectory } from './components/TeacherDirectory';
import { ClassDirectory } from './components/ClassDirectory';
import { SubjectManager } from './components/SubjectManager';
import { GradeQuotaManager } from './components/GradeQuotaManager';
import { AssignmentManager } from './components/AssignmentManager';
import { TimetableStudio } from './components/TimetableStudio';
import { MasterMatrixView } from './components/MasterMatrixView';
import { RoomTimetableView } from './components/RoomTimetableView';
import { ExcelModal } from './components/ExcelModal';
import { ImportReportModal } from './components/ImportReportModal';
import { AutoScheduleModal } from './components/AutoScheduleModal';
import { ConflictModal } from './components/ConflictModal';
import SchoolSettingsModal, { DEFAULT_SCHOOL_INFO } from './components/SchoolSettingsModal';
import { UpdateModal } from './components/UpdateModal';
import { WelcomeModal } from './components/WelcomeModal';
import { UserGuideModal } from './components/UserGuideModal';
import { checkForAppUpdates } from './services/updateChecker';

import { DEFAULT_GRADE_QUOTAS, PERIODS as DEFAULT_PERIODS } from './constants/defaultCurriculum';
import { SUBJECTS as INITIAL_SUBJECTS } from './constants/subjects';
import { 
  SAMPLE_CLASSES, 
  SAMPLE_TEACHERS, 
  SAMPLE_ROOMS, 
  SAMPLE_SCHOOL_INFO,
  generateSampleAssignments, 
  initializeEmptyTimetable 
} from './data/sampleData';
import { checkAllConflicts } from './services/conflictDetector';
import { solveTimetable } from './services/autoScheduler';
import { 
  loadAllDataFromDb, 
  saveAllDataToDb, 
  exportSqliteDatabaseFile, 
  importSqliteDatabaseFile 
} from './services/dbService';
import { 
  DEFAULT_DEPARTMENTS, 
  migrateDepartmentsAndTeachers 
} from './services/departmentService';

const DATA_VERSION = '2026_09_06_V35_SEPARATE_SCIENCE_HISTORY';

export function App() {
  const currentVersion = typeof window !== 'undefined' ? localStorage.getItem('EDUTIMETABLE_VERSION') : null;
  const isUpToDate = currentVersion === DATA_VERSION;

  // 1. Core State with LocalStorage Persistence
  const [activeTab, setActiveTab] = useState('studio');

  const [schoolInfo, setSchoolInfo] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('EDUTIMETABLE_SCHOOL_INFO') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.scheduler === 'Châu Đàn') {
          parsed.scheduler = '';
        }
        return parsed;
      } catch (e) {
        console.error('Error parsing schoolInfo:', e);
      }
    }
    return { ...DEFAULT_SCHOOL_INFO };
  });

  const [periods, setPeriods] = useState(() => {
    if (!isUpToDate) return JSON.parse(JSON.stringify(DEFAULT_PERIODS));
    const saved = localStorage.getItem('EDUTIMETABLE_PERIODS');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Tự động nâng cấp nếu người dùng đang dùng khung giờ mặc định cũ (07:30 - 08:05)
        if (Array.isArray(parsed) && parsed.some(p => p.time === '07:30 - 08:05')) {
          return JSON.parse(JSON.stringify(DEFAULT_PERIODS));
        }
        return parsed;
      } catch {
        return JSON.parse(JSON.stringify(DEFAULT_PERIODS));
      }
    }
    return JSON.parse(JSON.stringify(DEFAULT_PERIODS));
  });

  const [subjects, setSubjects] = useState(() => {
    if (!isUpToDate) return JSON.parse(JSON.stringify(INITIAL_SUBJECTS));
    const saved = localStorage.getItem('EDUTIMETABLE_SUBJECTS');
    return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(INITIAL_SUBJECTS));
  });

  const [gradeQuotas, setGradeQuotas] = useState(() => {
    if (!isUpToDate) return JSON.parse(JSON.stringify(DEFAULT_GRADE_QUOTAS));
    const saved = localStorage.getItem('EDUTIMETABLE_GRADE_QUOTAS');
    return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_GRADE_QUOTAS));
  });

  const [classes, setClasses] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('EDUTIMETABLE_CLASSES') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [...SAMPLE_CLASSES];
  });

  // Danh mục Tổ Chuyên Môn / Văn Phòng động
  const [departments, setDepartments] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('EDUTIMETABLE_DEPARTMENTS') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return DEFAULT_DEPARTMENTS;
  });

  const [teachers, setTeachers] = useState(() => {
    let raw = [...SAMPLE_TEACHERS];
    const saved = typeof window !== 'undefined' ? localStorage.getItem('EDUTIMETABLE_TEACHERS') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) raw = parsed;
      } catch {}
    }

    let currentDepts = DEFAULT_DEPARTMENTS;
    try {
      const savedDepts = localStorage.getItem('EDUTIMETABLE_DEPARTMENTS');
      if (savedDepts) currentDepts = JSON.parse(savedDepts);
    } catch {}

    // Bảo toàn toàn bộ dữ liệu tổ hiện có, tự động gán departmentId và tạo tổ tương ứng nếu cần
    const migrated = migrateDepartmentsAndTeachers(raw, currentDepts);
    return migrated.teachers;
  });

  const [rooms, setRooms] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('EDUTIMETABLE_ROOMS') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [...SAMPLE_ROOMS];
  });
  
  const [assignments, setAssignments] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('EDUTIMETABLE_ASSIGNMENTS') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return generateSampleAssignments(SAMPLE_CLASSES, DEFAULT_GRADE_QUOTAS, SAMPLE_TEACHERS);
  });

  const [timetable, setTimetable] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('EDUTIMETABLE_SCHEDULE') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed;
      } catch {}
    }
    const initialEmpty = initializeEmptyTimetable(SAMPLE_CLASSES);
    const initialAssignments = generateSampleAssignments(SAMPLE_CLASSES, DEFAULT_GRADE_QUOTAS, SAMPLE_TEACHERS);
    const solved = solveTimetable(SAMPLE_CLASSES, initialAssignments, SAMPLE_TEACHERS, SAMPLE_ROOMS, initialEmpty);
    return solved.timetable || initialEmpty;
  });


  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [importReport, setImportReport] = useState(null);
  const [isImportReportOpen, setIsImportReportOpen] = useState(false);
  const skipAssignmentSyncRef = useRef(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isUserGuideModalOpen, setIsUserGuideModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(() => {
    return !localStorage.getItem('EDUTIMETABLE_INITIALIZED_CHOICE');
  });
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [isUpdateReady, setIsUpdateReady] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [selectedStudioClassId, setSelectedStudioClassId] = useState('1A1');

  // Lắng nghe sự kiện cập nhật tự động từ Electron
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      if (window.electronAPI.onDownloadProgress) {
        window.electronAPI.onDownloadProgress((progress) => {
          setDownloadProgress(progress);
        });
      }
      if (window.electronAPI.onUpdateDownloaded) {
        window.electronAPI.onUpdateDownloaded((info) => {
          setIsUpdateReady(true);
          setDownloadProgress(null);
        });
      }
    }
  }, []);

  // Kiểm tra cập nhật tự động khi khởi động ứng dụng
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const info = await checkForAppUpdates();
        setUpdateInfo(info);
      } catch (err) {
        console.warn('Auto-update check:', err);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // ★ NẠP DỮ LIỆU TỪ CƠ SỞ DỮ LIỆU SQLITE (src/data/edutimetable.db) KHI KHỞI ĐỘNG
  useEffect(() => {
    let isMounted = true;
    loadAllDataFromDb().then(dbData => {
      if (!isMounted || !dbData) return;
      skipAssignmentSyncRef.current = true;
      if (dbData.schoolInfo) setSchoolInfo(dbData.schoolInfo);
      if (Array.isArray(dbData.periods) && dbData.periods.length > 0) setPeriods(dbData.periods);
      if (dbData.subjects && Object.keys(dbData.subjects).length > 0) setSubjects(dbData.subjects);
      if (dbData.gradeQuotas && Object.keys(dbData.gradeQuotas).length > 0) setGradeQuotas(dbData.gradeQuotas);
      if (Array.isArray(dbData.classes) && dbData.classes.length > 0) setClasses(dbData.classes);
      if (Array.isArray(dbData.departments) && dbData.departments.length > 0) {
        setDepartments(dbData.departments);
      }
      if (Array.isArray(dbData.teachers) && dbData.teachers.length > 0) {
        const migrated = migrateDepartmentsAndTeachers(dbData.teachers, dbData.departments || departments);
        setTeachers(migrated.teachers);
        if (migrated.departments?.length > (dbData.departments?.length || 0)) {
          setDepartments(migrated.departments);
        }
      }
      if (Array.isArray(dbData.rooms) && dbData.rooms.length > 0) setRooms(dbData.rooms);
      if (Array.isArray(dbData.assignments) && dbData.assignments.length > 0) setAssignments(dbData.assignments);
      if (dbData.timetable && Object.keys(dbData.timetable).length > 0) setTimetable(dbData.timetable);
    }).catch(err => {
      console.warn('Initial SQLite load warning:', err);
    });

    return () => { isMounted = false; };
  }, []);

  // Sync to LocalStorage on changes
  useEffect(() => {
    localStorage.setItem('EDUTIMETABLE_VERSION', DATA_VERSION);
  }, []);

  useEffect(() => {
    localStorage.setItem('EDUTIMETABLE_DEPARTMENTS', JSON.stringify(departments));
  }, [departments]);
  useEffect(() => {
    localStorage.setItem('EDUTIMETABLE_SCHOOL_INFO', JSON.stringify(schoolInfo));
  }, [schoolInfo]);

  useEffect(() => {
    localStorage.setItem('EDUTIMETABLE_PERIODS', JSON.stringify(periods));
  }, [periods]);

  useEffect(() => {
    localStorage.setItem('EDUTIMETABLE_SUBJECTS', JSON.stringify(subjects));
  }, [subjects]);

  // Track first render to skip initial auto-sync
  const isFirstRender = useRef(true);

  useEffect(() => {
    localStorage.setItem('EDUTIMETABLE_GRADE_QUOTAS', JSON.stringify(gradeQuotas));
  }, [gradeQuotas]);

  // ★ Auto-sync: khi gradeQuotas thay đổi -> tự động cập nhật assignments
  // Đảm bảo Định Mức Khối luôn đồng bộ với Studio Xếp Lịch & Phân Công GV
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Regenerate assignments from updated gradeQuotas, keeping existing teacher bindings
    setAssignments(prev => {
      const newAssignments = [];
      classes.forEach(cls => {
        const quota = gradeQuotas[cls.grade];
        if (!quota) return;
        quota.subjects.forEach(s => {
          const existing = prev.find(a => a.classId === cls.id && a.subjectId === s.subjectId);
          newAssignments.push({
            id: `ASG_${cls.id}_${s.subjectId}`,
            classId: cls.id,
            subjectId: s.subjectId,
            teacherId: existing?.teacherId || '',
            weeklyPeriods: s.weeklyPeriods,
            roomType: s.roomType || existing?.roomType || 'LOP_HOC',
            allowDouble: s.allowDouble || false
          });
        });
      });
      return newAssignments;
    });
  }, [gradeQuotas, classes]);

  useEffect(() => {
    localStorage.setItem('EDUTIMETABLE_CLASSES', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem('EDUTIMETABLE_TEACHERS', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('EDUTIMETABLE_ROOMS', JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem('EDUTIMETABLE_ASSIGNMENTS', JSON.stringify(assignments));
  }, [assignments]);

  // ★ TỰ ĐỘNG ĐỒNG BỘ: Mỗi khi Phân Công Chuyên Môn (assignments) thay đổi ->
  // Tự động cập nhật teacherId & phòng học của tất cả các tiết đã xếp trên Thời Khóa Biểu (timetable)
  useEffect(() => {
    if (skipAssignmentSyncRef.current) {
      skipAssignmentSyncRef.current = false;
      return;
    }

    setTimetable(prevTimetable => {
      let changed = false;
      const nextTimetable = { ...prevTimetable };

      const asgMap = new Map();
      assignments.forEach(a => {
        asgMap.set(`${a.classId}_${a.subjectId}`, a);
      });

      Object.keys(nextTimetable).forEach(classId => {
        let classChanged = false;
        const dayMap = { ...nextTimetable[classId] };

        for (let d = 2; d <= 6; d++) {
          if (!dayMap[d]) continue;
          let dayChanged = false;
          const periodMap = { ...dayMap[d] };

          for (let p = 1; p <= 7; p++) {
            const slot = periodMap[p];
            if (slot && slot.subjectId) {
              const matchingAsg = asgMap.get(`${classId}_${slot.subjectId}`);
              if (matchingAsg) {
                const targetTeacher = matchingAsg.teacherId || '';
                const targetRoom = matchingAsg.roomType || 'LOP_HOC';
                if (slot.teacherId !== targetTeacher || slot.roomId !== targetRoom) {
                  periodMap[p] = {
                    ...slot,
                    teacherId: targetTeacher,
                    roomId: targetRoom
                  };
                  dayChanged = true;
                }
              }
            }
          }

          if (dayChanged) {
            dayMap[d] = periodMap;
            classChanged = true;
          }
        }

        if (classChanged) {
          nextTimetable[classId] = dayMap;
          changed = true;
        }
      });

      return changed ? nextTimetable : prevTimetable;
    });
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem('EDUTIMETABLE_SCHEDULE', JSON.stringify(timetable));
  }, [timetable]);

  // ★ TỰ ĐỘNG LƯU VÀO CƠ SỞ DỮ LIỆU SQLITE (src/data/edutimetable.db)
  // Mỗi khi bạn thay đổi dữ liệu, CSDL SQLite sẽ tự động cập nhật ngay trên ổ đĩa
  useEffect(() => {
    const timer = setTimeout(() => {
      const payload = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        schoolInfo,
        periods,
        subjects,
        gradeQuotas,
        classes,
        departments,
        teachers,
        rooms,
        assignments,
        timetable
      };
      saveAllDataToDb(payload);
    }, 400);

    return () => clearTimeout(timer);
  }, [schoolInfo, periods, subjects, gradeQuotas, classes, departments, teachers, rooms, assignments, timetable]);

  // 2. Real-time Conflict Detection
  const conflicts = useMemo(() => {
    return checkAllConflicts(timetable, assignments, teachers, rooms, classes);
  }, [timetable, assignments, teachers, rooms, classes]);

  // 3. Tự động Xếp Lịch Toàn Trường (AI Solver)
  const [isAutoScheduleModalOpen, setIsAutoScheduleModalOpen] = useState(false);

  const handleOpenAutoScheduleModal = () => {
    setIsAutoScheduleModalOpen(true);
  };

  const handleExecuteAutoSchedule = (options = {}) => {
    setIsAutoScheduling(true);

    setTimeout(() => {
      try {
        const result = solveTimetable(classes, assignments, teachers, rooms, timetable, options);
        setTimetable(result.timetable);
        setIsAutoScheduleModalOpen(false);

        if (result.success) {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 }
          });
          const modeMsg = options.mode === 'FILL_UNASSIGNED' 
            ? 'Đã điền khuyết và xếp bổ sung các môn còn thiếu thành công' 
            : 'Đã xếp mới toàn bộ thời khóa biểu thành công';
          alert(`🎉 ${modeMsg} (${result.totalPlaced || 0} tiết được xếp)! Không có xung đột trùng giờ hay phòng.`);
        } else if (result.unassignedCount > 0) {
          alert(`Đã xếp được ${result.totalPlaced || 0} tiết. Còn ${result.unassignedCount} tiết chưa tìm được khoảng trống phù hợp do ràng buộc.`);
        }
      } catch (err) {
        console.error('Auto schedule failed:', err);
        alert('Có lỗi xảy ra trong quá trình xếp lịch tự động.');
      } finally {
        setIsAutoScheduling(false);
      }
    }, 300);
  };

  // 5. Khôi Phục Dữ Liệu Thu Gọn (10 lớp)
  const handleResetSampleData = () => {
    if (window.confirm('Chuyển sang Dữ Liệu Thu Gọn (10 lớp học, 20 GV)?')) {
      const freshQuotas = JSON.parse(JSON.stringify(DEFAULT_GRADE_QUOTAS));
      const freshClasses = [...SAMPLE_CLASSES];
      const freshTeachers = [...SAMPLE_TEACHERS];
      const freshRooms = [...SAMPLE_ROOMS];
      const freshAssignments = generateSampleAssignments(freshClasses, freshQuotas, freshTeachers);
      const empty = initializeEmptyTimetable(freshClasses);
      const solved = solveTimetable(freshClasses, freshAssignments, freshTeachers, freshRooms, empty);

      setSchoolInfo({ name: 'Trường Tiểu Học Ánh Dương', year: 'Năm học 2026 - 2027' });
      setSubjects(JSON.parse(JSON.stringify(INITIAL_SUBJECTS)));
      setGradeQuotas(freshQuotas);
      setClasses(freshClasses);
      setTeachers(freshTeachers);
      setRooms(freshRooms);
      setAssignments(freshAssignments);
      setTimetable(solved.timetable || empty);
    }
  };

  // 5. Khởi tạo / Nạp Dữ Liệu Mẫu Chuẩn (Trường Tiểu Học Ánh Dương)
  const handleSelectSampleData = () => {
    localStorage.setItem('EDUTIMETABLE_INITIALIZED_CHOICE', 'sample');
    const freshQuotas = JSON.parse(JSON.stringify(DEFAULT_GRADE_QUOTAS));
    const freshClasses = [...SAMPLE_CLASSES];
    const freshTeachers = [...SAMPLE_TEACHERS];
    const freshRooms = [...SAMPLE_ROOMS];
    const freshAssignments = generateSampleAssignments(freshClasses, freshQuotas, freshTeachers);
    const empty = initializeEmptyTimetable(freshClasses);
    const solved = solveTimetable(freshClasses, freshAssignments, freshTeachers, freshRooms, empty);

    setSchoolInfo({ ...DEFAULT_SCHOOL_INFO });
    setSubjects(JSON.parse(JSON.stringify(INITIAL_SUBJECTS)));
    setGradeQuotas(freshQuotas);
    setClasses(freshClasses);
    setTeachers(freshTeachers);
    setRooms(freshRooms);
    setAssignments(freshAssignments);
    setTimetable(solved.timetable || empty);
    setSelectedStudioClassId('1A1');
  };


  // Khởi tạo Dự Án Mới Trắng Hoàn Toàn Cho Trường Của Người Dùng
  const handleStartBlankProject = (customInfo) => {
    localStorage.setItem('EDUTIMETABLE_INITIALIZED_CHOICE', 'blank');
    setSchoolInfo(customInfo || {
      name: 'Trường Tiểu học Mới',
      district: 'Phòng GD&ĐT',
      year: 'Năm học 2026 - 2027',
      principal: '',
      scheduler: '',
      address: '',
      lunchBreak: '10:30 - 14:00'
    });
    const default5Classes = [
      { id: '1A1', name: 'Lớp 1A1', grade: 1, studentCount: 35, mainRoom: 'Phòng 101' },
      { id: '2A1', name: 'Lớp 2A1', grade: 2, studentCount: 35, mainRoom: 'Phòng 102' },
      { id: '3A1', name: 'Lớp 3A1', grade: 3, studentCount: 35, mainRoom: 'Phòng 201' },
      { id: '4A1', name: 'Lớp 4A1', grade: 4, studentCount: 35, mainRoom: 'Phòng 202' },
      { id: '5A1', name: 'Lớp 5A1', grade: 5, studentCount: 35, mainRoom: 'Phòng 301' }
    ];
    setClasses(default5Classes);
    setTeachers([]);
    setAssignments([]);
    setTimetable(initializeEmptyTimetable(default5Classes));
    setSelectedStudioClassId('1A1');
  };

  // 6. Xóa Sạch Thời Khóa Biểu
  const handleClearTimetable = () => {
    if (window.confirm('Xóa sạch thời khóa biểu tất cả các lớp?')) {
      setTimetable(initializeEmptyTimetable(classes));
    }
  };

  // 7. Đồng Bộ Phân Công từ Định Mức Khối
  const handleSyncAssignmentsFromQuotas = () => {
    setAssignments(generateSampleAssignments(classes, gradeQuotas, teachers));
  };

  // 8. Tiếp Nhận Dữ Liệu Nhập Từ File Excel Tùy Chỉnh
  const handleImportSuccess = (importedData, diagnostics) => {
    skipAssignmentSyncRef.current = true; // Bảo vệ dữ liệu TKB nguyên bản vừa nạp từ Excel, không cho assignments ghi đè

    if (importedData.teachers) setTeachers(importedData.teachers);
    if (importedData.classes) setClasses(importedData.classes);
    if (importedData.rooms) setRooms(importedData.rooms);
    if (importedData.subjects) setSubjects(prev => ({ ...prev, ...importedData.subjects }));
    if (importedData.gradeQuotas) setGradeQuotas(importedData.gradeQuotas);
    if (importedData.assignments) setAssignments(importedData.assignments);

    if (importedData.timetable) {
      setTimetable(importedData.timetable);
    } else if (importedData.classes) {
      const empty = initializeEmptyTimetable(importedData.classes);
      setTimetable(empty);
    }

    if (importedData.classes && importedData.classes.length > 0) {
      setSelectedStudioClassId(importedData.classes[0].id);
    }

    // Hiển thị báo cáo đối soát lỗi sau khi nạp nếu có lỗi hoặc cảnh báo
    if (diagnostics && ((diagnostics.errors && diagnostics.errors.length > 0) || (diagnostics.warnings && diagnostics.warnings.length > 0))) {
      setImportReport(diagnostics);
      setIsImportReportOpen(true);
    } else {
      const totalSlots = diagnostics?.summary?.validSlots || diagnostics?.summary?.totalSlots || 0;
      alert(`🎉 Nhập dữ liệu thành công!\nĐã nạp ${importedData.classes?.length || 0} lớp học, ${importedData.teachers?.length || 0} giáo viên và ${totalSlots} tiết học lên Thời khóa biểu. Dữ liệu hoàn toàn hợp lệ.`);
    }
  };

  const handleNavigateToStudioSlot = (classId, day, period) => {
    if (classId) setSelectedStudioClassId(classId);
    setActiveTab('studio');
  };

  // 9. Xuất File Sao Lưu Dữ Liệu Toàn Dự Án (.json)
  const handleExportBackupJson = () => {
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      schoolInfo,
      periods,
      subjects,
      gradeQuotas,
      classes,
      teachers,
      rooms,
      assignments,
      timetable
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DuLieu_TKB_${(schoolInfo.name || 'Truong').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 10. Nạp Dữ Liệu Từ File Sao Lưu (.json)
  const handleImportBackupJson = (jsonData) => {
    skipAssignmentSyncRef.current = true; // Bảo vệ: không cho auto-sync ghi đè assignments vừa nạp từ backup
    if (jsonData.schoolInfo) setSchoolInfo(jsonData.schoolInfo);
    if (jsonData.periods) setPeriods(jsonData.periods);
    if (jsonData.subjects) setSubjects(jsonData.subjects);
    if (jsonData.gradeQuotas) setGradeQuotas(jsonData.gradeQuotas);
    if (jsonData.classes) setClasses(jsonData.classes);
    if (jsonData.teachers) setTeachers(jsonData.teachers);
    if (jsonData.rooms) setRooms(jsonData.rooms);
    if (jsonData.assignments) setAssignments(jsonData.assignments);
    if (jsonData.timetable) setTimetable(jsonData.timetable);
  };

  // 11. Xuất File Cơ Sở Dữ Liệu SQLite (.db)
  const handleExportSqliteDb = async () => {
    try {
      await exportSqliteDatabaseFile(schoolInfo.name);
    } catch (err) {
      alert('Lỗi khi xuất file cơ sở dữ liệu SQLite: ' + err.message);
    }
  };

  // 12. Nạp File Cơ Sở Dữ Liệu SQLite (.db)
  const handleImportSqliteDb = async (file) => {
    try {
      const res = await importSqliteDatabaseFile(file);
      if (res?.data) {
        skipAssignmentSyncRef.current = true;
        const d = res.data;
        if (d.schoolInfo) setSchoolInfo(d.schoolInfo);
        if (Array.isArray(d.periods) && d.periods.length > 0) setPeriods(d.periods);
        if (d.subjects && Object.keys(d.subjects).length > 0) setSubjects(d.subjects);
        if (d.gradeQuotas && Object.keys(d.gradeQuotas).length > 0) setGradeQuotas(d.gradeQuotas);
        if (Array.isArray(d.classes) && d.classes.length > 0) setClasses(d.classes);
        if (Array.isArray(d.teachers) && d.teachers.length > 0) setTeachers(d.teachers);
        if (Array.isArray(d.rooms) && d.rooms.length > 0) setRooms(d.rooms);
        if (Array.isArray(d.assignments) && d.assignments.length > 0) setAssignments(d.assignments);
        if (d.timetable && Object.keys(d.timetable).length > 0) setTimetable(d.timetable);
        alert('🎉 Nạp cơ sở dữ liệu SQLite (.db) thành công!');
      }
    } catch (err) {
      alert('Lỗi khi nạp file cơ sở dữ liệu SQLite: ' + err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-bg)', paddingBottom: '60px' }}>
      {/* Global Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAutoSchedule={handleOpenAutoScheduleModal}
        onOpenExcelModal={() => setIsExcelModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
        onOpenWelcomeModal={() => setIsWelcomeModalOpen(true)}
        onOpenUserGuideModal={() => setIsUserGuideModalOpen(true)}
        updateInfo={updateInfo}
        onResetSampleData={handleResetSampleData}
        onClearTimetable={handleClearTimetable}
        onExportBackupJson={handleExportBackupJson}
        onImportBackupJson={handleImportBackupJson}
        onExportSqliteDb={handleExportSqliteDb}
        onImportSqliteDb={handleImportSqliteDb}
        onOpenConflictModal={() => setIsConflictModalOpen(true)}
        conflicts={conflicts}
        isAutoScheduling={isAutoScheduling}
        schoolInfo={schoolInfo}
        onOpenImportReport={() => setIsImportReportOpen(true)}
        importReportCount={(importReport?.errors?.length || 0) + (importReport?.warnings?.length || 0)}
      />

      {/* Main Content Area */}
      <main>
        {activeTab === 'studio' && (
          <TimetableStudio
            classes={classes}
            setClasses={setClasses}
            teachers={teachers}
            assignments={assignments}
            timetable={timetable}
            setTimetable={setTimetable}
            conflicts={conflicts}
            subjects={subjects}
            periods={periods}
            schoolInfo={schoolInfo}
            rooms={rooms}
            selectedClassId={selectedStudioClassId}
            onSelectClass={setSelectedStudioClassId}
            onOpenConflictModal={() => setIsConflictModalOpen(true)}
          />
        )}

        {activeTab === 'teachers' && (
          <TeacherDirectory
            teachers={teachers}
            setTeachers={setTeachers}
            departments={departments}
            setDepartments={setDepartments}
            assignments={assignments}
            setAssignments={setAssignments}
            classes={classes}
            setClasses={setClasses}
            timetable={timetable}
            subjects={subjects}
            periods={periods}
            schoolInfo={schoolInfo}
            onViewTeacherSchedule={(t) => {
              setActiveTab('studio');
            }}
          />
        )}

        {activeTab === 'classes' && (
          <ClassDirectory
            classes={classes}
            setClasses={setClasses}
            teachers={teachers}
            setTeachers={setTeachers}
            assignments={assignments}
            setAssignments={setAssignments}
            timetable={timetable}
            setTimetable={setTimetable}
            rooms={rooms}
            schoolInfo={schoolInfo}
            subjects={subjects}
            periods={periods}
            onSelectClassForStudio={(cid) => {
              setSelectedStudioClassId(cid);
              setActiveTab('studio');
            }}
          />
        )}

        {activeTab === 'subjects' && (
          <SubjectManager
            subjects={subjects}
            setSubjects={setSubjects}
            rooms={rooms}
            setRooms={setRooms}
            assignments={assignments}
            setAssignments={setAssignments}
            timetable={timetable}
            setTimetable={setTimetable}
            gradeQuotas={gradeQuotas}
            setGradeQuotas={setGradeQuotas}
            classes={classes}
          />
        )}

        {activeTab === 'curriculum' && (
          <GradeQuotaManager
            gradeQuotas={gradeQuotas}
            setGradeQuotas={setGradeQuotas}
            onSyncAssignments={handleSyncAssignmentsFromQuotas}
            subjects={subjects}
            rooms={rooms}
          />
        )}

        {activeTab === 'assignments' && (
          <AssignmentManager
            assignments={assignments}
            setAssignments={setAssignments}
            classes={classes}
            teachers={teachers}
            gradeQuotas={gradeQuotas}
            subjects={subjects}
            rooms={rooms}
          />
        )}

        {activeTab === 'matrix' && (
          <MasterMatrixView
            classes={classes}
            teachers={teachers}
            timetable={timetable}
            conflicts={conflicts}
            subjects={subjects}
            periods={periods}
            schoolInfo={schoolInfo}
            onOpenConflictModal={() => setIsConflictModalOpen(true)}
          />
        )}

        {activeTab === 'rooms' && (
          <RoomTimetableView
            rooms={rooms}
            setRooms={setRooms}
            classes={classes}
            teachers={teachers}
            timetable={timetable}
            subjects={subjects}
            setSubjects={setSubjects}
            assignments={assignments}
            setAssignments={setAssignments}
            periods={periods}
            schoolInfo={schoolInfo}
          />
        )}
      </main>

      {/* School and Period Times Settings Modal */}
      <SchoolSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        schoolInfo={schoolInfo}
        setSchoolInfo={setSchoolInfo}
        periods={periods}
        setPeriods={setPeriods}
      />

      {/* Excel Import/Export Modal */}
      <ExcelModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        classes={classes}
        teachers={teachers}
        assignments={assignments}
        gradeQuotas={gradeQuotas}
        timetable={timetable}
        subjects={subjects}
        schoolInfo={schoolInfo}
        onImportSuccess={handleImportSuccess}
      />

      {/* Conflict Details Inspector Modal */}
      <ConflictModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        conflicts={conflicts}
        classes={classes}
        teachers={teachers}
        onNavigateToClass={(clsId) => {
          setSelectedStudioClassId(clsId);
          setActiveTab('studio');
        }}
      />

      {/* Post-Import Error & Diagnostics Report Modal */}
      <ImportReportModal
        isOpen={isImportReportOpen}
        onClose={() => setIsImportReportOpen(false)}
        report={importReport || {}}
        classes={classes}
        onNavigateToSlot={handleNavigateToStudioSlot}
      />

      {/* Auto Schedule AI Modal */}
      <AutoScheduleModal
        isOpen={isAutoScheduleModalOpen}
        onClose={() => setIsAutoScheduleModalOpen(false)}
        onExecuteSchedule={handleExecuteAutoSchedule}
        classes={classes}
        teachers={teachers}
        assignments={assignments}
        timetable={timetable}
        subjects={subjects}
        isScheduling={isAutoScheduling}
      />

      {/* Auto-Update Checker Modal */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        initialUpdateInfo={updateInfo}
        onUpdateInfoChange={setUpdateInfo}
      />

      {/* Welcome & Project Initialization Modal */}
      <WelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
        onSelectSampleData={handleSelectSampleData}
        onStartBlankProject={handleStartBlankProject}
        onOpenExcelModal={() => setIsExcelModalOpen(true)}
        onOpenUserGuideModal={() => setIsUserGuideModalOpen(true)}
      />

      {/* Comprehensive User Guide & Manual Modal */}
      <UserGuideModal
        isOpen={isUserGuideModalOpen}
        onClose={() => setIsUserGuideModalOpen(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsUserGuideModalOpen(false);
        }}
      />

      {/* Floating Auto-Update Ready Toast (Tự động thông báo khi tải ngầm xong) */}
      {isUpdateReady && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
          border: '2px solid #60a5fa',
          borderRadius: '16px',
          padding: '16px 20px',
          color: '#ffffff',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🎉 Đã Tải Xong Bản Cập Nhật Mới!</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#bfdbfe', marginTop: '2px' }}>
              Bấm Khởi động lại để tự động nâng cấp tính năng mới.
            </div>
          </div>
          <button
            onClick={() => {
              if (window.electronAPI?.restartAndInstall) {
                window.electronAPI.restartAndInstall();
              }
            }}
            style={{
              background: '#10b981',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '10px',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
              whiteSpace: 'nowrap'
            }}
          >
            Khởi Động Lại Ngay
          </button>
        </div>
      )}
    </div>
  );
}

export default App;

// src/App.jsx
// Trung tâm điều phối ứng dụng EduTimetable Tiểu Học
// Tách biệt quản lý lưu trữ (useAppPersistence) và hệ thống hộp thoại (AppModals)

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
import { AppModals } from './components/AppModals';
import { DEFAULT_SCHOOL_INFO } from './components/SchoolSettingsModal';

import { DEFAULT_GRADE_QUOTAS, PERIODS as DEFAULT_PERIODS } from './constants/defaultCurriculum';
import { SUBJECTS as INITIAL_SUBJECTS } from './constants/subjects';
import { 
  SAMPLE_CLASSES, 
  SAMPLE_TEACHERS, 
  SAMPLE_ROOMS, 
  generateSampleAssignments, 
  initializeEmptyTimetable 
} from './data/sampleData';
import { checkAllConflicts } from './services/conflictDetector';
import { solveTimetable } from './services/autoScheduler';
import { 
  exportSqliteDatabaseFile, 
  importSqliteDatabaseFile 
} from './services/dbService';
import { 
  DEFAULT_DEPARTMENTS, 
  migrateDepartmentsAndTeachers 
} from './services/departmentService';
import { useAppPersistence, DATA_VERSION } from './hooks/useAppPersistence';

export function App() {
  const currentVersion = typeof window !== 'undefined' ? localStorage.getItem('EDUTIMETABLE_VERSION') : null;
  const isUpToDate = currentVersion === DATA_VERSION;

  // 1. Core State with LocalStorage Initialization
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
        console.error('Lỗi khi đọc schoolInfo từ localStorage:', e);
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

  // Modal State Controllers
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [importReport, setImportReport] = useState(null);
  const [isImportReportOpen, setIsImportReportOpen] = useState(false);
  const skipAssignmentSyncRef = useRef(false);
  const isFirstRender = useRef(true);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isUserGuideModalOpen, setIsUserGuideModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(() => {
    return !localStorage.getItem('EDUTIMETABLE_INITIALIZED_CHOICE');
  });
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [isAutoScheduleModalOpen, setIsAutoScheduleModalOpen] = useState(false);
  const [selectedStudioClassId, setSelectedStudioClassId] = useState('1A1');

  // Quản lý lưu trữ và đồng bộ hóa SQLite / LocalStorage / Update
  const {
    updateInfo,
    setUpdateInfo,
    isUpdateReady
  } = useAppPersistence({
    schoolInfo, setSchoolInfo,
    periods, setPeriods,
    subjects, setSubjects,
    gradeQuotas, setGradeQuotas,
    classes, setClasses,
    departments, setDepartments,
    teachers, setTeachers,
    rooms, setRooms,
    assignments, setAssignments,
    timetable, setTimetable,
    skipAssignmentSyncRef
  });

  // ★ Auto-sync: khi gradeQuotas thay đổi -> tự động cập nhật assignments
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
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

  // ★ TỰ ĐỘNG ĐỒNG BỘ: Mỗi khi assignments thay đổi -> cập nhật teacherId & roomId trên timetable
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

  // 2. Real-time Conflict Detection
  const conflicts = useMemo(() => {
    return checkAllConflicts(timetable, assignments, teachers, rooms, classes);
  }, [timetable, assignments, teachers, rooms, classes]);

  // 3. Tự động Xếp Lịch Toàn Trường (AI Solver)
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

  // 4. Khôi Phục Dữ Liệu Thu Gọn (10 lớp)
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
    skipAssignmentSyncRef.current = true;

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

    if (diagnostics && ((diagnostics.errors && diagnostics.errors.length > 0) || (diagnostics.warnings && diagnostics.warnings.length > 0))) {
      setImportReport(diagnostics);
      setIsImportReportOpen(true);
    } else {
      const totalSlots = diagnostics?.summary?.validSlots || diagnostics?.summary?.totalSlots || 0;
      alert(`🎉 Nhập dữ liệu thành công!\nĐã nạp ${importedData.classes?.length || 0} lớp học, ${importedData.teachers?.length || 0} giáo viên và ${totalSlots} tiết học lên Thời khóa biểu. Dữ liệu hoàn toàn hợp lệ.`);
    }
  };

  const handleNavigateToStudioSlot = (classId) => {
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
    skipAssignmentSyncRef.current = true;
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
            onViewTeacherSchedule={() => {
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

      {/* Unified Modals Container */}
      <AppModals
        isSettingsModalOpen={isSettingsModalOpen}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        schoolInfo={schoolInfo}
        setSchoolInfo={setSchoolInfo}
        periods={periods}
        setPeriods={setPeriods}
        isExcelModalOpen={isExcelModalOpen}
        setIsExcelModalOpen={setIsExcelModalOpen}
        classes={classes}
        teachers={teachers}
        assignments={assignments}
        gradeQuotas={gradeQuotas}
        timetable={timetable}
        subjects={subjects}
        onImportSuccess={handleImportSuccess}
        isConflictModalOpen={isConflictModalOpen}
        setIsConflictModalOpen={setIsConflictModalOpen}
        conflicts={conflicts}
        onNavigateToClass={(clsId) => {
          setSelectedStudioClassId(clsId);
          setActiveTab('studio');
        }}
        isImportReportOpen={isImportReportOpen}
        setIsImportReportOpen={setIsImportReportOpen}
        importReport={importReport}
        onNavigateToSlot={handleNavigateToStudioSlot}
        isAutoScheduleModalOpen={isAutoScheduleModalOpen}
        setIsAutoScheduleModalOpen={setIsAutoScheduleModalOpen}
        onExecuteSchedule={handleExecuteAutoSchedule}
        isAutoScheduling={isAutoScheduling}
        isUpdateModalOpen={isUpdateModalOpen}
        setIsUpdateModalOpen={setIsUpdateModalOpen}
        updateInfo={updateInfo}
        setUpdateInfo={setUpdateInfo}
        isWelcomeModalOpen={isWelcomeModalOpen}
        setIsWelcomeModalOpen={setIsWelcomeModalOpen}
        onSelectSampleData={handleSelectSampleData}
        onStartBlankProject={handleStartBlankProject}
        isUserGuideModalOpen={isUserGuideModalOpen}
        setIsUserGuideModalOpen={setIsUserGuideModalOpen}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsUserGuideModalOpen(false);
        }}
        isUpdateReady={isUpdateReady}
      />
    </div>
  );
}

export default App;

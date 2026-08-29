// src/App.jsx
// Auto-sync: gradeQuotas -> assignments -> studio
import React, { useState, useMemo, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { TeacherDirectory } from './components/TeacherDirectory';
import { SubjectManager } from './components/SubjectManager';
import { GradeQuotaManager } from './components/GradeQuotaManager';
import { AssignmentManager } from './components/AssignmentManager';
import { TimetableStudio } from './components/TimetableStudio';
import { MasterMatrixView } from './components/MasterMatrixView';
import { RoomTimetableView } from './components/RoomTimetableView';
import { ExcelModal } from './components/ExcelModal';
import { AutoScheduleModal } from './components/AutoScheduleModal';
import { ConflictModal } from './components/ConflictModal';

import { DEFAULT_GRADE_QUOTAS } from './constants/defaultCurriculum';
import { SUBJECTS as INITIAL_SUBJECTS } from './constants/subjects';
import { 
  SAMPLE_CLASSES, 
  SAMPLE_TEACHERS, 
  SAMPLE_ROOMS, 
  generateSampleAssignments, 
  initializeEmptyTimetable 
} from './data/sampleData';
import { QUYNH_LOC_DATA } from './data/quynhLocSchoolData';
import { checkAllConflicts } from './services/conflictDetector';
import { solveTimetable } from './services/autoScheduler';

const DATA_VERSION = '2026_08_29_V34_AUTHENTIC_SHORT_NAMES';

export function App() {
  const currentVersion = typeof window !== 'undefined' ? localStorage.getItem('EDUTIMETABLE_VERSION') : null;
  const isUpToDate = currentVersion === DATA_VERSION;

  // 1. Core State with LocalStorage Persistence
  const [activeTab, setActiveTab] = useState('studio');

  const [schoolInfo, setSchoolInfo] = useState(() => {
    if (!isUpToDate) {
      return {
        name: QUYNH_LOC_DATA.schoolName || 'Trường TH Quỳnh Lộc B',
        year: QUYNH_LOC_DATA.schoolYear || 'Năm học 2026 - 2027'
      };
    }
    const saved = localStorage.getItem('EDUTIMETABLE_SCHOOL_INFO');
    return saved ? JSON.parse(saved) : {
      name: QUYNH_LOC_DATA.schoolName || 'Trường TH Quỳnh Lộc B',
      year: QUYNH_LOC_DATA.schoolYear || 'Năm học 2026 - 2027'
    };
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
    if (!isUpToDate) return [...QUYNH_LOC_DATA.classes];
    const saved = localStorage.getItem('EDUTIMETABLE_CLASSES');
    return saved ? JSON.parse(saved) : [...QUYNH_LOC_DATA.classes];
  });

  const [teachers, setTeachers] = useState(() => {
    if (!isUpToDate) return [...QUYNH_LOC_DATA.teachers];
    const saved = localStorage.getItem('EDUTIMETABLE_TEACHERS');
    return saved ? JSON.parse(saved) : [...QUYNH_LOC_DATA.teachers];
  });

  const [rooms, setRooms] = useState(() => {
    if (!isUpToDate) return [...(QUYNH_LOC_DATA.rooms || SAMPLE_ROOMS)];
    const saved = localStorage.getItem('EDUTIMETABLE_ROOMS');
    return saved ? JSON.parse(saved) : [...(QUYNH_LOC_DATA.rooms || SAMPLE_ROOMS)];
  });
  
  const [assignments, setAssignments] = useState(() => {
    if (!isUpToDate) return [...QUYNH_LOC_DATA.assignments];
    const saved = localStorage.getItem('EDUTIMETABLE_ASSIGNMENTS');
    return saved ? JSON.parse(saved) : [...QUYNH_LOC_DATA.assignments];
  });

  const [timetable, setTimetable] = useState(() => {
    if (!isUpToDate) return JSON.parse(JSON.stringify(QUYNH_LOC_DATA.timetable));
    const saved = localStorage.getItem('EDUTIMETABLE_SCHEDULE');
    return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(QUYNH_LOC_DATA.timetable));
  });

  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [selectedStudioClassId, setSelectedStudioClassId] = useState('1A1');

  // Sync to LocalStorage on changes
  useEffect(() => {
    localStorage.setItem('EDUTIMETABLE_VERSION', DATA_VERSION);
  }, []);
  useEffect(() => {
    localStorage.setItem('EDUTIMETABLE_SCHOOL_INFO', JSON.stringify(schoolInfo));
  }, [schoolInfo]);

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

  // ★ TỰ ĐỘNG LƯU RA FILE ĐĨA: src/data/savedData.json
  // Mỗi khi bạn thay đổi dữ liệu, file JSON này sẽ tự động cập nhật ngay trên ổ đĩa
  useEffect(() => {
    const timer = setTimeout(() => {
      const payload = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        schoolInfo,
        subjects,
        gradeQuotas,
        classes,
        teachers,
        rooms,
        assignments,
        timetable
      };
      fetch('/api/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload, null, 2)
      }).catch(err => console.log('Auto-save to disk failed:', err));
    }, 400);

    return () => clearTimeout(timer);
  }, [schoolInfo, subjects, gradeQuotas, classes, teachers, rooms, assignments, timetable]);

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
  const handleImportSuccess = (importedData) => {
    if (importedData.teachers) setTeachers(importedData.teachers);
    if (importedData.classes) setClasses(importedData.classes);
    if (importedData.rooms) setRooms(importedData.rooms);
    if (importedData.gradeQuotas) setGradeQuotas(importedData.gradeQuotas);
    if (importedData.assignments) setAssignments(importedData.assignments);

    if (importedData.timetable) {
      setTimetable(importedData.timetable);
    } else if (importedData.classes) {
      const empty = initializeEmptyTimetable(importedData.classes);
      setTimetable(empty);
    }
  };

  // 9. Xuất File Sao Lưu Dữ Liệu Toàn Dự Án (.json)
  const handleExportBackupJson = () => {
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      schoolInfo,
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
    if (jsonData.schoolInfo) setSchoolInfo(jsonData.schoolInfo);
    if (jsonData.subjects) setSubjects(jsonData.subjects);
    if (jsonData.gradeQuotas) setGradeQuotas(jsonData.gradeQuotas);
    if (jsonData.classes) setClasses(jsonData.classes);
    if (jsonData.teachers) setTeachers(jsonData.teachers);
    if (jsonData.rooms) setRooms(jsonData.rooms);
    if (jsonData.assignments) setAssignments(jsonData.assignments);
    if (jsonData.timetable) setTimetable(jsonData.timetable);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-bg)', paddingBottom: '60px' }}>
      {/* Global Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAutoSchedule={handleOpenAutoScheduleModal}
        onOpenExcelModal={() => setIsExcelModalOpen(true)}
        onResetSampleData={handleResetSampleData}
        onClearTimetable={handleClearTimetable}
        onExportBackupJson={handleExportBackupJson}
        onImportBackupJson={handleImportBackupJson}
        onOpenConflictModal={() => setIsConflictModalOpen(true)}
        conflicts={conflicts}
        isAutoScheduling={isAutoScheduling}
        schoolInfo={schoolInfo}
      />

      {/* Main Content Area */}
      <main>
        {activeTab === 'studio' && (
          <TimetableStudio
            classes={classes}
            teachers={teachers}
            assignments={assignments}
            timetable={timetable}
            setTimetable={setTimetable}
            conflicts={conflicts}
            subjects={subjects}
            selectedClassId={selectedStudioClassId}
            onSelectClass={setSelectedStudioClassId}
            onOpenConflictModal={() => setIsConflictModalOpen(true)}
          />
        )}

        {activeTab === 'teachers' && (
          <TeacherDirectory
            teachers={teachers}
            setTeachers={setTeachers}
            assignments={assignments}
            setAssignments={setAssignments}
            classes={classes}
            setClasses={setClasses}
            timetable={timetable}
            subjects={subjects}
            onViewTeacherSchedule={(t) => {
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
          />
        )}
      </main>

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
    </div>
  );
}

export default App;

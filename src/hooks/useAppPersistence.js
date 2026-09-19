// src/hooks/useAppPersistence.js
// Quản lý đồng bộ dữ liệu giữa React State, LocalStorage và Cơ sở dữ liệu SQLite

import { useState, useEffect } from 'react';
import { loadAllDataFromDb, saveAllDataToDb } from '../services/dbService';
import { migrateDepartmentsAndTeachers } from '../services/departmentService';
import { checkForAppUpdates } from '../services/updateChecker';

export const DATA_VERSION = '2026_09_06_V35_SEPARATE_SCIENCE_HISTORY';

export function useAppPersistence({
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
  skipAssignmentSyncRef,
  skipQuotaSyncRef
}) {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [isUpdateReady, setIsUpdateReady] = useState(false);

  // 1. Lắng nghe sự kiện cập nhật tự động từ Electron
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      if (window.electronAPI.onDownloadProgress) {
        window.electronAPI.onDownloadProgress((progress) => {
          setDownloadProgress(progress);
        });
      }
      if (window.electronAPI.onUpdateDownloaded) {
        window.electronAPI.onUpdateDownloaded(() => {
          setIsUpdateReady(true);
          setDownloadProgress(null);
        });
      }
    }
  }, []);

  // 2. Kiểm tra cập nhật tự động khi khởi động ứng dụng
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

  // 3. Nạp dữ liệu từ CSDL SQLite khi khởi động
  useEffect(() => {
    let isMounted = true;
    loadAllDataFromDb().then(dbData => {
      if (!isMounted || !dbData) return;
      if (skipAssignmentSyncRef) skipAssignmentSyncRef.current = true;
      if (skipQuotaSyncRef) skipQuotaSyncRef.current = true;

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

  // 4. Đồng bộ dữ liệu sang LocalStorage
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

  useEffect(() => {
    localStorage.setItem('EDUTIMETABLE_GRADE_QUOTAS', JSON.stringify(gradeQuotas));
  }, [gradeQuotas]);

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

  useEffect(() => {
    localStorage.setItem('EDUTIMETABLE_SCHEDULE', JSON.stringify(timetable));
  }, [timetable]);

  // 5. Tự động lưu vào SQLite với debounce 400ms
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

  return {
    updateInfo,
    setUpdateInfo,
    downloadProgress,
    isUpdateReady
  };
}

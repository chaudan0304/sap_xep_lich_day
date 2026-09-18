// src/components/TeacherDirectory.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toPng, toBlob } from 'html-to-image';
import { 
  Users, 
  Search, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Calendar, 
  Clock, 
  CheckCircle, 
  X, 
  Download,
  Printer,
  BookOpen,
  Plus,
  FileText,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Image as ImageIcon,
  Copy,
  CheckCircle2,
  Building2,
  Briefcase
} from 'lucide-react';
import { DAYS_OF_WEEK, PERIODS as DEFAULT_PERIODS } from '../constants/defaultCurriculum';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects';
import { exportTeacherDirectory } from '../services/excelService';
import { TeacherTimetablePrintModal } from './TeacherTimetablePrintModal';
import { TeacherFormModal } from './TeacherFormModal';
import { 
  DEFAULT_DEPARTMENTS,
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  validateDepartmentName,
  isOfficeDepartment as isOfficeDeptService,
  countTeachersInDepartment,
  findDepartmentByName
} from '../services/departmentService';

/**
 * Kiểm tra xem một Tổ có phải là Tổ Văn Phòng / Hành chính hay không
 */
export const isOfficeDepartment = (dept) => {
  return isOfficeDeptService(dept);
};


const getTeacherRoleBadge = (teacher) => {
  if (!teacher) return { label: 'Giáo Viên', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };

  // 0. ƯU TIÊN ĐẶC BIỆT: Tổ Văn Phòng
  if (isOfficeDepartment(teacher.department)) {
    const pos = (teacher.position || '').trim();
    const task = (teacher.task || '').trim();
    const label = pos || (task ? task.split(';')[0] : 'Tổ Văn Phòng');
    return {
      label: label.length > 28 ? 'Tổ Văn Phòng' : label,
      bg: '#f0fdfa',
      color: '#0f766e',
      border: '#99f6e4'
    };
  }

  const position = (teacher.position || '').trim().toLowerCase();
  const task = (teacher.task || '').trim().toLowerCase();

  // 1. ƯU TIÊN 1: Chức vụ Quản lý & Ban Giám Hiệu được khai báo trực tiếp
  if (position.includes('phó hiệu trưởng') || position.includes('phó ht') || position.includes('pht') || position === 'p.hiệu trưởng') {
    return { label: 'Phó Hiệu Trưởng', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
  }

  if (position.includes('hiệu trưởng') || position === 'ht') {
    return { label: 'Hiệu Trưởng', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
  }

  if (position.includes('tổng phụ trách') || position.includes('tpt')) {
    return { label: 'Tổng Phụ Trách Đội', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
  }

  if (position.includes('tổ trưởng')) {
    return { label: 'Tổ Trưởng Chuyên Môn', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
  }

  if (position.includes('tổ phó')) {
    return { label: 'Tổ Phó Chuyên Môn', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
  }

  // 2. ƯU TIÊN 2: Giáo viên Chủ Nhiệm
  if (teacher.isHomeroom && teacher.homeroomClassId) {
    return {
      label: `GVCN: ${teacher.homeroomClassId}`,
      bg: '#fee2e2',
      color: '#b91c1c',
      border: '#fca5a5'
    };
  }

  // 3. ƯU TIÊN 3: Nhận diện qua Nhiệm vụ phân công (task) nếu position không có
  if (task.includes('phó hiệu trưởng')) {
    return { label: 'Phó Hiệu Trưởng', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
  }

  if (task.includes('phụ trách chung') || task.includes('hiệu trưởng')) {
    return { label: 'Hiệu Trưởng', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
  }

  if (task.includes('tổng phụ trách') || task.includes('tpt')) {
    return { label: 'Tổng Phụ Trách Đội', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
  }

  if (task.includes('kế toán')) {
    return { label: 'Kế toán', bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' };
  }

  if (task.includes('văn thư') || task.includes('thủ quỹ')) {
    return { label: 'Văn thư - Thủ quỹ', bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };
  }

  if (task.includes('y tế') || task.includes('thư viện')) {
    return { label: 'Y tế - Thư viện', bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' };
  }

  if (task.includes('bảo vệ')) {
    return { label: 'Bảo vệ', bg: '#f8fafc', color: '#334155', border: '#cbd5e1' };
  }

  if (task.includes('nghỉ sinh') || task.includes('thai sản')) {
    return { label: 'Nghỉ sinh', bg: '#fdf2f8', color: '#be185d', border: '#fbcfe8' };
  }

  // 4. Nếu có chức vụ riêng tùy biến khác
  if (teacher.position && !['giáo viên', 'gv', 'gv bộ môn', 'bộ môn'].includes(position)) {
    return {
      label: teacher.position,
      bg: '#f3e8ff',
      color: '#6b21a8',
      border: '#e9d5ff'
    };
  }

  return {
    label: 'GV Bộ Môn',
    bg: '#f3e8ff',
    color: '#6b21a8',
    border: '#e9d5ff'
  };
};

export const TeacherDirectory = ({
  teachers,
  setTeachers,
  departments = [],
  setDepartments = () => {},
  assignments,
  setAssignments,
  classes,
  setClasses,
  timetable,
  subjects = DEFAULT_SUBJECTS,
  periods = DEFAULT_PERIODS,
  schoolInfo = {}
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL'); // ALL, HOMEROOM, SUBJECT, DEPT:...

  // Danh mục Tổ Chuyên Môn / Văn Phòng động từ data source
  const activeDepartments = useMemo(() => {
    return getDepartments(departments && departments.length > 0 ? departments : DEFAULT_DEPARTMENTS);
  }, [departments]);

  // Danh sách tên các tổ để tương thích các render loop
  const allExistingDepartments = useMemo(() => {
    return activeDepartments.map(d => d.name);
  }, [activeDepartments]);

  // Xử lý khi thay đổi hoặc chọn Tổ Chuyên Môn
  const handleDepartmentChange = (val, explicitDeptId = null) => {
    const cleanName = (val || '').trim();
    let targetDept = null;
    if (explicitDeptId) {
      targetDept = getDepartmentById(activeDepartments, explicitDeptId);
    }
    if (!targetDept && cleanName) {
      targetDept = findDepartmentByName(activeDepartments, cleanName);
    }

    const isOffice = targetDept ? (targetDept.isOffice || isOfficeDepartment(targetDept.name)) : isOfficeDepartment(cleanName);
    const deptId = targetDept ? targetDept.id : (editingTeacher?.departmentId || '');

    if (isOffice) {
      setEditingTeacher(prev => ({
        ...prev,
        departmentId: deptId,
        department: targetDept ? targetDept.name : cleanName,
        dinhMuc: 0,
        weeklyQuota: 0,
        isHomeroom: false,
        homeroomClassId: '',
        subjectAssignments: [],
        offSessions: []
      }));
    } else {
      setEditingTeacher(prev => ({
        ...prev,
        departmentId: deptId,
        department: targetDept ? targetDept.name : cleanName,
        dinhMuc: (prev.dinhMuc === 0 || prev.dinhMuc === undefined) ? 23 : prev.dinhMuc,
        weeklyQuota: (prev.weeklyQuota === 0 || prev.weeklyQuota === undefined) ? 23 : prev.weeklyQuota
      }));
    }
  };

  // State Quản lý Danh mục Tổ chuyên môn (CRUD Modal)
  const [isDeptManagerOpen, setIsDeptManagerOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDeptIsOffice, setNewDeptIsOffice] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [editingDeptName, setEditingDeptName] = useState('');
  const [editingDeptDesc, setEditingDeptDesc] = useState('');
  const [editingDeptIsOffice, setEditingDeptIsOffice] = useState(false);

  // Thêm tổ mới qua dialog quản lý tổ
  const handleCreateDept = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const res = createDepartment(activeDepartments, {
      name: newDeptName,
      description: newDeptDesc,
      isOffice: newDeptIsOffice
    });
    if (!res.success) {
      alert('⚠️ ' + res.message);
      return;
    }
    setDepartments(res.departments);
    setNewDeptName('');
    setNewDeptDesc('');
    setNewDeptIsOffice(false);
    alert(`✅ Đã thêm tổ "${res.department.name}" vào danh mục thành công!`);
  };

  // Bắt đầu sửa tổ
  const handleStartEditDept = (dept) => {
    setEditingDeptId(dept.id);
    setEditingDeptName(dept.name);
    setEditingDeptDesc(dept.description || '');
    setEditingDeptIsOffice(Boolean(dept.isOffice));
  };

  // Lưu sửa tổ (đổi tên tổ -> tự động cập nhật tên tổ trong danh sách giáo viên)
  const handleSaveEditDept = (deptId) => {
    const res = updateDepartment(activeDepartments, deptId, {
      name: editingDeptName,
      description: editingDeptDesc,
      isOffice: editingDeptIsOffice
    }, teachers);
    if (!res.success) {
      alert('⚠️ ' + res.message);
      return;
    }
    setDepartments(res.departments);
    if (res.teachersModified && res.updatedTeachers) {
      setTeachers(res.updatedTeachers);
    }
    setEditingDeptId(null);
    alert(`✅ Đã cập nhật tổ "${res.department.name}" thành công!`);
  };

  // Xóa tổ (chặn xóa nếu đang có giáo viên thuộc tổ)
  const handleDeleteDept = (dept) => {
    const count = countTeachersInDepartment(dept, teachers);
    if (count > 0) {
      alert(
        `⚠️ KHÔNG THỂ XÓA TỔ "${dept.name}":\n\n` +
        `Hiện đang có ${count} giáo viên / nhân sự thuộc tổ này.\n` +
        `Để đảm bảo toàn vẹn dữ liệu, bạn vui lòng chuyển các giáo viên này sang tổ khác trước khi xóa!`
      );
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa tổ "${dept.name}" khỏi danh mục?\nThao tác này không thể hoàn tác.`)) {
      return;
    }

    const res = deleteDepartment(activeDepartments, dept.id, teachers);
    if (!res.success) {
      alert('⚠️ ' + res.message);
      return;
    }
    setDepartments(res.departments);
    alert(`✅ Đã xóa tổ "${dept.name}" khỏi hệ thống thành công!`);
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);

  // Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrintTeacherId, setSelectedPrintTeacherId] = useState(null);

  // Lock body scroll when modal is open so popup stays dead-center
  useEffect(() => {
    if (isModalOpen || isPrintModalOpen || isDeptManagerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, isPrintModalOpen, isDeptManagerOpen]);


  // Tính toán số tiết phân công & số tiết thực tế đã xếp của từng GV
  const teacherStats = useMemo(() => {
    const stats = {};

    teachers.forEach(t => {
      // Phân công
      const assigned = assignments
        .filter(a => a.teacherId === t.id)
        .reduce((sum, a) => sum + (Number(a.weeklyPeriods) || 0), 0);

      // Đã xếp trên TKB
      let scheduled = 0;
      classes.forEach(cls => {
        for (let d = 2; d <= 6; d++) {
          for (let p = 1; p <= 7; p++) {
            const slot = timetable[cls.id]?.[d]?.[p];
            if (slot && slot.teacherId === t.id) {
              scheduled++;
            }
          }
        }
      });

      stats[t.id] = { assigned: assigned || t.assignedPeriods || 0, scheduled };
    });

    return stats;
  }, [teachers, assignments, classes, timetable]);

  // Lọc danh sách giáo viên
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchSearch = 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.phone?.includes(searchQuery);

      let matchRole = true;
      if (selectedRole.startsWith('DEPT:')) {
        const targetVal = selectedRole.substring(5);
        const targetDept = getDepartmentById(activeDepartments, targetVal) || findDepartmentByName(activeDepartments, targetVal);
        if (targetDept) {
          matchRole = t.departmentId === targetDept.id || (t.department || '').trim().toLowerCase() === targetDept.name.trim().toLowerCase();
        } else {
          matchRole = (t.department || '').trim() === targetVal;
        }
      } else if (selectedRole === 'TO_123') {
        matchRole = (t.department || '').trim() === 'Tổ 1, 2, 3';
      } else if (selectedRole === 'TO_45') {
        matchRole = (t.department || '').trim() === 'Tổ 4, 5';
      } else if (selectedRole === 'SUBJECT_GROUP') {
        matchRole = (t.department || '').trim() === 'Giáo viên bộ môn';
      } else if (selectedRole === 'TO_OFFICE') {
        matchRole = isOfficeDepartment(t.department);
      } else if (selectedRole === 'HOMEROOM') {
        matchRole = t.isHomeroom && !isOfficeDepartment(t.department);
      } else if (selectedRole === 'SUBJECT') {
        const badge = getTeacherRoleBadge(t);
        matchRole = (badge.label === 'GV Bộ Môn' || badge.label === 'Tổng Phụ Trách Đội') && !isOfficeDepartment(t.department);
      } else if (selectedRole === 'ADMIN') {
        const badge = getTeacherRoleBadge(t);
        matchRole = ['Hiệu Trưởng', 'Phó Hiệu Trưởng'].includes(badge.label);
      } else if (selectedRole === 'STAFF') {
        const badge = getTeacherRoleBadge(t);
        matchRole = isOfficeDepartment(t.department) || ['Kế toán', 'Văn thư - Thủ quỹ', 'Y tế - Thư viện', 'Bảo vệ', 'Nghỉ sinh'].includes(badge.label);
      }

      return matchSearch && matchRole;
    });
  }, [teachers, searchQuery, selectedRole]);


  // Toggle Buổi Nghỉ cho GV đang chỉnh sửa
  const toggleOffSession = (sessionKey) => {
    if (!editingTeacher) return;
    setEditingTeacher(prev => {
      const current = prev.offSessions || [];
      const isOff = current.includes(sessionKey);
      return {
        ...prev,
        offSessions: isOff
          ? current.filter(s => s !== sessionKey)
          : [...current, sessionKey]
      };
    });
  };

  // Mở modal thêm GV / Nhân sự
  const handleAddNew = () => {
    const nextId = `GV_${String(teachers.length + 1).padStart(2, '0')}`;
    const defaultDept = activeDepartments[0] || { id: 'dept_bo_mon', name: 'Giáo viên bộ môn' };
    setEditingTeacher({
      id: nextId,
      name: '',
      code: '',
      departmentId: defaultDept.id,
      department: defaultDept.name,
      position: '',
      task: '',
      isHomeroom: false,
      homeroomClassId: '',
      phone: '',
      email: '',
      note: '',
      dinhMuc: 23,
      weeklyQuota: 23,
      offSessions: [],
      subjectAssignments: [
        { subjectId: 'TIN_HOC', classIds: [] }
      ],
      color: '#3b82f6'
    });
    setIsModalOpen(true);
  };

  // Mở modal sửa GV
  const handleEdit = (teacher) => {
    const specialistSubjects = ['TIENG_ANH', 'TIN_HOC', 'THE_DUC', 'AM_NHAC', 'MY_THUAT', 'DAO_DUC'];
    const teacherAsgs = (assignments || []).filter(a => a.teacherId === teacher.id);
    
    // 1. Gom các lớp thực tế từ assignments
    const liveSubjectMap = {};
    teacherAsgs.forEach(a => {
      if (teacher.isHomeroom && a.classId === teacher.homeroomClassId && !specialistSubjects.includes(a.subjectId)) {
        return;
      }
      if (!liveSubjectMap[a.subjectId]) {
        liveSubjectMap[a.subjectId] = [];
      }
      if (!liveSubjectMap[a.subjectId].includes(a.classId)) {
        liveSubjectMap[a.subjectId].push(a.classId);
      }
    });

    // 2. Gom các môn từ teacher.subjectAssignments đã lưu trên hồ sơ
    const savedConfigs = Array.isArray(teacher.subjectAssignments) ? teacher.subjectAssignments : [];
    const mergedMap = new Map();

    // Nạp các môn đã lưu: Ưu tiên danh sách lớp đã lưu trên hồ sơ giáo viên
    savedConfigs.forEach(cfg => {
      if (!cfg.subjectId) return;
      const classesForSub = (cfg.classIds !== undefined && cfg.classIds !== null)
        ? cfg.classIds
        : (liveSubjectMap[cfg.subjectId] || []);
      mergedMap.set(cfg.subjectId, classesForSub);
    });

    // Nạp thêm các môn đang có trong assignments nhưng chưa có trong savedConfigs
    Object.entries(liveSubjectMap).forEach(([sId, cIds]) => {
      if (!mergedMap.has(sId)) {
        mergedMap.set(sId, cIds);
      }
    });

    let subjectAssignments = Array.from(mergedMap.entries()).map(([sId, cIds]) => ({
      subjectId: sId,
      classIds: cIds
    }));

    const matchingDept = teacher.departmentId
      ? getDepartmentById(activeDepartments, teacher.departmentId)
      : findDepartmentByName(activeDepartments, teacher.department);

    setEditingTeacher({
      ...teacher,
      departmentId: matchingDept ? matchingDept.id : (activeDepartments[0]?.id || 'dept_bo_mon'),
      department: matchingDept ? matchingDept.name : (teacher.department || 'Giáo viên bộ môn'),
      note: teacher.note || '',
      offSessions: [...(teacher.offSessions || [])],
      subjectAssignments: subjectAssignments
    });
    setIsModalOpen(true);
  };

  // Xóa GV
  const handleDelete = (teacherId) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa giáo viên [${teacherId}] khỏi danh sách?`)) {
      setTeachers(prev => prev.filter(t => t.id !== teacherId));
    }
  };

  // Lưu thông tin GV
  const handleSaveTeacher = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingTeacher || !editingTeacher.name?.trim()) {
      alert('Vui lòng nhập họ và tên giáo viên / nhân viên!');
      return;
    }

    const deptTrimmed = (editingTeacher.department || '').trim();
    let targetDept = null;
    if (editingTeacher.departmentId) {
      targetDept = getDepartmentById(activeDepartments, editingTeacher.departmentId);
    }
    if (!targetDept && deptTrimmed) {
      targetDept = findDepartmentByName(activeDepartments, deptTrimmed);
    }

    // Tự động tạo tổ mới nếu người dùng gõ tên tổ chưa từng có trong danh mục
    if (!targetDept && deptTrimmed) {
      const createRes = createDepartment(activeDepartments, { name: deptTrimmed });
      if (createRes.success) {
        targetDept = createRes.department;
        setDepartments(createRes.departments);
      }
    }

    const finalDeptId = targetDept ? targetDept.id : 'dept_bo_mon';
    const finalDeptName = targetDept ? targetDept.name : (deptTrimmed || 'Giáo viên bộ môn');
    const isOffice = targetDept ? (targetDept.isOffice || isOfficeDepartment(targetDept.name)) : isOfficeDepartment(deptTrimmed);
    const isHomeroom = !isOffice && !!editingTeacher.isHomeroom;
    const homeroomClassId = isHomeroom ? editingTeacher.homeroomClassId : null;
    const subjectAssignments = isOffice ? [] : (editingTeacher.subjectAssignments || []);
    const dinhMuc = isOffice ? 0 : (editingTeacher.dinhMuc !== undefined ? Number(editingTeacher.dinhMuc) : (editingTeacher.weeklyQuota !== undefined ? Number(editingTeacher.weeklyQuota) : 23));
    const weeklyQuota = dinhMuc;
    const offSessions = isOffice ? [] : (editingTeacher.offSessions || []);

    const teacherToSave = {
      ...editingTeacher,
      departmentId: finalDeptId,
      department: finalDeptName,
      isHomeroom,
      homeroomClassId,
      subjectAssignments,
      dinhMuc,
      weeklyQuota,
      offSessions
    };

    // Gom tất cả các classId được chọn theo từng subjectId (hỗ trợ không giới hạn số môn)
    const subjectMap = {};
    subjectAssignments.forEach(cfg => {
      if (!cfg.subjectId) return;
      if (!subjectMap[cfg.subjectId]) {
        subjectMap[cfg.subjectId] = new Set();
      }
      (cfg.classIds || []).forEach(cid => subjectMap[cfg.subjectId].add(cid));
    });

    setTeachers(prev => {
      // Nếu chọn làm GVCN lớp X, hủy vai trò GVCN của các GV khác trên lớp X đó
      let updated = prev.map(t => {
        if (homeroomClassId && t.id !== teacherToSave.id && t.homeroomClassId === homeroomClassId) {
          t = { ...t, isHomeroom: false, homeroomClassId: null };
        }

        // RÀNG BUỘC: 1 môn của 1 lớp chỉ cho 1 người dạy!
        // Nếu GV khác đang có lớp mà editingTeacher vừa chọn cho cùng môn -> Tự động loại bỏ lớp đó khỏi GV khác
        if (!isOffice && t.id !== teacherToSave.id && Array.isArray(t.subjectAssignments)) {
          let hasOverlap = false;
          const cleanedConfigs = t.subjectAssignments.map(cfg => {
            const myClaimedClasses = subjectMap[cfg.subjectId];
            if (myClaimedClasses && Array.isArray(cfg.classIds)) {
              const filtered = cfg.classIds.filter(cid => !myClaimedClasses.has(cid));
              if (filtered.length !== cfg.classIds.length) {
                hasOverlap = true;
                return { ...cfg, classIds: filtered };
              }
            }
            return cfg;
          });
          if (hasOverlap) {
            t = { ...t, subjectAssignments: cleanedConfigs };
          }
        }

        return t;
      });

      const exists = updated.some(t => t.id === teacherToSave.id);
      if (exists) {
        return updated.map(t => t.id === teacherToSave.id ? teacherToSave : t);
      } else {
        return [...updated, teacherToSave];
      }
    });

    // Cập nhật GVCN trong danh sách classes
    if (setClasses) {
      if (homeroomClassId) {
        setClasses(prev => prev.map(c => 
          c.id === homeroomClassId ? { ...c, homeroomTeacherId: teacherToSave.id } : c
        ));
      } else {
        // Nếu không làm chủ nhiệm hoặc là Tổ Văn Phòng, gỡ giáo viên này khỏi bất kỳ lớp nào từng gán
        setClasses(prev => prev.map(c => 
          c.homeroomTeacherId === teacherToSave.id ? { ...c, homeroomTeacherId: null } : c
        ));
      }
    }

    // Đồng bộ danh sách các môn và lớp phụ trách vào assignments
    if (setAssignments) {
      if (isOffice) {
        // Tổ Văn Phòng: Gỡ bỏ toàn bộ phân công đứng lớp của nhân viên văn phòng
        setAssignments(prev => prev.map(a => a.teacherId === teacherToSave.id ? { ...a, teacherId: '' } : a));
      } else {
        const specialistSubjects = ['TIENG_ANH', 'TIN_HOC', 'THE_DUC', 'AM_NHAC', 'MY_THUAT', 'DAO_DUC'];

        setAssignments(prev => {
          let updatedList = prev.map(a => {
            const isHomeroomSubject = homeroomClassId && a.classId === homeroomClassId && !specialistSubjects.includes(a.subjectId);

            // 1. Môn chủ nhiệm của Lớp Chủ Nhiệm -> Luôn phân công cho GVCN
            if (isHomeroomSubject) {
              return { ...a, teacherId: teacherToSave.id };
            }

            // 2. Kiểm tra môn này có trong danh sách phân công của GV này không
            if (subjectMap[a.subjectId]) {
              if (subjectMap[a.subjectId].has(a.classId)) {
                return { ...a, teacherId: teacherToSave.id };
              } else if (a.teacherId === teacherToSave.id) {
                return { ...a, teacherId: '' };
              }
            } else {
              // Môn này không còn trong danh sách môn của GV -> Gỡ bỏ nếu trước đó đang gán
              if (a.teacherId === teacherToSave.id) {
                return { ...a, teacherId: '' };
              }
            }

            return a;
          });

          // 3. Tự động bổ sung các phân công lớp chưa tồn tại trong danh sách assignments
          Object.entries(subjectMap).forEach(([sId, classSet]) => {
            classSet.forEach(cId => {
              const exists = updatedList.some(a => a.subjectId === sId && a.classId === cId);
              if (!exists) {
                const defaultRoom = (subjects && subjects[sId]?.defaultRoom) || 'LOP_HOC';
                updatedList.push({
                  id: `asg_${cId}_${sId}`,
                  classId: cId,
                  subjectId: sId,
                  teacherId: teacherToSave.id,
                  weeklyPeriods: 1,
                  roomType: defaultRoom
                });
              }
            });
          });

          return updatedList;
        });
      }
    }

    setIsModalOpen(false);
    setEditingTeacher(null);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      <div className="no-print">
        {/* 1. Header & Summary Stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={28} color="#4f46e5" />
              <span>Danh Sách & Hồ Sơ Giáo Viên</span>
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
              Quản lý thông tin cán bộ giáo viên, phân loại chuyên môn, định mức tiết và lịch đăng ký nghỉ
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setSelectedPrintTeacherId(null);
                setIsPrintModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <Printer size={16} color="#4f46e5" />
              <span>In Thời Khóa Biểu</span>
            </button>

            <button
              onClick={() => exportTeacherDirectory(teachers, assignments, timetable, classes)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <Download size={16} />
              <span>Xuất Excel Danh Sách GV</span>
            </button>

            <button
              onClick={() => setIsDeptManagerOpen(true)}
              title="Quản lý danh mục Tổ Chuyên Môn và Tổ Văn Phòng động"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#4338ca',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <Building2 size={16} color="#4f46e5" />
              <span>Quản Lý Tổ ({activeDepartments.length})</span>
            </button>


            <button
              onClick={handleAddNew}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontWeight: 700,
                background: '#4f46e5',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)'
              }}
            >
              <UserPlus size={16} />
              <span>Thêm Nhân Sự Mới</span>
            </button>
          </div>
        </div>

      {/* 2. Top Stats Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: '#ffffff',
          padding: '16px 20px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Tổng Số Nhân Sự</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{teachers.length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>thầy cô / CB</span></div>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          padding: '16px 20px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Giáo Viên Chủ Nhiệm</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
              {teachers.filter(t => t.isHomeroom).length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>lớp</span>
            </div>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          padding: '16px 20px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Giáo Viên Bộ Môn</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
              {teachers.filter(t => !t.isHomeroom && !isOfficeDepartment(t.department)).length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>thầy cô</span>
            </div>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          padding: '16px 20px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Tổ Văn Phòng</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
              {teachers.filter(t => isOfficeDepartment(t.department)).length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>nhân sự</span>
            </div>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          padding: '16px 20px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Tổng Tiết Đã Xếp</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
              {Object.values(teacherStats).reduce((sum, s) => sum + s.scheduled, 0)} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>tiết/tuần</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div style={{
        background: '#ffffff',
        padding: '16px 20px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          padding: '8px 14px',
          borderRadius: '10px',
          width: '320px'
        }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Tìm theo tên, mã GV, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '0.875rem'
            }}
          />
          {searchQuery && (
            <X size={14} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Vai trò */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Tổ / Vai trò:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '0.85rem',
                color: '#334155',
                outline: 'none'
              }}
            >
              <option value="ALL">Tất cả nhân sự ({teachers.length})</option>
              <optgroup label="── Danh Sách Tổ Chuyên Môn / Văn Phòng ──">
                {activeDepartments.map(dept => {
                  const count = countTeachersInDepartment(dept, teachers);
                  const isOffice = dept.isOffice || isOfficeDepartment(dept.name);
                  return (
                    <option key={dept.id} value={`DEPT:${dept.id}`}>
                      {isOffice ? '🏢 ' : '👥 '}{dept.name} ({count})
                    </option>
                  );
                })}
              </optgroup>
              <optgroup label="── Phân Loại Vai Trò ──">
                <option value="HOMEROOM">Giáo viên Chủ Nhiệm ({teachers.filter(t => t.isHomeroom && !isOfficeDepartment(t.department)).length})</option>
                <option value="ADMIN">Ban Giám Hiệu</option>
                <option value="STAFF">Tổ Văn Phòng / Nhân viên ({teachers.filter(t => isOfficeDepartment(t.department)).length})</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Teachers Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '14px 18px', width: '60px' }}>STT</th>
                <th style={{ padding: '14px 18px' }}>Giáo Viên</th>
                <th style={{ padding: '14px 18px' }}>Mã / Viết Tắt</th>
                <th style={{ padding: '14px 18px' }}>Vai Trò</th>
                <th style={{ padding: '14px 18px' }}>Lớp Giảng Dạy</th>
                <th style={{ padding: '14px 18px' }}>Định Mức & Tiến Độ</th>
                <th style={{ padding: '14px 18px' }}>Buổi Đăng Ký Nghỉ</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    Không tìm thấy giáo viên nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, index) => {
                  const stat = teacherStats[teacher.id] || { assigned: 0, scheduled: 0 };
                  const isOverloaded = stat.assigned > 25;
                  const isScheduledComplete = stat.assigned > 0 && stat.scheduled >= stat.assigned;

                  return (
                    <tr 
                      key={teacher.id}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 18px', color: '#94a3b8', fontWeight: 600 }}>
                        {index + 1}
                      </td>

                      {/* Name & Avatar */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: teacher.color || '#4f46e5',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            flexShrink: 0
                          }}>
                            {teacher.name.split(' ').pop()?.[0] || 'G'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{teacher.name}</div>
                            {teacher.note ? (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                {teacher.note}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          background: '#f1f5f9',
                          borderRadius: '6px',
                          color: '#334155'
                        }}>
                          {teacher.code || teacher.id}
                        </span>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '14px 18px' }}>
                        {(() => {
                          const badge = getTeacherRoleBadge(teacher);
                          return (
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '999px',
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap'
                            }}>
                              {badge.label}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Lớp Phụ Trách Giảng Dạy */}
                      <td style={{ padding: '14px 18px' }}>
                        {(() => {
                          const specialistSubjects = ['TIENG_ANH', 'TIN_HOC', 'THE_DUC', 'AM_NHAC', 'MY_THUAT', 'DAO_DUC'];
                          const teacherAsgs = (assignments || []).filter(a => a.teacherId === teacher.id);
                          
                          const subMap = {};
                          if (Array.isArray(teacher.subjectAssignments) && teacher.subjectAssignments.length > 0) {
                            teacher.subjectAssignments.forEach(cfg => {
                              if (cfg.subjectId) {
                                subMap[cfg.subjectId] = cfg.classIds || [];
                              }
                            });
                          } else {
                            teacherAsgs.forEach(a => {
                              if (teacher.isHomeroom && a.classId === teacher.homeroomClassId && !specialistSubjects.includes(a.subjectId)) {
                                return;
                              }
                              if (!subMap[a.subjectId]) subMap[a.subjectId] = [];
                              if (!subMap[a.subjectId].includes(a.classId)) {
                                subMap[a.subjectId].push(a.classId);
                              }
                            });
                          }

                          const badge = getTeacherRoleBadge(teacher);
                          const subEntries = Object.entries(subMap);
                          const isOnLeave = badge.label === 'Nghỉ sinh';
                          const isOfficeStaff = isOfficeDepartment(teacher.department);
                          const isStaff = isOfficeStaff || ['Kế toán', 'Văn thư - Thủ quỹ', 'Y tế - Thư viện', 'Bảo vệ'].includes(badge.label);

                          if (isOfficeStaff || isStaff) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '0.78rem', color: '#0f766e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Building2 size={13} /> {teacher.position || (teacher.task ? teacher.task.split(';')[0] : 'Tổ Văn Phòng')}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                  (Công tác hành chính - Không đứng lớp)
                                </span>
                              </div>
                            );
                          }

                          if (!teacher.isHomeroom && subEntries.length === 0) {
                            if (isOnLeave) {
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '0.78rem', color: '#be185d', fontWeight: 600 }}>
                                    Nghỉ chế độ thai sản
                                  </span>
                                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                    (Tạm ngưng công tác)
                                  </span>
                                </div>
                              );
                            }
                            return <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Chưa phân công lớp</span>;
                          }

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '280px' }}>
                              {teacher.isHomeroom && teacher.homeroomClassId && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                  <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', fontSize: '0.72rem', fontWeight: 700 }}>
                                    Lớp CN: {teacher.homeroomClassId}
                                  </span>
                                </div>
                              )}
                              {subEntries.map(([sId, cList]) => {
                                const subObj = subjects[sId] || { name: sId };
                                return (
                                  <div key={sId} style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5' }}>
                                      {subObj.name}:
                                    </span>
                                    {cList.length === 0 ? (
                                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>Chưa chọn lớp</span>
                                    ) : cList.length > 15 ? (
                                      <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#e0e7ff', color: '#3730a3', fontSize: '0.72rem', fontWeight: 700 }}>
                                        Toàn trường ({cList.length} lớp)
                                      </span>
                                    ) : (
                                      cList.map(cId => (
                                        <span key={cId} style={{ padding: '1px 5px', borderRadius: '3px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '0.7rem', fontWeight: 600 }}>
                                          {cId}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Quota Progress */}
                      <td style={{ padding: '14px 18px' }}>
                        {(() => {
                          const badge = getTeacherRoleBadge(teacher);
                          const isOnLeave = badge.label === 'Nghỉ sinh';
                          const isOfficeStaff = isOfficeDepartment(teacher.department);
                          const isStaff = isOfficeStaff || ['Kế toán', 'Văn thư - Thủ quỹ', 'Y tế - Thư viện', 'Bảo vệ'].includes(badge.label);

                          if (isOnLeave) {
                            return (
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: '#fdf2f8',
                                border: '1px solid #fbcfe8',
                                color: '#be185d',
                                fontSize: '0.72rem',
                                fontWeight: 600
                              }}>
                                Miễn định mức (Nghỉ sinh)
                              </span>
                            );
                          }

                          if (isOfficeStaff || (isStaff && stat.scheduled === 0)) {
                            return (
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: '#f0fdfa',
                                border: '1px solid #99f6e4',
                                color: '#0f766e',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Building2 size={12} /> Công tác hành chính (0 tiết)
                              </span>
                            );
                          }

                          return (
                            <div style={{ minWidth: '140px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 700, color: isOverloaded ? '#ef4444' : '#334155' }}>
                                  Đã xếp: {stat.scheduled} / {teacher.dinhMuc !== undefined ? teacher.dinhMuc : (stat.assigned || 23)} tiết
                                </span>
                                <span style={{ color: '#4f46e5', fontWeight: 600 }}>{teacher.dinhMuc !== undefined ? teacher.dinhMuc : 23}T/tuần</span>
                              </div>
                              <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${(teacher.dinhMuc !== undefined ? teacher.dinhMuc : (stat.assigned || 23)) > 0 ? Math.min(100, (stat.scheduled / (teacher.dinhMuc !== undefined ? teacher.dinhMuc : (stat.assigned || 23))) * 100) : (stat.scheduled === 0 ? 100 : 0)}%`,
                                  height: '100%',
                                  background: isScheduledComplete || (teacher.dinhMuc === 0 && stat.scheduled === 0) ? '#10b981' : (isOverloaded ? '#ef4444' : '#6366f1'),
                                  borderRadius: '999px',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Off Sessions */}
                      <td style={{ padding: '14px 18px' }}>
                        {(() => {
                          const badge = getTeacherRoleBadge(teacher);
                          if (badge.label === 'Nghỉ sinh') {
                            return (
                              <span style={{ color: '#be185d', fontSize: '0.75rem', fontWeight: 600, fontStyle: 'italic' }}>
                                Nghỉ toàn thời gian
                              </span>
                            );
                          }
                          if (isOfficeDepartment(teacher.department) || ['Kế toán', 'Văn thư - Thủ quỹ', 'Y tế - Thư viện', 'Bảo vệ'].includes(badge.label)) {
                            return (
                              <span style={{ color: '#0f766e', fontSize: '0.72rem', fontStyle: 'italic', background: '#f0fdfa', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ccfbf1' }}>
                                Theo giờ hành chính
                              </span>
                            );
                          }
                          if (teacher.offSessions && teacher.offSessions.length > 0) {
                            return (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {teacher.offSessions.map(s => {
                                  const [d, sess] = s.split('_');
                                  return (
                                    <span key={s} style={{
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: '#fffbeb',
                                      border: '1px solid #fde68a',
                                      color: '#b45309',
                                      fontSize: '0.7rem',
                                      fontWeight: 600
                                    }}>
                                      {sess === 'morning' ? 'Sáng' : 'Chiều'} T{d}
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          }
                          return <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Dạy cả tuần</span>;
                        })()}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        {(() => {
                          const badge = getTeacherRoleBadge(teacher);
                          const isOnLeave = badge.label === 'Nghỉ sinh';
                          const isOfficeStaff = isOfficeDepartment(teacher.department);
                          const isStaff = isOfficeStaff || ['Kế toán', 'Văn thư - Thủ quỹ', 'Y tế - Thư viện', 'Bảo vệ'].includes(badge.label);
                          const hasSchedule = stat.scheduled > 0;

                          return (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              {!isOnLeave && !isStaff && hasSchedule && (
                                <button
                                  onClick={() => {
                                    setSelectedPrintTeacherId(teacher.id);
                                    setIsPrintModalOpen(true);
                                  }}
                                  title="Xem & Tùy chọn in Thời khóa biểu giáo viên này (A4)"
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    color: '#2563eb',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600
                                  }}
                                >
                                  <Printer size={13} />
                                  <span>In TKB</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleEdit(teacher)}
                                title="Chỉnh sửa hồ sơ giáo viên"
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  color: '#475569',
                                  cursor: 'pointer'
                                }}
                              >
                                <Edit3 size={14} />
                              </button>

                              <button
                                onClick={() => handleDelete(teacher.id)}
                                title="Xóa giáo viên"
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  background: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  color: '#ef4444',
                                  cursor: 'pointer'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. ADD / EDIT TEACHER MODAL (REDESIGNED PHASE 3) */}
      <TeacherFormModal
        isOpen={isModalOpen && Boolean(editingTeacher)}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTeacher(null);
        }}
        editingTeacher={editingTeacher}
        setEditingTeacher={setEditingTeacher}
        onSave={handleSaveTeacher}
        departments={activeDepartments}
        setDepartments={setDepartments}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        assignments={assignments}
        onOpenDeptManager={() => setIsDeptManagerOpen(true)}
        toggleOffSession={toggleOffSession}
        handleDepartmentChange={handleDepartmentChange}
      />

      {/* 5b. MODAL QUẢN LÝ DANH MỤC TỔ CHUYÊN MÔN & VĂN PHÒNG */}
      {isDeptManagerOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDeptManagerOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#e0e7ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Building2 size={22} color="#4338ca" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                    Quản Lý Danh Mục Tổ Chuyên Môn & Văn Phòng
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Thêm mới tổ, đổi tên và kiểm tra số lượng nhân sự trực thuộc
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeptManagerOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Card Thêm Tổ Mới */}
              <form onSubmit={handleCreateDept} style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={16} color="#4f46e5" />
                  <span>Thêm Tổ Chuyên Môn / Văn Phòng Mới</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="Tên tổ mới (VD: Tổ 1, Tổ Tin Học...)"
                    required
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      background: '#4f46e5',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Plus size={14} />
                    <span>Thêm Tổ</span>
                  </button>
                </div>
              </form>

              {/* Bảng Danh Sách Các Tổ */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>
                    Danh Sách Các Tổ Hiện Có ({activeDepartments.length})
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    💡 Khi đổi tên tổ, giáo viên thuộc tổ sẽ tự động được cập nhật. Tổ đang có giáo viên sẽ không cho phép xóa trực tiếp.
                  </span>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '10px 12px', width: '50px', textAlign: 'center' }}>STT</th>
                        <th style={{ padding: '10px 12px' }}>Tên Tổ</th>
                        <th style={{ padding: '10px 12px', width: '140px', textAlign: 'center' }}>Số Nhân Sự</th>
                        <th style={{ padding: '10px 12px', width: '140px', textAlign: 'center' }}>Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDepartments.map((dept, idx) => {
                        const isEditing = editingDeptId === dept.id;
                        const teacherCount = countTeachersInDepartment(dept, teachers);

                        if (isEditing) {
                          return (
                            <tr key={dept.id} style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a' }}>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>{idx + 1}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <input
                                  type="text"
                                  value={editingDeptName}
                                  onChange={(e) => setEditingDeptName(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #d97706',
                                    fontSize: '0.82rem',
                                    fontWeight: 700
                                  }}
                                />
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>
                                {teacherCount}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditDept(dept.id)}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      background: '#059669',
                                      color: '#ffffff',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontSize: '0.72rem',
                                      fontWeight: 700
                                    }}
                                  >
                                    Lưu
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingDeptId(null)}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      background: '#94a3b8',
                                      color: '#ffffff',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontSize: '0.72rem'
                                    }}
                                  >
                                    Hủy
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={dept.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b' }}>
                              <span style={{ marginRight: '8px' }}>👥</span>
                              <span>{dept.name}</span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                background: teacherCount > 0 ? '#e0e7ff' : '#f1f5f9',
                                color: teacherCount > 0 ? '#4338ca' : '#94a3b8'
                              }}>
                                {teacherCount} người
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditDept(dept)}
                                  title="Đổi tên / sửa thông tin tổ"
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    background: '#f8fafc',
                                    border: '1px solid #cbd5e1',
                                    color: '#475569',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '0.72rem',
                                    fontWeight: 600
                                  }}
                                >
                                  <Edit3 size={13} />
                                  <span>Sửa</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDept(dept)}
                                  title={teacherCount > 0 ? `Không thể xóa vì có ${teacherCount} GV đang thuộc tổ` : 'Xóa tổ trống này'}
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    background: teacherCount > 0 ? '#f8fafc' : '#fef2f2',
                                    border: teacherCount > 0 ? '1px solid #e2e8f0' : '1px solid #fca5a5',
                                    color: teacherCount > 0 ? '#94a3b8' : '#ef4444',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '0.72rem',
                                    fontWeight: 600
                                  }}
                                >
                                  <Trash2 size={13} />
                                  <span>Xóa</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Tổng cộng: <strong>{activeDepartments.length}</strong> tổ chuyên môn & văn phòng
              </span>
              <button
                type="button"
                onClick={() => setIsDeptManagerOpen(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  background: '#1e293b',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      </div>

      {/* 6. TEACHER TIMETABLE PRINT MODAL */}
      {isPrintModalOpen && (
        <TeacherTimetablePrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          teachers={teachers}
          departments={activeDepartments}
          classes={classes}
          timetable={timetable}
          subjects={subjects}
          periods={periods}
          schoolInfo={schoolInfo}
          assignments={assignments}
          initialTeacherId={selectedPrintTeacherId}
        />
      )}
    </div>
  );
};

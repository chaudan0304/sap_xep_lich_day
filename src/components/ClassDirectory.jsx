// src/components/ClassDirectory.jsx
// Quản lý Danh Sách Toàn Bộ Các Lớp Học Trong Trường (Thêm, Sửa, Xóa, Tạo Nhanh Hàng Loạt)

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  GraduationCap,
  Plus,
  Search,
  Edit3,
  Trash2,
  Sparkles,
  Calendar,
  CheckCircle2,
  X,
  Building2,
  Printer
} from 'lucide-react';
import { ClassTimetablePrintModal } from './ClassTimetablePrintModal';

export const GRADE_COLORS = {
  1: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', badgeBg: '#dbeafe', dot: '#3b82f6', label: 'Khối 1' },
  2: { bg: '#fdf4ff', border: '#f5d0fe', text: '#a21caf', badgeBg: '#fae8ff', dot: '#d946ef', label: 'Khối 2' },
  3: { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', badgeBg: '#ffedd5', dot: '#f97316', label: 'Khối 3' },
  4: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', badgeBg: '#dcfce7', dot: '#22c55e', label: 'Khối 4' },
  5: { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', badgeBg: '#ede9fe', dot: '#8b5cf6', label: 'Khối 5' }
};

export const ClassDirectory = ({
  classes = [],
  setClasses,
  teachers = [],
  setTeachers,
  assignments: _assignments = [],
  setAssignments,
  timetable = {},
  setTimetable,
  rooms: _rooms = [],
  schoolInfo = {},
  subjects = {},
  periods = [],
  onSelectClassForStudio
}) => {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL'); // 'ALL' | 1 | 2 | 3 | 4 | 5
  const [selectedHomeroomFilter, setSelectedHomeroomFilter] = useState('ALL'); // 'ALL' | 'ASSIGNED' | 'UNASSIGNED'

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null); // null = Add, object = Edit
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrintClassId, setSelectedPrintClassId] = useState(null);

  // Toast Notification
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Lock body scroll when any modal is open
  React.useEffect(() => {
    if (isAddEditModalOpen || isBulkModalOpen || isPrintModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAddEditModalOpen, isBulkModalOpen, isPrintModalOpen]);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    id: '',
    grade: 1,
    homeroomTeacherId: '',
    mainRoom: '',
    studentCount: 35
  });

  // Form State for Bulk Create
  const [bulkGrade, setBulkGrade] = useState(1);
  const [bulkNamingStyle, setBulkNamingStyle] = useState('LETTERS'); // 'LETTERS' (1A, 1B), 'NUMBERS' (1A1, 1A2), 'SLASH' (1/1, 1/2), 'CUSTOM'
  const [bulkCount, setBulkCount] = useState(4);
  const [bulkCustomInput, setBulkCustomInput] = useState('');

  // Teacher Map for quick lookup
  const teacherMap = useMemo(() => {
    const map = new Map();
    teachers.forEach(t => map.set(t.id, t));
    return map;
  }, [teachers]);

  // Statistics
  const stats = useMemo(() => {
    const total = classes.length;
    const gradeCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let assignedHomeroomCount = 0;
    let totalStudents = 0;

    classes.forEach(c => {
      const g = Number(c.grade) || 1;
      if (gradeCounts[g] !== undefined) gradeCounts[g]++;
      if (c.homeroomTeacherId) assignedHomeroomCount++;
      totalStudents += Number(c.studentCount) || 35;
    });

    return { total, gradeCounts, assignedHomeroomCount, totalStudents };
  }, [classes]);

  // Filtered Classes List
  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      // Search
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q || 
        cls.name.toLowerCase().includes(q) || 
        cls.id.toLowerCase().includes(q) ||
        (cls.mainRoom && cls.mainRoom.toLowerCase().includes(q)) ||
        (cls.homeroomTeacherId && teacherMap.get(cls.homeroomTeacherId)?.name.toLowerCase().includes(q));

      // Grade Filter
      const matchGrade = selectedGradeFilter === 'ALL' || Number(cls.grade) === Number(selectedGradeFilter);

      // Homeroom Filter
      const matchHomeroom = selectedHomeroomFilter === 'ALL' ||
        (selectedHomeroomFilter === 'ASSIGNED' && !!cls.homeroomTeacherId) ||
        (selectedHomeroomFilter === 'UNASSIGNED' && !cls.homeroomTeacherId);

      return matchSearch && matchGrade && matchHomeroom;
    }).sort((a, b) => {
      const gradeA = Number(a.grade) || 1;
      const gradeB = Number(b.grade) || 1;
      if (gradeA !== gradeB) return gradeA - gradeB;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }, [classes, searchQuery, selectedGradeFilter, selectedHomeroomFilter, teacherMap]);

  // Calculate scheduled periods for each class
  const classScheduleStats = useMemo(() => {
    const res = {};
    classes.forEach(cls => {
      let count = 0;
      for (let d = 2; d <= 6; d++) {
        for (let p = 1; p <= 7; p++) {
          if (timetable[cls.id]?.[d]?.[p]) count++;
        }
      }
      res[cls.id] = count;
    });
    return res;
  }, [classes, timetable]);

  // ─────────────────────────────────────────────────────────────
  // HANDLERS: ADD / EDIT CLASS
  // ─────────────────────────────────────────────────────────────
  const handleOpenAddModal = () => {
    setEditingClass(null);
    setFormData({
      name: '',
      id: '',
      grade: selectedGradeFilter !== 'ALL' ? Number(selectedGradeFilter) : 1,
      homeroomTeacherId: '',
      mainRoom: '',
      studentCount: 35
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (cls) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name || '',
      id: cls.id || '',
      grade: Number(cls.grade) || 1,
      homeroomTeacherId: cls.homeroomTeacherId || '',
      mainRoom: cls.mainRoom || '',
      studentCount: cls.studentCount || 35
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveClass = (e) => {
    e.preventDefault();
    const rawName = formData.name.trim();
    if (!rawName) {
      alert('Vui lòng nhập tên lớp học!');
      return;
    }

    // Generate/Normalize ID
    let rawId = formData.id.trim();
    if (!rawId) {
      // Tự động tạo ID từ tên lớp (ví dụ: 'Lớp 1A1' -> '1A1', '1A' -> '1A')
      rawId = rawName.replace(/^Lớp\s+/i, '').replace(/\s+/g, '').toUpperCase();
    }

    const cleanGrade = Number(formData.grade) || 1;
    const cleanName = rawName.startsWith('Lớp ') ? rawName : `Lớp ${rawName}`;
    const cleanRoom = formData.mainRoom.trim() || `P.${rawId}`;
    const cleanStudentCount = Number(formData.studentCount) || 35;
    const cleanHomeroomId = formData.homeroomTeacherId || null;

    if (editingClass) {
      // EDIT MODE
      const oldId = editingClass.id;
      const isIdChanged = oldId !== rawId;

      if (isIdChanged && classes.some(c => c.id === rawId)) {
        alert(`Mã lớp "${rawId}" đã tồn tại trên hệ thống! Vui lòng chọn mã khác.`);
        return;
      }

      const updatedClasses = classes.map(c => {
        if (c.id === oldId) {
          return {
            ...c,
            id: rawId,
            name: cleanName,
            grade: cleanGrade,
            homeroomTeacherId: cleanHomeroomId,
            mainRoom: cleanRoom,
            studentCount: cleanStudentCount
          };
        }
        return c;
      });

      // Update Teachers Homeroom linking
      if (setTeachers) {
        setTeachers(prevTeachers => prevTeachers.map(t => {
          if (cleanHomeroomId && t.id === cleanHomeroomId) {
            return { ...t, isHomeroom: true, homeroomClassId: rawId };
          }
          if (t.homeroomClassId === oldId && t.id !== cleanHomeroomId) {
            return { ...t, isHomeroom: false, homeroomClassId: null };
          }
          return t;
        }));
      }

      // If ID changed, migrate assignments & timetable
      if (isIdChanged) {
        if (setAssignments) {
          setAssignments(prev => prev.map(a => a.classId === oldId ? { ...a, classId: rawId } : a));
        }
        if (setTimetable) {
          setTimetable(prev => {
            const next = { ...prev };
            if (next[oldId]) {
              next[rawId] = next[oldId];
              delete next[oldId];
            }
            return next;
          });
        }
      }

      setClasses(updatedClasses);
      showToast(`Đã cập nhật thông tin lớp ${cleanName} thành công!`);
    } else {
      // ADD MODE
      if (classes.some(c => c.id === rawId || c.name.toLowerCase() === cleanName.toLowerCase())) {
        alert(`Lớp "${cleanName}" (Mã: ${rawId}) đã tồn tại trên hệ thống!`);
        return;
      }

      const newClass = {
        id: rawId,
        name: cleanName,
        grade: cleanGrade,
        homeroomTeacherId: cleanHomeroomId,
        mainRoom: cleanRoom,
        studentCount: cleanStudentCount
      };

      setClasses([...classes, newClass]);

      // Initialize empty timetable slot for new class
      if (setTimetable) {
        setTimetable(prev => ({
          ...prev,
          [rawId]: { 2: {}, 3: {}, 4: {}, 5: {}, 6: {} }
        }));
      }

      // Update Teacher if Homeroom is chosen
      if (cleanHomeroomId && setTeachers) {
        setTeachers(prev => prev.map(t => {
          if (t.id === cleanHomeroomId) {
            return { ...t, isHomeroom: true, homeroomClassId: rawId };
          }
          return t;
        }));
      }

      showToast(`Đã thêm lớp mới ${cleanName} thành công!`);
    }

    setIsAddEditModalOpen(false);
  };

  // ─────────────────────────────────────────────────────────────
  // HANDLERS: DELETE CLASS
  // ─────────────────────────────────────────────────────────────
  const handleDeleteClass = (cls) => {
    const confirmMsg = `Bạn có chắc chắn muốn xóa lớp "${cls.name}" (Mã: ${cls.id})?\n\n• Toàn bộ phân công chuyên môn và TKB của lớp này sẽ được dọn dẹp.\n• Thông tin giáo viên chủ nhiệm sẽ được cập nhật.`;
    if (!window.confirm(confirmMsg)) return;

    // 1. Remove from classes
    setClasses(classes.filter(c => c.id !== cls.id));

    // 2. Cleanup assignments
    if (setAssignments) {
      setAssignments(prev => prev.filter(a => a.classId !== cls.id));
    }

    // 3. Cleanup timetable
    if (setTimetable) {
      setTimetable(prev => {
        const next = { ...prev };
        delete next[cls.id];
        return next;
      });
    }

    // 4. Cleanup teacher homeroom link
    if (cls.homeroomTeacherId && setTeachers) {
      setTeachers(prev => prev.map(t => {
        if (t.id === cls.homeroomTeacherId || t.homeroomClassId === cls.id) {
          return { ...t, isHomeroom: false, homeroomClassId: null };
        }
        return t;
      }));
    }

    showToast(`Đã xóa lớp ${cls.name} khỏi hệ thống.`, 'info');
  };

  // ─────────────────────────────────────────────────────────────
  // HANDLERS: BULK CREATE CLASSES
  // ─────────────────────────────────────────────────────────────
  const handleBulkCreate = (e) => {
    e.preventDefault();
    const g = Number(bulkGrade);
    let classNamesToCreate = [];

    if (bulkNamingStyle === 'CUSTOM') {
      const parts = bulkCustomInput.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      if (parts.length === 0) {
        alert('Vui lòng nhập ít nhất 1 tên lớp!');
        return;
      }
      classNamesToCreate = parts;
    } else {
      const count = Math.min(10, Math.max(1, Number(bulkCount) || 4));
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K'];
      
      for (let i = 0; i < count; i++) {
        if (bulkNamingStyle === 'LETTERS') {
          classNamesToCreate.push(`${g}${letters[i] || (i + 1)}`);
        } else if (bulkNamingStyle === 'NUMBERS') {
          classNamesToCreate.push(`${g}A${i + 1}`);
        } else if (bulkNamingStyle === 'SLASH') {
          classNamesToCreate.push(`${g}/${i + 1}`);
        }
      }
    }

    const newClassObjects = [];
    let skippedCount = 0;

    classNamesToCreate.forEach(raw => {
      const cId = raw.replace(/^Lớp\s+/i, '').replace(/\s+/g, '').toUpperCase();
      const cName = raw.startsWith('Lớp ') ? raw : `Lớp ${raw}`;

      if (classes.some(existing => existing.id === cId || existing.name.toLowerCase() === cName.toLowerCase())) {
        skippedCount++;
        return;
      }

      newClassObjects.push({
        id: cId,
        name: cName,
        grade: g,
        homeroomTeacherId: null,
        mainRoom: `P.${cId}`,
        studentCount: 35
      });
    });

    if (newClassObjects.length === 0) {
      alert('Tất cả các lớp trong danh sách đã tồn tại trên hệ thống!');
      return;
    }

    setClasses(prev => [...prev, ...newClassObjects]);

    // Init timetable slots
    if (setTimetable) {
      setTimetable(prev => {
        const next = { ...prev };
        newClassObjects.forEach(c => {
          if (!next[c.id]) {
            next[c.id] = { 2: {}, 3: {}, 4: {}, 5: {}, 6: {} };
          }
        });
        return next;
      });
    }

    setIsBulkModalOpen(false);
    showToast(`Đã tạo thành công ${newClassObjects.length} lớp học cho Khối ${g}!${skippedCount > 0 ? ` (Bỏ qua ${skippedCount} lớp đã trùng)` : ''}`);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 99999,
          background: toast.type === 'info' ? '#1e293b' : '#059669',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 700,
          fontSize: '0.9rem',
          animation: 'slideInRight 0.2s ease-out'
        }}>
          <CheckCircle2 size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. Header & Quick Actions */}
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
            <GraduationCap size={28} color="#4f46e5" />
            <span>Danh Sách Lớp Toàn Trường</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Quản lý cơ cấu lớp học theo từng khối (1 đến 5), giáo viên chủ nhiệm, phòng học và sĩ số học sinh.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setSelectedPrintClassId(null);
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
            <Printer size={16} />
            <span>In TKB Toàn Trường</span>
          </button>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}
          >
            <Sparkles size={16} />
            <span>Tạo Nhanh Hàng Loạt</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}
          >
            <Plus size={18} />
            <span>Thêm Lớp Mới</span>
          </button>
        </div>
      </div>

      {/* 2. Grade Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[1, 2, 3, 4, 5].map(g => {
          const count = stats.gradeCounts[g] || 0;
          const colorCfg = GRADE_COLORS[g];
          const isSelected = selectedGradeFilter === g;

          return (
            <div
              key={g}
              onClick={() => setSelectedGradeFilter(isSelected ? 'ALL' : g)}
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '16px 20px',
                border: isSelected ? `2px solid ${colorCfg.text}` : `1px solid ${colorCfg.border}`,
                boxShadow: isSelected ? '0 8px 20px rgba(0,0,0,0.1)' : 'var(--shadow-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colorCfg.dot }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: colorCfg.text }}>
                    {colorCfg.label}
                  </span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
                  {count} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>lớp</span>
                </div>
              </div>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: colorCfg.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colorCfg.text
              }}>
                <GraduationCap size={22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Search & Filter Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        padding: '16px 20px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Search Box */}
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Tìm theo tên lớp, mã lớp, GVCN, phòng học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Grade Pills Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedGradeFilter('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: selectedGradeFilter === 'ALL' ? '#1e1b4b' : '#f1f5f9',
              color: selectedGradeFilter === 'ALL' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Tất cả ({stats.total})
          </button>
          {[1, 2, 3, 4, 5].map(g => (
            <button
              key={g}
              onClick={() => setSelectedGradeFilter(g)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: selectedGradeFilter === g ? GRADE_COLORS[g].text : GRADE_COLORS[g].bg,
                color: selectedGradeFilter === g ? '#ffffff' : GRADE_COLORS[g].text,
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Khối {g} ({stats.gradeCounts[g] || 0})
            </button>
          ))}
        </div>

        {/* Homeroom Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>GVCN:</span>
          <select
            value={selectedHomeroomFilter}
            onChange={(e) => setSelectedHomeroomFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.8rem',
              color: '#334155',
              outline: 'none',
              background: '#ffffff',
              fontWeight: 600
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ASSIGNED">Đã có GVCN ({stats.assignedHomeroomCount})</option>
            <option value="UNASSIGNED">Chưa có GVCN ({stats.total - stats.assignedHomeroomCount})</option>
          </select>
        </div>
      </div>

      {/* 4. Classes Table */}
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
                <th style={{ padding: '14px 18px', width: '50px' }}>STT</th>
                <th style={{ padding: '14px 18px' }}>Lớp Học</th>
                <th style={{ padding: '14px 18px', width: '100px' }}>Khối</th>
                <th style={{ padding: '14px 18px' }}>Giáo Viên Chủ Nhiệm</th>
                <th style={{ padding: '14px 18px', width: '140px' }}>Phòng Học Chính</th>
                <th style={{ padding: '14px 18px', width: '100px' }}>Sĩ Số</th>
                <th style={{ padding: '14px 18px', width: '160px' }}>Tiến Độ TKB</th>
                <th style={{ padding: '14px 18px', textAlign: 'right', width: '200px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    Không tìm thấy lớp học nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls, index) => {
                  const g = Number(cls.grade) || 1;
                  const colorCfg = GRADE_COLORS[g] || GRADE_COLORS[1];
                  const hrTeacher = teacherMap.get(cls.homeroomTeacherId);
                  const scheduledPeriods = classScheduleStats[cls.id] || 0;
                  const isFullyScheduled = scheduledPeriods >= 30;

                  return (
                    <tr
                      key={cls.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 18px', color: '#94a3b8', fontWeight: 600 }}>
                        {index + 1}
                      </td>

                      {/* Class Name & Code */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: colorCfg.bg,
                            border: `1px solid ${colorCfg.border}`,
                            color: colorCfg.text,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.85rem'
                          }}>
                            {cls.id}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                              {cls.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Mã lớp: <code>{cls.id}</code>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Grade Badge */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: colorCfg.badgeBg,
                          color: colorCfg.text,
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          Khối {g}
                        </span>
                      </td>

                      {/* Homeroom Teacher */}
                      <td style={{ padding: '14px 18px' }}>
                        {hrTeacher ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: hrTeacher.color || '#3b82f6',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem'
                            }}>
                              {hrTeacher.name.split(' ').pop()?.[0] || 'G'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
                                {hrTeacher.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                {hrTeacher.code || hrTeacher.id}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#fef2f2',
                            border: '1px dashed #fca5a5',
                            color: '#dc2626',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            Chưa phân công GVCN
                          </span>
                        )}
                      </td>

                      {/* Main Room */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          color: '#334155',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}>
                          <Building2 size={12} color="#64748b" />
                          <span>{cls.mainRoom || `P.${cls.id}`}</span>
                        </span>
                      </td>

                      {/* Student Count */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                          {cls.studentCount || 35}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '4px' }}>em</span>
                      </td>

                      {/* Scheduled Progress */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, (scheduledPeriods / 32) * 100)}%`,
                              height: '100%',
                              background: isFullyScheduled ? '#10b981' : '#3b82f6',
                              borderRadius: '3px'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isFullyScheduled ? '#059669' : '#334155', minWidth: '40px' }}>
                            {scheduledPeriods}/32
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => {
                              if (onSelectClassForStudio) onSelectClassForStudio(cls.id);
                            }}
                            title="Mở trong Studio Xếp Lịch"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Calendar size={13} />
                            <span>Xếp TKB</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedPrintClassId(cls.id);
                              setIsPrintModalOpen(true);
                            }}
                            title="In Thời Khóa Biểu A4"
                            style={{
                              padding: '6px 8px',
                              borderRadius: '8px',
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              cursor: 'pointer'
                            }}
                          >
                            <Printer size={14} />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(cls)}
                            title="Chỉnh sửa thông tin lớp"
                            style={{
                              padding: '6px 8px',
                              borderRadius: '8px',
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            onClick={() => handleDeleteClass(cls)}
                            title="Xóa lớp học"
                            style={{
                              padding: '6px 8px',
                              borderRadius: '8px',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#dc2626',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. MODAL THÊM / SỬA LỚP HỌC                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isAddEditModalOpen && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div className="animate-scale-up" style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            border: '1px solid #e2e8f0'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e1b4b', margin: 0 }}>
                    {editingClass ? `Chỉnh Sửa Lớp ${editingClass.name}` : 'Thêm Lớp Học Mới'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Thiết lập tên lớp, khối học, giáo viên chủ nhiệm và phòng học.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveClass} style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Tên Lớp */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Tên Lớp Học <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 1A1, 1A, 2B, 3A..."
                    value={formData.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        name: val,
                        id: prev.id ? prev.id : val.replace(/^Lớp\s+/i, '').replace(/\s+/g, '').toUpperCase()
                      }));
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Mã Định Danh & Khối Học (Grid 2 cột) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Mã Lớp (ID)
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 1A1"
                      value={formData.id}
                      onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        outline: 'none',
                        fontFamily: 'var(--font-mono)'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Khối Học <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        outline: 'none',
                        background: '#ffffff',
                        fontWeight: 600
                      }}
                    >
                      {[1, 2, 3, 4, 5].map(g => (
                        <option key={g} value={g}>Khối {g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Giáo Viên Chủ Nhiệm */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Giáo Viên Chủ Nhiệm (GVCN)
                  </label>
                  <select
                    value={formData.homeroomTeacherId || ''}
                    onChange={(e) => setFormData({ ...formData, homeroomTeacherId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                  >
                    <option value="">-- Chưa phân công GVCN --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code || t.id}) - {t.department || 'Giáo viên'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phòng Học Chính & Sĩ Số (Grid 2 cột) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Phòng Học Chính
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: P.101, P.1A1"
                      value={formData.mainRoom}
                      onChange={(e) => setFormData({ ...formData, mainRoom: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Sĩ Số Học Sinh
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={formData.studentCount}
                      onChange={(e) => setFormData({ ...formData, studentCount: Number(e.target.value) || 35 })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  {editingClass ? 'Lưu Thay Đổi' : 'Thêm Lớp Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. MODAL TẠO NHANH HÀNG LOẠT (BULK GENERATE)                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isBulkModalOpen && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div className="animate-scale-up" style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '540px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #fef3c7 0%, #ffffff 100%)',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#78350f', margin: 0 }}>
                    Tạo Nhanh Danh Sách Lớp Học
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#92400e' }}>
                    Tự động khởi tạo hàng loạt lớp học cho khối chỉ trong 1 click.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBulkCreate} style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Chọn Khối */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Chọn Khối Cần Tạo
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                    {[1, 2, 3, 4, 5].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setBulkGrade(g)}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: bulkGrade === g ? `2px solid ${GRADE_COLORS[g].text}` : '1px solid #cbd5e1',
                          background: bulkGrade === g ? GRADE_COLORS[g].bg : '#ffffff',
                          color: bulkGrade === g ? GRADE_COLORS[g].text : '#475569',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        Khối {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kiểu Đặt Tên Lớp */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Kiểu Đặt Tên Lớp
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="namingStyle"
                        checked={bulkNamingStyle === 'LETTERS'}
                        onChange={() => setBulkNamingStyle('LETTERS')}
                      />
                      <span>Chữ cái: <strong>{bulkGrade}A, {bulkGrade}B, {bulkGrade}C, {bulkGrade}D...</strong></span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="namingStyle"
                        checked={bulkNamingStyle === 'NUMBERS'}
                        onChange={() => setBulkNamingStyle('NUMBERS')}
                      />
                      <span>Chữ cái & số: <strong>{bulkGrade}A1, {bulkGrade}A2, {bulkGrade}A3, {bulkGrade}A4...</strong></span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="namingStyle"
                        checked={bulkNamingStyle === 'SLASH'}
                        onChange={() => setBulkNamingStyle('SLASH')}
                      />
                      <span>Dấu gạch: <strong>{bulkGrade}/1, {bulkGrade}/2, {bulkGrade}/3, {bulkGrade}/4...</strong></span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="namingStyle"
                        checked={bulkNamingStyle === 'CUSTOM'}
                        onChange={() => setBulkNamingStyle('CUSTOM')}
                      />
                      <span>Tự nhập danh sách tên lớp tùy chỉnh</span>
                    </label>
                  </div>
                </div>

                {/* Số lượng lớp hoặc Custom Input */}
                {bulkNamingStyle !== 'CUSTOM' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Số Lượng Lớp Khối {bulkGrade} (Từ 1 đến 10 lớp)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={bulkCount}
                      onChange={(e) => setBulkCount(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Nhập danh sách tên lớp (cách nhau bởi dấu phẩy)
                    </label>
                    <textarea
                      rows="3"
                      placeholder={`Ví dụ: ${bulkGrade}A1, ${bulkGrade}A2, ${bulkGrade}A3, ${bulkGrade}A4, ${bulkGrade}A5`}
                      value={bulkCustomInput}
                      onChange={(e) => setBulkCustomInput(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        outline: 'none',
                        resize: 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                  }}
                >
                  Tạo Ngay Danh Sách Lớp
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 7. CLASS TIMETABLE PRINT MODAL */}
      {isPrintModalOpen && (
        <ClassTimetablePrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          classes={classes}
          teachers={teachers}
          timetable={timetable}
          subjects={subjects}
          periods={periods}
          schoolInfo={schoolInfo}
          initialClassId={selectedPrintClassId}
        />
      )}
    </div>
  );
};

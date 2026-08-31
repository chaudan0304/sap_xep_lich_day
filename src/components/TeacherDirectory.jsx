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
  CheckCircle2
} from 'lucide-react';
import { DAYS_OF_WEEK, PERIODS, PERIODS as DEFAULT_PERIODS } from '../constants/defaultCurriculum';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects';
import { exportTeacherDirectory } from '../services/excelService';
import { triggerAppPrint } from '../services/printService';

export const getTeacherRoleBadge = (teacher) => {
  if (!teacher) return { label: 'Giáo Viên', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };

  // 1. Ưu tiên vai trò Giáo viên Chủ Nhiệm
  if (teacher.isHomeroom && teacher.homeroomClassId) {
    return {
      label: `GVCN: ${teacher.homeroomClassId}`,
      bg: '#fee2e2',
      color: '#b91c1c',
      border: '#fca5a5'
    };
  }

  const position = (teacher.position || '').trim().toLowerCase();
  const task = (teacher.task || '').trim().toLowerCase();
  const combined = `${position} ${task}`;

  if (combined.includes('hiệu trưởng') || combined.includes('phụ trách chung')) {
    if (combined.includes('phó') || combined.includes('chuyên môn')) {
      return { label: 'Phó Hiệu Trưởng', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
    }
    return { label: 'Hiệu Trưởng', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
  }

  if (combined.includes('phó hiệu trưởng')) {
    return { label: 'Phó Hiệu Trưởng', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
  }

  if (combined.includes('tổng phụ trách') || combined.includes('tpt')) {
    return { label: 'Tổng Phụ Trách Đội', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
  }

  if (combined.includes('kế toán')) {
    return { label: 'Kế toán', bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' };
  }

  if (combined.includes('văn thư') || combined.includes('thủ quỹ')) {
    return { label: 'Văn thư - Thủ quỹ', bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };
  }

  if (combined.includes('y tế') || combined.includes('thư viện')) {
    return { label: 'Y tế - Thư viện', bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' };
  }

  if (combined.includes('bảo vệ')) {
    return { label: 'Bảo vệ', bg: '#f8fafc', color: '#334155', border: '#cbd5e1' };
  }

  if (combined.includes('nghỉ sinh') || combined.includes('thai sản')) {
    return { label: 'Nghỉ sinh', bg: '#fdf2f8', color: '#be185d', border: '#fbcfe8' };
  }

  if (teacher.position && teacher.position !== 'Giáo Viên' && teacher.position !== 'giáo viên' && teacher.position !== 'GV' && teacher.position !== 'GV Bộ Môn') {
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
  const [selectedRole, setSelectedRole] = useState('ALL'); // ALL, HOMEROOM, SUBJECT

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);

  // Quick Timetable View Modal
  const [previewTeacher, setPreviewTeacher] = useState(null);
  const [teacherPreviewTab, setTeacherPreviewTab] = useState('a4'); // 'a4' | 'grid'
  const [teacherPreviewZoom, setTeacherPreviewZoom] = useState(90);
  const [showTeacherHeader, setShowTeacherHeader] = useState(true);
  const [showTeacherSignatures, setShowTeacherSignatures] = useState(true);
  const [isExportingTeacherImg, setIsExportingTeacherImg] = useState(false);
  const [isCopyingTeacherImg, setIsCopyingTeacherImg] = useState(false);
  const [teacherToast, setTeacherToast] = useState('');

  const teacherSheetRef = useRef(null);

  const showTeacherToast = (msg) => {
    setTeacherToast(msg);
    setTimeout(() => setTeacherToast(''), 3500);
  };

  // Xuất ảnh TKB Giáo viên nét cao gửi Zalo
  const handleExportTeacherZaloImage = async () => {
    if (!teacherSheetRef.current || !previewTeacher) return;
    try {
      setIsExportingTeacherImg(true);
      const dataUrl = await toPng(teacherSheetRef.current, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      const safeName = (previewTeacher.name || 'GiaoVien').replace(/\s+/g, '_');
      link.download = `TKB_GV_${safeName}_Zalo.png`;
      link.href = dataUrl;
      link.click();
      showTeacherToast(`Đã tải ảnh TKB Thầy/Cô ${previewTeacher.name} nét cao cho Zalo!`);
    } catch (err) {
      console.error('Lỗi xuất ảnh GV:', err);
      alert('Không thể tạo file ảnh. Vui lòng thử lại!');
    } finally {
      setIsExportingTeacherImg(false);
    }
  };

  // Sao chép ảnh TKB Giáo viên vào Clipboard để dán ngay Ctrl+V vào Zalo
  const handleCopyTeacherZaloImage = async () => {
    if (!teacherSheetRef.current || !previewTeacher) return;
    try {
      setIsCopyingTeacherImg(true);
      const blob = await toBlob(teacherSheetRef.current, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff'
      });
      if (!blob) throw new Error('Không thể tạo blob ảnh');

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showTeacherToast(`Đã sao chép ảnh TKB ${previewTeacher.name}! Nhấn Ctrl+V để dán vào Zalo.`);
      } else {
        handleExportTeacherZaloImage();
      }
    } catch (err) {
      console.error('Lỗi copy ảnh clipboard:', err);
      handleExportTeacherZaloImage();
    } finally {
      setIsCopyingTeacherImg(false);
    }
  };

  // Lock body scroll when modal is open so popup stays dead-center
  useEffect(() => {
    if (isModalOpen || previewTeacher) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, previewTeacher]);


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
      if (selectedRole === 'HOMEROOM') {
        matchRole = t.isHomeroom;
      } else if (selectedRole === 'SUBJECT') {
        const badge = getTeacherRoleBadge(t);
        matchRole = badge.label === 'GV Bộ Môn' || badge.label === 'Tổng Phụ Trách Đội';
      } else if (selectedRole === 'ADMIN') {
        const badge = getTeacherRoleBadge(t);
        matchRole = ['Hiệu Trưởng', 'Phó Hiệu Trưởng'].includes(badge.label);
      } else if (selectedRole === 'STAFF') {
        const badge = getTeacherRoleBadge(t);
        matchRole = ['Kế toán', 'Văn thư - Thủ quỹ', 'Y tế - Thư viện', 'Bảo vệ', 'Nghỉ sinh'].includes(badge.label);
      }

      return matchSearch && matchRole;
    });
  }, [teachers, searchQuery, selectedRole]);

  // Mở modal thêm GV
  const handleAddNew = () => {
    const nextId = `GV_${String(teachers.length + 1).padStart(2, '0')}`;
    setEditingTeacher({
      id: nextId,
      name: '',
      code: '',
      department: 'Giáo viên',
      isHomeroom: false,
      homeroomClassId: '',
      phone: '',
      email: '',
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

    setEditingTeacher({
      ...teacher,
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
      alert('Vui lòng nhập họ và tên giáo viên!');
      return;
    }

    const isHomeroom = !!editingTeacher.isHomeroom;
    const homeroomClassId = isHomeroom ? editingTeacher.homeroomClassId : null;
    const subjectAssignments = editingTeacher.subjectAssignments || [];

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
        if (homeroomClassId && t.id !== editingTeacher.id && t.homeroomClassId === homeroomClassId) {
          t = { ...t, isHomeroom: false, homeroomClassId: null };
        }

        // RÀNG BUỘC: 1 môn của 1 lớp chỉ cho 1 người dạy!
        // Nếu GV khác đang có lớp mà editingTeacher vừa chọn cho cùng môn -> Tự động loại bỏ lớp đó khỏi GV khác
        if (t.id !== editingTeacher.id && Array.isArray(t.subjectAssignments)) {
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

      const exists = updated.some(t => t.id === editingTeacher.id);
      if (exists) {
        return updated.map(t => t.id === editingTeacher.id ? editingTeacher : t);
      } else {
        return [...updated, editingTeacher];
      }
    });

    // Cập nhật GVCN trong danh sách classes
    if (setClasses && homeroomClassId) {
      setClasses(prev => prev.map(c => 
        c.id === homeroomClassId ? { ...c, homeroomTeacherId: editingTeacher.id } : c
      ));
    }

    // Đồng bộ danh sách các môn và lớp phụ trách vào assignments
    if (setAssignments) {
      const specialistSubjects = ['TIENG_ANH', 'TIN_HOC', 'THE_DUC', 'AM_NHAC', 'MY_THUAT', 'DAO_DUC'];

      setAssignments(prev => {
        let updatedList = prev.map(a => {
          const isHomeroomSubject = homeroomClassId && a.classId === homeroomClassId && !specialistSubjects.includes(a.subjectId);

          // 1. Môn chủ nhiệm của Lớp Chủ Nhiệm -> Luôn phân công cho GVCN
          if (isHomeroomSubject) {
            return { ...a, teacherId: editingTeacher.id };
          }

          // 2. Kiểm tra môn này có trong danh sách phân công của GV này không
          if (subjectMap[a.subjectId]) {
            if (subjectMap[a.subjectId].has(a.classId)) {
              return { ...a, teacherId: editingTeacher.id };
            } else if (a.teacherId === editingTeacher.id) {
              return { ...a, teacherId: '' };
            }
          } else {
            // Môn này không còn trong danh sách môn của GV -> Gỡ bỏ nếu trước đó đang gán
            if (a.teacherId === editingTeacher.id) {
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
                teacherId: editingTeacher.id,
                weeklyPeriods: 1,
                roomType: defaultRoom
              });
            }
          });
        });

        return updatedList;
      });
    }

    setIsModalOpen(false);
    setEditingTeacher(null);
  };

  // Helper to render an individual A4 Printable Teacher Schedule Sheet
  const renderTeacherSheet = (t, isPreview = false) => {
    if (!t) return null;
    return (
      <div
        className={isPreview ? 'preview-sheet' : 'printable-sheet page-break'}
        style={{
          width: '100%',
          maxWidth: isPreview ? '100%' : '210mm',
          margin: '0 auto',
          background: '#ffffff',
          color: '#000000',
          fontFamily: '"Times New Roman", Times, serif',
          padding: isPreview ? '24px 28px' : '0',
          boxSizing: 'border-box'
        }}
      >
        {/* National / School Header */}
        {showTeacherHeader && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '1.5px solid #000',
            paddingBottom: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ fontSize: '9.5pt', textTransform: 'uppercase', fontWeight: 700 }}>
                {schoolInfo.district || 'UBND PHƯỜNG TÂN MAI'}
              </div>
              <div style={{ fontSize: '10.5pt', textTransform: 'uppercase', fontWeight: 800 }}>
                {(schoolInfo.name || 'TRƯỜNG TIỂU HỌC QUỲNH LỘC B').toUpperCase()}
              </div>
            </div>
            <div style={{ textAlign: 'center', width: '50%' }}>
              <div style={{ fontSize: '9.5pt', fontWeight: 800 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div style={{ fontSize: '9pt', fontStyle: 'italic', textDecoration: 'underline', marginTop: '2px' }}>
                Độc lập - Tự do - Hạnh phúc
              </div>
            </div>
          </div>
        )}

        {/* Timetable Title */}
        {(() => {
          const taughtClassNames = (() => {
            const nameSet = new Set();
            if (t.isHomeroom && t.homeroomClassId) {
              const c = classes.find(item => item.id === t.homeroomClassId || item.name === t.homeroomClassId);
              nameSet.add(c ? c.name : t.homeroomClassId);
            }
            (assignments || []).forEach(a => {
              if (a.teacherId === t.id && a.classId) {
                const c = classes.find(item => item.id === a.classId || item.name === a.classId);
                nameSet.add(c ? c.name : a.classId);
              }
            });
            if (Array.isArray(t.subjectAssignments)) {
              t.subjectAssignments.forEach(cfg => {
                (cfg.classIds || []).forEach(cid => {
                  const c = classes.find(item => item.id === cid || item.name === cid);
                  nameSet.add(c ? c.name : cid);
                });
              });
            }
            classes.forEach(cls => {
              for (let dayId = 2; dayId <= 6; dayId++) {
                for (let pId = 1; pId <= 7; pId++) {
                  if (timetable[cls.id]?.[dayId]?.[pId]?.teacherId === t.id) {
                    nameSet.add(cls.name);
                  }
                }
              }
            });
            return Array.from(nameSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
          })();

          return (
            <div style={{ textAlign: 'center', margin: '8px 0 10px 0' }}>
              <h1 style={{ fontSize: '15pt', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                LỊCH GIẢNG DẠY CÁ NHÂN
              </h1>
              <div style={{ fontSize: '12pt', fontWeight: 800, marginTop: '3px', color: '#000' }}>
                Giáo viên: {t.name} ({t.code || t.id})
              </div>
              <div style={{ fontSize: '9pt', fontStyle: 'italic', marginTop: '2px' }}>
                Chức vụ / Nhiệm vụ: {t.position || t.task || 'Giáo viên'} • {schoolInfo.year || 'Năm học 2026 - 2027'}
              </div>
              {taughtClassNames.length > 0 && (
                <div style={{
                  fontSize: '8.5pt',
                  fontWeight: 700,
                  marginTop: '4px',
                  color: '#000'
                }}>
                  Danh sách các lớp giảng dạy ({taughtClassNames.length} lớp):{' '}
                  <span style={{ fontWeight: 800 }}>
                    {taughtClassNames.join(', ')}
                  </span>
                  {t.isHomeroom && t.homeroomClassId && (
                    <span style={{ fontStyle: 'italic', marginLeft: '6px' }}>
                      (Chủ nhiệm lớp: {classes.find(c => c.id === t.homeroomClassId)?.name || t.homeroomClassId})
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Official Printable Table */}
        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', border: '1.5px solid #000', textAlign: 'center', fontSize: '8.5pt' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #000' }}>
              <th style={{ border: '1px solid #000', width: '52px', padding: '5px 2px', fontWeight: 800 }}>Buổi</th>
              <th style={{ border: '1px solid #000', width: '32px', padding: '5px 2px', fontWeight: 800 }}>Tiết</th>
              <th style={{ border: '1px solid #000', width: '68px', padding: '5px 2px', fontWeight: 800 }}>Thời gian</th>
              {DAYS_OF_WEEK.map(d => (
                <th key={d.id} style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 800 }}>
                  {d.name.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map(p => (
              <React.Fragment key={p.id}>
                <tr>
                  {p.id === 1 && (
                    <td
                      rowSpan={4}
                      style={{
                        border: '1px solid #000',
                        fontWeight: 800,
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        fontSize: '9pt',
                        padding: '2px 4px',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box'
                      }}
                    >
                      SÁNG
                    </td>
                  )}
                  {p.id === 5 && (
                    <td
                      rowSpan={3}
                      style={{
                        border: '1px solid #000',
                        fontWeight: 800,
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        fontSize: '9pt',
                        padding: '2px 4px',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box'
                      }}
                    >
                      CHIỀU
                    </td>
                  )}

                  <td style={{ border: '1px solid #000', fontWeight: 800, verticalAlign: 'middle', fontSize: '9.5pt' }}>
                    {p.id <= 4 ? p.id : (p.id - 4)}
                  </td>

                  <td style={{ border: '1px solid #000', fontSize: '8pt', verticalAlign: 'middle', color: '#222' }}>
                    {p.time}
                  </td>

                  {DAYS_OF_WEEK.map(day => {
                    let matchSlot = null;
                    let matchClass = null;

                    classes.forEach(cls => {
                      const slot = timetable[cls.id]?.[day.id]?.[p.id];
                      if (slot && slot.teacherId === t.id) {
                        matchSlot = slot;
                        matchClass = cls;
                      }
                    });

                    const sub = matchSlot ? ((subjects && subjects[matchSlot.subjectId]) || DEFAULT_SUBJECTS[matchSlot.subjectId] || { name: matchSlot.subjectRaw || matchSlot.subjectId }) : null;
                    const isWedOff = day.id === 4 && p.id > 4;

                    if (isWedOff) {
                      return (
                        <td key={day.id} style={{ border: '1px solid #000', fontStyle: 'italic', color: '#555', background: '#f8fafc', height: '40px', verticalAlign: 'middle' }}>
                          Nghỉ
                        </td>
                      );
                    }

                    return (
                      <td key={day.id} style={{ border: '1px solid #000', height: '36px', padding: '2px 2px', verticalAlign: 'middle', wordBreak: 'break-word' }}>
                        {matchSlot ? (
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '9pt', color: '#000', lineHeight: 1.15 }}>
                              {sub?.name || matchSlot.subjectId}
                            </div>
                            <div style={{ fontSize: '8pt', fontWeight: 700, color: '#000', marginTop: '1px' }}>
                              {matchClass?.name}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#aaa' }}>-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {p.id === 4 && (
                  <tr style={{ background: '#f1f5f9', border: '1px solid #000' }}>
                    <td colSpan={8} style={{ border: '1px solid #000', padding: '3px', fontSize: '8pt', fontWeight: 800, fontStyle: 'italic' }}>
                      {schoolInfo.lunchBreak ? `🍱 NGHỈ TRƯA (${schoolInfo.lunchBreak})` : '🍱 NGHỈ TRƯA (10:30 - 14:00)'}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Footer Signatures */}
        {showTeacherSignatures && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '9pt' }}>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>GIÁO VIÊN</div>
              <div style={{ fontStyle: 'italic', fontSize: '8pt', marginTop: '2px' }}>(Ký và ghi rõ họ tên)</div>
              <div style={{ height: '40px' }} />
              <div style={{ fontWeight: 800 }}>{t.name}</div>
            </div>
            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ fontStyle: 'italic', fontSize: '8.5pt' }}>Tân Mai, ngày 05 tháng 09 năm 2026</div>
              <div style={{ fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>HIỆU TRƯỞNG</div>
              <div style={{ fontStyle: 'italic', fontSize: '8pt', marginTop: '2px' }}>(Ký và đóng dấu)</div>
              <div style={{ height: '40px' }} />
              <div style={{ fontWeight: 800 }}>{schoolInfo.principal || 'Bùi Văn Việt'}</div>
            </div>
          </div>
        )}
      </div>
    );
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
            <span>Danh Sách & Hồ Sơ Giáo Viên ({teachers.length})</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Quản lý thông tin cán bộ giáo viên, phân loại chuyên môn, định mức tiết và lịch đăng ký nghỉ
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
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
            <span>Thêm Giáo Viên Mới</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Tổng Số Giáo Viên</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{teachers.length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>thầy cô</span></div>
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
              {teachers.filter(t => !t.isHomeroom).length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>thầy cô</span>
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
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Vai trò:</span>
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
              <option value="ALL">Tất cả vai trò</option>
              <option value="HOMEROOM">Giáo viên Chủ Nhiệm</option>
              <option value="SUBJECT">Giáo viên Bộ Môn</option>
              <option value="ADMIN">Ban Giám Hiệu</option>
              <option value="STAFF">Văn phòng / Nhân viên</option>
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
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {teacher.task ? teacher.task.substring(0, 45) + '...' : (teacher.phone ? `📞 ${teacher.phone}` : '')}
                            </div>
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
                          const isStaff = ['Kế toán', 'Văn thư - Thủ quỹ', 'Y tế - Thư viện', 'Bảo vệ'].includes(badge.label);

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
                            if (isStaff) {
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '0.78rem', color: '#0f766e', fontWeight: 600 }}>
                                    {teacher.task ? teacher.task.split(';')[0] : `Nhiệm vụ: ${badge.label}`}
                                  </span>
                                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                    (Không tham gia đứng lớp)
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
                          const isStaff = ['Kế toán', 'Văn thư - Thủ quỹ', 'Y tế - Thư viện', 'Bảo vệ'].includes(badge.label);

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

                          if (isStaff && stat.scheduled === 0) {
                            return (
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: '#f0fdfa',
                                border: '1px solid #99f6e4',
                                color: '#0f766e',
                                fontSize: '0.72rem',
                                fontWeight: 600
                              }}>
                                Công tác hành chính (0 tiết)
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
                          if (['Kế toán', 'Văn thư - Thủ quỹ', 'Y tế - Thư viện', 'Bảo vệ'].includes(badge.label)) {
                            return (
                              <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>
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
                          const isStaff = ['Kế toán', 'Văn thư - Thủ quỹ', 'Y tế - Thư viện', 'Bảo vệ'].includes(badge.label);
                          const hasSchedule = stat.scheduled > 0;

                          return (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              {!isOnLeave && !isStaff && hasSchedule && (
                                <button
                                  onClick={() => setPreviewTeacher(teacher)}
                                  title="Xem Thời khóa biểu của giáo viên này"
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
                                  <Calendar size={13} />
                                  <span>Xem TKB</span>
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

      {/* 5. ADD / EDIT TEACHER MODAL (PORTAL TO ROOT BODY - ALWAYS ON TOP) */}
      {isModalOpen && editingTeacher && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div className="animate-fade-in" style={{
            background: '#ffffff',
            borderRadius: '24px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            padding: '28px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={24} color="#4f46e5" />
                <span>{editingTeacher.id && teachers.some(t => t.id === editingTeacher.id) ? 'Chỉnh Sửa Hồ Sơ Giáo Viên' : 'Thêm Giáo Viên Mới'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}>
                <X size={22} color="#94a3b8" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Mã Giáo Viên *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTeacher.id}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, id: e.target.value.trim() })}
                    placeholder="VD: GV_01"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Mã Viết Tắt (Hiển thị TKB)
                  </label>
                  <input
                    type="text"
                    value={editingTeacher.code || ''}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, code: e.target.value })}
                    placeholder="VD: Nga, NGA.NT, Trang..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Họ và Tên Giáo Viên *
                </label>
                <input
                  type="text"
                  required
                  value={editingTeacher.name}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                  placeholder="VD: Nguyễn Thị Nga"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Chức Vụ / Vị Trí Công Tác
                  </label>
                  <input
                    type="text"
                    value={editingTeacher.position || ''}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, position: e.target.value })}
                    placeholder="VD: GVCN, GV Bộ Môn, Kế toán, Văn thư, Hiệu Trưởng..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Định Mức Tiết Dạy / Tuần *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="35"
                    value={editingTeacher.dinhMuc !== undefined ? editingTeacher.dinhMuc : (editingTeacher.weeklyQuota !== undefined ? editingTeacher.weeklyQuota : 23)}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, dinhMuc: Number(e.target.value), weeklyQuota: Number(e.target.value) })}
                    placeholder="VD: 23 tiết/tuần (hoặc 0 nếu BGH/văn phòng)"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Số Điện Thoại
                  </label>
                  <input
                    type="text"
                    value={editingTeacher.phone}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, phone: e.target.value })}
                    placeholder="0912.xxx.xxx"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingTeacher.email}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, email: e.target.value })}
                    placeholder="gv@quynhlocb.edu.vn"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              {/* Vai trò chủ nhiệm */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={editingTeacher.isHomeroom}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, isHomeroom: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Là Giáo Viên Chủ Nhiệm (GVCN)</span>
                </label>

                {editingTeacher.isHomeroom && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Phụ trách lớp:</span>
                    <select
                      value={editingTeacher.homeroomClassId || ''}
                      onChange={(e) => setEditingTeacher({ ...editingTeacher, homeroomClassId: e.target.value })}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    >
                      <option value="">-- Chọn lớp chủ nhiệm --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} (Khối {c.grade})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Phân công Giảng dạy Nhiều Môn & Lớp */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookOpen size={20} color="#4f46e5" />
                      <span>Phân Công Giảng Dạy Các Môn & Lớp ({(editingTeacher.subjectAssignments || []).length} môn):</span>
                    </label>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      (Không giới hạn số môn — Bạn có thể thêm 1, 2, 3, 4, 5+ môn cho mỗi giáo viên)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const current = editingTeacher.subjectAssignments || [];
                      const usedSubjectIds = new Set(current.map(c => c.subjectId));
                      const allSubIds = Object.keys(subjects);
                      const nextSubId = allSubIds.find(k => !usedSubjectIds.has(k)) || allSubIds[0] || 'THE_DUC';
                      setEditingTeacher({
                        ...editingTeacher,
                        subjectAssignments: [
                          ...current,
                          { subjectId: nextSubId, classIds: [] }
                        ]
                      });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: '#4f46e5',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)'
                    }}
                  >
                    <Plus size={15} />
                    <span>+ Thêm Môn Dạy Mới</span>
                  </button>
                </div>

                {/* Danh sách các môn giảng dạy */}
                {(editingTeacher.subjectAssignments || []).length === 0 ? (
                  <div style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '2px dashed #cbd5e1',
                    color: '#64748b'
                  }}>
                    <div style={{ fontSize: '1.75rem', marginBottom: '6px' }}>👨‍🏫</div>
                    <p style={{ margin: '0 0 6px 0', fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>
                      Giáo viên hiện không phụ trách môn bộ môn nào (0 môn)
                    </p>
                    <p style={{ margin: '0 0 14px 0', fontSize: '0.78rem', color: '#94a3b8', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                      Thích hợp cho Ban Giám Hiệu, Cán bộ văn phòng, hoặc chỉ quản lý lớp chủ nhiệm.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const allSubIds = Object.keys(subjects);
                        setEditingTeacher({
                          ...editingTeacher,
                          subjectAssignments: [{ subjectId: allSubIds[0] || 'THE_DUC', classIds: [] }]
                        });
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: '#4f46e5',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={14} />
                      <span>+ Thêm Môn Dạy Đầu Tiên</span>
                    </button>
                  </div>
                ) : (
                  (editingTeacher.subjectAssignments || []).map((subItem, subIdx) => {
                    const subjectObj = subjects[subItem.subjectId] || { name: subItem.subjectId };
                    return (
                      <div
                        key={subIdx}
                        style={{
                          background: '#ffffff',
                          padding: '14px',
                          borderRadius: '12px',
                          border: '1px solid #c7d2fe',
                          marginBottom: '12px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3730a3' }}>
                              Môn #{subIdx + 1}:
                            </span>
                            <select
                              value={subItem.subjectId}
                              onChange={(e) => {
                                const newSubId = e.target.value;
                                const updated = (editingTeacher.subjectAssignments || []).map((item, idx) => {
                                  if (idx === subIdx) {
                                    const existingClasses = (assignments || [])
                                      .filter(a => a.teacherId === editingTeacher.id && a.subjectId === newSubId)
                                      .map(a => a.classId);
                                    return { ...item, subjectId: newSubId, classIds: existingClasses };
                                  }
                                  return item;
                                });
                                setEditingTeacher({ ...editingTeacher, subjectAssignments: updated });
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: '1px solid #818cf8',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                background: '#eef2ff',
                                color: '#312e81'
                              }}
                            >
                              {Object.values(subjects).map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.name} ({sub.id})</option>
                              ))}
                            </select>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (editingTeacher.subjectAssignments || []).map((item, idx) => {
                                  if (idx === subIdx) {
                                    return { ...item, classIds: classes.map(c => c.id) };
                                  }
                                  return item;
                                });
                                setEditingTeacher({ ...editingTeacher, subjectAssignments: updated });
                              }}
                              style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', cursor: 'pointer' }}
                            >
                              Chọn Cả 23 Lớp
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (editingTeacher.subjectAssignments || []).map((item, idx) => {
                                  if (idx === subIdx) {
                                    return { ...item, classIds: [] };
                                  }
                                  return item;
                                });
                                setEditingTeacher({ ...editingTeacher, subjectAssignments: updated });
                              }}
                              style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: '#f8fafc', color: '#64748b', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                            >
                              Bỏ Chọn
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (editingTeacher.subjectAssignments || []).filter((_, idx) => idx !== subIdx);
                                setEditingTeacher({ ...editingTeacher, subjectAssignments: updated });
                              }}
                              title="Xóa môn này khỏi phân công"
                              style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Trash2 size={12} />
                              <span>Xóa môn</span>
                            </button>
                          </div>
                        </div>

                      {/* Danh sách 23 lớp checkboxes */}
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', marginBottom: '6px' }}>
                        Lớp dạy môn {subjectObj.name}: {(subItem.classIds || []).length} / {classes.length} lớp
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))',
                        gap: '6px',
                        maxHeight: '120px',
                        overflowY: 'auto',
                        background: '#f8fafc',
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}>
                        {classes.map(cls => {
                          const isChecked = (subItem.classIds || []).includes(cls.id);
                          const asgForClass = (assignments || []).find(a => a.classId === cls.id && a.subjectId === subItem.subjectId);
                          const currentTeacherId = asgForClass?.teacherId;
                          const currentTeacherObj = currentTeacherId && currentTeacherId !== editingTeacher.id
                            ? teachers.find(t => t.id === currentTeacherId)
                            : null;

                          return (
                            <label
                              key={cls.id}
                              title={currentTeacherObj && !isChecked ? `Lớp ${cls.name} môn ${subjectObj.name} đang do ${currentTeacherObj.name} (${currentTeacherObj.code || currentTeacherObj.id}) dạy. Tích chọn sẽ chuyển sang giáo viên này.` : cls.name}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 6px',
                                borderRadius: '5px',
                                background: isChecked ? '#e0e7ff' : (currentTeacherObj ? '#fffbeb' : '#ffffff'),
                                border: `1px solid ${isChecked ? '#818cf8' : (currentTeacherObj ? '#fde68a' : '#e2e8f0')}`,
                                cursor: 'pointer',
                                fontWeight: isChecked ? 700 : 500,
                                fontSize: '0.75rem',
                                color: isChecked ? '#312e81' : (currentTeacherObj ? '#92400e' : '#64748b')
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const curClasses = subItem.classIds || [];
                                  const nextClasses = e.target.checked
                                    ? [...curClasses, cls.id]
                                    : curClasses.filter(id => id !== cls.id);
                                  const updated = (editingTeacher.subjectAssignments || []).map((item, idx) => {
                                    if (idx === subIdx) {
                                      return { ...item, classIds: nextClasses };
                                    }
                                    return item;
                                  });
                                  setEditingTeacher({ ...editingTeacher, subjectAssignments: updated });
                                }}
                              />
                              <span>{cls.name}</span>
                              {currentTeacherObj && !isChecked && (
                                <span style={{ fontSize: '0.62rem', color: '#b45309', background: '#fef3c7', padding: '1px 3px', borderRadius: '3px', border: '1px solid #fde68a' }}>
                                  {currentTeacherObj.code || currentTeacherObj.name.split(' ').pop()}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                }))}
              </div>

              {/* Đăng ký Buổi nghỉ */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                  📅 Đăng Ký Buổi Nghỉ Chuyên Môn / Bồi Dưỡng:
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '8px',
                  background: '#f8fafc',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  {DAYS_OF_WEEK.map(day => {
                    const morningKey = `${day.id}_morning`;
                    const afternoonKey = `${day.id}_afternoon`;
                    const isMorningOff = (editingTeacher.offSessions || []).includes(morningKey);
                    const isAfternoonOff = (editingTeacher.offSessions || []).includes(afternoonKey);

                    return (
                      <div key={day.id} style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569', marginBottom: '6px' }}>
                          {day.name}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => toggleOffSession(morningKey)}
                            style={{
                              padding: '4px',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: '1px solid',
                              background: isMorningOff ? '#fef2f2' : '#ffffff',
                              borderColor: isMorningOff ? '#ef4444' : '#cbd5e1',
                              color: isMorningOff ? '#b91c1c' : '#64748b'
                            }}
                          >
                            {isMorningOff ? 'Sáng: Nghỉ' : 'Sáng: Dạy'}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleOffSession(afternoonKey)}
                            style={{
                              padding: '4px',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: '1px solid',
                              background: isAfternoonOff ? '#fef2f2' : '#ffffff',
                              borderColor: isAfternoonOff ? '#ef4444' : '#cbd5e1',
                              color: isAfternoonOff ? '#b91c1c' : '#64748b'
                            }}
                          >
                            {isAfternoonOff ? 'Chiều: Nghỉ' : 'Chiều: Dạy'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    background: '#4f46e5',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)'
                  }}
                >
                  Lưu Thông Tin Giáo Viên
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      </div>

      {/* 6. QUICK TIMETABLE PREVIEW & PRINT MODAL (PORTAL TO ROOT BODY) */}
      {previewTeacher && createPortal(
        <div className="portal-print-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          {/* SCREEN-ONLY INTERACTIVE MODAL CONTAINER */}
          <div className="no-print animate-fade-in" style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '1100px',
            width: '100%',
            height: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            {/* Modal Top Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)'
                }}>
                  <Printer size={20} />
                </div>
                {(() => {
                  const taughtClasses = (() => {
                    const nameSet = new Set();
                    if (previewTeacher.isHomeroom && previewTeacher.homeroomClassId) {
                      const c = classes.find(item => item.id === previewTeacher.homeroomClassId || item.name === previewTeacher.homeroomClassId);
                      nameSet.add(c ? c.name : previewTeacher.homeroomClassId);
                    }
                    (assignments || []).forEach(a => {
                      if (a.teacherId === previewTeacher.id && a.classId) {
                        const c = classes.find(item => item.id === a.classId || item.name === a.classId);
                        nameSet.add(c ? c.name : a.classId);
                      }
                    });
                    if (Array.isArray(previewTeacher.subjectAssignments)) {
                      previewTeacher.subjectAssignments.forEach(cfg => {
                        (cfg.classIds || []).forEach(cid => {
                          const c = classes.find(item => item.id === cid || item.name === cid);
                          nameSet.add(c ? c.name : cid);
                        });
                      });
                    }
                    classes.forEach(cls => {
                      for (let dayId = 2; dayId <= 6; dayId++) {
                        for (let pId = 1; pId <= 7; pId++) {
                          if (timetable[cls.id]?.[dayId]?.[pId]?.teacherId === previewTeacher.id) {
                            nameSet.add(cls.name);
                          }
                        }
                      }
                    });
                    return Array.from(nameSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                  })();

                  return (
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>Thời Khóa Biểu: {previewTeacher.name}</span>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: '#eff6ff', color: '#2563eb', fontWeight: 700 }}>
                          {previewTeacher.code || previewTeacher.id}
                        </span>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                          {getTeacherRoleBadge(previewTeacher).label}
                        </span>
                      </h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                        {taughtClasses.length > 0 ? (
                          <span>
                            Lớp giảng dạy ({taughtClasses.length} lớp):{' '}
                            <strong style={{ color: '#1d4ed8' }}>{taughtClasses.join(', ')}</strong>
                          </span>
                        ) : (
                          'Xem trước bản in A4 chuẩn Bộ GD&ĐT và in trực tiếp ra máy in hoặc file PDF.'
                        )}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Header Action Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* View Switcher Tabs */}
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <button
                    onClick={() => setTeacherPreviewTab('a4')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '7px',
                      border: 'none',
                      background: teacherPreviewTab === 'a4' ? '#ffffff' : 'transparent',
                      color: teacherPreviewTab === 'a4' ? '#2563eb' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      boxShadow: teacherPreviewTab === 'a4' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    <FileText size={14} />
                    <span>Xem Bản In A4</span>
                  </button>
                  <button
                    onClick={() => setTeacherPreviewTab('grid')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '7px',
                      border: 'none',
                      background: teacherPreviewTab === 'grid' ? '#ffffff' : 'transparent',
                      color: teacherPreviewTab === 'grid' ? '#2563eb' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      boxShadow: teacherPreviewTab === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    <LayoutGrid size={14} />
                    <span>Lưới Tương Tác</span>
                  </button>
                </div>

                {/* Zoom Controls (when on A4 preview tab) */}
                {teacherPreviewTab === 'a4' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#f8fafc', padding: '2px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <button
                      onClick={() => setTeacherPreviewZoom(prev => Math.max(60, prev - 10))}
                      title="Thu nhỏ"
                      style={{ padding: '5px 7px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#475569' }}
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: '36px', textAlign: 'center', color: '#334155' }}>
                      {teacherPreviewZoom}%
                    </span>
                    <button
                      onClick={() => setTeacherPreviewZoom(prev => Math.min(140, prev + 10))}
                      title="Phóng to"
                      style={{ padding: '5px 7px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#475569' }}
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      onClick={() => setTeacherPreviewZoom(90)}
                      title="Mặc định 90%"
                      style={{ padding: '5px 7px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#475569' }}
                    >
                      <Maximize2 size={13} />
                    </button>
                  </div>
                )}

                {/* Print Options Toggle (when on A4 preview tab) */}
                {teacherPreviewTab === 'a4' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#f8fafc',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.78rem'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
                      <input
                        type="checkbox"
                        checked={showTeacherHeader}
                        onChange={e => setShowTeacherHeader(e.target.checked)}
                      />
                      <span>Tiêu đề UBND</span>
                    </label>
                    <div style={{ width: '1px', height: '12px', background: '#cbd5e1' }} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
                      <input
                        type="checkbox"
                        checked={showTeacherSignatures}
                        onChange={e => setShowTeacherSignatures(e.target.checked)}
                      />
                      <span>Chữ ký duyệt</span>
                    </label>
                  </div>
                )}

                {/* Copy Image Button */}
                <button
                  onClick={handleCopyTeacherZaloImage}
                  disabled={isCopyingTeacherImg}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '8px 13px',
                    borderRadius: '10px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: isCopyingTeacherImg ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Sao chép ảnh TKB vào Clipboard. Mở Zalo và nhấn Ctrl+V để gửi ngay cho giáo viên!"
                >
                  <Copy size={15} />
                  <span>{isCopyingTeacherImg ? 'Đang copy...' : 'Copy Ảnh (Dán Zalo)'}</span>
                </button>

                {/* Download Zalo Image Button */}
                <button
                  onClick={handleExportTeacherZaloImage}
                  disabled={isExportingTeacherImg}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '8px 13px',
                    borderRadius: '10px',
                    background: '#fdf4ff',
                    border: '1px solid #f5d0fe',
                    color: '#a21caf',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: isExportingTeacherImg ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Tải file ảnh PNG sắc nét (High-DPI) để gửi qua Zalo hoặc in ảnh"
                >
                  <ImageIcon size={15} />
                  <span>{isExportingTeacherImg ? 'Đang tạo...' : 'Tải Ảnh Zalo'}</span>
                </button>

                {/* Primary Print Button */}
                <button
                  onClick={() => triggerAppPrint()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
                  }}
                >
                  <Printer size={15} />
                  <span>In Thời Khóa Biểu</span>
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setPreviewTeacher(null)}
                  style={{
                    padding: '6px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body Viewport */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              background: teacherPreviewTab === 'a4' ? '#334155' : '#ffffff',
              padding: teacherPreviewTab === 'a4' ? '20px' : '24px',
              position: 'relative'
            }}>
              {/* Teacher Toast Alert */}
              {teacherToast && (
                <div style={{
                  position: 'fixed',
                  bottom: '24px',
                  right: '24px',
                  zIndex: 999999,
                  background: '#059669',
                  color: '#ffffff',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
                  animation: 'slideInRight 0.2s ease-out'
                }}>
                  <CheckCircle2 size={18} />
                  <span>{teacherToast}</span>
                </div>
              )}

              {teacherPreviewTab === 'a4' ? (
                /* TAB 1: A4 PAPER PREVIEW VIEWPORT */
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100%' }}>
                  <div
                    ref={teacherSheetRef}
                    style={{
                      background: '#ffffff',
                      width: '210mm',
                      minHeight: '297mm',
                      boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)',
                      borderRadius: '2px',
                      transform: `scale(${teacherPreviewZoom / 100})`,
                      transformOrigin: 'top center',
                      transition: 'transform 0.15s ease',
                      boxSizing: 'border-box'
                    }}
                  >
                    {renderTeacherSheet(previewTeacher, true)}
                  </div>
                </div>
              ) : (
                /* TAB 2: INTERACTIVE GRID VIEWPORT */
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                  {/* Taught Classes Summary Tags */}
                  {(() => {
                    const taughtClasses = (() => {
                      const nameSet = new Set();
                      if (previewTeacher.isHomeroom && previewTeacher.homeroomClassId) {
                        const c = classes.find(item => item.id === previewTeacher.homeroomClassId || item.name === previewTeacher.homeroomClassId);
                        nameSet.add(c ? c.name : previewTeacher.homeroomClassId);
                      }
                      (assignments || []).forEach(a => {
                        if (a.teacherId === previewTeacher.id && a.classId) {
                          const c = classes.find(item => item.id === a.classId || item.name === a.classId);
                          nameSet.add(c ? c.name : a.classId);
                        }
                      });
                      if (Array.isArray(previewTeacher.subjectAssignments)) {
                        previewTeacher.subjectAssignments.forEach(cfg => {
                          (cfg.classIds || []).forEach(cid => {
                            const c = classes.find(item => item.id === cid || item.name === cid);
                            nameSet.add(c ? c.name : cid);
                          });
                        });
                      }
                      classes.forEach(cls => {
                        for (let dayId = 2; dayId <= 6; dayId++) {
                          for (let pId = 1; pId <= 7; pId++) {
                            if (timetable[cls.id]?.[dayId]?.[pId]?.teacherId === previewTeacher.id) {
                              nameSet.add(cls.name);
                            }
                          }
                        }
                      });
                      return Array.from(nameSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                    })();

                    if (taughtClasses.length === 0) return null;

                    return (
                      <div style={{
                        background: '#eff6ff',
                        borderRadius: '10px',
                        border: '1px solid #bfdbfe',
                        padding: '8px 12px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e40af' }}>
                          📚 Danh sách các lớp giảng dạy ({taughtClasses.length} lớp):
                        </span>
                        {taughtClasses.map(clsName => (
                          <span
                            key={clsName}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: '#ffffff',
                              border: '1px solid #93c5fd',
                              color: '#1d4ed8',
                              fontWeight: 700,
                              fontSize: '0.75rem'
                            }}
                          >
                            {clsName}
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Bell Schedule Bar */}
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    padding: '6px 12px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    fontSize: '0.72rem'
                  }}>
                    <span style={{ fontWeight: 800, color: '#1e293b' }}>⏰ Khung Giờ:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 800, color: '#1d4ed8', background: '#eff6ff', padding: '1px 4px', borderRadius: '3px' }}>SÁNG:</span>
                        <span style={{ color: '#334155' }}>
                          {periods.filter(p => p.session === 'morning').map(p => `T${p.id} (${p.time})`).join(' • ')}
                        </span>
                      </div>
                      <div style={{ width: '1px', height: '10px', background: '#cbd5e1' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 800, color: '#b45309', background: '#fffbeb', padding: '1px 4px', borderRadius: '3px' }}>CHIỀU:</span>
                        <span style={{ color: '#334155' }}>
                          {periods.filter(p => p.session === 'afternoon').map(p => `T${p.id <= 4 ? p.id : (p.id - 4)} (${p.time})`).join(' • ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Table Grid */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '10px 6px', width: '55px', color: '#475569', fontWeight: 800, borderRight: '1px solid #e2e8f0' }}>Buổi</th>
                          <th style={{ padding: '10px 6px', width: '50px', color: '#475569', fontWeight: 800, borderRight: '1px solid #e2e8f0' }}>Tiết</th>
                          {DAYS_OF_WEEK.map(d => (
                            <th key={d.id} style={{ padding: '10px', color: '#1e293b', fontWeight: 700 }}>
                              {d.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {PERIODS.map(p => (
                          <React.Fragment key={p.id}>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              {/* Buổi Sáng / Chiều */}
                              {p.id === 1 && (
                                <td
                                  rowSpan={4}
                                  style={{
                                    background: '#eff6ff',
                                    color: '#1e40af',
                                    fontWeight: 800,
                                    fontSize: '0.8rem',
                                    borderRight: '2px solid #bfdbfe',
                                    verticalAlign: 'middle',
                                    letterSpacing: '1px'
                                  }}
                                >
                                  <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto' }}>
                                    SÁNG
                                  </div>
                                </td>
                              )}

                              {p.id === 5 && (
                                <td
                                  rowSpan={3}
                                  style={{
                                    background: '#fffbeb',
                                    color: '#b45309',
                                    fontWeight: 800,
                                    fontSize: '0.8rem',
                                    borderRight: '2px solid #fde68a',
                                    verticalAlign: 'middle',
                                    letterSpacing: '1px'
                                  }}
                                >
                                  <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto' }}>
                                    CHIỀU
                                  </div>
                                </td>
                              )}

                              <td
                                title={`${p.name}: ${p.time}`}
                                style={{
                                  padding: '10px 4px',
                                  background: p.session === 'morning' ? '#f8fafc' : '#fffdf5',
                                  borderRight: '1px solid #e2e8f0',
                                  fontWeight: 800,
                                  color: p.session === 'morning' ? '#2563eb' : '#d97706',
                                  fontSize: '0.95rem',
                                  verticalAlign: 'middle'
                                }}
                              >
                                {p.id <= 4 ? p.id : (p.id - 4)}
                              </td>

                              {DAYS_OF_WEEK.map(day => {
                                let matchSlot = null;
                                let matchClass = null;

                                classes.forEach(cls => {
                                  const slot = timetable[cls.id]?.[day.id]?.[p.id];
                                  if (slot && slot.teacherId === previewTeacher.id) {
                                    matchSlot = slot;
                                    matchClass = cls;
                                  }
                                });

                                const sub = matchSlot ? ((subjects && subjects[matchSlot.subjectId]) || DEFAULT_SUBJECTS[matchSlot.subjectId] || { name: matchSlot.subjectRaw || matchSlot.subjectId, bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' }) : null;

                                return (
                                  <td key={day.id} style={{ padding: '8px', verticalAlign: 'middle', height: '60px' }}>
                                    {matchSlot ? (
                                      <div style={{
                                        padding: '6px 8px',
                                        borderRadius: '8px',
                                        background: sub?.bg || '#eff6ff',
                                        border: `1px solid ${sub?.border || '#bfdbfe'}`,
                                        color: sub?.text || '#1e40af',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '2px'
                                      }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>
                                          {sub?.name || matchSlot.subjectId}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff', background: '#3b82f6', padding: '1px 6px', borderRadius: '4px' }}>
                                          {matchClass?.name}
                                        </span>
                                      </div>
                                    ) : (
                                      <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>

                            {p.id === 4 && (
                              <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0', borderBottom: '2px solid #e2e8f0' }}>
                                <td colSpan="7" style={{ padding: '6px', color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>
                                  🍱 NGHỈ TRƯA (10:30 - 14:00)
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setPreviewTeacher(null)}
                      style={{
                        padding: '10px 22px',
                        borderRadius: '10px',
                        background: '#4f46e5',
                        border: 'none',
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* DEDICATED OFFICIAL PRINTABLE SHEET FOR TEACHER (A4 PORTRAIT)  */}
          {/* ACTIVE DURING BROWSER & ELECTRON PRINTING                     */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="printable-batch-container">
            {renderTeacherSheet(previewTeacher, false)}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

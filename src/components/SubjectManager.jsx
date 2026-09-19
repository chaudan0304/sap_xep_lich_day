// src/components/SubjectManager.jsx
import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Sparkles, 
  Building2, 
  X, 
  CheckCircle2, 
  Download,
  Calendar,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { SUBJECT_CATEGORIES, SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects';
import { parseExcelWorkbook } from '../services/excelParser.js';
import ExcelJS from 'exceljs';
import { saveExcelJSWorkbook } from '../services/excel/excelStyles.js';

// Preset color palettes for nice visual presentation
const COLOR_PRESETS = [
  { name: 'Xanh Dương (Toán)', color: '#2563eb', bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
  { name: 'Đỏ Tươi (Tiếng Việt)', color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
  { name: 'Tím Đậm (Tiếng Anh)', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', text: '#5b21b6' },
  { name: 'Xanh Lam (Tin học)', color: '#0284c7', bg: '#f0f9ff', border: '#7dd3fc', text: '#075985' },
  { name: 'Xanh Lá (Thể chất)', color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46' },
  { name: 'Xanh Lục (Đạo đức)', color: '#10b981', bg: '#f0fdf4', border: '#86efac', text: '#166534' },
  { name: 'Xanh Mòng Két (TNXH)', color: '#0d9488', bg: '#f0fdfa', border: '#5eead4', text: '#115e59' },
  { name: 'Hổ Phách (Lịch sử-Địa lí)', color: '#b45309', bg: '#fffbeb', border: '#fcd34d', text: '#78350f' },
  { name: 'Vàng Cam (Âm nhạc)', color: '#d97706', bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
  { name: 'Cam Đất (Mỹ thuật)', color: '#ea580c', bg: '#fff7ed', border: '#fdba74', text: '#9a3412' },
  { name: 'Chàm Indigo (HĐTN)', color: '#4f46e5', bg: '#eef2ff', border: '#a5b4fc', text: '#3730a3' },
  { name: 'Hồng Đậm (Kỹ năng mềm)', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', text: '#9d174d' },
  { name: 'Xanh Chanh (Tự chọn)', color: '#65a30d', bg: '#f7fee7', border: '#bef264', text: '#3f6212' },
  { name: 'Xám Trung Tính (Cố định)', color: '#475569', bg: '#f8fafc', border: '#cbd5e1', text: '#1e293b' }
];

export const SubjectManager = ({
  subjects,
  setSubjects,
  rooms = [],
  setRooms,
  assignments = [],
  setAssignments,
  timetable = {},
  setTimetable,
  gradeQuotas = {},
  setGradeQuotas,
  classes: _classes = []
}) => {
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const excelFileInputRef = useRef(null);

  // Danh sách phòng học đồng bộ động từ tab Phòng Chức Năng
  const availableRoomTypes = useMemo(() => {
    const standard = [
      { id: 'LOP_HOC', name: 'Phòng học tại lớp (Mặc định)', isSpecialized: false },
      { id: 'SAN_TRUONG', name: 'Sân trường toàn trường', isSpecialized: false }
    ];
    const dynamicRooms = (rooms || []).map(r => ({
      id: r.id,
      name: `${r.name} (${r.building || r.code || 'Phòng bộ môn'})`,
      isSpecialized: true,
      original: r
    }));
    return [...standard, ...dynamicRooms];
  }, [rooms]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  // 1. Quét dữ liệu TKB thực tế & Đối soát môn học
  const { timetableUsage, missingSubjectsInTimetable } = useMemo(() => {
    const usage = {}; // subjectId -> { count: number, classIds: Set, sampleRaw: string }
    const missing = new Map(); // subjectId -> { id, rawName, count, classIds: Set }

    if (timetable && typeof timetable === 'object') {
      Object.entries(timetable).forEach(([cId, days]) => {
        if (!days) return;
        Object.values(days).forEach((periods) => {
          if (!periods) return;
          Object.values(periods).forEach((slot) => {
            if (slot && slot.subjectId) {
              const sId = slot.subjectId;
              const sRaw = slot.subjectRaw || sId;

              // Thống kê số tiết đã xếp
              if (!usage[sId]) {
                usage[sId] = { count: 0, classIds: new Set(), sampleRaw: sRaw };
              }
              usage[sId].count++;
              usage[sId].classIds.add(cId);

              // Kiểm tra xem đã có trong danh mục subjects chưa
              if (!subjects || !subjects[sId]) {
                if (!missing.has(sId)) {
                  missing.set(sId, {
                    id: sId,
                    rawName: sRaw,
                    count: 0,
                    classIds: new Set()
                  });
                }
                const m = missing.get(sId);
                m.count++;
                m.classIds.add(cId);
              }
            }
          });
        });
      });
    }

    // Kiểm tra thêm assignments (phân công chuyên môn)
    if (Array.isArray(assignments)) {
      assignments.forEach(a => {
        if (a && a.subjectId && (!subjects || !subjects[a.subjectId])) {
          if (!missing.has(a.subjectId)) {
            missing.set(a.subjectId, {
              id: a.subjectId,
              rawName: a.subjectId,
              count: 0,
              classIds: new Set([a.classId])
            });
          }
        }
      });
    }

    return {
      timetableUsage: usage,
      missingSubjectsInTimetable: Array.from(missing.values())
    };
  }, [timetable, assignments, subjects]);

  // Convert subjects object to array (deduplicating by id)
  const subjectList = useMemo(() => {
    const list = Object.values(subjects || {});
    const seen = new Set();
    return list.filter(sub => {
      if (!sub || !sub.id) return false;
      if (seen.has(sub.id)) return false;
      seen.add(sub.id);
      return true;
    });
  }, [subjects]);

  // Subject List for display
  const filteredSubjects = subjectList;

  // Mở modal thêm môn mới
  const handleAddNew = () => {
    const defaultColor = COLOR_PRESETS[0];
    setEditingSubject({
      id: '',
      name: '',
      shortName: '',
      category: SUBJECT_CATEGORIES.CORE,
      color: defaultColor.color,
      bg: defaultColor.bg,
      border: defaultColor.border,
      text: defaultColor.text,
      defaultRoom: 'LOP_HOC',
      isFixed: false,
      description: '',
      _isNew: true,
      _originalId: ''
    });
    setIsModalOpen(true);
  };

  // Mở modal sửa môn hiện có
  const handleEdit = (sub) => {
    setEditingSubject({ 
      ...sub, 
      _originalId: sub.id, 
      _isNew: false 
    });
    setIsModalOpen(true);
  };

  // Mở modal hoàn thiện môn học thiếu phát hiện từ TKB
  const handleQuickEditMissing = (item) => {
    const pIndex = Object.keys(subjects || {}).length % COLOR_PRESETS.length;
    const preset = COLOR_PRESETS[pIndex];
    setEditingSubject({
      id: item.id,
      name: item.rawName || item.id,
      shortName: item.rawName ? (item.rawName.length > 8 ? item.rawName.substring(0, 8) : item.rawName) : item.id,
      category: SUBJECT_CATEGORIES.CORE,
      color: preset.color,
      bg: preset.bg,
      border: preset.border,
      text: preset.text,
      defaultRoom: 'LOP_HOC',
      isFixed: false,
      description: `Môn học phát hiện từ Thời khóa biểu (${item.count} tiết đang dạy)`,
      _isNew: false,
      _originalId: item.id
    });
    setIsModalOpen(true);
  };

  // Xóa môn (có kiểm tra cảnh báo nếu môn đang có tiết trên TKB)
  const handleDelete = (subjectId) => {
    const usage = timetableUsage[subjectId];
    let confirmMsg = `Bạn có chắc chắn muốn xóa môn [${subjects[subjectId]?.name || subjectId}] khỏi danh mục môn học?`;
    if (usage && usage.count > 0) {
      confirmMsg = `⚠️ CẢNH BÁO QUAN TRỌNG:\nMôn [${subjects[subjectId]?.name || subjectId}] đang được xếp trong ${usage.count} tiết trên Thời khóa biểu (${usage.classIds.size} lớp học)!\nNếu xóa, các ô TKB này sẽ chuyển về trạng thái chưa cấu hình màu sắc.\n\nBạn có chắc chắn muốn xóa môn này không?`;
    }

    if (window.confirm(confirmMsg)) {
      setSubjects(prev => {
        const next = { ...prev };
        delete next[subjectId];
        return next;
      });
      triggerSaveNotification();
    }
  };

  // ⚡ Thêm tất cả môn thiếu phát hiện từ TKB vào danh mục trong 1 click
  const handleAddAllMissingSubjects = () => {
    if (missingSubjectsInTimetable.length === 0) return;

    const newSubjectsToAdd = {};
    const currentKeysCount = Object.keys(subjects || {}).length;

    missingSubjectsInTimetable.forEach((item, idx) => {
      const pIndex = (currentKeysCount + idx) % COLOR_PRESETS.length;
      const preset = COLOR_PRESETS[pIndex];
      newSubjectsToAdd[item.id] = {
        id: item.id,
        name: item.rawName || item.id,
        shortName: item.rawName ? (item.rawName.length > 8 ? item.rawName.substring(0, 8) : item.rawName) : item.id,
        category: SUBJECT_CATEGORIES.CORE,
        color: preset.color,
        bg: preset.bg,
        border: preset.border,
        text: preset.text,
        defaultRoom: 'LOP_HOC',
        isFixed: false,
        description: `Môn học trích xuất tự động từ Thời khóa biểu (${item.count} tiết đang dạy)`
      };
    });

    setSubjects(prev => ({
      ...prev,
      ...newSubjectsToAdd
    }));
    triggerSaveNotification();
    showBannerMessage(`🎉 Đã bổ sung thành công ${missingSubjectsInTimetable.length} môn học vào Danh mục môn học!`);
  };

  // 🔍 Quét trực tiếp thời khóa biểu và trích xuất tất cả môn học
  const handleScanFromTimetable = () => {
    const foundSubjects = new Map();
    let totalSlotsScanned = 0;

    if (timetable && typeof timetable === 'object') {
      Object.values(timetable).forEach((days) => {
        if (!days) return;
        Object.values(days).forEach((periods) => {
          if (!periods) return;
          Object.values(periods).forEach((slot) => {
            if (slot && slot.subjectId) {
              totalSlotsScanned++;
              const sId = slot.subjectId;
              const sRaw = slot.subjectRaw || sId;
              if (!foundSubjects.has(sId)) {
                foundSubjects.set(sId, {
                  id: sId,
                  name: sRaw,
                  shortName: sRaw.length > 8 ? sRaw.substring(0, 8) : sRaw,
                  count: 0
                });
              }
              foundSubjects.get(sId).count++;
            }
          });
        });
      });
    }

    if (foundSubjects.size === 0) {
      alert('Thời khóa biểu hiện tại đang trống (chưa có tiết học nào). Bạn có thể thêm môn thủ công hoặc nạp từ file Excel.');
      return;
    }

    const newSubjectsToAdd = {};
    let newlyAddedCount = 0;
    const currentKeys = new Set(Object.keys(subjects || {}));

    foundSubjects.forEach((val, sId) => {
      if (!currentKeys.has(sId)) {
        const pIndex = (currentKeys.size + newlyAddedCount) % COLOR_PRESETS.length;
        const preset = COLOR_PRESETS[pIndex];
        newSubjectsToAdd[sId] = {
          id: sId,
          name: val.name,
          shortName: val.shortName,
          category: SUBJECT_CATEGORIES.CORE,
          color: preset.color,
          bg: preset.bg,
          border: preset.border,
          text: preset.text,
          defaultRoom: 'LOP_HOC',
          isFixed: false,
          description: `Môn học trích xuất tự động từ Thời khóa biểu (${val.count} tiết đang dạy)`
        };
        newlyAddedCount++;
      }
    });

    if (newlyAddedCount > 0) {
      setSubjects(prev => ({
        ...prev,
        ...newSubjectsToAdd
      }));
      triggerSaveNotification();
      showBannerMessage(`🎉 Đã quét ${totalSlotsScanned} tiết trên TKB và bổ sung ${newlyAddedCount} môn học mới vào danh mục!`);
    } else {
      showBannerMessage(`✅ Đã rà soát ${totalSlotsScanned} tiết trên TKB: Toàn bộ ${foundSubjects.size} môn học đều đã có đầy đủ trong danh mục!`);
    }
  };

  // 📁 Đọc trực tiếp môn học từ một file Excel TKB
  const handleImportFromExcelFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseExcelWorkbook(buffer);
      if (parsed && parsed.subjects) {
        const found = Object.values(parsed.subjects);
        let addedCount = 0;
        setSubjects(prev => {
          const next = { ...prev };
          found.forEach(s => {
            if (!next[s.id]) {
              next[s.id] = s;
              addedCount++;
            }
          });
          return next;
        });
        triggerSaveNotification();
        showBannerMessage(`🎉 Đã đọc file Excel [${file.name}]: Trích xuất được ${found.length} môn học (trong đó đã bổ sung ${addedCount} môn mới vào danh mục)!`);
      } else {
        alert('Không tìm thấy dữ liệu môn học trong file Excel này.');
      }
    } catch (err) {
      console.error(err);
      alert(`Lỗi khi đọc file Excel: ${err.message}`);
    } finally {
      if (excelFileInputRef.current) excelFileInputRef.current.value = '';
    }
  };

  // Lưu môn học & Đồng bộ dây chuyền (Cascade) sang TKB, Phân công, Định mức & Phòng
  const handleSaveSubject = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingSubject) return;

    if (!editingSubject.id?.trim() || !editingSubject.name?.trim()) {
      alert('Vui lòng nhập đầy đủ Mã môn học và Tên môn học!');
      return;
    }

    const removeVietnameseTones = (str) => {
      return (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
    };

    const cleanId = removeVietnameseTones(editingSubject.id)
      .toUpperCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '');

    if (!cleanId) {
      alert('Mã môn học không hợp lệ! Vui lòng nhập ký tự chữ hoặc số.');
      return;
    }

    const originalId = editingSubject._originalId || cleanId;
    const isIdChanged = !editingSubject._isNew && originalId && originalId !== cleanId;

    if (isIdChanged && subjects && subjects[cleanId]) {
      if (!window.confirm(`Mã môn học [${cleanId}] đã tồn tại trong danh mục! Bạn có chắc muốn ghi đè môn [${originalId}] vào [${cleanId}] không?`)) {
        return;
      }
    }

    const targetRoom = editingSubject.defaultRoom || 'LOP_HOC';
    const shortName = editingSubject.shortName?.trim() || editingSubject.name.trim().substring(0, 10);

    const updatedSubject = {
      ...editingSubject,
      id: cleanId,
      name: editingSubject.name.trim(),
      shortName: shortName,
      defaultRoom: targetRoom
    };
    delete updatedSubject._isNew;
    delete updatedSubject._originalId;

    // 1. Cập nhật danh mục môn học (subjects)
    setSubjects(prev => {
      const next = { ...prev };
      if (isIdChanged && next[originalId]) {
        delete next[originalId];
      }
      next[cleanId] = updatedSubject;
      return next;
    });

    // 2. Đồng bộ dây chuyền (Cascade) sang Thời khóa biểu (timetable)
    if (isIdChanged && setTimetable && timetable) {
      setTimetable(prevTkb => {
        const nextTkb = { ...prevTkb };
        Object.keys(nextTkb).forEach(cId => {
          if (nextTkb[cId]) {
            nextTkb[cId] = { ...nextTkb[cId] };
            for (let d = 2; d <= 6; d++) {
              if (nextTkb[cId][d]) {
                nextTkb[cId][d] = { ...nextTkb[cId][d] };
                for (let p = 1; p <= 7; p++) {
                  const slot = nextTkb[cId][d][p];
                  if (slot && slot.subjectId === originalId) {
                    nextTkb[cId][d][p] = {
                      ...slot,
                      subjectId: cleanId,
                      subjectRaw: shortName || updatedSubject.name
                    };
                  }
                }
              }
            }
          }
        });
        return nextTkb;
      });
    }

    // 3. Đồng bộ sang Phân công chuyên môn (assignments)
    if (setAssignments) {
      setAssignments(prev => (prev || []).map(a => {
        if (a.subjectId === originalId || a.subjectId === cleanId) {
          return {
            ...a,
            subjectId: cleanId,
            roomType: targetRoom
          };
        }
        return a;
      }));
    }

    // 4. Đồng bộ sang Định mức khối (gradeQuotas)
    if (setGradeQuotas && gradeQuotas) {
      setGradeQuotas(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(g => {
          if (next[g] && Array.isArray(next[g].subjects)) {
            next[g] = {
              ...next[g],
              subjects: next[g].subjects.map(s => {
                if (s.subjectId === originalId || s.subjectId === cleanId) {
                  return {
                    ...s,
                    subjectId: cleanId,
                    name: updatedSubject.name,
                    shortName: shortName,
                    roomType: targetRoom
                  };
                }
                return s;
              })
            };
          }
        });
        return next;
      });
    }

    // 5. Đồng bộ sang danh sách Phòng chức năng (rooms)
    if (setRooms && targetRoom !== 'LOP_HOC' && targetRoom !== 'SAN_TRUONG') {
      setRooms(prev => (prev || []).map(r => 
        r.id === targetRoom ? { ...r, subjectId: cleanId } : (r.subjectId === originalId ? { ...r, subjectId: cleanId } : r)
      ));
    }

    setIsModalOpen(false);
    setEditingSubject(null);
    triggerSaveNotification();
  };

  // Khôi phục danh mục chuẩn CTGDPT 2018
  const handleResetToStandard = () => {
    if (window.confirm('Khôi phục toàn bộ danh mục môn học về chuẩn CTGDPT 2018 của Bộ GD&ĐT?')) {
      setSubjects(JSON.parse(JSON.stringify(DEFAULT_SUBJECTS)));
      triggerSaveNotification();
      showBannerMessage('Đã khôi phục toàn bộ danh mục môn học về chuẩn CTGDPT 2018!');
    }
  };

  // Xuất Excel Danh mục môn
  const handleExportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Danh Mục Môn Học');
    ws.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã Môn Học', key: 'id', width: 16 },
      { header: 'Tên Môn Học', key: 'name', width: 25 },
      { header: 'Tên Viết Tắt (TKB)', key: 'shortName', width: 20 },
      { header: 'Nhóm Môn', key: 'category', width: 20 },
      { header: 'Phòng Chức Năng', key: 'room', width: 25 },
      { header: 'Môn Cố Định', key: 'isFixed', width: 15 },
      { header: 'Mô Tả', key: 'description', width: 35 }
    ];

    subjectList.forEach((s, idx) => {
      const room = availableRoomTypes.find(r => r.id === s.defaultRoom);
      ws.addRow({
        stt: idx + 1,
        id: s.id,
        name: s.name,
        shortName: s.shortName || s.name,
        category: s.category,
        room: room ? room.name : 'Phòng học tại lớp',
        isFixed: s.isFixed ? 'Có' : 'Không',
        description: s.description || ''
      });
    });

    await saveExcelJSWorkbook(wb, 'DanhMuc_MonHoc_TieuHoc.xlsx');
  };

  const triggerSaveNotification = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const showBannerMessage = (msg) => {
    setScanMessage(msg);
    setTimeout(() => setScanMessage(null), 4000);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* 1. Header & Actions */}
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
            <BookOpen size={28} color="#4f46e5" />
            <span>Quản Lý Danh Mục Môn Học & Hoạt Động Giáo Dục</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Cấu hình tên môn, mã hiển thị trên TKB, nhóm chuyên môn, phòng thực hành, màu sắc nhận diện và tự động đồng bộ sang TKB
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Nút Đọc Môn Từ Thời Khóa Biểu */}
          <button
            onClick={handleScanFromTimetable}
            title="Quét toàn bộ thời khóa biểu để đối soát và tự động trích xuất các môn học vào danh mục"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 700,
              background: '#e0e7ff',
              border: '1.5px solid #c7d2fe',
              color: '#3730a3',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.1)'
            }}
          >
            <Calendar size={16} color="#4f46e5" />
            <span>Đọc Môn Từ TKB</span>
          </button>

          {/* Nút Đọc Môn Từ File Excel */}
          <input
            type="file"
            ref={excelFileInputRef}
            onChange={handleImportFromExcelFile}
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
          />

          <button
            onClick={() => excelFileInputRef.current?.click()}
            title="Đọc nhanh danh mục môn học từ một file Excel thời khóa biểu"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              color: '#166534',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <FileSpreadsheet size={16} color="#16a34a" />
            <span>Đọc Môn Từ File Excel</span>
          </button>

          <button
            onClick={handleExportExcel}
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
            <span>Xuất Excel Danh Mục</span>
          </button>

          <button
            onClick={handleResetToStandard}
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
            <RotateCcw size={16} />
            <span>Khôi Phục Chuẩn GDPT 2018</span>
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
            <Plus size={16} />
            <span>Thêm Môn Học Mới</span>
          </button>
        </div>
      </div>

      {/* Thông báo quét môn học TKB / Excel */}
      {scanMessage && (
        <div className="animate-fade-in" style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600,
          fontSize: '0.875rem',
          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.08)'
        }}>
          <Sparkles size={18} color="#3b82f6" />
          <span>{scanMessage}</span>
        </div>
      )}

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="animate-fade-in" style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600,
          fontSize: '0.875rem'
        }}>
          <CheckCircle2 size={18} color="#10b981" />
          <span>Đã lưu và cập nhật đồng bộ môn học thành công!</span>
        </div>
      )}

      {/* CẢNH BÁO MÔN HỌC TRONG TKB CHƯA CÓ TRONG DANH MỤC */}
      {missingSubjectsInTimetable.length > 0 && (
        <div className="animate-fade-in" style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '1.5px solid #f59e0b',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '24px',
          boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.12)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fef3c7', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#92400e' }}>
                  Phát hiện {missingSubjectsInTimetable.length} môn học trong Thời khóa biểu chưa có trong Danh mục môn học!
                </h4>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.83rem', color: '#b45309' }}>
                  Các môn này đang có tiết trên TKB nhưng chưa được định cấu hình tên chuẩn, màu sắc và phòng học. Hãy thêm hoặc cấu hình ngay để hiển thị TKB chuẩn đẹp:
                </p>
              </div>
            </div>

            <button
              onClick={handleAddAllMissingSubjects}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '10px',
                background: '#d97706',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(217, 119, 6, 0.35)'
              }}
            >
              <Sparkles size={16} />
              <span>⚡ Thêm Tất Cả {missingSubjectsInTimetable.length} Môn Vào Danh Mục</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {missingSubjectsInTimetable.map((item, idx) => (
              <div 
                key={idx}
                style={{
                  background: '#ffffff',
                  border: '1px solid #fed7aa',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <div>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#9a3412', marginRight: '6px' }}>
                    {item.rawName || item.id}
                  </span>
                  <span style={{ fontSize: '0.72rem', background: '#ffedd5', color: '#c2410c', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    Mã: {item.id}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#78350f', marginLeft: '6px' }}>
                    ({item.count} tiết - {item.classIds.size} lớp)
                  </span>
                </div>

                <button
                  onClick={() => handleQuickEditMissing(item)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: '#fff7ed',
                    border: '1px solid #fdba74',
                    color: '#c2410c',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Edit3 size={12} />
                  <span>Sửa & Cấu hình</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* 4. Subjects Table */}
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
                <th style={{ padding: '14px 18px' }}>Môn Học & Hoạt Động</th>
                <th style={{ padding: '14px 18px', width: '130px' }}>Mã Môn</th>
                <th style={{ padding: '14px 18px', width: '140px' }}>Viết Tắt (TKB)</th>
                <th style={{ padding: '14px 18px', width: '180px' }}>Nhóm Môn Học</th>
                <th style={{ padding: '14px 18px', width: '220px' }}>Phòng Yêu Cầu</th>
                <th style={{ padding: '14px 18px', width: '160px' }}>Sử Dụng TKB</th>
                <th style={{ padding: '14px 18px' }}>Mô Tả & Ghi Chú</th>
                <th style={{ padding: '14px 18px', textAlign: 'right', width: '100px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    Không tìm thấy môn học nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((sub, index) => {
                  const room = availableRoomTypes.find(r => r.id === sub.defaultRoom);
                  const isSpecialRoom = room?.isSpecialized;

                  return (
                    <tr 
                      key={sub.id}
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

                      {/* Subject Name & Visual Badge */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: sub.bg || '#eff6ff',
                            border: `1.5px solid ${sub.border || '#bfdbfe'}`,
                            color: sub.text || '#1e40af',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                          }}>
                            <span>{sub.name}</span>
                          </div>
                          {sub.isFixed && (
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: '#f1f5f9',
                              color: '#64748b',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              Cố định
                            </span>
                          )}
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
                          {sub.id}
                        </span>
                      </td>

                      {/* Short Name */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          color: '#1e293b'
                        }}>
                          {sub.shortName || sub.name}
                        </span>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '999px',
                          background: '#f1f5f9',
                          color: '#475569',
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }}>
                          {sub.category}
                        </span>
                      </td>

                      {/* Room */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: isSpecialRoom ? '#fff7ed' : '#f8fafc',
                          border: `1px solid ${isSpecialRoom ? '#fed7aa' : '#e2e8f0'}`,
                          color: isSpecialRoom ? '#c2410c' : '#475569'
                        }}>
                          <Building2 size={13} />
                          <span>{room ? room.name : 'Phòng học tại lớp'}</span>
                        </span>
                      </td>

                      {/* Sử Dụng TKB */}
                      <td style={{ padding: '14px 18px' }}>
                        {(() => {
                          const usage = timetableUsage[sub.id];
                          if (usage && usage.count > 0) {
                            return (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '999px',
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                color: '#065f46',
                                fontWeight: 700,
                                fontSize: '0.78rem'
                              }}>
                                <CheckCircle2 size={13} color="#10b981" />
                                <span>{usage.count} tiết ({usage.classIds.size} lớp)</span>
                              </span>
                            );
                          }
                          return (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '999px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              color: '#94a3b8',
                              fontSize: '0.75rem'
                            }}>
                              Chưa xếp TKB
                            </span>
                          );
                        })()}
                      </td>

                      {/* Description */}
                      <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.8rem' }}>
                        {sub.description || '-'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => handleEdit(sub)}
                            title="Chỉnh sửa thông tin môn học"
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

                          {!sub.isFixed && (
                            <button
                              onClick={() => handleDelete(sub.id)}
                              title="Xóa môn học khỏi danh mục"
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
                          )}
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

      {/* 5. ADD / EDIT SUBJECT MODAL (PORTAL TO ROOT BODY) */}
      {isModalOpen && editingSubject && createPortal(
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
                <BookOpen size={24} color="#4f46e5" />
                <span>{editingSubject.id && subjects[editingSubject.id] ? 'Chỉnh Sửa Thông Tin Môn Học' : 'Thêm Môn Học Mới'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}>
                <X size={22} color="#94a3b8" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Mã Môn Học (Không dấu, viết hoa) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSubject.id || ''}
                    onChange={(e) => setEditingSubject({ ...editingSubject, id: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    placeholder="VD: STEM, KHOA_HOC, TIENG_ANH"
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      borderRadius: '8px', 
                      border: '1px solid #cbd5e1', 
                      fontSize: '0.875rem', 
                      background: '#ffffff',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)'
                    }}
                  />
                  {!editingSubject._isNew && (
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#6366f1', marginTop: '4px', lineHeight: 1.3 }}>
                      💡 Có thể đổi mã môn. Hệ thống sẽ tự động cập nhật đồng bộ sang TKB, Phân công và Định mức khối.
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Tên Viết Tắt (Hiển thị ô TKB) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSubject.shortName || ''}
                    onChange={(e) => setEditingSubject({ ...editingSubject, shortName: e.target.value })}
                    placeholder="VD: STEM, T.Anh, GDTC"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Tên Môn Học Đầy Đủ *
                </label>
                <input
                  type="text"
                  required
                  value={editingSubject.name || ''}
                  onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  placeholder="VD: Giáo dục STEM & Khám phá khoa học"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Nhóm Môn Học
                  </label>
                  <select
                    value={editingSubject.category || SUBJECT_CATEGORIES.CORE}
                    onChange={(e) => setEditingSubject({ ...editingSubject, category: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#ffffff' }}
                  >
                    {Object.entries(SUBJECT_CATEGORIES).map(([key, label]) => (
                      <option key={key} value={label}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Phòng Chức Năng Yêu Cầu
                  </label>
                  <select
                    value={editingSubject.defaultRoom || 'LOP_HOC'}
                    onChange={(e) => setEditingSubject({ ...editingSubject, defaultRoom: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#ffffff' }}
                  >
                    {availableRoomTypes.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Color Presets Picker */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                  🎨 Chọn Tông Màu Nhận Diện Trên Thời Khóa Biểu:
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '8px',
                  background: '#f8fafc',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  {COLOR_PRESETS.map((p, idx) => {
                    const isSelected = editingSubject.bg === p.bg && editingSubject.text === p.text;
                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setEditingSubject({
                          ...editingSubject,
                          color: p.color,
                          bg: p.bg,
                          border: p.border,
                          text: p.text
                        })}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          background: p.bg,
                          border: `2px solid ${isSelected ? p.color : p.border}`,
                          color: p.text,
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          textAlign: 'center',
                          boxShadow: isSelected ? '0 0 0 2px #4f46e5' : 'none'
                        }}
                      >
                        {p.name.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Mô Tả / Mục Tiêu Giáo Dục
                </label>
                <textarea
                  rows="2"
                  value={editingSubject.description || ''}
                  onChange={(e) => setEditingSubject({ ...editingSubject, description: e.target.value })}
                  placeholder="Ghi chú thêm về môn học..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
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
                  Lưu Thông Tin Môn Học
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

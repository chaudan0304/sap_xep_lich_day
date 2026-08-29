// src/components/SubjectManager.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Layers, 
  Sparkles, 
  Building2, 
  Palette, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Download,
  Flame,
  Bookmark
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { SUBJECT_CATEGORIES, ROOM_TYPES, SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects';
import * as XLSX from 'xlsx';

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
  setAssignments
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  // Filtered Subject List
  const filteredSubjects = useMemo(() => {
    return subjectList.filter(sub => {
      const matchSearch = 
        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.shortName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat = selectedCategory === 'ALL' || sub.category === selectedCategory;
      const matchRoom = 
        selectedRoomFilter === 'ALL' ||
        (selectedRoomFilter === 'SPECIALIZED' && sub.defaultRoom && sub.defaultRoom !== 'LOP_HOC') ||
        (selectedRoomFilter === 'CLASSROOM' && (!sub.defaultRoom || sub.defaultRoom === 'LOP_HOC'));

      return matchSearch && matchCat && matchRoom;
    });
  }, [subjectList, searchQuery, selectedCategory, selectedRoomFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = subjectList.length;
    const specializedRooms = subjectList.filter(s => s.defaultRoom && s.defaultRoom !== 'LOP_HOC' && s.defaultRoom !== 'SAN_TRUONG').length;
    const coreCount = subjectList.filter(s => s.category === SUBJECT_CATEGORIES.CORE).length;
    const specializedCount = subjectList.filter(s => s.category === SUBJECT_CATEGORIES.SPECIALIZED || s.category === SUBJECT_CATEGORIES.LANGUAGE).length;

    return { total, specializedRooms, coreCount, specializedCount };
  }, [subjectList]);

  // Mở modal thêm môn
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
      _isNew: true
    });
    setIsModalOpen(true);
  };

  // Mở modal sửa môn
  const handleEdit = (sub) => {
    setEditingSubject({ ...sub, _isNew: false });
    setIsModalOpen(true);
  };

  // Xóa môn
  const handleDelete = (subjectId) => {

    if (window.confirm(`Bạn có chắc chắn muốn xóa môn [${subjects[subjectId]?.name || subjectId}] khỏi danh mục môn học?`)) {
      setSubjects(prev => {
        const next = { ...prev };
        delete next[subjectId];
        return next;
      });
      triggerSaveNotification();
    }
  };

  // Lưu môn học & Đồng bộ sang Phân công & Phòng chức năng
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

    // 1. Cập nhật danh mục môn học
    setSubjects(prev => ({
      ...prev,
      [cleanId]: updatedSubject
    }));

    // 2. Đồng bộ roomType sang bảng Phân công chuyên môn (assignments)
    if (setAssignments) {
      setAssignments(prev => prev.map(a => 
        a.subjectId === cleanId ? { ...a, roomType: targetRoom } : a
      ));
    }

    // 3. Đồng bộ subjectId sang danh sách Phòng chức năng (rooms)
    if (setRooms && targetRoom !== 'LOP_HOC' && targetRoom !== 'SAN_TRUONG') {
      setRooms(prev => prev.map(r => 
        r.id === targetRoom ? { ...r, subjectId: cleanId } : r
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
    }
  };

  // Xuất Excel Danh mục môn
  const handleExportExcel = () => {
    const rows = subjectList.map((s, idx) => {
      const room = availableRoomTypes.find(r => r.id === s.defaultRoom);
      return {
        'STT': idx + 1,
        'Mã Môn Học': s.id,
        'Tên Môn Học': s.name,
        'Tên Viết Tắt (TKB)': s.shortName || s.name,
        'Nhóm Môn': s.category,
        'Phòng Chức Năng': room ? room.name : 'Phòng học tại lớp',
        'Môn Cố Định': s.isFixed ? 'Có' : 'Không',
        'Mô Tả': s.description || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh Mục Môn Học');
    XLSX.writeFile(wb, 'DanhMuc_MonHoc_TieuHoc.xlsx');
  };

  const triggerSaveNotification = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
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
            <span>Quản Lý Danh Mục Môn Học & Hoạt Động Giáo Dục ({subjectList.length})</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Cấu hình tên môn, mã hiển thị trên TKB, nhóm chuyên môn, phòng thực hành và màu sắc nhận diện
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
          <span>Đã lưu và cập nhật danh mục môn học thành công!</span>
        </div>
      )}

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
            <BookOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Tổng Số Môn & Hoạt Động</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
              {stats.total} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>môn học</span>
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
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
            <Layers size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Môn Cơ Bản & Văn Hóa</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
              {stats.coreCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>môn</span>
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
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Ngoại Ngữ & Năng Khiếu</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
              {stats.specializedCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>môn</span>
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
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Dùng Phòng Chức Năng</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
              {stats.specializedRooms} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>phòng chuyên biệt</span>
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
            placeholder="Tìm theo tên môn, mã viết tắt..."
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
          {/* Nhóm môn */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Nhóm:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
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
              <option value="ALL">Tất cả nhóm môn</option>
              {Object.entries(SUBJECT_CATEGORIES).map(([key, label]) => (
                <option key={key} value={label}>{label}</option>
              ))}
            </select>
          </div>

          {/* Phòng học */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Phòng:</span>
            <select
              value={selectedRoomFilter}
              onChange={(e) => setSelectedRoomFilter(e.target.value)}
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
              <option value="ALL">Tất cả phòng học</option>
              <option value="SPECIALIZED">Chỉ môn dùng phòng chức năng</option>
              <option value="CLASSROOM">Học tại lớp học thông thường</option>
            </select>
          </div>
        </div>
      </div>

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
                <th style={{ padding: '14px 18px' }}>Mô Tả & Ghi Chú</th>
                <th style={{ padding: '14px 18px', textAlign: 'right', width: '100px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
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
                    disabled={!editingSubject._isNew}
                    value={editingSubject.id || ''}
                    onChange={(e) => setEditingSubject({ ...editingSubject, id: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    placeholder="VD: STEM, KHOA_HOC"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: !editingSubject._isNew ? '#f1f5f9' : '#ffffff' }}
                  />
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

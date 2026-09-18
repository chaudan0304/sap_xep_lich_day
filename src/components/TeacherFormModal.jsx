// src/components/TeacherFormModal.jsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, 
  UserCheck, 
  X, 
  BookOpen, 
  Plus, 
  Trash2, 
  Building2, 
  Briefcase, 
  Calendar, 
  Clock, 
  Phone, 
  Mail, 
  Settings, 
  Check, 
  FolderKanban, 
  GraduationCap,
  FileText,
  AlertCircle
} from 'lucide-react';
import { DAYS_OF_WEEK } from '../constants/defaultCurriculum';
import { 
  getDepartmentById, 
  createDepartment, 
  isOfficeDepartment 
} from '../services/departmentService';

/**
 * Modal Chỉnh sửa / Thêm mới Hồ sơ Giáo viên
 * Thiết kế hiện đại, chuyên nghiệp, responsive 2 cột (Desktop/Tablet) và 1 cột (Mobile)
 * Width: 880px (820-900px), maxHeight: 90vh, Fixed Header, Scrollable Body, Sticky Footer
 */
export const TeacherFormModal = ({
  isOpen,
  onClose,
  editingTeacher,
  setEditingTeacher,
  onSave,
  departments = [],
  setDepartments,
  classes = [],
  subjects = {},
  teachers = [],
  assignments = [],
  onOpenDeptManager,
  toggleOffSession,
  handleDepartmentChange
}) => {
  // State mở form thêm tổ nhanh inline
  const [showAddDept, setShowAddDept] = useState(false);
  const [inlineDeptName, setInlineDeptName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !editingTeacher) return null;

  const isExisting = editingTeacher.id && teachers.some(t => t.id === editingTeacher.id);
  const isOffice = isOfficeDepartment(editingTeacher.department);

  // Xử lý thêm tổ mới nhanh ngay trong modal
  const handleQuickAddDepartment = (e) => {
    if (e) e.preventDefault();
    const cleanName = inlineDeptName.trim();
    if (!cleanName) {
      alert('⚠️ Vui lòng nhập tên tổ chuyên môn / văn phòng!');
      return;
    }

    const res = createDepartment(departments, { name: cleanName });
    if (!res.success) {
      alert('⚠️ ' + res.message);
      return;
    }

    // Cập nhật danh mục tổ chung
    if (setDepartments) {
      setDepartments(res.departments);
    }

    // Tự động chọn ngay tổ mới tạo cho giáo viên đang chỉnh sửa
    handleDepartmentChange(res.department.name, res.department.id);
    setInlineDeptName('');
    setShowAddDept(false);
  };

  // Form submit wrapper
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      onSave(e);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        maxWidth: '880px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        animation: 'fadeInModal 0.2s ease-out'
      }}>
        {/* ========================================================= */}
        {/* 1. FIXED HEADER */}
        {/* ========================================================= */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4338ca'
            }}>
              <UserCheck size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
                {isExisting ? 'Chỉnh Sửa Hồ Sơ Giáo Viên' : 'Thêm Mới Hồ Sơ Giáo Viên'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Cập nhật thông tin và phân công chuyên môn
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              padding: '8px',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            title="Đóng (Hủy)"
          >
            <X size={20} />
          </button>
        </div>

        {/* ========================================================= */}
        {/* 2. SCROLLABLE BODY */}
        {/* ========================================================= */}
        <form id="teacher-profile-form" onSubmit={handleSubmit} style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* ------------------------------------------------------- */}
          {/* SECTION A: THÔNG TIN CƠ BẢN */}
          {/* ------------------------------------------------------- */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px'
          }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#334155',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Users size={16} color="#4f46e5" />
              <span>Thông Tin Cơ Bản</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Mã Giáo Viên <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingTeacher.id || ''}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, id: e.target.value.trim() })}
                  placeholder="VD: GV_03"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    background: '#ffffff'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Mã Viết Tắt (Hiển thị TKB)
                </label>
                <input
                  type="text"
                  value={editingTeacher.code || ''}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, code: e.target.value })}
                  placeholder="VD: Nguyễn Nga, NGA.NT..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    background: '#ffffff'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Họ và Tên Giáo Viên <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={editingTeacher.name || ''}
                onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                placeholder="VD: Nguyễn Thị Nga"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  background: '#ffffff'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Ghi Chú
              </label>
              <input
                type="text"
                value={editingTeacher.note || ''}
                onChange={(e) => setEditingTeacher({ ...editingTeacher, note: e.target.value })}
                placeholder="VD: Dạy tăng cường khối 4-5, Tổ trưởng CM, Bồi dưỡng HSG..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  background: '#ffffff'
                }}
              />
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* SECTION B: THÔNG TIN CÔNG TÁC & TỔ CHUYÊN MÔN ĐỘNG */}
          {/* ------------------------------------------------------- */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px'
          }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#334155',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Briefcase size={16} color="#4f46e5" />
              <span>Thông Tin Công Tác</span>
            </div>

            {/* Hàng 1: Tổ Chuyên Môn & Loại Giáo Viên */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                    Tổ Chuyên Môn / Văn Phòng <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddDept(!showAddDept)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#4f46e5',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '0'
                      }}
                      title="Tạo tổ chuyên môn mới ngay lập tức"
                    >
                      <Plus size={13} />
                      <span>{showAddDept ? 'Đóng' : 'Thêm tổ'}</span>
                    </button>
                    {onOpenDeptManager && (
                      <button
                        type="button"
                        onClick={onOpenDeptManager}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '0'
                        }}
                        title="Mở bảng quản lý tổ chuyên môn đầy đủ"
                      >
                        <Settings size={12} />
                        <span>Quản lý tổ</span>
                      </button>
                    )}
                  </div>
                </div>

                <select
                  required
                  value={editingTeacher.departmentId || ''}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const found = getDepartmentById(departments, selectedId);
                    if (found) {
                      handleDepartmentChange(found.name, found.id);
                    } else if (selectedId === '') {
                      handleDepartmentChange('', '');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: isOffice ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                    background: isOffice ? '#f0fdfa' : '#ffffff',
                    color: isOffice ? '#0f766e' : '#1e293b',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">-- Chọn tổ chuyên môn / văn phòng --</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.isOffice || isOfficeDepartment(dept.name) ? '🏢 ' : '👥 '}{dept.name}
                    </option>
                  ))}
                </select>

                {/* Inline Fast Create Department Form */}
                {showAddDept && (
                  <div style={{
                    marginTop: '8px',
                    padding: '10px',
                    background: '#eef2ff',
                    border: '1px solid #c7d2fe',
                    borderRadius: '8px',
                    display: 'flex',
                    gap: '6px',
                    alignItems: 'center'
                  }}>
                    <input
                      type="text"
                      value={inlineDeptName}
                      onChange={(e) => setInlineDeptName(e.target.value)}
                      placeholder="Nhập tên tổ mới (VD: Tổ Tin Học...)"
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #818cf8',
                        fontSize: '0.8rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddDepartment}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#4f46e5',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Tạo & Chọn
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddDept(false)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: '#cbd5e1',
                        color: '#334155',
                        border: 'none',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Loại Giáo Viên <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={
                    isOffice ? 'Nhân viên văn phòng / Hành chính' :
                    (editingTeacher.isHomeroom ? 'Giáo viên chủ nhiệm' : 'Giáo viên bộ môn')
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Giáo viên chủ nhiệm') {
                      setEditingTeacher({ ...editingTeacher, isHomeroom: true });
                    } else if (val === 'Giáo viên bộ môn') {
                      setEditingTeacher({ ...editingTeacher, isHomeroom: false, homeroomClassId: '' });
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    background: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Giáo viên bộ môn">Giáo viên bộ môn</option>
                  <option value="Giáo viên chủ nhiệm">Giáo viên chủ nhiệm</option>
                  <option value="Ban Giám Hiệu">Ban Giám Hiệu</option>
                  <option value="Nhân viên văn phòng / Hành chính">Nhân viên văn phòng / Hành chính</option>
                </select>
              </div>
            </div>

            {/* Hàng 2: Chức vụ & Định mức */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Chức Vụ / Vị Trí Công Tác
                </label>
                <input
                  type="text"
                  value={editingTeacher.position || ''}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, position: e.target.value })}
                  placeholder={isOffice ? "VD: Kế toán, Văn thư, Y tế, Thư viện..." : "VD: GVCN, Tổ trưởng, Hiệu trưởng..."}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    background: '#ffffff'
                  }}
                />
                {isOffice && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {['Kế toán', 'Văn thư - Thủ quỹ', 'Y tế', 'Thư viện', 'Bảo vệ'].map(posName => (
                      <button
                        key={posName}
                        type="button"
                        onClick={() => setEditingTeacher({ ...editingTeacher, position: posName })}
                        style={{
                          fontSize: '0.68rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: editingTeacher.position === posName ? '#ccfbf1' : '#ffffff',
                          border: `1px solid ${editingTeacher.position === posName ? '#5eead4' : '#cbd5e1'}`,
                          color: editingTeacher.position === posName ? '#0f766e' : '#475569',
                          cursor: 'pointer',
                          fontWeight: editingTeacher.position === posName ? 700 : 500
                        }}
                      >
                        {posName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Định Mức Tiết Dạy / Tuần <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {isOffice ? (
                  <div>
                    <input
                      type="number"
                      disabled
                      value={0}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        background: '#f1f5f9',
                        color: '#64748b',
                        cursor: 'not-allowed'
                      }}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#0d9488', fontWeight: 700, marginTop: '4px', display: 'block' }}>
                      🏢 Tổ Văn Phòng: Miễn định mức tiết dạy (0 tiết/tuần)
                    </span>
                  </div>
                ) : (
                  <input
                    type="number"
                    min="0"
                    max="35"
                    value={editingTeacher.dinhMuc !== undefined ? editingTeacher.dinhMuc : (editingTeacher.weeklyQuota !== undefined ? editingTeacher.weeklyQuota : 23)}
                    onChange={(e) => setEditingTeacher({
                      ...editingTeacher,
                      dinhMuc: Number(e.target.value),
                      weeklyQuota: Number(e.target.value)
                    })}
                    placeholder="VD: 23 tiết/tuần"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      background: '#ffffff'
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* SECTION C: THÔNG TIN LIÊN HỆ */}
          {/* ------------------------------------------------------- */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px'
          }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#334155',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Phone size={16} color="#4f46e5" />
              <span>Thông Tin Liên Hệ</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Số Điện Thoại
                </label>
                <input
                  type="text"
                  value={editingTeacher.phone || ''}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, phone: e.target.value })}
                  placeholder="0912.xxx.xxx"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    background: '#ffffff'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={editingTeacher.email || ''}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, email: e.target.value })}
                  placeholder="gv@quynhlocb.edu.vn"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    background: '#ffffff'
                  }}
                />
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* SECTION D: GIÁO VIÊN CHỦ NHIỆM */}
          {/* ------------------------------------------------------- */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px'
          }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#334155',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <GraduationCap size={16} color="#4f46e5" />
              <span>Giáo Viên Chủ Nhiệm (GVCN)</span>
            </div>

            {isOffice ? (
              <div style={{
                background: '#ffffff',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                  Là Giáo Viên Chủ Nhiệm (GVCN)
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  color: '#0f766e',
                  background: '#f0fdfa',
                  border: '1px solid #ccfbf1',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontWeight: 700
                }}>
                  🔒 Đã tắt cho Tổ Văn Phòng
                </span>
              </div>
            ) : (
              <div style={{
                background: '#ffffff',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(editingTeacher.isHomeroom)}
                    onChange={(e) => setEditingTeacher({
                      ...editingTeacher,
                      isHomeroom: e.target.checked,
                      homeroomClassId: e.target.checked ? editingTeacher.homeroomClassId : ''
                    })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Là giáo viên chủ nhiệm (GVCN)</span>
                </label>

                {editingTeacher.isHomeroom && (
                  <div style={{ marginTop: '12px', paddingLeft: '28px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                      Phụ trách lớp:
                    </span>
                    <select
                      value={editingTeacher.homeroomClassId || ''}
                      onChange={(e) => setEditingTeacher({ ...editingTeacher, homeroomClassId: e.target.value })}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: '1px solid #818cf8',
                        background: '#eef2ff',
                        color: '#312e81',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">-- Chọn lớp chủ nhiệm --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} - Khối {c.grade}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ------------------------------------------------------- */}
          {/* SECTION E: PHÂN CÔNG GIẢNG DẠY (Cards Môn Học) */}
          {/* ------------------------------------------------------- */}
          {isOffice ? (
            <div style={{
              background: '#f0fdfa',
              padding: '24px 20px',
              borderRadius: '16px',
              border: '1.5px dashed #99f6e4',
              textAlign: 'center'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                margin: '0 auto 10px auto',
                borderRadius: '12px',
                background: '#ccfbf1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f766e'
              }}>
                <Building2 size={22} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f766e' }}>
                Đã Khóa Phân Công Giảng Dạy Cho Tổ Văn Phòng
              </h4>
              <p style={{ margin: '0 auto', fontSize: '0.8rem', color: '#115e59', maxWidth: '520px', lineHeight: 1.5 }}>
                Cán bộ, nhân viên <strong>Tổ Văn Phòng</strong> phụ trách công tác chuyên trách (hành chính, kế toán, y tế, thư viện, bảo vệ...), không tham gia giảng dạy bộ môn hay đứng lớp.
              </p>
            </div>
          ) : (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '18px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div>
                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#334155',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <BookOpen size={16} color="#4f46e5" />
                    <span>Phân Công Giảng Dạy ({(editingTeacher.subjectAssignments || []).length} môn)</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Không giới hạn số môn — Mỗi môn phụ trách các lớp tương ứng
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
                    padding: '7px 14px',
                    borderRadius: '8px',
                    background: '#4f46e5',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)'
                  }}
                >
                  <Plus size={14} />
                  <span>+ Thêm Môn Dạy Mới</span>
                </button>
              </div>

              {/* Danh sách các card môn học */}
              {(editingTeacher.subjectAssignments || []).length === 0 ? (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '2px dashed #cbd5e1',
                  color: '#64748b'
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>👨‍🏫</div>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 700, color: '#334155', fontSize: '0.85rem' }}>
                    Chưa phân công môn giảng dạy nào (0 môn)
                  </p>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Thích hợp cho Ban Giám Hiệu hoặc giáo viên chỉ phụ trách lớp chủ nhiệm.
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
                      gap: '4px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      background: '#4f46e5',
                      color: '#ffffff',
                      fontSize: '0.78rem',
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(editingTeacher.subjectAssignments || []).map((subItem, subIdx) => {
                    const subjectObj = subjects[subItem.subjectId] || { name: subItem.subjectId };
                    const assignedClassesCount = (subItem.classIds || []).length;

                    return (
                      <div
                        key={subIdx}
                        style={{
                          background: '#ffffff',
                          padding: '14px',
                          borderRadius: '12px',
                          border: '1px solid #c7d2fe',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                      >
                        {/* Header của Card môn */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '10px',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3730a3' }}>
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
                                padding: '5px 10px',
                                borderRadius: '7px',
                                border: '1px solid #818cf8',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                background: '#eef2ff',
                                color: '#312e81',
                                cursor: 'pointer'
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
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: '#e0e7ff',
                                color: '#3730a3',
                                border: '1px solid #c7d2fe',
                                cursor: 'pointer'
                              }}
                            >
                              Chọn Tất Cả Lớp
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
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                background: '#f8fafc',
                                color: '#64748b',
                                border: '1px solid #cbd5e1',
                                cursor: 'pointer'
                              }}
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
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <Trash2 size={12} />
                              <span>Xóa môn</span>
                            </button>
                          </div>
                        </div>

                        {/* Thống kê & Danh sách Lớp Checkbox Chips */}
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', marginBottom: '6px' }}>
                          Lớp dạy môn {subjectObj.name}: {assignedClassesCount} / {classes.length} lớp
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                          gap: '6px',
                          maxHeight: '130px',
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
                                  padding: '4px 6px',
                                  borderRadius: '6px',
                                  background: isChecked ? '#e0e7ff' : (currentTeacherObj ? '#fffbeb' : '#ffffff'),
                                  border: `1px solid ${isChecked ? '#818cf8' : (currentTeacherObj ? '#fde68a' : '#e2e8f0')}`,
                                  cursor: 'pointer',
                                  fontWeight: isChecked ? 700 : 500,
                                  fontSize: '0.75rem',
                                  color: isChecked ? '#312e81' : (currentTeacherObj ? '#92400e' : '#64748b'),
                                  transition: 'all 0.1s ease'
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
                                  <span style={{
                                    fontSize: '0.6rem',
                                    color: '#b45309',
                                    background: '#fef3c7',
                                    padding: '1px 3px',
                                    borderRadius: '3px',
                                    border: '1px solid #fde68a'
                                  }}>
                                    {currentTeacherObj.code || currentTeacherObj.name.split(' ').pop()}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* SECTION F: ĐĂNG KÝ BUỔI NGHỈ CHUYÊN MÔN */}
          {/* ------------------------------------------------------- */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px'
          }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#334155',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Calendar size={16} color="#4f46e5" />
              <span>Đăng Ký Buổi Nghỉ Chuyên Môn / Bồi Dưỡng</span>
            </div>

            {isOffice ? (
              <div style={{
                background: '#ffffff',
                padding: '14px 16px',
                borderRadius: '10px',
                border: '1px dashed #cbd5e1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Cán bộ, nhân viên <strong>Tổ Văn Phòng</strong> làm việc theo giờ hành chính cố định của trường, không áp dụng lịch đăng ký nghỉ giảng dạy.
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#0f766e',
                  background: '#f0fdfa',
                  border: '1px solid #ccfbf1',
                  padding: '4px 10px',
                  borderRadius: '6px'
                }}>
                  🏢 Lịch: Giờ Hành Chính
                </span>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${DAYS_OF_WEEK.length}, 1fr)`,
                gap: '8px'
              }}>
                {DAYS_OF_WEEK.map(day => {
                  const morningKey = `${day.id}_morning`;
                  const afternoonKey = `${day.id}_afternoon`;
                  const isMorningOff = (editingTeacher.offSessions || []).includes(morningKey);
                  const isAfternoonOff = (editingTeacher.offSessions || []).includes(afternoonKey);

                  return (
                    <div
                      key={day.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '10px 6px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#334155', marginBottom: '8px' }}>
                        {day.name}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => toggleOffSession(morningKey)}
                          style={{
                            padding: '6px 4px',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: '1px solid',
                            background: isMorningOff ? '#fef2f2' : '#f0fdf4',
                            borderColor: isMorningOff ? '#fca5a5' : '#bbf7d0',
                            color: isMorningOff ? '#b91c1c' : '#15803d',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isMorningOff ? 'Sáng: Nghỉ' : 'Sáng: Dạy'}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleOffSession(afternoonKey)}
                          style={{
                            padding: '6px 4px',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: '1px solid',
                            background: isAfternoonOff ? '#fef2f2' : '#f0fdf4',
                            borderColor: isAfternoonOff ? '#fca5a5' : '#bbf7d0',
                            color: isAfternoonOff ? '#b91c1c' : '#15803d',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isAfternoonOff ? 'Chiều: Nghỉ' : 'Chiều: Dạy'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* ========================================================= */}
        {/* 3. STICKY FOOTER */}
        {/* ========================================================= */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '12px',
          background: '#ffffff',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 20px',
              borderRadius: '10px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Hủy
          </button>
          <button
            type="submit"
            form="teacher-profile-form"
            disabled={isSaving}
            style={{
              padding: '9px 24px',
              borderRadius: '10px',
              background: isSaving ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Check size={16} />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

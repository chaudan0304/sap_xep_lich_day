// src/components/WelcomeModal.jsx
import React, { useState } from 'react';
import { 
  Sparkles, 
  PlusCircle, 
  FileSpreadsheet, 
  School, 
  BookOpen, 
  Layers, 
  ArrowRight, 
  X, 
  FolderOpen,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { QUYNH_LOC_DATA } from '../data/quynhLocSchoolData';
import { DEFAULT_GRADE_QUOTAS, PERIODS as DEFAULT_PERIODS } from '../constants/defaultCurriculum';
import { SUBJECTS as INITIAL_SUBJECTS } from '../constants/subjects';
import { DEFAULT_SCHOOL_INFO } from './SchoolSettingsModal';

export const WelcomeModal = ({
  isOpen,
  onClose,
  onSelectSampleData,
  onStartBlankProject,
  onOpenExcelModal,
  onOpenUserGuideModal,
  onImportBackupJsonClick
}) => {
  const [blankSchoolName, setBlankSchoolName] = useState('');
  const [blankDistrict, setBlankDistrict] = useState('');
  const [blankYear, setBlankYear] = useState('Năm học 2026 - 2027');
  const [showBlankConfig, setShowBlankConfig] = useState(false);

  if (!isOpen) return null;

  const handleConfirmBlank = () => {
    onStartBlankProject({
      name: blankSchoolName.trim() || 'Trường Tiểu học Mới',
      district: blankDistrict.trim() || 'Phòng GD&ĐT / UBND Phường',
      year: blankYear.trim() || 'Năm học 2026 - 2027',
      principal: '',
      scheduler: '',
      address: '',
      lunchBreak: '10:30 - 14:00'
    });
    setShowBlankConfig(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '720px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        animation: 'fadeIn 0.25s ease-out'
      }}>
        {/* Banner Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #4f46e5 100%)',
          padding: '28px 32px',
          color: '#ffffff',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '12px',
              borderRadius: '16px',
              display: 'flex',
              backdropFilter: 'blur(4px)'
            }}>
              <School size={32} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                  Chào Mừng Đến Với EduTimetable
                </h2>
                <span style={{
                  background: '#10b981',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '999px'
                }}>
                  Tiểu Học
                </span>
              </div>
              <p style={{ fontSize: '0.86rem', color: '#e0e7ff', margin: '4px 0 0 0' }}>
                Phần mềm Xếp Thời Khóa Biểu & Quản Lý Giảng Dạy Chuẩn CTGDPT 2018
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Đóng"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '28px 32px' }}>
          {!showBlankConfig ? (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Bạn muốn bắt đầu như thế nào?
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                  Vui lòng chọn hình thức khởi tạo dữ liệu cho phần mềm:
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Option 1: Dữ liệu mẫu Demo */}
                <button
                  onClick={() => {
                    onSelectSampleData();
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: '1.5px solid #bfdbfe',
                    background: '#eff6ff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.08)'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#dbeafe';
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = '#eff6ff';
                    e.currentTarget.style.borderColor = '#bfdbfe';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      background: '#3b82f6',
                      color: '#ffffff',
                      padding: '10px',
                      borderRadius: '12px',
                      display: 'flex'
                    }}>
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1e3a8a' }}>
                          Khám Phá Dữ Liệu Mẫu (Demo)
                        </span>
                        <span style={{
                          background: '#2563eb',
                          color: '#ffffff',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px'
                        }}>
                          Khuyên dùng xem thử
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#475569', margin: '3px 0 0 0' }}>
                        Nạp sẵn TKB mẫu chuẩn 23 lớp, 31 giáo viên, định mức môn & phòng học để trải nghiệm ngay.
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={20} color="#3b82f6" />
                </button>

                {/* Option 2: Bắt đầu dự án mới sạch sẽ */}
                <button
                  onClick={() => setShowBlankConfig(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: '1.5px solid #a7f3d0',
                    background: '#ecfdf5',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#d1fae5';
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = '#ecfdf5';
                    e.currentTarget.style.borderColor = '#a7f3d0';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      background: '#059669',
                      color: '#ffffff',
                      padding: '10px',
                      borderRadius: '12px',
                      display: 'flex'
                    }}>
                      <PlusCircle size={24} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#065f46' }}>
                          Tạo Thời Khóa Biểu Mới Cho Trường Của Bạn
                        </span>
                        <span style={{
                          background: '#059669',
                          color: '#ffffff',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px'
                        }}>
                          Trống 100%
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#475569', margin: '3px 0 0 0' }}>
                        Bắt đầu với dữ liệu sạch hoàn toàn, sẵn sàng nhập danh sách giáo viên & lớp học của bạn.
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={20} color="#059669" />
                </button>

                {/* Option 3: Nạp từ Excel có sẵn */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenExcelModal();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderRadius: '16px',
                    border: '1.5px solid #e2e8f0',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      background: '#0284c7',
                      color: '#ffffff',
                      padding: '10px',
                      borderRadius: '12px',
                      display: 'flex'
                    }}>
                      <FileSpreadsheet size={24} />
                    </div>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                        Nhập Dữ Liệu Từ File Excel
                      </span>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '3px 0 0 0' }}>
                        Tự động đọc danh sách Giáo viên, Phân công chuyên môn và Thời khóa biểu từ Excel.
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={20} color="#64748b" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Thông Tin Trường Học Của Bạn
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                  Nhập thông tin cơ bản để khởi tạo dự án mới:
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Tên Trường Tiểu Học:
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Trường Tiểu học Nguyễn Huệ"
                    value={blankSchoolName}
                    onChange={e => setBlankSchoolName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Cơ Quan Quản Lý / Cấp Trên:
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Phòng GD&ĐT Quận Hải Châu"
                      value={blankDistrict}
                      onChange={e => setBlankDistrict(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Năm Học:
                    </label>
                    <input
                      type="text"
                      placeholder="Năm học 2026 - 2027"
                      value={blankYear}
                      onChange={e => setBlankYear(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowBlankConfig(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBlank}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    background: '#059669',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
                  }}
                >
                  Bắt Đầu Xếp Lịch Ngay
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div style={{
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          padding: '12px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>Bạn có thể chuyển đổi hoặc nạp lại dữ liệu mẫu bất cứ lúc nào trong menu Header.</span>
            {onOpenUserGuideModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenUserGuideModal();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4f46e5',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                📖 Xem Cẩm Nang Hướng Dẫn Sử Dụng
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#334155',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

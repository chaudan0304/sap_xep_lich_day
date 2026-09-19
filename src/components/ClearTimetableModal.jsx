// src/components/ClearTimetableModal.jsx
// Hộp thoại xác nhận Xóa Thời Khóa Biểu thông minh: Hỗ trợ bảo lưu các tiết học đã Khóa Cố Định

import React, { useMemo } from 'react';
import { 
  Trash2, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  X,
  ShieldCheck,
  Calendar,
  GraduationCap
} from 'lucide-react';

export const ClearTimetableModal = ({
  isOpen,
  onClose,
  classes = [],
  timetable = {},
  onConfirmClear
}) => {
  // Thống kê số tiết đã xếp và số tiết đã khóa cố định
  const stats = useMemo(() => {
    let totalAssigned = 0;
    let lockedCount = 0;

    if (timetable && typeof timetable === 'object') {
      Object.values(timetable).forEach(classDays => {
        if (!classDays || typeof classDays !== 'object') return;
        Object.values(classDays).forEach(daySlots => {
          if (!daySlots || typeof daySlots !== 'object') return;
          Object.values(daySlots).forEach(slot => {
            if (slot && (slot.subjectId || slot.subjectRaw)) {
              totalAssigned++;
              if (slot.isLocked) {
                lockedCount++;
              }
            }
          });
        });
      });
    }

    return {
      totalAssigned,
      lockedCount,
      unlockedCount: totalAssigned - lockedCount
    };
  }, [timetable]);

  const { totalAssigned, lockedCount, unlockedCount } = stats;

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div 
        className="animate-scale-up"
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.35)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header Modal */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: lockedCount > 0 ? 'rgba(99, 102, 241, 0.3)' : 'rgba(239, 68, 68, 0.3)',
              padding: '10px',
              borderRadius: '12px',
              border: `1px solid ${lockedCount > 0 ? 'rgba(165, 180, 252, 0.4)' : 'rgba(248, 113, 113, 0.4)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {lockedCount > 0 ? <ShieldCheck size={24} color="#a5b4fc" /> : <Trash2 size={24} color="#fca5a5" />}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Xác Nhận Xóa Thời Khóa Biểu
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#cbd5e1' }}>
                {lockedCount > 0 
                  ? `Đang có ${lockedCount} tiết học được ghim khóa cố định` 
                  : 'Dọn dẹp lịch học để chuẩn bị xếp lại từ đầu'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nội dung chi tiết */}
        <div style={{ padding: '24px' }}>
          {/* Thanh thống kê */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            marginBottom: '20px'
          }}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>Tổng Lớp</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>{classes.length}</div>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>Tổng Tiết Đã Xếp</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0284c7' }}>{totalAssigned}</div>
            </div>

            <div style={{
              background: lockedCount > 0 ? '#eef2ff' : '#f8fafc',
              border: `1px solid ${lockedCount > 0 ? '#c7d2fe' : '#e2e8f0'}`,
              borderRadius: '10px',
              padding: '10px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: lockedCount > 0 ? '#4338ca' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Lock size={12} />
                <span>Tiết Cố Định</span>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: lockedCount > 0 ? '#4338ca' : '#64748b' }}>
                {lockedCount}
              </div>
            </div>
          </div>

          {/* Lựa chọn xóa nếu CÓ tiết cố định */}
          {lockedCount > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Lựa chọn 1: Giữ lại tiết cố định (Khuyên dùng) */}
              <div
                onClick={() => onConfirmClear(true)}
                style={{
                  border: '2px solid #6366f1',
                  background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                  borderRadius: '14px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '16px',
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
                }}>
                  ★ KHUYÊN DÙNG
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    background: '#ffffff',
                    color: '#4f46e5',
                    padding: '8px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 6px rgba(79, 70, 229, 0.15)'
                  }}>
                    <ShieldCheck size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#312e81' }}>
                      Xóa tiết chưa khóa & Giữ nguyên {lockedCount} tiết CỐ ĐỊNH
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#4b5563', marginTop: '4px', lineHeight: 1.45 }}>
                      Bảo lưu an toàn 100% các tiết đã ghim khóa 🔒 (ví dụ: Chào cờ, Sinh hoạt lớp, các tiết chuyên đề cố định...). Hệ thống chỉ dọn dẹp <strong>{unlockedCount} tiết tự do</strong> để bạn xếp lại.
                    </div>
                  </div>
                </div>
              </div>

              {/* Lựa chọn 2: Xóa sạch toàn bộ */}
              <div
                onClick={() => onConfirmClear(false)}
                style={{
                  border: '1px solid #fecdd3',
                  background: '#fff1f2',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#ffe4e6';
                  e.currentTarget.style.borderColor = '#fda4af';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#fff1f2';
                  e.currentTarget.style.borderColor = '#fecdd3';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    background: '#ffffff',
                    color: '#e11d48',
                    padding: '8px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 6px rgba(225, 29, 72, 0.12)'
                  }}>
                    <Trash2 size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#9f1239' }}>
                      Xóa sạch toàn bộ (Kể cả {lockedCount} tiết cố định)
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#881337', marginTop: '3px', lineHeight: 1.4 }}>
                      Xóa trắng hoàn toàn tất cả {totalAssigned} tiết học trên toàn trường. Bạn sẽ phải xếp lại từ đầu.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Không có tiết cố định nào */
            <div>
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.5 }}>
                  Hiện thời khóa biểu có <strong>{totalAssigned} tiết đã xếp</strong> và chưa có tiết nào được đánh dấu <strong>Cố định (Khóa 🔒)</strong>.
                  <div style={{ marginTop: '6px', color: '#78350f', fontSize: '0.76rem' }}>
                    💡 <strong>Mẹo hay:</strong> Nếu bạn muốn giữ lại các tiết như <em>Chào cờ, Sinh hoạt lớp, Tiếng Anh chuyên đề...</em>, hãy vào <strong>Studio Xếp Lịch</strong> và nhấn biểu tượng <strong>Ổ khóa 🔓</strong> trên ô tiết học để cố định trước khi xóa!
                  </div>
                </div>
              </div>

              <button
                onClick={() => onConfirmClear(false)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #e11d48, #be123c)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Trash2 size={16} />
                <span>Xác Nhận Xóa Sạch {totalAssigned} Tiết Thời Khóa Biểu</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div style={{
          background: '#f8fafc',
          padding: '14px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
            ℹ️ Thao tác này có thể <strong>Hoàn tác (Undo)</strong> bất kỳ lúc nào.
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
            onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
          >
            Hủy Bỏ
          </button>
        </div>
      </div>
    </div>
  );
};

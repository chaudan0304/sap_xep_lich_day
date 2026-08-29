// src/components/UpdateModal.jsx
import React, { useState } from 'react';
import { 
  Sparkles, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X,
  PackageCheck,
  ArrowUpCircle
} from 'lucide-react';
import { CURRENT_APP_VERSION, checkForAppUpdates } from '../services/updateChecker';

export const UpdateModal = ({ isOpen, onClose, initialUpdateInfo, onUpdateInfoChange }) => {
  const [updateInfo, setUpdateInfo] = useState(initialUpdateInfo || null);
  const [isChecking, setIsChecking] = useState(false);

  if (!isOpen) return null;

  const handleManualCheck = async () => {
    setIsChecking(true);
    const result = await checkForAppUpdates();
    setUpdateInfo(result);
    if (onUpdateInfoChange) onUpdateInfoChange(result);
    setIsChecking(false);
  };

  const hasUpdate = updateInfo?.hasUpdate;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Modal Header */}
        <div style={{
          background: hasUpdate ? 'linear-gradient(135deg, #1e3a8a, #3b82f6)' : 'linear-gradient(135deg, #0f172a, #334155)',
          padding: '20px 24px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '10px',
              borderRadius: '12px',
              display: 'flex'
            }}>
              {hasUpdate ? <ArrowUpCircle size={28} color="#93c5fd" /> : <PackageCheck size={28} color="#6ee7b7" />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                {hasUpdate ? 'Bản Cập Nhật Mới Đã Sẵn Sàng!' : 'Kiểm Tra Bản Cập Nhật'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.8)', margin: '2px 0 0 0' }}>
                Phiên bản hiện tại trên máy của bạn: <strong>v{CURRENT_APP_VERSION}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>
          {hasUpdate ? (
            <div>
              {/* Version Comparison Badge */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '18px'
              }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Phiên bản mới nhất</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1d4ed8' }}>
                    v{updateInfo.latestVersion}
                  </div>
                </div>
                <div style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Sparkles size={14} /> Khuyên dùng
                </div>
              </div>

              {/* Release Notes */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  📝 Nội dung cải tiến & tính năng mới:
                </div>
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px',
                  fontSize: '0.82rem',
                  color: '#475569',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-line',
                  lineHeight: '1.5'
                }}>
                  {updateInfo.releaseNotes}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <a
                  href={updateInfo.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#1d4ed8'}
                  onMouseOut={e => e.currentTarget.style.background = '#2563eb'}
                >
                  <Download size={18} />
                  <span>Tải Bản Cập Nhật Ngay</span>
                </a>

                {updateInfo.htmlUrl && (
                  <a
                    href={updateInfo.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={16} />
                    <span>Chi tiết GitHub</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 10px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                border: '1px solid #a7f3d0'
              }}>
                <CheckCircle2 size={36} color="#059669" />
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                Phần Mềm Đang Ở Phiên Bản Mới Nhất
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '380px', margin: '0 auto 20px auto' }}>
                Bạn đang sử dụng phiên bản <strong>v{CURRENT_APP_VERSION}</strong>. Hệ thống sẽ tự động thông báo khi có bất kỳ tính năng mới nào được phát hành.
              </p>

              <button
                onClick={handleManualCheck}
                disabled={isChecking}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: isChecking ? 'not-allowed' : 'pointer'
                }}
              >
                <RefreshCw size={16} className={isChecking ? 'spin' : ''} />
                <span>{isChecking ? 'Đang kiểm tra kết nối...' : 'Kiểm tra lại ngay'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: '#64748b'
        }}>
          <span>Hệ thống Xếp Thời Khóa Biểu Tiểu Học Chuẩn CTGDPT 2018</span>
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

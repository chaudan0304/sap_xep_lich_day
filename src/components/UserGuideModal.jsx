// src/components/UserGuideModal.jsx
import React, { useState } from 'react';
import { 
  BookOpen, 
  X, 
  Sparkles, 
  Calendar, 
  Printer, 
  Users, 
  Bookmark, 
  Layers, 
  Grid3X3, 
  Building2, 
  FileSpreadsheet, 
  Save, 
  Upload, 
  Trash2, 
  Lock, 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Lightbulb, 
  HelpCircle,
  School,
  Settings,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export const UserGuideModal = ({ isOpen, onClose, onNavigateTab }) => {
  const [activeCategory, setActiveCategory] = useState('workflow');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const categories = [
    { id: 'workflow', label: '1. Quy Trình 5 Bước Chuẩn', icon: Sparkles, badge: 'Quan trọng' },
    { id: 'studio', label: '2. Studio Xếp Lịch & Tác Vụ', icon: Calendar, badge: 'Chính' },
    { id: 'print', label: '3. In Thời Khóa Biểu A4', icon: Printer, badge: 'Mới' },
    { id: 'autoschedule', label: '4. Tự Động Xếp Lịch AI', icon: Sparkles, badge: 'AI' },
    { id: 'teachers', label: '5. Giáo Viên & Định Mức Môn', icon: Users, badge: null },
    { id: 'excel_backup', label: '6. Nhập/Xuất Excel & Sao Lưu', icon: FileSpreadsheet, badge: null },
    { id: 'faq', label: '7. Mẹo Hay & Hỏi Đáp (FAQ)', icon: Lightbulb, badge: 'Mẹo' },
  ];

  return (
    <div 
      className="portal-userguide-modal no-print"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '1200px',
          height: '90vh',
          maxHeight: '850px',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              padding: '10px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BookOpen size={24} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                  Cẩm Nang & Hướng Dẫn Sử Dụng Chi Tiết
                </h2>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px'
                }}>
                  EduTimetable Tiểu Học
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#c7d2fe', margin: '3px 0 0 0' }}>
                Hướng dẫn từng bước giúp thầy/cô thành thạo xếp lịch chuẩn CTGDPT 2018
              </p>
            </div>
          </div>

          {/* Search Box & Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '10px',
              padding: '6px 12px'
            }}>
              <Search size={15} color="#c7d2fe" />
              <input
                type="text"
                placeholder="Tìm hướng dẫn (VD: sĩ số, in, đổi tiết...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  width: '200px'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', color: '#c7d2fe', cursor: 'pointer', padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.5)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Navigation Sidebar + Right Content View */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* LEFT SIDEBAR NAVIGATION */}
          <div style={{
            width: '280px',
            background: '#f8fafc',
            borderRight: '1px solid #e2e8f0',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            overflowY: 'auto'
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', padding: '4px 10px', letterSpacing: '0.05em' }}>
              Danh Mục Hướng Dẫn
            </div>

            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeCategory === cat.id && !searchQuery;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSearchQuery('');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: isSelected ? '1px solid #c7d2fe' : '1px solid transparent',
                    background: isSelected ? '#eef2ff' : 'transparent',
                    color: isSelected ? '#3730a3' : '#475569',
                    fontWeight: isSelected ? 800 : 600,
                    fontSize: '0.84rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected) e.currentTarget.style.background = '#f1f5f9';
                  }}
                  onMouseOut={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon size={16} color={isSelected ? '#4f46e5' : '#64748b'} />
                    <span>{cat.label}</span>
                  </div>
                  {cat.badge && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '6px',
                      background: isSelected ? '#4f46e5' : '#e2e8f0',
                      color: isSelected ? '#ffffff' : '#64748b'
                    }}>
                      {cat.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Quick Tips Box in Sidebar */}
            <div style={{
              marginTop: 'auto',
              padding: '12px',
              borderRadius: '12px',
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              color: '#92400e',
              fontSize: '0.75rem',
              lineHeight: 1.4
            }}>
              <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Lightbulb size={14} color="#d97706" />
                <span>Mẹo Nhớ Nhanh</span>
              </div>
              Bấm biểu tượng <strong>Ổ Khóa 🔒</strong> tại tiết Chào cờ hoặc Sinh hoạt lớp trước khi chạy Tự Động Xếp Lịch để cố định vị trí mong muốn!
            </div>
          </div>

          {/* RIGHT CONTENT DISPLAY */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px 36px',
            background: '#ffffff',
            lineHeight: 1.6
          }}>

            {/* If user is searching */}
            {searchQuery ? (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>
                  Kết quả tìm kiếm cho: "{searchQuery}"
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <SearchGuideResults query={searchQuery} />
                </div>
              </div>
            ) : (
              <>
                {/* ───────────────────────────────────────────────────────────── */}
                {/* TAB 1: WORKFLOW 5 BƯỚC CHUẨN                                  */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeCategory === 'workflow' && (
                  <div className="animate-fade-in">
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4f46e5', fontWeight: 800, fontSize: '0.85rem' }}>
                        <Sparkles size={18} />
                        <span>QUY TRÌNH CHUẨN NHẤT ĐỂ XẾP THỜI KHÓA BIỂU</span>
                      </div>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 8px 0' }}>
                        5 Bước Hoàn Thiện Thời Khóa Biểu Trường Tiểu Học
                      </h2>
                      <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                        Hệ thống được thiết kế theo đúng quy trình nghiệp vụ thực tế của các trường tiểu học tại Việt Nam theo chương trình GDPT 2018 (32 tiết/tuần/lớp).
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      
                      {/* Step 1 */}
                      <div style={{
                        padding: '16px 20px',
                        borderRadius: '14px',
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          background: '#4f46e5',
                          color: '#ffffff',
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          flexShrink: 0
                        }}>
                          1
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0' }}>
                            Khởi tạo dự án & Cài đặt thông tin trường
                          </h4>
                          <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 8px 0' }}>
                            Bấm vào <strong>[📂 Dự Án]</strong> ở góc trên để chọn nạp <em>Dữ liệu mẫu chuẩn (Quỳnh Lộc - 23 lớp)</em> để làm quen, hoặc chọn <em>Dự án trắng</em>. Sau đó nhấp vào <strong>[🏫 Tên Trường (Sửa)]</strong> để đặt tên trường, hiệu trưởng, năm học và khung giờ tiết học.
                          </p>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ fontSize: '0.75rem', background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                              Khung giờ sáng (Tiết 1-4) & chiều (Tiết 5-7)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div style={{
                        padding: '16px 20px',
                        borderRadius: '14px',
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          background: '#0284c7',
                          color: '#ffffff',
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          flexShrink: 0
                        }}>
                          2
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0' }}>
                            Kiểm tra Danh sách Giáo viên & Buổi đăng ký nghỉ
                          </h4>
                          <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 8px 0' }}>
                            Chuyển sang tab <strong>[Danh Sách Giáo Viên]</strong> để thêm/sửa giáo viên, tên viết tắt hiển thị trên TKB, gán Giáo Viên Chủ Nhiệm (GVCN) và đặc biệt là <strong>Buổi Đăng Ký Nghỉ (off)</strong> (ví dụ: Nghỉ Sáng Thứ 2, Nghỉ Chiều Thứ 6). Thuật toán AI sẽ tự động tránh xếp lịch vào các buổi này.
                          </p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div style={{
                        padding: '16px 20px',
                        borderRadius: '14px',
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          background: '#059669',
                          color: '#ffffff',
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          flexShrink: 0
                        }}>
                          3
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0' }}>
                            Xác nhận Định Mức Môn (Khối 1 - 5) & Phân Công Chuyên Môn
                          </h4>
                          <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 8px 0' }}>
                            Vào tab <strong>[Định Mức Khối]</strong> kiểm tra số tiết quy định của từng môn (chuẩn 32 tiết/tuần). Sau đó vào tab <strong>[Phân Công Chuyên Môn]</strong> để gán thầy cô nào dạy môn gì ở từng lớp cụ thể.
                          </p>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div style={{
                        padding: '16px 20px',
                        borderRadius: '14px',
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          background: '#d97706',
                          color: '#ffffff',
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          flexShrink: 0
                        }}>
                          4
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0' }}>
                            Xếp lịch tại Studio hoặc Bấm [Tự Động Xếp Lịch AI]
                          </h4>
                          <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 8px 0' }}>
                            Bấm nút <strong>[⚡ Tự Động Xếp Lịch]</strong> trên Header: Hệ thống AI sẽ tự động giải toán xếp toàn bộ các lớp trong vòng vài giây, đảm bảo 0 trùng giáo viên, 0 trùng phòng chức năng và chuẩn định mức sáng/chiều. Sau đó vào <strong>[Studio Xếp Lịch]</strong> để tinh chỉnh thủ công, hoán đổi tiết nếu muốn.
                          </p>
                        </div>
                      </div>

                      {/* Step 5 */}
                      <div style={{
                        padding: '16px 20px',
                        borderRadius: '14px',
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          background: '#7c3aed',
                          color: '#ffffff',
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          flexShrink: 0
                        }}>
                          5
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0' }}>
                            In Thời Khóa Biểu chuẩn A4 & Xuất File Excel
                          </h4>
                          <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 8px 0' }}>
                            Bấm <strong>[In Thời Khóa Biểu]</strong> trong Studio để xem trước tương tác A4, in từng lớp hoặc in hàng loạt toàn trường. Hoặc vào <strong>[Ma Trận Toàn Trường]</strong> / <strong>[Excel]</strong> để xuất file sổ thời khóa biểu hoàn chỉnh gửi Phòng GD hoặc dán thông báo.
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* TAB 2: STUDIO XẾP LỊCH                                        */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeCategory === 'studio' && (
                  <div className="animate-fade-in">
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>
                      Studio Xếp Lịch & Các Thao Tác Trực Quan
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
                      Nơi thầy/cô điều chỉnh, kéo thả, hoán đổi tiết học và quản lý sĩ số từng lớp một cách chi tiết.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                      
                      {/* Card 1: Kéo thả từ Giỏ */}
                      <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fafafa' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '1.1rem' }}>🎒</span>
                          <span>Kéo thả từ Giỏ Môn Học (Bên Trái)</span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0 }}>
                          Cột trái liệt kê tất cả các môn của lớp cùng số tiết cần xếp (ví dụ: Toán 5/5, Tiếng Việt 12/12). Thầy cô có thể kéo thẻ môn học thả vào ô trống bất kỳ trên bảng.
                        </p>
                      </div>

                      {/* Card 2: Chế độ Hoán đổi */}
                      <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fafafa' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <ArrowLeftRight size={18} color="#2563eb" />
                          <span>Chế Độ Hoán Đổi Vị Trí (Swap)</span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0 }}>
                          Bấm vào biểu tượng <strong>⇄ (Đổi chỗ)</strong> tại bất kỳ ô nào trên bảng, sau đó nhấp vào ô đích muốn đổi. Hệ thống sẽ tự động hoán đổi vị trí 2 tiết học ngay lập tức.
                        </p>
                      </div>

                      {/* Card 3: Khóa tiết cố định */}
                      <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fafafa' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <Lock size={18} color="#d97706" />
                          <span>Khóa Tiết Học Cố Định (🔒 Lock)</span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0 }}>
                          Bấm vào icon ổ khóa trên tiết học. Khi tiết bị khóa (🔒), tính năng Tự động xếp lịch sẽ <strong>không bao giờ di chuyển tiết đó</strong>. Rất hữu ích cho tiết Chào cờ (Sáng T2) hay Sinh hoạt lớp (Chiều T6).
                        </p>
                      </div>

                      {/* Card 4: Sửa sĩ số lớp */}
                      <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fafafa' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <Users size={18} color="#059669" />
                          <span>Chỉnh Sửa Sĩ Số Lớp (Từng lớp & Theo Khối)</span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0 }}>
                          Nhấp trực tiếp vào <strong>`Sĩ số: 35 HS`</strong> (hoặc icon cây bút ✏️) trên thanh chọn lớp để gõ nhanh số học sinh. Hoặc mở bảng quản lý sĩ số để gán hàng loạt theo khối (Khối 1 đến 5).
                        </p>
                      </div>

                      {/* Card 5: Xóa lịch 1 lớp vs Xóa toàn trường */}
                      <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #fee2e2', background: '#fff5f5' }}>
                        <div style={{ fontWeight: 800, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <Trash2 size={18} color="#dc2626" />
                          <span>Xóa Lịch Lớp (Studio) vs Xóa Toàn Trường (Header)</span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: 0 }}>
                          - <strong>[Xóa Lịch Lớp]:</strong> Nằm ở Studio, chỉ xóa riêng lịch của lớp đang mở (các lớp khác giữ nguyên).<br/>
                          - <strong>[Xóa TKB]:</strong> Nằm ở Header, xóa sạch toàn bộ các lớp của trường để xếp lại từ đầu.
                        </p>
                      </div>

                      {/* Card 6: Chuyển lớp & Lọc Khối */}
                      <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fafafa' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <Bookmark size={18} color="#7c3aed" />
                          <span>Bộ Lọc Khối 1 - 5 & Phím chuyển lớp</span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0 }}>
                          Dễ dàng lọc theo từng khối [Khối 1]..[Khối 5] để giao diện gọn gàng. Sử dụng nút mũi tên <strong>`◀`</strong> và <strong>`▶`</strong> để chuyển nhanh giữa các lớp liền kề.
                        </p>
                      </div>

                    </div>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* TAB 3: IN THỜI KHÓA BIỂU                                     */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeCategory === 'print' && (
                  <div className="animate-fade-in">
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>
                      Xem Trước & In Ấn Thời Khóa Biểu Chuẩn A4
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
                      Hệ thống hỗ trợ in ấn trực quan, định dạng chuẩn quốc gia trên 1 trang giấy A4 đứng (Portrait).
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: '0 0 6px 0' }}>
                          1. Xem trước tương tác trực tiếp (Live Preview)
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                          Khi bấm <strong>[In Thời Khóa Biểu]</strong> trong Studio, màn hình sẽ hiển thị trang A4 thật với đầy đủ Quốc hiệu, Tiêu ngữ, Tên trường, Tên lớp, Giáo viên chủ nhiệm, Sĩ số và bảng lịch 32 tiết. Có thể phóng to thu nhỏ từ 50% đến 125% để kiểm tra.
                        </p>
                      </div>

                      <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: '0 0 6px 0' }}>
                          2. Phạm vi in linh hoạt (Lớp hiện tại / Từng khối / Toàn trường)
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                          - <strong>Chỉ in lớp đang chọn:</strong> In 1 trang A4 duy nhất cho lớp.<br/>
                          - <strong>In theo khối:</strong> Chỉ in các lớp thuộc Khối 1, Khối 2...<br/>
                          - <strong>In toàn trường:</strong> Tự động ngắt trang (`page-break`) in toàn bộ 23 lớp thành 23 trang A4 chuẩn xác mà không bị lẹm viền.
                        </p>
                      </div>

                      <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: '0 0 6px 0' }}>
                          3. Tùy chọn hiển thị & Chữ ký
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                          Có thể bật/tắt: Tên giáo viên bộ môn trong từng ô, Khung giờ từng tiết học, Dòng nghỉ trưa bán trú, và phần chữ ký chân trang (Hiệu trưởng & Người lập biểu).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* TAB 4: TỰ ĐỘNG XẾP LỊCH AI                                   */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeCategory === 'autoschedule' && (
                  <div className="animate-fade-in">
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>
                      Thuật Toán Tự Động Xếp Lịch (AI Auto-Scheduler)
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
                      Giải quyết bài toán xếp thời khóa biểu tối ưu cho toàn trường chỉ trong 1 cú nhấp chuột.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ padding: '16px', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fef3c7' }}>
                        <div style={{ fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <CheckCircle2 size={16} color="#d97706" />
                          <span>Các ràng buộc cứng được AI đảm bảo 100%:</span>
                        </div>
                        <ul style={{ fontSize: '0.85rem', color: '#78350f', margin: '6px 0 0 16px', padding: 0 }}>
                          <li><strong>Không trùng giờ giáo viên:</strong> 1 giáo viên không thể dạy 2 lớp khác nhau trong cùng 1 tiết.</li>
                          <li><strong>Không vi phạm buổi đăng ký nghỉ:</strong> Giáo viên nghỉ buổi nào sẽ không bao giờ bị xếp vào buổi đó.</li>
                          <li><strong>Không trùng phòng chức năng:</strong> Phòng Tin học, Nhà Đa Năng/Sân Thể Chất không bị xếp quá số lượng phòng thực có.</li>
                          <li><strong>Định mức sáng/chiều:</strong> Các môn Toán, Tiếng Việt, Tiếng Anh được ưu tiên buổi sáng; Hoạt động tăng cường/củng cố vào buổi chiều.</li>
                          <li><strong>Bảo toàn tiết khóa (🔒):</strong> Giữ nguyên chính xác vị trí các tiết đã khóa.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* TAB 5: GIÁO VIÊN & ĐỊNH MỨC                                  */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeCategory === 'teachers' && (
                  <div className="animate-fade-in">
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>
                      Quản Lý Giáo Viên, Môn Học & Phân Công Chuyên Môn
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
                      Quản lý hồ sơ nhân sự, phân tổ bộ môn và phân bổ trách nhiệm giảng dạy.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: '0 0 6px 0' }}>
                          Tên viết tắt (Code TKB) của Giáo viên
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                          Mỗi giáo viên nên có 1 tên viết tắt ngắn gọn (ví dụ: Cô Mai Lan → <code>LanM</code> hoặc <code>MaiLan</code>) để khi in trên ô thời khóa biểu nhỏ vẫn hiển thị rõ ràng, không bị tràn ô.
                        </p>
                      </div>

                      <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: '0 0 6px 0' }}>
                          Giáo Viên Chủ Nhiệm (GVCN)
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                          GVCN sẽ được tự động gán dạy các môn cơ bản (Tiếng Việt, Toán, Hoạt động trải nghiệm...) của lớp mình chủ nhiệm theo quy định phân công chuyên môn.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* TAB 6: EXCEL & BACKUP                                        */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeCategory === 'excel_backup' && (
                  <div className="animate-fade-in">
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>
                      Nhập / Xuất Excel & Sao Lưu Dữ Liệu (.JSON)
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
                      Dễ dàng chia sẻ file, lưu trữ định kỳ và xuất bảng tính Excel chuẩn Bộ Giáo Dục.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ padding: '16px', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                        <div style={{ fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <Save size={16} color="#059669" />
                          <span>Lưu File & Nạp File (.json) - An toàn 100%</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#047857', margin: 0 }}>
                          Bấm nút <strong>[💾 Lưu File]</strong> để tải 1 file `.json` chứa toàn bộ dữ liệu (lớp, giáo viên, định mức, bảng xếp lịch) về máy tính. Khi chuyển máy tính khác hoặc muốn khôi phục bản sao lưu, chỉ cần bấm <strong>[📤 Nạp File]</strong>.
                        </p>
                      </div>

                      <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <FileSpreadsheet size={16} color="#059669" />
                          <span>Xuất File Excel Chuẩn</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                          Xuất toàn bộ thời khóa biểu ra bảng tính Excel với đầy đủ sheet: TKB Toàn trường, TKB Từng Lớp, TKB Giáo Viên và Bảng phân công tiết dạy.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* TAB 7: FAQ & MẸO HAY                                          */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeCategory === 'faq' && (
                  <div className="animate-fade-in">
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>
                      Câu Hỏi Thường Gặp (FAQ) & Mẹo Xử Lý Nhanh
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                      
                      <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem', marginBottom: '4px' }}>
                          ❓ Khi chạy Tự động xếp lịch báo "Không thể xếp do xung đột", tôi cần làm gì?
                        </div>
                        <p style={{ fontSize: '0.83rem', color: '#475569', margin: 0 }}>
                          👉 Hãy nhấp vào nút <strong>[Xung Đột]</strong> màu đỏ trên Header. Hệ thống sẽ chỉ ra chính xác giáo viên nào bị đăng ký nghỉ quá nhiều hoặc môn nào thiếu giáo viên/phòng chức năng.
                        </p>
                      </div>

                      <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem', marginBottom: '4px' }}>
                          ❓ Dữ liệu được lưu ở đâu? Có bị mất khi tắt trình duyệt không?
                        </div>
                        <p style={{ fontSize: '0.83rem', color: '#475569', margin: 0 }}>
                          👉 Dữ liệu được tự động lưu liên tục trong bộ nhớ cục bộ (LocalStorage) của máy tính. Tuy nhiên, thầy/cô nên bấm <strong>[💾 Lưu File]</strong> định kỳ để lưu file `.json` dự phòng ra ổ đĩa D hoặc USB!
                        </p>
                      </div>

                      <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem', marginBottom: '4px' }}>
                          ❓ Tôi chỉ muốn xếp lại lịch của 1 lớp duy nhất thì làm thế nào?
                        </div>
                        <p style={{ fontSize: '0.83rem', color: '#475569', margin: 0 }}>
                          👉 Mở Studio Xếp Lịch, chọn lớp đó, rồi bấm nút <strong>[🗑️ Xóa Lịch Lớp]</strong>. Sau đó kéo thả môn hoặc bấm xếp riêng cho lớp đó mà không làm ảnh hưởng các lớp khác.
                        </p>
                      </div>

                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HelpCircle size={15} color="#6366f1" />
            <span>Bạn cần hỗ trợ thêm? Bấm vào các mục bên trái để xem chi tiết.</span>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '8px 22px',
              borderRadius: '10px',
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#4338ca'}
            onMouseOut={(e) => e.currentTarget.style.background = '#4f46e5'}
          >
            Đã Hiểu & Đóng
          </button>
        </div>

      </div>
    </div>
  );
};

// Helper for Vietnamese diacritic-insensitive search
const normalizeVietnamese = (str = '') => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

// Helper component for search
const SearchGuideResults = ({ query }) => {
  const qNorm = normalizeVietnamese(query.trim());
  const allTips = [
    { title: 'Chỉnh sửa sĩ số học sinh', desc: 'Nhấp vào chữ "Sĩ số: 35 HS" trên thanh điều khiển của Studio hoặc bấm icon cây bút ✏️ để chỉnh sửa từng lớp hoặc gán hàng loạt cho Khối 1 đến Khối 5.', category: 'Studio' },
    { title: 'In thời khóa biểu chuẩn A4', desc: 'Bấm [In Thời Khóa Biểu] tại Studio. Hỗ trợ xem trước A4 trực quan, in 1 lớp, in theo khối hoặc in toàn bộ 23 lớp có ngắt trang tự động.', category: 'In Ấn' },
    { title: 'Hoán đổi tiết học (Swap)', desc: 'Bấm biểu tượng ⇄ tại ô tiết học nguồn, sau đó nhấp vào ô tiết học đích để đổi vị trí 2 tiết.', category: 'Studio' },
    { title: 'Khóa tiết học cố định (Lock)', desc: 'Bấm biểu tượng ổ khóa 🔒 để cố định tiết học. Thuật toán tự động xếp lịch sẽ không bao giờ thay đổi tiết này.', category: 'Studio' },
    { title: 'Xóa lịch 1 lớp', desc: 'Bấm nút [Xóa Lịch Lớp] trên thanh điều khiển của Studio để xóa riêng lịch của lớp hiện tại.', category: 'Studio' },
    { title: 'Xóa thời khóa biểu toàn trường', desc: 'Bấm nút [Xóa TKB] màu đỏ trên thanh Header để xóa sạch thời khóa biểu tất cả các lớp.', category: 'Header' },
    { title: 'Tự động xếp lịch AI', desc: 'Bấm nút [Tự Động Xếp Lịch] trên Header để AI tự động phân bổ và tối ưu hóa 32 tiết cho toàn bộ các lớp.', category: 'Tự Động' },
    { title: 'Lưu & Nạp file sao lưu (.json)', desc: 'Bấm [Lưu File] để tải file backup về máy tính và [Nạp File] để nạp lại dữ liệu bất cứ lúc nào.', category: 'Dữ Liệu' },
    { title: 'Xuất file Excel', desc: 'Bấm nút [Excel] để mở hộp thoại nhập xuất Excel, xuất bảng ma trận và thời khóa biểu chuẩn Bộ GD&ĐT.', category: 'Excel' },
    { title: 'Buổi đăng ký nghỉ của Giáo viên', desc: 'Vào tab [Danh Sách Giáo Viên] để tích chọn buổi nghỉ (Sáng/Chiều từ Thứ 2 đến Thứ 6) cho từng thầy cô.', category: 'Giáo Viên' },
    { title: 'Cài đặt tên trường & Năm học', desc: 'Nhấp vào tên trường ở thanh tiêu đề hoặc bấm [Cài Đặt] để chỉnh sửa tên trường, hiệu trưởng và khung giờ tiết học.', category: 'Cài Đặt' }
  ];

  const filtered = allTips.filter(t => {
    const titleNorm = normalizeVietnamese(t.title);
    const descNorm = normalizeVietnamese(t.desc);
    const catNorm = normalizeVietnamese(t.category);
    return titleNorm.includes(qNorm) || descNorm.includes(qNorm) || catNorm.includes(qNorm);
  });

  if (filtered.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px' }}>
        Không tìm thấy hướng dẫn nào khớp với từ khóa "{query}". Hãy thử tìm: "sĩ số", "in", "đổi tiết", "xóa", "excel"...
      </div>
    );
  }

  return (
    <>
      {filtered.map((item, idx) => (
        <div key={idx} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem' }}>{item.title}</div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#e0e7ff', color: '#3730a3' }}>
              {item.category}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>{item.desc}</p>
        </div>
      ))}
    </>
  );
};

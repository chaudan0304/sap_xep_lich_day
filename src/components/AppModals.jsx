// src/components/AppModals.jsx
// Quản lý và kết nối tập trung tất cả các Modal trong ứng dụng EduTimetable

import React from 'react';
import SchoolSettingsModal from './SchoolSettingsModal';
import { ExcelModal } from './ExcelModal';
import { ConflictModal } from './ConflictModal';
import { ImportReportModal } from './ImportReportModal';
import { AutoScheduleModal } from './AutoScheduleModal';
import { UpdateModal } from './UpdateModal';
import { WelcomeModal } from './WelcomeModal';
import { UserGuideModal } from './UserGuideModal';

export const AppModals = ({
  // SchoolSettingsModal
  isSettingsModalOpen,
  setIsSettingsModalOpen,
  schoolInfo,
  setSchoolInfo,
  periods,
  setPeriods,

  // ExcelModal
  isExcelModalOpen,
  setIsExcelModalOpen,
  classes,
  teachers,
  assignments,
  gradeQuotas,
  timetable,
  subjects,
  onImportSuccess,

  // ConflictModal
  isConflictModalOpen,
  setIsConflictModalOpen,
  conflicts,
  onNavigateToClass,

  // ImportReportModal
  isImportReportOpen,
  setIsImportReportOpen,
  importReport,
  onNavigateToSlot,

  // AutoScheduleModal
  isAutoScheduleModalOpen,
  setIsAutoScheduleModalOpen,
  onExecuteSchedule,
  isAutoScheduling,

  // UpdateModal
  isUpdateModalOpen,
  setIsUpdateModalOpen,
  updateInfo,
  setUpdateInfo,

  // WelcomeModal
  isWelcomeModalOpen,
  setIsWelcomeModalOpen,
  onSelectSampleData,
  onStartBlankProject,

  // UserGuideModal
  isUserGuideModalOpen,
  setIsUserGuideModalOpen,
  onNavigateTab,

  // Floating Update Toast
  isUpdateReady
}) => {
  return (
    <>
      {/* Cấu hình trường và khung giờ */}
      <SchoolSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        schoolInfo={schoolInfo}
        setSchoolInfo={setSchoolInfo}
        periods={periods}
        setPeriods={setPeriods}
      />

      {/* Nhập/Xuất Excel */}
      <ExcelModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        classes={classes}
        teachers={teachers}
        assignments={assignments}
        gradeQuotas={gradeQuotas}
        timetable={timetable}
        subjects={subjects}
        schoolInfo={schoolInfo}
        onImportSuccess={onImportSuccess}
      />

      {/* Chi tiết xung đột */}
      <ConflictModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        conflicts={conflicts}
        classes={classes}
        teachers={teachers}
        onNavigateToClass={onNavigateToClass}
      />

      {/* Báo cáo đối soát sau nhập Excel */}
      <ImportReportModal
        isOpen={isImportReportOpen}
        onClose={() => setIsImportReportOpen(false)}
        report={importReport || {}}
        classes={classes}
        onNavigateToSlot={onNavigateToSlot}
      />

      {/* Tự động xếp lịch AI */}
      <AutoScheduleModal
        isOpen={isAutoScheduleModalOpen}
        onClose={() => setIsAutoScheduleModalOpen(false)}
        onExecuteSchedule={onExecuteSchedule}
        classes={classes}
        teachers={teachers}
        assignments={assignments}
        timetable={timetable}
        subjects={subjects}
        isScheduling={isAutoScheduling}
      />

      {/* Kiểm tra cập nhật */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        initialUpdateInfo={updateInfo}
        onUpdateInfoChange={setUpdateInfo}
      />

      {/* Modal Chào mừng và chọn dữ liệu khởi đầu */}
      <WelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
        onSelectSampleData={onSelectSampleData}
        onStartBlankProject={onStartBlankProject}
        onOpenExcelModal={() => setIsExcelModalOpen(true)}
        onOpenUserGuideModal={() => setIsUserGuideModalOpen(true)}
      />

      {/* Hướng dẫn sử dụng */}
      <UserGuideModal
        isOpen={isUserGuideModalOpen}
        onClose={() => setIsUserGuideModalOpen(false)}
        onNavigateTab={onNavigateTab}
      />

      {/* Floating Auto-Update Ready Toast */}
      {isUpdateReady && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
          border: '2px solid #60a5fa',
          borderRadius: '16px',
          padding: '16px 20px',
          color: '#ffffff',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🎉 Đã Tải Xong Bản Cập Nhật Mới!</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#bfdbfe', marginTop: '2px' }}>
              Bấm Khởi động lại để tự động nâng cấp tính năng mới.
            </div>
          </div>
          <button
            onClick={() => {
              if (window.electronAPI?.restartAndInstall) {
                window.electronAPI.restartAndInstall();
              }
            }}
            style={{
              background: '#10b981',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '10px',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
              whiteSpace: 'nowrap'
            }}
          >
            Khởi Động Lại Ngay
          </button>
        </div>
      )}
    </>
  );
};

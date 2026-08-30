; installer.nsi - Windows Installer Setup Script for EduTimetable Tiểu Học
!include "MUI2.nsh"
!include "FileFunc.nsh"

; General Information
Name "EduTimetable Tiểu Học"
Caption "Cài Đặt Phần Mềm EduTimetable Tiểu Học - Chuẩn CTGDPT 2018"
OutFile "dist-desktop\EduTimetable_TieuHoc_Setup_v1.0.1.exe"
Unicode True
RequestExecutionLevel user
SetCompressor /SOLID lzma

; Default Installation Directory (Không cần quyền Admin)
InstallDir "$LOCALAPPDATA\Programs\EduTimetable_TieuHoc"
InstallDirRegKey HKCU "Software\EduTimetable_TieuHoc" "Install_Dir"

; Interface Settings
!define MUI_ABORTWARNING

; Welcome Page
!define MUI_WELCOMEPAGE_TITLE "Chào Mừng Đến Với Trình Cài Đặt EduTimetable Tiểu Học"
!define MUI_WELCOMEPAGE_TEXT "Hệ thống hỗ trợ Sắp Xếp Thời Khóa Biểu & Quản Lý Định Mức GDPT 2018.$\r$\n$\r$\nChương trình sẽ tự động cài đặt ứng dụng vào máy tính của bạn và tạo biểu tượng lối tắt trên màn hình Desktop để sử dụng thuận tiện nhất.$\r$\n$\r$\nNhấn 'Tiếp tục' để bắt đầu cài đặt."
!insertmacro MUI_PAGE_WELCOME

; Directory Selection Page
!insertmacro MUI_PAGE_DIRECTORY

; Installation Progress Page
!insertmacro MUI_PAGE_INSTFILES

; Finish Page
!define MUI_FINISHPAGE_TITLE "Cài Đặt Thành Công!"
!define MUI_FINISHPAGE_TEXT "Phần mềm EduTimetable Tiểu Học đã được cài đặt hoàn tất vào máy tính của bạn.$\r$\n$\r$\nBiểu tượng đã được tạo sẵn trên màn hình Desktop."
!define MUI_FINISHPAGE_RUN "$INSTDIR\EduTimetable_TieuHoc.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Mở EduTimetable Tiểu Học ngay bây giờ"
!insertmacro MUI_PAGE_FINISH

; Uninstaller Pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

; Installer Section
Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite on

  ; Copy toàn bộ file ứng dụng đã build
  File /r "dist-desktop\EduTimetable_TieuHoc-win32-x64\*.*"

  ; Lưu đường dẫn cài đặt vào Registry
  WriteRegStr HKCU "Software\EduTimetable_TieuHoc" "Install_Dir" "$INSTDIR"

  ; Tạo trình gỡ cài đặt
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Đăng ký vào Windows Control Panel / Settings (Apps & Features)
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc" "DisplayName" "EduTimetable Tiểu Học"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc" "DisplayVersion" "1.0.1"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc" "Publisher" "Châu Đàn"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc" "DisplayIcon" "$INSTDIR\EduTimetable_TieuHoc.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc" "NoRepair" 1

  ; Tạo thư mục Start Menu & Lối tắt
  CreateDirectory "$SMPROGRAMS\EduTimetable Tiểu Học"
  CreateShortcut "$SMPROGRAMS\EduTimetable Tiểu Học\EduTimetable Tiểu Học.lnk" "$INSTDIR\EduTimetable_TieuHoc.exe" "" "$INSTDIR\EduTimetable_TieuHoc.exe" 0
  CreateShortcut "$SMPROGRAMS\EduTimetable Tiểu Học\Gỡ Cài Đặt (Uninstall).lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0

  ; Tạo biểu tượng ngoài màn hình chính Desktop
  CreateShortcut "$DESKTOP\EduTimetable Tiểu Học.lnk" "$INSTDIR\EduTimetable_TieuHoc.exe" "" "$INSTDIR\EduTimetable_TieuHoc.exe" 0
SectionEnd

; Uninstaller Section
Section "Uninstall"
  ; Xóa lối tắt ngoài Desktop
  Delete "$DESKTOP\EduTimetable Tiểu Học.lnk"

  ; Xóa lối tắt trong Start Menu
  Delete "$SMPROGRAMS\EduTimetable Tiểu Học\EduTimetable Tiểu Học.lnk"
  Delete "$SMPROGRAMS\EduTimetable Tiểu Học\Gỡ Cài Đặt (Uninstall).lnk"
  RMDir "$SMPROGRAMS\EduTimetable Tiểu Học"

  ; Xóa khóa Registry
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc"
  DeleteRegKey HKCU "Software\EduTimetable_TieuHoc"

  ; Xóa toàn bộ file cài đặt
  RMDir /r "$INSTDIR"
SectionEnd

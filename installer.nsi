Unicode True
; installer.nsi - Trình Cài Đặt Tự Động Windows cho EduTimetable Tiểu Học
!include "MUI2.nsh"
!include "FileFunc.nsh"

; Thông Tin Chung
Name "EduTimetable Tiểu Học"
Caption "Cài Đặt Phần Mềm EduTimetable Tiểu Học - Chuẩn CTGDPT 2018"
OutFile "dist-desktop\EduTimetable_TieuHoc_Setup_v1.0.1.exe"
RequestExecutionLevel admin
SetCompressor /SOLID lzma

; Thư mục cài đặt mặc định
InstallDir "$PROGRAMFILES64\EduTimetable Tiểu Học"
InstallDirRegKey HKLM "Software\EduTimetable_TieuHoc" "Install_Dir"

; Cấu hình giao diện Modern UI
!define MUI_ABORTWARNING

; 1. Trang Chào Mừng
!define MUI_WELCOMEPAGE_TITLE "Chào Mừng Đến Với Trình Cài Đặt EduTimetable Tiểu Học"
!define MUI_WELCOMEPAGE_TEXT "Hệ thống hỗ trợ Sắp Xếp Thời Khóa Biểu & Quản Lý Định Mức GDPT 2018.$\r$\n$\r$\nTrình cài đặt sẽ tự động thiết lập phần mềm vào máy tính của bạn và tạo biểu tượng lối tắt trên màn hình Desktop để sử dụng thuận tiện nhất.$\r$\n$\r$\nNhấn 'Tiếp tục' để bắt đầu cài đặt."
!insertmacro MUI_PAGE_WELCOME

; 2. Trang Chọn Thư Mục Cài Đặt
!insertmacro MUI_PAGE_DIRECTORY

; 3. Trang Tiến Trình Cài Đặt
!insertmacro MUI_PAGE_INSTFILES

; 4. Trang Hoàn Tất
!define MUI_FINISHPAGE_TITLE "Cài Đặt Hoàn Tất!"
!define MUI_FINISHPAGE_TEXT "Phần mềm EduTimetable Tiểu Học đã được cài đặt thành công vào máy tính của bạn.$\r$\n$\r$\nBiểu tượng đã được tạo sẵn trên màn hình Desktop."
!define MUI_FINISHPAGE_RUN "$INSTDIR\EduTimetable_TieuHoc.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Khởi chạy EduTimetable Tiểu Học ngay bây giờ"
!insertmacro MUI_PAGE_FINISH

; Trang Gỡ Cài Đặt
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Ngôn Ngữ Giao Diện
!insertmacro MUI_LANGUAGE "Vietnamese"
!insertmacro MUI_LANGUAGE "English"

; Tự động đóng ứng dụng nếu đang chạy trước khi bắt đầu cài đặt
Function .onInit
  nsExec::Exec 'taskkill /F /IM EduTimetable_TieuHoc.exe /T'
  nsExec::Exec 'taskkill /F /IM "EduTimetable Tiểu Học.exe" /T'
  Sleep 500
FunctionEnd

; Tự động đóng ứng dụng trước khi gỡ cài đặt
Function un.onInit
  nsExec::Exec 'taskkill /F /IM EduTimetable_TieuHoc.exe /T'
  nsExec::Exec 'taskkill /F /IM "EduTimetable Tiểu Học.exe" /T'
  Sleep 500
FunctionEnd

; Phân Đoạn Cài Đặt Chính
Section "MainSection" SEC01
  ; Đảm bảo ứng dụng đã đóng hoàn toàn trước khi ghi đè file
  nsExec::Exec 'taskkill /F /IM EduTimetable_TieuHoc.exe /T'
  Sleep 500

  ; Đảm bảo thư mục đích tồn tại và xóa file exe cũ nếu đang tồn tại
  CreateDirectory "$INSTDIR"
  Delete /REBOOTOK "$INSTDIR\EduTimetable_TieuHoc.exe"

  SetOutPath "$INSTDIR"
  SetOverwrite on

  ; Sao chép toàn bộ file phần mềm
  File /r "dist-desktop\EduTimetable_TieuHoc-win32-x64\*.*"

  ; Ghi nhớ đường dẫn cài đặt vào Registry
  WriteRegStr HKLM "Software\EduTimetable_TieuHoc" "Install_Dir" "$INSTDIR"

  ; Tạo trình gỡ cài đặt (Uninstall.exe)
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Đăng ký vào Windows Settings & Control Panel (Apps & Features)
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc" "DisplayName" "EduTimetable Tiểu Học"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc" "DisplayVersion" "1.0.1"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc" "Publisher" "Châu Đàn"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc" "DisplayIcon" "$INSTDIR\EduTimetable_TieuHoc.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc" "NoRepair" 1

  ; Thiết lập ngữ cảnh All Users để tạo biểu tượng dùng chung
  SetShellVarContext all

  ; Tạo biểu tượng trong Start Menu
  CreateDirectory "$SMPROGRAMS\EduTimetable Tiểu Học"
  CreateShortcut "$SMPROGRAMS\EduTimetable Tiểu Học\EduTimetable Tiểu Học.lnk" "$INSTDIR\EduTimetable_TieuHoc.exe" "" "$INSTDIR\EduTimetable_TieuHoc.exe" 0
  CreateShortcut "$SMPROGRAMS\EduTimetable Tiểu Học\Gỡ Cài Đặt (Uninstall).lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0

  ; Tạo biểu tượng ngoài màn hình chính Desktop
  CreateShortcut "$DESKTOP\EduTimetable Tiểu Học.lnk" "$INSTDIR\EduTimetable_TieuHoc.exe" "" "$INSTDIR\EduTimetable_TieuHoc.exe" 0
SectionEnd

; Phân Đoạn Gỡ Cài Đặt (Uninstall)
Section "Uninstall"
  SetShellVarContext all

  ; Xóa biểu tượng ngoài Desktop
  Delete "$DESKTOP\EduTimetable Tiểu Học.lnk"

  ; Xóa biểu tượng trong Start Menu
  Delete "$SMPROGRAMS\EduTimetable Tiểu Học\EduTimetable Tiểu Học.lnk"
  Delete "$SMPROGRAMS\EduTimetable Tiểu Học\Gỡ Cài Đặt (Uninstall).lnk"
  RMDir "$SMPROGRAMS\EduTimetable Tiểu Học"

  ; Xóa khóa đăng ký Registry
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\EduTimetable_TieuHoc"
  DeleteRegKey HKLM "Software\EduTimetable_TieuHoc"

  ; Xóa toàn bộ file và thư mục cài đặt
  RMDir /r "$INSTDIR"
SectionEnd

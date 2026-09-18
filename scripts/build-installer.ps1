# scripts/build-installer.ps1
$ErrorActionPreference = "Stop"

Write-Host "Dang tim kiem trinh bien dich NSIS (makensis.exe)..." -ForegroundColor Cyan

# 1. Kiem tra trong PATH
$makensis = (Get-Command makensis.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)

# 2. Kiem tra trong cache cua electron-builder theo LOCALAPPDATA
if (-not $makensis -and $env:LOCALAPPDATA) {
    $cached = Get-ChildItem -Path "$env:LOCALAPPDATA\electron-builder\cache\nsis\*\Bin\makensis.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cached) {
        $makensis = $cached.FullName
    }
}

# 3. Kiem tra trong Program Files tieu chuan
if (-not $makensis) {
    $commonPaths = @(
        "${env:ProgramFiles}\NSIS\makensis.exe",
        "${env:ProgramFiles(x86)}\NSIS\makensis.exe"
    )
    foreach ($p in $commonPaths) {
        if (Test-Path $p) {
            $makensis = $p
            break
        }
    }
}

if (-not $makensis) {
    Write-Error "Khong tim thay makensis.exe tren he thong! Vui long cai dat NSIS hoac chay 'npm run electron:build' truoc."
    exit 1
}

Write-Host "Tim thay NSIS tai: $makensis" -ForegroundColor Green
Write-Host "Dang dong goi installer.nsi..." -ForegroundColor Cyan

# Xoa file installer cu neu co de tranh loi khoa file
$targetExe = "dist-desktop\EduTimetable_TieuHoc_Setup_v1.0.5.exe"
if (Test-Path $targetExe) {
    Remove-Item $targetExe -Force -ErrorAction SilentlyContinue
}

& $makensis /INPUTCHARSET UTF8 installer.nsi
if ($LASTEXITCODE -ne 0) {
    Write-Error "Bien dich installer that bai voi ma loi $LASTEXITCODE"
    exit $LASTEXITCODE
}
Write-Host "Dong goi trinh cai dat hoan tat thanh cong!" -ForegroundColor Green

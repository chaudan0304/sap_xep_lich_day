// src/services/updateChecker.js
// Kiểm tra bản cập nhật mới từ GitHub Releases

export const CURRENT_APP_VERSION = '1.0.5';
export const GITHUB_REPOS = [
  'chaudan0304/edutimetable-app',
  'chaudan0304/sap_xep_lich_day'
];

/**
 * So sánh 2 chuỗi version semver (ví dụ: '1.0.1' > '1.0.0')
 * @returns {number} 1 nếu v1 > v2, -1 nếu v1 < v2, 0 nếu bằng nhau
 */
export function compareVersions(v1, v2) {
  const cleanV1 = (v1 || '').replace(/^v/i, '').trim();
  const cleanV2 = (v2 || '').replace(/^v/i, '').trim();
  
  const parts1 = cleanV1.split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = cleanV2.split('.').map(n => parseInt(n, 10) || 0);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Gọi GitHub API để kiểm tra xem có bản phát hành mới hay không
 */
export async function checkForAppUpdates() {
  for (const repo of GITHUB_REPOS) {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const latestTag = data.tag_name || data.name || '';
      const latestVersion = latestTag.replace(/^v/i, '').trim();

      const isNewer = compareVersions(latestVersion, CURRENT_APP_VERSION) > 0;

      // Ưu tiên file .exe (bộ cài NSIS Silent Install mượt mà, ổn định nhất), nếu không có mới dùng zip
      const exeAsset = data.assets?.find(a => a.name.toLowerCase().endsWith('.exe'));
      const zipAsset = data.assets?.find(a => a.name.toLowerCase().endsWith('.zip') && !a.name.includes('-win32-x64'));
      const chosenAsset = exeAsset || zipAsset;
      const downloadUrl = chosenAsset?.browser_download_url || data.html_url;
      const fileName = chosenAsset?.name || 'EduTimetable_TieuHoc.zip';

      // Trích xuất SHA256 checksum từ GitHub release digest hoặc release body nếu có
      let expectedChecksum = null;
      if (chosenAsset?.digest) {
        expectedChecksum = chosenAsset.digest.replace(/^sha256:/i, '').trim();
      } else if (data.body) {
        const filePattern = new RegExp(`${fileName}[^\\n]*?([a-fA-F0-9]{64})|([a-fA-F0-9]{64})[^\\n]*?${fileName}`, 'i');
        const fileMatch = data.body.match(filePattern);
        if (fileMatch) {
          expectedChecksum = (fileMatch[1] || fileMatch[2]).toLowerCase().trim();
        } else {
          const generalMatch = data.body.match(/\b([a-fA-F0-9]{64})\b/);
          if (generalMatch) {
            expectedChecksum = generalMatch[1].toLowerCase().trim();
          }
        }
      }

      return {
        hasUpdate: isNewer,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: latestVersion,
        tagName: latestTag,
        releaseTitle: data.name || latestTag,
        releaseNotes: data.body || 'Bản cập nhật nâng cấp hiệu năng và sửa lỗi.',
        downloadUrl: downloadUrl,
        fileName: fileName,
        expectedChecksum: expectedChecksum,
        htmlUrl: data.html_url,
        publishedAt: data.published_at,
        repo: repo
      };
    } catch (err) {
      console.warn(`Lỗi kiểm tra cập nhật repo ${repo}:`, err.message);
    }
  }

  return {
    hasUpdate: false,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: CURRENT_APP_VERSION,
    message: 'Bạn đang dùng phiên bản mới nhất.'
  };
}

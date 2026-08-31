// src/services/updateChecker.js
// Kiểm tra bản cập nhật mới từ GitHub Releases

export const CURRENT_APP_VERSION = '1.0.2';
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

      // Tìm file .exe hoặc file zip đính kèm trong Release Assets nếu có
      const exeAsset = data.assets?.find(a => a.name.endsWith('.exe'));
      const zipAsset = data.assets?.find(a => a.name.endsWith('.zip'));
      const chosenAsset = zipAsset || exeAsset;
      const downloadUrl = chosenAsset?.browser_download_url || data.html_url;
      const fileName = chosenAsset?.name || 'EduTimetable_TieuHoc.zip';

      return {
        hasUpdate: isNewer,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: latestVersion,
        tagName: latestTag,
        releaseTitle: data.name || latestTag,
        releaseNotes: data.body || 'Bản cập nhật nâng cấp hiệu năng và sửa lỗi.',
        downloadUrl: downloadUrl,
        fileName: fileName,
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

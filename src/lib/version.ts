// 版本信息 - 由构建脚本自动生成
// 格式: v[构建日期]-[git 提交号前7位]

// 构建时由 scripts/generate-version.js 生成
// 如果文件不存在，使用默认值
interface VersionInfo {
  version: string;
  buildDate: string;
  commit: string;
}

let versionData: VersionInfo = {
  version: 'v0.0.0-unknown',
  buildDate: 'unknown',
  commit: 'unknown'
};

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  versionData = require('./version.json');
} catch {
  // 使用默认值
}

export default versionData;

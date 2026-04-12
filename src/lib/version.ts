// 版本信息 - 由构建脚本自动生成
// 格式: v[提交数量].[提交号]

// 构建时由 scripts/generate-version.js 生成
// 如果文件不存在，使用默认值
interface VersionInfo {
  version: string;
  versionFull: string;
  buildDate: string;
  commit: string;
  commits: number;
}

let versionData: VersionInfo = {
  version: 'v0.0.0-unknown',
  versionFull: 'v0.0.0-unknown (unknown commit, build unknown)',
  buildDate: 'unknown',
  commit: 'unknown',
  commits: 0
};

try {
  const data = require('./version.json');
  versionData = {
    ...data,
    versionFull: `${data.version} (${data.commits || 0} commits, build ${data.buildDate})`
  };
} catch {
  // 使用默认值
}

export default versionData;

// 版本信息 - 由构建脚本自动生成
// 格式: v[构建日期]-[git 提交号前7位]

// 构建时由 scripts/generate-version.js 生成
// 如果文件不存在，使用默认值
try {
  // @ts-ignore
  module.exports = require('./version.json');
} catch {
  module.exports = {
    version: 'v0.0.0-unknown',
    buildDate: 'unknown',
    commit: 'unknown'
  };
}

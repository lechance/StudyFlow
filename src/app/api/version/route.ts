import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // 尝试读取 version.json
    const versionPath = path.join(process.cwd(), 'src', 'lib', 'version.json');
    
    if (fs.existsSync(versionPath)) {
      const content = fs.readFileSync(versionPath, 'utf-8');
      const data = JSON.parse(content);
      return NextResponse.json({
        version: data.version || 'v1.0.0',
        buildDate: data.buildDate,
        commit: data.commit
      });
    }
    
    // 如果文件不存在，返回默认版本
    return NextResponse.json({
      version: 'v1.0.0',
      buildDate: '',
      commit: ''
    });
  } catch {
    return NextResponse.json({
      version: 'v1.0.0',
      buildDate: '',
      commit: ''
    });
  }
}

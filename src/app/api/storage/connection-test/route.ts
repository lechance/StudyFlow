import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';
import { S3Storage } from 'coze-coding-dev-sdk';

// 测试存储连接
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请先登录'
      }, { status: 401 });
    }

    const body = await request.json();
    const {
      endpoint_url,
      access_key,
      secret_key,
      bucket_name,
      region
    } = body;

    // 验证必填字段
    if (!endpoint_url || !access_key || !secret_key || !bucket_name) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请填写完整的 S3 配置信息'
      }, { status: 400 });
    }

    // 创建 S3 存储实例
    const storage = new S3Storage({
      endpointUrl: endpoint_url,
      accessKey: access_key,
      secretKey: secret_key,
      bucketName: bucket_name,
      region: region || 'us-east-1'
    });

    try {
      // 尝试列出对象来测试连接
      const result = await storage.listFiles({ maxKeys: 1 });
      
      return NextResponse.json<ApiResponse>({
        success: true,
        message: '连接成功',
        data: {
          connected: true,
          bucket: bucket_name,
          message: '已成功连接到 S3 存储服务'
        }
      });
    } catch (storageError: any) {
      console.error('S3 connection test error:', storageError);
      
      // 解析错误信息
      let errorMessage = '连接失败';
      if (storageError.message) {
        if (storageError.message.includes('403') || storageError.message.includes('Access Denied')) {
          errorMessage = '访问被拒绝，请检查 Access Key 和 Secret Key';
        } else if (storageError.message.includes('404') || storageError.message.includes('NoSuchBucket')) {
          errorMessage = 'Bucket 不存在，请检查 Bucket 名称';
        } else if (storageError.message.includes('ECONNREFUSED') || storageError.message.includes('ENOTFOUND')) {
          errorMessage = '无法连接到服务器，请检查 Endpoint URL';
        } else {
          errorMessage = storageError.message.substring(0, 100);
        }
      }

      return NextResponse.json<ApiResponse>({
        success: false,
        error: errorMessage,
        data: {
          connected: false
        }
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Storage connection test error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '连接测试失败'
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    const requestOrigin = request.headers.get('origin');
    let allowOrigin = '*';
    
    if (requestOrigin) {
      allowOrigin = requestOrigin;
    } else {
      const protocol = request.headers.get('x-forwarded-proto') || request.url.split('://')[0];
      const host = request.headers.get('host') || request.nextUrl.host;
      allowOrigin = `${protocol}://${host}`;
    }
    
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', allowOrigin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }
  
  // 处理 API 请求的 CORS
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const requestOrigin = request.headers.get('origin');
    let allowOrigin = '*';
    
    if (requestOrigin) {
      allowOrigin = requestOrigin;
    } else {
      const protocol = request.headers.get('x-forwarded-proto') || request.url.split('://')[0];
      const host = request.headers.get('host') || request.nextUrl.host;
      allowOrigin = `${protocol}://${host}`;
    }
    
    const response = NextResponse.next();
    
    // 使用具体的 origin，确保 credentials 可以工作
    response.headers.set('Access-Control-Allow-Origin', allowOrigin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};

import type { Metadata } from 'next';
import { AuthProvider } from '@/hooks/useAuth';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'StudyFlow - 智能学习助手',
    template: '%s | StudyFlow',
  },
  description: '一款面向学生和职场人的智能学习计划与时间管理应用，助你高效学习、持续进步。',
  keywords: ['学习计划', '时间管理', '番茄钟', '任务管理', '学习助手'],
  authors: [{ name: 'StudyFlow Team' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

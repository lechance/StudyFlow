import type { Metadata } from 'next';
import { AuthProvider } from '@/hooks/useAuth';
import { LanguageProvider } from '@/lib/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'StudyFlow - Smart Study Assistant',
    template: '%s | StudyFlow',
  },
  description: 'An intelligent learning plan and time management application for students and professionals.',
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
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <AuthProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

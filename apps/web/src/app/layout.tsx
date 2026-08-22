import type { Metadata } from 'next';
import { Roboto, Montserrat, Caveat_Brush } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../lib/auth/AuthProvider';
import { ToastProvider } from '../components/ui/Toast';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
});

const montserrat = Montserrat({
  weight: ['600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

const caveatBrush = Caveat_Brush({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-caveat-brush',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Dayflow — Every workday, perfectly aligned',
  description: 'Enterprise Human Resource Management System for modern organizations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${roboto.variable} ${montserrat.variable} ${caveatBrush.variable}`}>
      <body className="min-h-screen bg-background text-text-primary antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

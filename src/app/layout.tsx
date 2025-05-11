import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google'; // Prioritize Geist_Mono
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseProvider } from '@/components/providers/firebase-provider';
import { AuthProvider } from '@/components/providers/auth-provider';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Black HAT Commit',
  description: 'A communication and planning app with a hacker aesthetic.',
  icons: {
    icon: '/logo.png', // Using logo.png as favicon
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistMono.variable} font-mono antialiased`}>
        <FirebaseProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}

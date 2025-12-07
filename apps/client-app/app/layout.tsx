// Root layout(wraps all pages)

import { Metadata } from 'next';
import { AuthProvider } from '@/components/auth/AuthProvider';
import './global.scss'

export const metadata: Metadata = {
  title: "Innogram Social Media App",
  description: "Connect with friends and share moments",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

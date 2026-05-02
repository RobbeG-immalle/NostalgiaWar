import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nostalgia War',
  description: 'Vote for the most nostalgic video!',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-white antialiased font-sans">
        {children}
      </body>
    </html>
  );
}

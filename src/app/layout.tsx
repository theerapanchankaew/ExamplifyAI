
'use client';

import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { useIsClient } from '@/hooks/use-is-client';

// This metadata will not be static because this is a client component.
// We can move this to a static export if needed in a separate root layout.
// export const metadata: Metadata = {
//   title: 'ExamplifyAI',
//   description: 'Learning & Examination Management System by AI',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isClient = useIsClient();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>ExamplifyAI</title>
        <meta name="description" content="Learning & Examination Management System by AI" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
        {isClient && <Toaster />}
      </body>
    </html>
  );
}

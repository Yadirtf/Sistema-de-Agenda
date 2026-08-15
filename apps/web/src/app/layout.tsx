import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { RealTimeSyncProvider } from '@/components/providers/RealTimeSyncProvider';

export const metadata: Metadata = {
  title: 'Sistema de Agendamiento - Gestión Inteligente de Citas',
  description: 'Sistema completo para gestión de citas, clientes, periodos y reagendamientos.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <RealTimeSyncProvider>
              {children}
            </RealTimeSyncProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

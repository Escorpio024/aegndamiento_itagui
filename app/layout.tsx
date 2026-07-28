import type { Metadata } from 'next';
import '../styles/globals.css';
import Navbar from '@/components/Navbar';
import { ToastProvider } from '@/components/ToastProvider';

export const metadata: Metadata = {
  title: 'Aurora Agenda Itagüi — Agendamiento de Imágenes Diagnósticas',
  description: 'Sistema oficial de agendamiento de citas de imágenes diagnósticas computarizadas para el municipio de Itagüi, Antioquia.',
  keywords: ['imágenes diagnósticas', 'agendamiento', 'itagüi', 'citas médicas'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ToastProvider>
          <Navbar />
          <main>{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}

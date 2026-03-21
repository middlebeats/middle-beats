import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'MIDDLE BEATS — Artist Portal',
  description: 'Your music analytics and royalty platform by MIDDLE BEATS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet"/>
        <meta name="theme-color" content="#040e2b"/>
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "'Syne', sans-serif" }}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#071535', color: '#fff', border: '1px solid #1a3080' },
            success: { iconTheme: { primary: '#22d36b', secondary: '#071535' } },
            error: { iconTheme: { primary: '#ff5566', secondary: '#071535' } },
          }}
        />
      </body>
    </html>
  )
}

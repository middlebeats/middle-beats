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
        <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
        <meta name="theme-color" content="#060f2a"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
      </head>
      <body style={{ margin:0, padding:0, fontFamily:"'Inter', sans-serif", color:'#fff', background:'#060f2a' }}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background:'#0a1628', color:'#fff', border:'1px solid rgba(99,130,255,0.25)', fontFamily:'Inter,sans-serif', fontSize:13 },
            success: { iconTheme: { primary:'#34d399', secondary:'#0a1628' } },
            error: { iconTheme: { primary:'#f87171', secondary:'#0a1628' } },
          }}
        />
      </body>
    </html>
  )
}

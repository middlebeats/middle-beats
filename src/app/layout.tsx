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
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet"/>
        <meta name="theme-color" content="#030a1c"/>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
      </head>
      <body style={{ margin:0, padding:0, fontFamily:"'DM Sans', sans-serif", color:'#fff', background:'#030a1c' }}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background:'#0d1b3e', color:'#fff', border:'1px solid rgba(99,130,255,0.2)', fontFamily:"'DM Sans',sans-serif", fontSize:13 },
            success: { iconTheme: { primary:'#34d399', secondary:'#0d1b3e' } },
            error: { iconTheme: { primary:'#f87171', secondary:'#0d1b3e' } },
          }}
        />
      </body>
    </html>
  )
}

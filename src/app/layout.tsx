import type { Metadata } from 'next'
import { Syne, Space_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const syne = Syne({ subsets: ['latin'], variable: '--font-syne', weight: ['400','500','600','700','800'] })
const spaceMono = Space_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400','700'] })

export const metadata: Metadata = {
  title: 'Middle Beats — Artist Portal',
  description: 'Your music analytics and royalty platform',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${spaceMono.variable}`}>
      <body>
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

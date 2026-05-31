import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cliqy Studio — Dev Challenge',
  description: 'Mini Verification Panel',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  )
}

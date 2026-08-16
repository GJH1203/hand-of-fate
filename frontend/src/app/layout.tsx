// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { UnifiedAuthProvider } from '@/hooks/useUnifiedAuth'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  fallback: ['system-ui', 'arial']
})

export const metadata: Metadata = {
    title: "Queen's Blood",
    description: 'A strategic card placement game',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
        <body className={inter.className}>
            <UnifiedAuthProvider>
                {children}
            </UnifiedAuthProvider>
        </body>
        </html>
    )
}

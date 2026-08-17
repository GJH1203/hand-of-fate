// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Cinzel, Inter } from 'next/font/google'
import './globals.css'
import { UnifiedAuthProvider } from '@/hooks/useUnifiedAuth'
import AppBackground from '@/components/layout/AppBackground'
import { ToastProvider } from '@/components/ui/toast'

/*
 * Two faces, and the split between them is strict: Cinzel carries anything that is
 * meant to feel like the game — page titles, section titles, room codes, scores,
 * card names — and Inter carries the interface. Cinzel is here because the card
 * art already uses a serif of that weight; the UI simply had not caught up.
 */
const cinzel = Cinzel({
    subsets: ['latin'],
    weight: ['500', '600', '700'],
    display: 'swap',
    variable: '--font-display',
    fallback: ['Georgia', 'serif'],
})

const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
    variable: '--font-ui',
    fallback: ['system-ui', 'arial'],
})

const siteUrl = 'https://handoffate.org'
const description =
    'A real-time 1v1 card duel. Claim a 3x5 board one column at a time, and win more columns than your opponent.'

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'Hand of Fate — Mystical 1v1 Card Duels',
        template: '%s | Hand of Fate',
    },
    description,
    applicationName: 'Hand of Fate',
    openGraph: {
        type: 'website',
        siteName: 'Hand of Fate',
        title: 'Hand of Fate — Mystical 1v1 Card Duels',
        description,
        url: siteUrl,
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Hand of Fate — Mystical 1v1 Card Duels',
        description,
    },
}

export const viewport: Viewport = {
    themeColor: '#0A0C16',
    colorScheme: 'dark',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
        <body className="font-ui antialiased">
            <AppBackground />
            <UnifiedAuthProvider>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </UnifiedAuthProvider>
        </body>
        </html>
    )
}

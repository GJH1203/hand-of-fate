// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Marcellus, Spectral } from 'next/font/google'
import './globals.css'
import { UnifiedAuthProvider } from '@/hooks/useUnifiedAuth'
import AppBackground from '@/components/layout/AppBackground'
import { ToastProvider } from '@/components/ui/toast'

/*
 * Two faces, and the division is between the carved and the written.
 *
 * Marcellus is Roman inscriptional capitals — the letterforms of monuments and
 * temple architraves, drawn from the same tradition as the Trajan column. It has
 * ONE weight, and that is not a limitation to work around: carved letters have
 * one weight, because a chisel does. It sets every title, label and control, in
 * capitals, with the open tracking a cut inscription is spaced at.
 *
 * Spectral is a serif cut for screens rather than for paper, which matters here
 * because everything sits on a dark ground and a delicate old-style face goes to
 * grey. It carries all the prose and — absolutely, with no exceptions — every
 * number in the game. An ephemeris sets its tables in the text face, not in a
 * second one.
 *
 * The previous pass used a monospace for the apparatus, on the argument that the
 * card was the artefact and everything around it was a modern annotation. That
 * argument does not survive this direction: there is nothing modern here to
 * annotate with.
 */
const marcellus = Marcellus({
    subsets: ['latin'],
    weight: ['400'],
    display: 'swap',
    variable: '--font-display',
    fallback: ['Georgia', 'Times New Roman', 'serif'],
})

const spectral = Spectral({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600'],
    style: ['normal', 'italic'],
    display: 'swap',
    variable: '--font-text',
    fallback: ['Georgia', 'Times New Roman', 'serif'],
})

const siteUrl = 'https://handoffate.org'
const description =
    'A real-time 1v1 card duel. Claim a 3x5 board one column at a time, and win more columns than your opponent.'

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'Hand of Fate — real-time 1v1 card duels',
        template: '%s | Hand of Fate',
    },
    description,
    applicationName: 'Hand of Fate',
    openGraph: {
        type: 'website',
        siteName: 'Hand of Fate',
        title: 'Hand of Fate — real-time 1v1 card duels',
        description,
        url: siteUrl,
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Hand of Fate — real-time 1v1 card duels',
        description,
    },
}

export const viewport: Viewport = {
    /* The table, not the sheet — it is what fills the browser chrome's gutters. */
    themeColor: '#080B16',
    colorScheme: 'dark',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={`${marcellus.variable} ${spectral.variable}`}>
        <body className="font-text">
            <a href="#main" className="skip-link">
                Skip to content
            </a>
            <AppBackground />
            {/* Above the table, which is no longer negatively stacked. */}
            <div className="relative z-raised">
                <UnifiedAuthProvider>
                    <ToastProvider>
                        {children}
                    </ToastProvider>
                </UnifiedAuthProvider>
            </div>
        </body>
        </html>
    )
}

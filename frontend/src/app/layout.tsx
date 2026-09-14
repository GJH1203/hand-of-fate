// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { EB_Garamond, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { UnifiedAuthProvider } from '@/hooks/useUnifiedAuth'
import AppBackground from '@/components/layout/AppBackground'
import { ToastProvider } from '@/components/ui/toast'

/*
 * Two faces, and the split between them is a point of view rather than a
 * hierarchy.
 *
 * EB Garamond is Duffner and Pardo's revival of Claude Garamont's 16th-century
 * Parisian punches — a text face, not a display interpretation, so unlike
 * Cormorant it holds its colour down to 15px on a light ground. It is the
 * DEFAULT voice here: on a printed sheet, prose is the norm and the interface
 * is the exception.
 *
 * IBM Plex Mono is the only monospace on Google Fonts with a humanist skeleton
 * rather than a geometric one, so it does not fight a Garamond, and its slashed
 * zero and full-serifed 1 are unambiguous at 11px — which is what a room code
 * read down a phone line needs.
 *
 * The anachronism is deliberate. The CARD is the printed artefact; everything
 * around it — the room code, the tally, the connection state, the margin line —
 * is the modern apparatus, the pencil annotation in the margin of a proof. Two
 * registers, on purpose. It collapses into an inconsistency the moment the mono
 * sets a heading or the serif sets a number, which is why that rule is absolute:
 * nothing below 15px is set in the serif, and every number anywhere is mono.
 */
const garamond = EB_Garamond({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    style: ['normal', 'italic'],
    display: 'swap',
    variable: '--font-display',
    fallback: ['Georgia', 'Times New Roman', 'serif'],
})

const plex = IBM_Plex_Mono({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    display: 'swap',
    variable: '--font-mono',
    fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
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
    themeColor: '#140C07',
    colorScheme: 'light',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={`${garamond.variable} ${plex.variable}`}>
        {/*
          * No `antialiased`. Subpixel smoothing off is a dark-UI reflex: on a light
          * ground it thins the strokes, and EB Garamond's hairlines are fine enough.
          */}
        <body className="font-display">
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

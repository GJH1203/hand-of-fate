// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { UnifiedAuthProvider } from '@/hooks/useUnifiedAuth'
import AppBackground from '@/components/layout/AppBackground'
import { ToastProvider } from '@/components/ui/toast'

/*
 * Two faces, split by size rather than by role.
 *
 * Cormorant Garamond is a high-contrast old-style serif: beautiful at 40px and
 * invisible at 13px, because its thin strokes vanish against a dark ground. So it
 * carries the display sizes only — the wordmark, page titles, the room code — and
 * Space Grotesk carries everything a player has to read at a glance, numbers
 * included. That is the opposite of the previous split, where the serif was also
 * printing the power values on the cards at 14px.
 *
 * Space Grotesk over Inter for the same reason the palette lost its second accent:
 * Inter is the face that gets chosen when nobody chooses. Space Grotesk has actual
 * character in its numerals and terminals, which is most of what this interface is.
 */
const cormorant = Cormorant_Garamond({
    subsets: ['latin'],
    weight: ['500', '600', '700'],
    display: 'swap',
    variable: '--font-display',
    fallback: ['Georgia', 'serif'],
})

const spaceGrotesk = Space_Grotesk({
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
    themeColor: '#0C0B0A',
    colorScheme: 'dark',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={`${cormorant.variable} ${spaceGrotesk.variable}`}>
        {/*
          * `grain` puts a fixed noise overlay over the whole document. It is on the
          * body rather than in AppBackground because it has to sit *over* the content,
          * not behind it — that is what stops the flat vector surfaces reading as
          * plastic, and it hides the banding in the background's radial gradients.
          */}
        <body className="grain font-ui antialiased">
            <a href="#main" className="skip-link">
                Skip to content
            </a>
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

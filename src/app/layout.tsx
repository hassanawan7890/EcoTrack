import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import './globals.css'

function getMetadataBase() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim()
  if (!siteUrl) return undefined

  const normalizedUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`

  try {
    return new URL(normalizedUrl)
  } catch {
    return undefined
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: { default: 'EcoTrack', template: '%s | EcoTrack' },
  applicationName: 'EcoTrack',
  description: 'Municipal waste and recycling management platform',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'EcoTrack',
    description: 'Municipal waste and recycling management platform',
    siteName: 'EcoTrack',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

import './globals.css'

export const metadata = {
  title: 'OnTime Transit',
  description: 'Find realtime transit information.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

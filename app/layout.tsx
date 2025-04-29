import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { SyncProvider } from "@/lib/sync-context"

const inter = Inter({ subsets: ["latin", "cyrillic"] })

export const metadata = {
  title: "Enterprise Hub",
  description: "Управление задачами и ресурсами предприятия",
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <SyncProvider>
            {children}
            <Toaster />
          </SyncProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

import { MainNav } from '@/features/auth/components/main-nav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </main>
    </div>
  )
}

import { Sidebar } from '@/features/auth/components/sidebar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background relative">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 md:h-screen md:overflow-y-auto">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 py-6 w-full max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  )
}

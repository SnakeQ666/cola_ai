import { ResponsiveLayout } from '@/components/layouts/responsive-layout'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>
}


import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import RunningCampaignBanner from '@/components/RunningCampaignBanner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <RunningCampaignBanner />
          <main className="flex-1 p-8 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}

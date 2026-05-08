import { useLocation } from "react-router-dom";
import { ModernDashboardLayout } from "./ModernDashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useLaunchAcknowledgment } from "@/hooks/useLaunchAcknowledgment";
import { LaunchAnnouncementDialog } from "./LaunchAnnouncementDialog";
import { useLaunchSettings } from "@/hooks/useLaunchSettings";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { needsAck, markAcknowledged, userId } = useLaunchAcknowledgment();
  const { enabled: launchEnabled } = useLaunchSettings();

  const isAuthPage = location.pathname === "/auth";
  const isPublicSharedDream = location.pathname.startsWith("/dream/shared/");

  if (loading) return null;

  const showLaunchDialog =
    !!user && !isAuthPage && !isPublicSharedDream && needsAck && !!userId && launchEnabled;

  if (user && !isAuthPage && !isPublicSharedDream) {
    return (
      <ModernDashboardLayout>
        {children}
        {showLaunchDialog && (
          <LaunchAnnouncementDialog userId={userId!} onAcknowledged={markAcknowledged} />
        )}
      </ModernDashboardLayout>
    );
  }

  return <>{children}</>;
};

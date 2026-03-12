import TopBar from "./topbar";

interface AppTopBarProps {
  userInitials: string;
  notificationCount: number;
}

export default function AppTopBar({ userInitials, notificationCount }: AppTopBarProps) {
  return <TopBar userInitials={userInitials} notificationCount={notificationCount} />;
}

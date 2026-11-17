import { NavLink } from "react-router-dom";
import { Users, User } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

// 底部「联系人 / 我的」双 Tab 布局，移动端竖版居中
export default function TabLayout({ children }: Props) {
  return (
    <div className="flex h-[100dvh] w-full justify-center bg-muted">
      <div className="relative flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-background shadow-sm">
        <div className="feed-scroll flex-1 overflow-y-auto">{children}</div>
        <nav className="flex shrink-0 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
          <Tab to="/" label="联系人" icon={Users} />
          <Tab to="/me" label="我的" icon={User} />
        </nav>
      </div>
    </div>
  );
}

function Tab({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Users }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
          isActive ? "text-primary" : "text-muted-foreground"
        }`
      }
    >
      <Icon className="h-6 w-6" />
      <span>{label}</span>
    </NavLink>
  );
}

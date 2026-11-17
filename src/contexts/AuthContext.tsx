import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Profile } from "@/types/types";
import { toast } from "sonner";

// 本地化账号系统：账号信息仅存在当前浏览器 localStorage，不与任何后端共享。
// 注意：这不是安全的身份认证，仅用于在同一浏览器内区分不同本地账号。

const ACCOUNTS_KEY = "angel_accounts_v1";
const SESSION_KEY = "angel_session_v1";

interface LocalAccount {
  id: string;
  username: string;
  // 仅做本地混淆存储，无安全意义
  password: string;
  profile?: Profile;
}

interface LocalUser {
  id: string;
  email: string;
}

const loadAccounts = (): LocalAccount[] => {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]");
  } catch {
    return [];
  }
};

const saveAccounts = (a: LocalAccount[]) => {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a));
};

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `h${h >>> 0}`;
};

export async function getProfile(_userId: string): Promise<Profile | null> {
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  const acc = loadAccounts().find((a) => a.id === id);
  return acc?.profile ?? null;
}

interface AuthContextType {
  user: LocalUser | null;
  profile: Profile | null;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const p = await getProfile(user.id);
    setProfile(p);
  };

  useEffect(() => {
    const id = localStorage.getItem(SESSION_KEY);
    if (id) {
      const acc = loadAccounts().find((a) => a.id === id);
      if (acc) {
        setUser({ id: acc.id, email: `${acc.username}@local` });
        setProfile(acc.profile ?? null);
      }
    }
    setLoading(false);
  }, []);

  const signInWithUsername = async (username: string, password: string) => {
    try {
      const acc = loadAccounts().find((a) => a.username === username);
      if (!acc || acc.password !== hash(password)) {
        throw new Error("用户名或密码错误");
      }
      localStorage.setItem(SESSION_KEY, acc.id);
      setUser({ id: acc.id, email: `${username}@local` });
      setProfile(acc.profile ?? null);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithUsername = async (username: string, password: string) => {
    try {
      const accounts = loadAccounts();
      if (accounts.some((a) => a.username === username)) {
        throw new Error("用户名已存在");
      }
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `u_${Date.now()}`;
      accounts.push({ id, username, password: hash(password) });
      saveAccounts(accounts);
      localStorage.setItem(SESSION_KEY, id);
      setUser({ id, email: `${username}@local` });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signInWithUsername, signUpWithUsername, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

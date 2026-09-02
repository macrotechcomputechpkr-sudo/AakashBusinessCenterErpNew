import { useAuth } from '@/context/AuthContext';
import TopBar from './TopBar';
import type { PageKey } from '@/types/nav';
import { Loader2 } from 'lucide-react';

interface MainLayoutProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  children: React.ReactNode;
}

export default function MainLayout({ currentPage, onNavigate, children }: MainLayoutProps) {
  const { currentCompany, loading } = useAuth();

  if (loading || !currentCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <Loader2 className="w-8 h-8 text-[#0078d4] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar currentPage={currentPage} onNavigate={onNavigate} />
      <div className="flex-1 overflow-y-auto bc-scroll bg-[#f5f5f5]">{children}</div>
    </div>
  );
}

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Tenant, ErpUser, Company, Branch } from '@/types/erp';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  erpUser: ErpUser | null;
  tenant: Tenant | null;
  companies: Company[];
  currentCompany: Company | null;
  branches: Branch[];
  currentBranch: Branch | null;
  loading: boolean;
  signIn: (email: string, password: string, tenantCode: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  switchCompany: (company: Company) => void;
  switchBranch: (branch: Branch) => void;
  refreshCompanies: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [erpUser, setErpUser] = useState<ErpUser | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const loadInProgress = useRef(false);

  async function loadBranches(companyId: string) {
    const { data: branchData } = await supabase
      .from('branches')
      .select('*')
      .eq('company_id', companyId)
      .order('is_head_office', { ascending: false })
      .order('code');
    const branchList: Branch[] = (branchData as Branch[]) || [];
    setBranches(branchList);
    setCurrentBranch(branchList[0] ?? null);
  }

  async function loadErpData(userId: string) {
    if (loadInProgress.current) return;
    loadInProgress.current = true;
    setLoading(true);
    try {
      const { data: erpUserData, error: erpError } = await supabase
        .from('erp_users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (erpError) throw erpError;
      if (!erpUserData) {
        setLoading(false);
        return;
      }

      setErpUser(erpUserData);

      const { data: tenantData, error: tenantError } = await supabase
        .from('master_tenants')
        .select('*')
        .eq('id', erpUserData.tenant_id)
        .maybeSingle();

      if (tenantError) throw tenantError;
      if (tenantData) setTenant(tenantData);

      const { data: ucData, error: ucError } = await supabase
        .from('user_companies')
        .select('company_id, companies(*)')
        .eq('user_id', userId);

      if (ucError) throw ucError;
      if (ucData) {
        const companyList = ucData.map((uc: any) => uc.companies).filter(Boolean);
        setCompanies(companyList);
        const firstCompany = companyList[0] ?? null;
        if (firstCompany && !currentCompany) {
          setCurrentCompany(firstCompany);
          await loadBranches(firstCompany.id);
        }
      }
    } catch (err) {
      console.error('Error loading ERP data:', err);
    } finally {
      loadInProgress.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadErpData(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (!newSession) {
        setErpUser(null);
        setTenant(null);
        setCompanies([]);
        setCurrentCompany(null);
        setBranches([]);
        setCurrentBranch(null);
        setLoading(false);
      } else if (newSession.user && event !== 'TOKEN_REFRESHED') {
        loadErpData(newSession.user.id);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string, tenantCode: string) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (authError) return { error: authError.message };

      const { data: erpData, error: erpError } = await supabase
        .from('erp_users')
        .select('*')
        .eq('id', authData.user!.id)
        .maybeSingle();

      if (erpError || !erpData) {
        await supabase.auth.signOut();
        return { error: 'User not linked to any tenant' };
      }

      const { data: tenantData, error: tenantError } = await supabase
        .from('master_tenants')
        .select('*')
        .eq('id', erpData.tenant_id)
        .maybeSingle();

      if (tenantError || !tenantData) {
        await supabase.auth.signOut();
        return { error: 'Tenant not found' };
      }

      if (tenantData.tenant_code !== tenantCode.toUpperCase().trim()) {
        await supabase.auth.signOut();
        return { error: 'User does not belong to this tenant' };
      }

      if (tenantData.status !== 'active') {
        await supabase.auth.signOut();
        return { error: 'Tenant is inactive' };
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred' };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setErpUser(null);
    setTenant(null);
    setCompanies([]);
    setCurrentCompany(null);
    setBranches([]);
    setCurrentBranch(null);
  }

  function switchCompany(company: Company) {
    setCurrentCompany(company);
    loadBranches(company.id);
  }

  function switchBranch(branch: Branch) {
    setCurrentBranch(branch);
  }

  async function refreshCompanies() {
    if (!user) return;
    const { data: ucData } = await supabase
      .from('user_companies')
      .select('company_id, companies(*)')
      .eq('user_id', user.id);
    if (ucData) {
      const companyList = ucData.map((uc: any) => uc.companies).filter(Boolean);
      setCompanies(companyList);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session, user, erpUser, tenant, companies, currentCompany,
        branches, currentBranch,
        loading, signIn, signOut, switchCompany, switchBranch, refreshCompanies,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import { useAuth } from '@/context/AuthContext';
import { Building2, ChevronRight, LogOut, MapPin, FileText, Calendar } from 'lucide-react';

export default function CompanySelectorScreen() {
  const { erpUser, tenant, companies, switchCompany, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      <div className="bg-[#0078d4] text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6" />
          <div>
            <h1 className="text-sm font-semibold">Sahayak ERP</h1>
            <p className="text-xs text-blue-100">Select a company to continue</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-blue-100">Welcome</p>
            <p className="text-sm font-medium">{erpUser?.full_name}</p>
          </div>
          <button onClick={signOut} className="bc-btn-secondary bg-white/10 border-white/20 text-white hover:bg-white/20">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-3xl">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-gray-800">Choose Your Company</h2>
            <p className="text-sm text-gray-500 mt-1">
              Tenant: <span className="font-medium text-[#0078d4]">{tenant?.tenant_code}</span>
              {' '}&middot; {tenant?.name}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => switchCompany(company)}
                className="bc-card p-5 text-left hover:border-[#0078d4] hover:shadow-lg transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-[#deecf9] flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-[#0078d4]" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#0078d4] transition-colors" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">{company.name}</h3>
                <div className="space-y-1">
                  {company.pan_number && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <FileText className="w-3.5 h-3.5" />
                      PAN: {company.pan_number}
                    </div>
                  )}
                  {company.fiscal_year_label && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      FY: {company.fiscal_year_label}
                    </div>
                  )}
                  {company.address && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5" />
                      {company.address}
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Currency: {company.currency}</span>
                  <span className="bc-badge-success">Active</span>
                </div>
              </button>
            ))}
          </div>

          {companies.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No companies assigned to your account.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

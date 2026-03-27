import React from 'react';
import { LayoutDashboard, Users, Calendar, BookOpen, BarChart3, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const primaryNav = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'meetings', label: 'Meetings', icon: Calendar },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="flex min-h-screen w-72 flex-col gap-10 border-r border-slate-200/70 bg-white/70 px-6 py-8 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#2596be] to-[#670bb8] font-bold text-white">
          C
        </div>
        <div className="text-lg font-semibold text-slate-700">
          CRM<span className="text-indigo-500">.</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-8">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Workspace</p>
          <nav className="flex flex-col gap-2">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                    item.active
                      ? 'bg-gradient-to-br from-[#2596be] to-[#670bb8] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
      >
        <LogOut size={18} />
        Log out
      </button>
    </aside>
  );
};

export default Sidebar;
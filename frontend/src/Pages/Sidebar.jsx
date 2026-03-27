import React from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  Files,
} from 'lucide-react';

const primaryNav = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'meetings', label: 'Meetings', icon: Calendar },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const Sidebar = () => {
  return (
    <aside className="w-72 min-h-screen bg-white/70 backdrop-blur-xl border-r border-slate-200/70 px-6 py-8 flex flex-col gap-10">
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#2596be] to-[#670bb8] grid place-items-center text-white font-bold">
          C
        </div>
        <div className="text-lg font-semibold text-slate-700">
          CRM<span className="text-indigo-500">.</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-4">Workspace</p>
          <nav className="flex flex-col gap-2">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
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

      <button className="flex items-center gap-3 text-sm font-semibold text-slate-500 hover:text-slate-800 transition">
        <LogOut size={18} />
        Log out
      </button>
    </aside>
  );
};

export default Sidebar;

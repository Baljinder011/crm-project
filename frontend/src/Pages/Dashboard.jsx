import React from 'react';
import {
  Bell,
  ChevronDown,
  PencilLine,
  Phone,
  Plus,
  Search,
} from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const leads = [
  { id: 1, name: 'Aman Logistics', source: 'Website', status: 'New', lastContacted: '2 hours ago', owner: 'AK' },
  { id: 2, name: 'BluePeak Foods', source: 'WhatsApp', status: 'Qualified', lastContacted: 'Yesterday', owner: 'BK' },
  { id: 3, name: 'Nexa Retail', source: 'Email', status: 'Proposal', lastContacted: '3 days ago', owner: 'SK' },
  { id: 4, name: 'Orbit EduTech', source: 'Call', status: 'Won', lastContacted: '1 week ago', owner: 'PK' },
];

const statusStyles = {
  New: 'bg-sky-100 text-sky-700',
  Qualified: 'bg-amber-100 text-amber-700',
  Proposal: 'bg-violet-100 text-violet-700',
  Won: 'bg-emerald-100 text-emerald-700',
};

const Dashboard = () => {
  const { user } = useAuth();

  const userInitials = String(user?.name || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="relative flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_-10%_-20%,#dbeafe_0%,transparent_60%),radial-gradient(900px_600px_at_120%_-10%,#e0f2fe_0%,transparent_55%)]" />

        <Sidebar />

        <main className="relative flex-1 p-8 lg:p-10">
          <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">CRM Overview</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-800 lg:text-4xl">Leads Dashboard</h1>
              <p className="mt-2 text-sm text-slate-500">Logged in as {user?.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden w-full md:block md:w-96">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search leads..."
                  className="w-full rounded-full border border-slate-200 bg-white/90 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition hover:text-slate-700">
                <Bell size={18} />
              </button>
              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 shadow-sm">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#2596be] to-[#670bb8] text-xs font-semibold text-white">
                  {userInitials}
                </div>
                <div className="hidden sm:block text-sm font-medium text-slate-700">{user?.name}</div>
                <ChevronDown size={16} className="text-slate-400" />
              </div>
            </div>
          </header>

          <section className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { label: 'Total Leads', value: '128' },
              { label: 'New This Week', value: '21' },
              { label: 'Calls Scheduled', value: '13' },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                <p className="text-sm text-slate-500">{item.label}</p>
                <h3 className="mt-3 text-3xl font-semibold text-slate-800">{item.value}</h3>
              </div>
            ))}
          </section>

          <section className="mt-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Recent Leads</h2>
                <p className="mt-1 text-sm text-slate-500">Static demo list for now. Wire this to real lead APIs next.</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#2596be] to-[#670bb8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95">
                <Plus size={16} />
                Add New Lead
              </button>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-sm animate-fade-in">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Name</th>
                    <th className="px-6 py-4 font-semibold">Source</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Last Contacted</th>
                    <th className="px-6 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-100 text-xs font-semibold text-indigo-600">
                            {lead.owner}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">{lead.name}</div>
                            <div className="text-xs text-slate-400">Assigned to {lead.owner}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{lead.source}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[lead.status]}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{lead.lastContacted}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600">
                            <PencilLine size={14} />
                            Edit
                          </button>
                          <button className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-[#2596be] to-[#670bb8] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-95">
                            <Phone size={14} />
                            Call
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
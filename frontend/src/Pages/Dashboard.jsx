import React from 'react';
import Sidebar from './Sidebar';
import { Bell, ChevronDown, Phone, Search, PencilLine, Plus } from 'lucide-react';

const Dashboard = () => {
  const leads = [
    {
      id: 1,
      name: 'Rahul Sharma',
      source: 'Facebook Ads',
      status: 'New',
      lastContacted: 'Today, 10:30 AM',
      owner: 'RS',
    },
    {
      id: 2,
      name: 'Anita Verma',
      source: 'Website Form',
      status: 'In-Progress',
      lastContacted: 'Yesterday, 5:15 PM',
      owner: 'AV',
    },
    {
      id: 3,
      name: 'Karan Mehta',
      source: 'Referral',
      status: 'Qualified',
      lastContacted: 'Mar 18, 2026',
      owner: 'KM',
    },
    {
      id: 4,
      name: 'Sana Khan',
      source: 'WhatsApp',
      status: 'Contacted',
      lastContacted: 'Mar 17, 2026',
      owner: 'SK',
    },
    {
      id: 5,
      name: 'Vikas Joshi',
      source: 'LinkedIn',
      status: 'Cold',
      lastContacted: 'Mar 15, 2026',
      owner: 'VJ',
    },
  ];

  const statusStyles = {
    New: 'bg-emerald-50 text-emerald-600',
    'In-Progress': 'bg-amber-50 text-amber-600',
    Qualified: 'bg-indigo-50 text-indigo-600',
    Contacted: 'bg-sky-50 text-sky-600',
    Cold: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="relative flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_-10%_-20%,#dbeafe_0%,transparent_60%),radial-gradient(900px_600px_at_120%_-10%,#e0f2fe_0%,transparent_55%)]" />

        <Sidebar />

        <main className="relative flex-1 p-8 lg:p-10">
          <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">CRM Overview</p>
              <h1 className="text-3xl lg:text-4xl font-semibold text-slate-800 mt-2">
                Leads Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search leads..."
                  className="w-full rounded-full border border-slate-200 bg-white/90 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <button className="h-10 w-10 rounded-full border border-slate-200 bg-white/80 shadow-sm grid place-items-center text-slate-500 hover:text-slate-700 transition">
                <Bell size={18} />
              </button>
              <div className="flex items-center gap-3 bg-white/80 border border-slate-200 rounded-full px-3 py-1.5 shadow-sm">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#2596be] to-[#670bb8] text-white grid place-items-center text-xs font-semibold">
                  ABC
                </div>
                <div className="hidden sm:block text-sm font-medium text-slate-700">Abc </div>
                <ChevronDown size={16} className="text-slate-400" />
              </div>
            </div>
          </header>

          <section className="mt-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Recent Leads</h2>
                <p className="text-sm text-slate-500 mt-1">Track your most active opportunities.</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#2596be] to-[#670bb8] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition">
                <Plus size={16} />
                Add New Lead
              </button>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200/80 bg-white/90 shadow-sm overflow-hidden animate-fade-in">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Name</th>
                    <th className="px-6 py-4 font-semibold">Source</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Last Contacted</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-indigo-100 text-indigo-600 grid place-items-center text-xs font-semibold">
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
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            statusStyles[lead.status]
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{lead.lastContacted}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-600 transition">
                            <PencilLine size={14} />
                            Edit
                          </button>
                          <button className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-[#2596be] to-[#670bb8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition">
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

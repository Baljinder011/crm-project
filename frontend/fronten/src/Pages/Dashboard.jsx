import React from 'react';
import { ArrowUpRight, CheckCircle2, Flame, PencilLine, Phone, Plus, Sparkles } from 'lucide-react';
import AppLayout from '../components/AppLayout';

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
  const kpis = [
    { label: 'Total Leads', value: '1,284', note: 'Across all sources', trend: '+8.4%' },
    { label: 'Qualified', value: '312', note: 'Ready to convert', trend: '+3.2%' },
    { label: 'Pipeline Value', value: '$412k', note: 'Open opportunities', trend: '+12.5%' },
    { label: 'Won This Month', value: '46', note: 'Closed deals', trend: '+9.1%' },
  ];

  const stages = [
    { label: 'New', value: 34, color: 'bg-sky-500' },
    { label: 'Qualified', value: 22, color: 'bg-emerald-500' },
    { label: 'Proposal', value: 18, color: 'bg-indigo-500' },
    { label: 'Negotiation', value: 9, color: 'bg-amber-500' },
  ];

  const weeklyMomentum = [48, 62, 54, 78, 66, 58, 80];
  const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const focusTasks = [
    { label: 'Call Aman Logistics', meta: 'Today · Proposal stage' },
    { label: 'Send demo deck to Nexa Retail', meta: 'Due tomorrow' },
    { label: 'Review 12 unassigned leads', meta: 'High priority' },
  ];

  const activityFeed = [
    { id: 1, title: 'Orbit EduTech moved to Negotiation', time: '2 hours ago' },
    { id: 2, title: 'BluePeak Foods requested a follow-up', time: 'Yesterday' },
    { id: 3, title: 'New lead imported from Website form', time: 'Yesterday' },
    { id: 4, title: 'Aman Logistics marked as Qualified', time: '2 days ago' },
  ];

  return (
    <AppLayout
      title="Dashboard"
      eyebrow="CRM Overview"
      description="Your revenue cockpit — monitor lead health, momentum, and next actions."
    >
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <div key={item.label} className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                <h3 className="mt-3 text-3xl font-semibold text-slate-800">{item.value}</h3>
                <p className="mt-2 text-sm text-slate-500">{item.note}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                {item.trend}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Revenue Pulse</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-800">Weekly Momentum</h2>
            </div>
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600">
              View report
              <ArrowUpRight size={16} />
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {stages.map((stage) => (
              <div key={stage.label} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>{stage.label}</span>
                  <span className="font-semibold text-slate-700">{stage.value}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full ${stage.color}`} style={{ width: `${stage.value * 2}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Touches per day</p>
              <span className="text-xs text-slate-400">Last 7 days</span>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-3">
              {weeklyMomentum.map((value, index) => (
                <div key={weekLabels[index]} className="flex flex-col items-center gap-2">
                  <div className="relative h-24 w-3 rounded-full bg-slate-100">
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-b from-[#2596be] to-[#670bb8]"
                      style={{ height: `${value}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{weekLabels[index]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Flame size={18} />
              <p className="text-sm font-medium">Focus Today</p>
            </div>
            <h3 className="mt-2 text-xl font-semibold text-slate-800">Priority Tasks</h3>
            <div className="mt-5 space-y-3">
              {focusTasks.map((task) => (
                <div key={task.label} className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                  <CheckCircle2 size={18} className="mt-0.5 text-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{task.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{task.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm">
            <div className="flex items-center gap-2 text-white/70">
              <Sparkles size={18} />
              <p className="text-xs uppercase tracking-[0.3em]">Opportunity</p>
            </div>
            <h3 className="mt-3 text-2xl font-semibold">Push 12 dormant leads</h3>
            <p className="mt-2 text-sm text-white/70">
              Leads inactive for 14+ days have a 2x drop in conversion. Trigger a follow-up sequence.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900">
                Start Sequence
              </button>
              <button className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white/80">
                Review List
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Recent Leads</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-800">Active opportunities</h3>
            </div>
            <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#2596be] to-[#670bb8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95">
              <Plus size={16} />
              Add New Lead
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-sm">
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
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Activity</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-800">Latest updates</h3>
          <div className="mt-6 space-y-4">
            {activityFeed.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.time}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppLayout>
  );
};

export default Dashboard;

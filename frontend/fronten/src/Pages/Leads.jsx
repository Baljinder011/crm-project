import React from 'react';
import AppLayout from '../components/AppLayout';

const Leads = () => {
  const stats = [
    { label: 'Total Leads', value: '1,284', trend: '+8.4%' },
    { label: 'Qualified', value: '312', trend: '+3.2%' },
    { label: 'In Pipeline', value: '184', trend: '+1.1%' },
    { label: 'Won This Month', value: '46', trend: '+12.9%' },
  ];

  const leads = [
    {
      id: 1,
      name: 'Aman Logistics',
      stage: 'Proposal',
      owner: 'AK',
      score: 86,
      value: '$24k',
      updated: '2h ago',
    },
    {
      id: 2,
      name: 'BluePeak Foods',
      stage: 'Qualified',
      owner: 'BK',
      score: 78,
      value: '$18k',
      updated: 'Yesterday',
    },
    {
      id: 3,
      name: 'Nexa Retail',
      stage: 'Discovery',
      owner: 'SK',
      score: 64,
      value: '$11k',
      updated: '2 days ago',
    },
    {
      id: 4,
      name: 'Orbit EduTech',
      stage: 'Negotiation',
      owner: 'PK',
      score: 92,
      value: '$41k',
      updated: '3 days ago',
    },
  ];

  const pipeline = [
    { label: 'New', value: 34, color: 'bg-sky-500' },
    { label: 'Qualified', value: 22, color: 'bg-emerald-500' },
    { label: 'Proposal', value: 18, color: 'bg-indigo-500' },
    { label: 'Negotiation', value: 9, color: 'bg-amber-500' },
  ];

  return (
    <AppLayout title="Leads" eyebrow="CRM Overview" description="Track, prioritize, and convert your hottest prospects.">
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Lead Flow</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-800">Pipeline Momentum</h2>
              <p className="mt-2 text-sm text-slate-500">
                74% of active leads are progressing this week.
              </p>
            </div>
            <button className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#2596be] to-[#670bb8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95">
              Add New Lead
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="text-2xl font-semibold text-slate-800">{item.value}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                    {item.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Stage Distribution</p>
              <span className="text-xs text-slate-400">Last 7 days</span>
            </div>
            <div className="mt-4 space-y-3">
              {pipeline.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-20 text-xs font-medium text-slate-500">{item.label}</div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full ${item.color}`} style={{ width: `${item.value * 2}%` }} />
                  </div>
                  <div className="w-8 text-right text-xs font-semibold text-slate-600">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Focus Today</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-800">Top Priority Leads</h3>
            <div className="mt-5 space-y-4">
              {leads.slice(0, 3).map((lead) => (
                <div key={lead.id} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{lead.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{lead.stage} · Updated {lead.updated}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-800">{lead.value}</div>
                    <div className="mt-1 text-xs text-emerald-600">Score {lead.score}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Next Best Action</p>
            <h3 className="mt-3 text-2xl font-semibold">Follow up with Orbit EduTech</h3>
            <p className="mt-2 text-sm text-white/70">
              Negotiation stage is 3 days idle. Scheduling a call increases close rate by 14%.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900">
                Schedule Call
              </button>
              <button className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white/80">
                Send Proposal
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Latest Activity</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-800">Lead Updates</h3>
            </div>
            <button className="text-sm font-semibold text-indigo-600">View all</button>
          </div>
          <div className="mt-6 space-y-4">
            {leads.map((lead) => (
              <div key={lead.id} className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-100 text-xs font-semibold text-indigo-600">
                  {lead.owner}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-800">{lead.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Stage: {lead.stage} · Last update {lead.updated}
                  </div>
                </div>
                <div className="text-right text-xs font-semibold text-slate-600">{lead.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Quick Actions</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-800">Move Faster</h3>
          <div className="mt-5 space-y-3">
            {[
              'Import new leads from CSV',
              'Assign owners for unclaimed leads',
              'Review stale opportunities',
              'Create a follow-up sequence',
            ].map((task) => (
              <button
                key={task}
                className="w-full rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-white"
              >
                {task}
              </button>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200/80 bg-white px-4 py-4 text-xs text-slate-500">
            Tip: Add lead score rules to auto-prioritize hot deals.
          </div>
        </div>
      </section>
    </AppLayout>
  );
};

export default Leads;

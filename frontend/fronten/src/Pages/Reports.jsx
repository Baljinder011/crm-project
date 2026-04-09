import React from 'react';
import { ArrowUpRight, BarChart3, Download, LineChart, PieChart, TrendingUp } from 'lucide-react';
import AppLayout from '../components/AppLayout';

const Reports = () => {
  const kpis = [
    { label: 'Pipeline Value', value: '$412k', trend: '+12.5%' },
    { label: 'Win Rate', value: '38%', trend: '+3.1%' },
    { label: 'Avg Deal Size', value: '$9.2k', trend: '+4.6%' },
    { label: 'Sales Cycle', value: '18 days', trend: '-2.4%' },
  ];

  const channels = [
    { label: 'Website', value: 52, color: 'bg-sky-500' },
    { label: 'WhatsApp', value: 34, color: 'bg-emerald-500' },
    { label: 'Email', value: 24, color: 'bg-indigo-500' },
    { label: 'Referrals', value: 18, color: 'bg-amber-500' },
  ];

  const reports = [
    { id: 1, name: 'Weekly Pipeline Health', type: 'Sales', updated: '2 hours ago' },
    { id: 2, name: 'Campaign Performance', type: 'Marketing', updated: 'Yesterday' },
    { id: 3, name: 'Rep Activity Summary', type: 'Team', updated: '2 days ago' },
    { id: 4, name: 'Customer Source Trends', type: 'Insights', updated: 'Last week' },
  ];

  return (
    <AppLayout
      title="Reports"
      eyebrow="CRM Overview"
      description="Track revenue performance, pipeline movement, and team productivity."
    >
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <div key={item.label} className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
            <div className="mt-3 text-3xl font-semibold text-slate-800">{item.value}</div>
            <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
              {item.trend}
            </span>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Revenue analytics</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-800">Performance snapshot</h2>
            </div>
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600">
              View dashboard
              <ArrowUpRight size={16} />
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Close Rate', value: '38%', icon: TrendingUp },
              { label: 'Forecast', value: '$92k', icon: LineChart },
              { label: 'Pipeline Mix', value: '6 stages', icon: PieChart },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                    <Icon size={18} className="text-indigo-500" />
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-slate-800">{item.value}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Lead sources</p>
              <span className="text-xs text-slate-400">Last 30 days</span>
            </div>
            <div className="mt-4 space-y-3">
              {channels.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-24 text-xs font-medium text-slate-500">{item.label}</div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full ${item.color}`} style={{ width: `${item.value}%` }} />
                  </div>
                  <div className="w-10 text-right text-xs font-semibold text-slate-600">{item.value}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Report center</p>
            <h3 className="mt-3 text-2xl font-semibold">Export weekly summary</h3>
            <p className="mt-2 text-sm text-white/70">
              Generate a shareable PDF with the latest pipeline and revenue metrics.
            </p>
            <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900">
              <Download size={14} />
              Download PDF
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <BarChart3 size={18} />
              <p className="text-sm font-medium">Highlights</p>
            </div>
            <h3 className="mt-2 text-xl font-semibold text-slate-800">Top insights</h3>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <p>Website leads are converting 18% faster than WhatsApp leads.</p>
              <p>Avg sales cycle dropped by 2.4 days this month.</p>
              <p>Three reps exceed pipeline targets by 20%.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Saved reports</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-800">Quick access</h3>
          </div>
          <button className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600">
            View all
            <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {reports.map((report) => (
            <div key={report.id} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
              <p className="text-sm font-semibold text-slate-800">{report.name}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{report.type}</span>
                <span>{report.updated}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  );
};

export default Reports;

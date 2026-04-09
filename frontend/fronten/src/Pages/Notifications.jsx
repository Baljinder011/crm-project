import React from 'react';
import { Bell, CheckCircle2, Clock, Info, MailOpen, ShieldAlert, Trash2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';

const Notifications = () => {
  const highlights = [
    { label: 'Unread', value: '3', icon: Bell },
    { label: 'This Week', value: '18', icon: Clock },
    { label: 'Actions Needed', value: '4', icon: ShieldAlert },
    { label: 'Resolved', value: '52', icon: CheckCircle2 },
  ];

  const notifications = [
    { id: 1, title: 'Orbit EduTech moved to Negotiation', time: '2 hours ago', type: 'info', unread: true },
    { id: 2, title: 'BluePeak Foods scheduled a demo call', time: 'Yesterday', type: 'success', unread: true },
    { id: 3, title: 'Weekly pipeline report is ready', time: '2 days ago', type: 'neutral', unread: false },
    { id: 4, title: 'New lead imported from Website form', time: '3 days ago', type: 'info', unread: false },
    { id: 5, title: 'Password updated successfully', time: 'Last week', type: 'success', unread: false },
  ];

  return (
    <AppLayout
      title="Notifications"
      eyebrow="CRM Overview"
      description="Stay on top of lead activity, alerts, and system updates."
    >
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                  <div className="mt-3 text-3xl font-semibold text-slate-800">{item.value}</div>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-100 text-indigo-600">
                  <Icon size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Inbox</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-800">Latest notifications</h2>
            </div>
            <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#2596be] to-[#670bb8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95">
              <MailOpen size={16} />
              Mark all read
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {notifications.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-4">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 h-2.5 w-2.5 rounded-full ${
                      item.type === 'success'
                        ? 'bg-emerald-500'
                        : item.type === 'info'
                        ? 'bg-indigo-500'
                        : 'bg-slate-300'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.time}</p>
                  </div>
                  {item.unread ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      New
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <button className="rounded-full border border-slate-200/70 bg-white px-3 py-1 font-semibold text-slate-600 transition hover:border-indigo-200">
                    View details
                  </button>
                  <button className="rounded-full border border-slate-200/70 bg-white px-3 py-1 font-semibold text-slate-600 transition hover:border-indigo-200">
                    Snooze
                  </button>
                  <button className="rounded-full border border-slate-200/70 bg-white px-3 py-1 font-semibold text-slate-600 transition hover:border-indigo-200">
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm">
            <div className="flex items-center gap-2 text-white/70">
              <Info size={18} />
              <p className="text-xs uppercase tracking-[0.3em]">Tip</p>
            </div>
            <h3 className="mt-3 text-2xl font-semibold">Keep the inbox clean</h3>
            <p className="mt-2 text-sm text-white/70">
              Archive resolved updates to focus on high-priority alerts.
            </p>
            <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900">
              <Trash2 size={14} />
              Clear resolved
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Preferences</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-800">Notification channels</h3>
            <div className="mt-5 space-y-3">
              {[
                { label: 'Lead alerts', active: true },
                { label: 'Daily summaries', active: true },
                { label: 'System updates', active: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                  <div className={`flex h-6 w-11 items-center rounded-full p-1 ${item.active ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                    <div className={`h-4 w-4 rounded-full bg-white transition ${item.active ? 'translate-x-5' : ''}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  );
};

export default Notifications;

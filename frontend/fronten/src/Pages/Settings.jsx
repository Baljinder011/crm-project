import React from 'react';
import { Bell, CheckCircle2, Lock, Mail, Shield, SlidersHorizontal, User } from 'lucide-react';
import AppLayout from '../components/AppLayout';

const Settings = () => {
  const preferences = [
    { label: 'Email Notifications', description: 'Weekly activity summary and alerts.', enabled: true, icon: Mail },
    { label: 'Product Updates', description: 'New features and release notes.', enabled: true, icon: Bell },
    { label: 'Quiet Hours', description: 'Mute notifications after 8 PM.', enabled: false, icon: SlidersHorizontal },
  ];

  const security = [
    'Two-factor authentication enabled',
    'Password updated 18 days ago',
    'Login alerts for new devices',
  ];

  const integrations = [
    { name: 'Google Calendar', status: 'Connected' },
    { name: 'Slack', status: 'Connected' },
    { name: 'Zoom', status: 'Pending' },
  ];

  return (
    <AppLayout
      title="Settings"
      eyebrow="CRM Overview"
      description="Manage profile, notifications, and security preferences."
    >
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Profile</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-800">Account details</h2>
            </div>
            <button className="rounded-full bg-gradient-to-br from-[#2596be] to-[#670bb8] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95">
              Edit Profile
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-indigo-100 text-2xl font-semibold text-indigo-600">
              B
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-800">Baljinder Singh</p>
              <p className="mt-1 text-sm text-slate-500">Sales Lead · Chandigarh</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Mail size={14} />
                  baljinder@indraq.com
                </span>
                <span className="inline-flex items-center gap-1">
                  <User size={14} />
                  Last active 2 hours ago
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Role</p>
              <p className="mt-2 text-sm font-semibold text-slate-700">Sales Lead</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Plan</p>
              <p className="mt-2 text-sm font-semibold text-slate-700">Growth · 12 seats</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Security score</p>
            <h3 className="mt-3 text-2xl font-semibold">92%</h3>
            <p className="mt-2 text-sm text-white/70">Enable device login alerts to reach 100%.</p>
            <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900">
              <Shield size={14} />
              Review Security
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Integrations</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-800">Connected apps</h3>
            <div className="mt-5 space-y-3">
              {integrations.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                  <span className={`text-xs font-semibold ${item.status === 'Connected' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Preferences</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-800">Notifications & alerts</h3>
            </div>
            <button className="text-sm font-semibold text-indigo-600">Manage</button>
          </div>
          <div className="mt-6 space-y-4">
            {preferences.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-100 text-indigo-600">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                    </div>
                  </div>
                  <div className={`flex h-6 w-11 items-center rounded-full p-1 ${item.enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                    <div className={`h-4 w-4 rounded-full bg-white transition ${item.enabled ? 'translate-x-5' : ''}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Lock size={18} />
            <p className="text-sm font-medium">Security</p>
          </div>
          <h3 className="mt-2 text-xl font-semibold text-slate-800">Protection checklist</h3>
          <div className="mt-5 space-y-3">
            {security.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <p className="text-sm font-semibold text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppLayout>
  );
};

export default Settings;

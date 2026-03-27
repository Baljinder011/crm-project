import React from 'react';
import { ArrowUpRight, CalendarCheck, Clock, MapPin, Plus, UserCheck, Video } from 'lucide-react';
import AppLayout from '../components/AppLayout';

const Meetings = () => {
  const stats = [
    { label: 'Meetings Today', value: '8', note: '3 remaining', icon: CalendarCheck },
    { label: 'Booked This Week', value: '26', note: 'Up 12%', icon: UserCheck },
    { label: 'Avg Duration', value: '32 min', note: 'Last 30 days', icon: Clock },
    { label: 'Video Calls', value: '71%', note: 'Hybrid teams', icon: Video },
  ];

  const agenda = [
    { time: '09:00 AM', title: 'Aman Logistics', meta: 'Discovery · Zoom' },
    { time: '11:30 AM', title: 'BluePeak Foods', meta: 'Follow-up · Google Meet' },
    { time: '02:00 PM', title: 'Nexa Retail', meta: 'Demo · In-office' },
    { time: '04:15 PM', title: 'Orbit EduTech', meta: 'Negotiation · Zoom' },
  ];

  const upcoming = [
    { id: 1, name: 'Aman Logistics', time: 'Today · 09:00 AM', owner: 'AK', type: 'Discovery', location: 'Zoom' },
    { id: 2, name: 'BluePeak Foods', time: 'Today · 11:30 AM', owner: 'BK', type: 'Follow-up', location: 'Google Meet' },
    { id: 3, name: 'Nexa Retail', time: 'Tomorrow · 10:00 AM', owner: 'SK', type: 'Demo', location: 'HQ Boardroom' },
    { id: 4, name: 'Orbit EduTech', time: 'Friday · 02:30 PM', owner: 'PK', type: 'Negotiation', location: 'Zoom' },
  ];

  return (
    <AppLayout
      title="Meetings"
      eyebrow="CRM Overview"
      description="Schedule, run, and review every customer conversation in one place."
    >
      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Today at a glance</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-800">Meeting Command Center</h2>
              <p className="mt-2 text-sm text-slate-500">All your calls, demos, and follow-ups at a glance.</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#2596be] to-[#670bb8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95">
              <Plus size={16} />
              New Meeting
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {stats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                      <div className="mt-2 text-2xl font-semibold text-slate-800">{item.value}</div>
                      <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                    </div>
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-100 text-indigo-600">
                      <Icon size={18} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Agenda timeline</p>
              <button className="text-sm font-semibold text-indigo-600">See calendar</button>
            </div>
            <div className="mt-4 space-y-3">
              {agenda.map((item) => (
                <div key={item.time} className="flex items-start gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                  <div className="text-xs font-semibold text-slate-500">{item.time}</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Next meeting</p>
            <h3 className="mt-3 text-2xl font-semibold">Aman Logistics</h3>
            <p className="mt-2 text-sm text-white/70">Discovery call · 09:00 AM</p>
            <div className="mt-4 flex items-center gap-3 text-xs text-white/70">
              <Video size={14} />
              Zoom link ready
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900">
                Join Call
              </button>
              <button className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white/80">
                View Notes
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Quick actions</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-800">Stay on track</h3>
            <div className="mt-4 space-y-3">
              {['Share agenda', 'Send reminder emails', 'Create meeting summary'].map((item) => (
                <button
                  key={item}
                  className="w-full rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-white"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Upcoming meetings</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-800">All scheduled sessions</h3>
          </div>
          <button className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600">
            View calendar
            <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {upcoming.map((meet) => (
            <div key={meet.id} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{meet.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{meet.type} · {meet.time}</p>
                </div>
                <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-600">{meet.owner}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <MapPin size={14} />
                {meet.location}
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  );
};

export default Meetings;

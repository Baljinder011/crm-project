import React from 'react';
import { ArrowUpRight, BookOpen, LifeBuoy, Layers, PlayCircle, Plus, Zap } from 'lucide-react';
import AppLayout from '../components/AppLayout';

const KnowledgeBase = () => {
  const categories = [
    { label: 'Getting Started', count: '18 articles', icon: PlayCircle },
    { label: 'Sales Playbooks', count: '24 articles', icon: Zap },
    { label: 'Integrations', count: '12 articles', icon: Layers },
    { label: 'Billing & Plans', count: '9 articles', icon: BookOpen },
  ];

  const articles = [
    { id: 1, title: 'Qualify leads in under 5 minutes', tag: 'Sales', read: '6 min read' },
    { id: 2, title: 'How to set up automated follow-ups', tag: 'Automation', read: '4 min read' },
    { id: 3, title: 'Best-performing outreach sequences', tag: 'Playbooks', read: '8 min read' },
    { id: 4, title: 'CRM data import checklist', tag: 'Setup', read: '5 min read' },
  ];

  const updates = [
    { id: 1, title: 'New WhatsApp integration guide', time: '2 days ago' },
    { id: 2, title: 'Sales dashboard FAQ refresh', time: 'Last week' },
    { id: 3, title: 'Lead scoring rules explained', time: '2 weeks ago' },
  ];

  return (
    <AppLayout
      title="Knowledge Base"
      eyebrow="CRM Overview"
      description="Guides, playbooks, and answers for every step of your sales journey."
    >
      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Browse collections</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-800">Find answers fast</h2>
              <p className="mt-2 text-sm text-slate-500">Jump into curated guides or search above.</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#2596be] to-[#670bb8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95">
              <Plus size={16} />
              New Article
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {categories.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.count}</p>
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
              <p className="text-sm font-semibold text-slate-700">Popular articles</p>
              <button className="text-sm font-semibold text-indigo-600">View all</button>
            </div>
            <div className="mt-4 space-y-3">
              {articles.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-600">{item.tag}</span>
                    <span>{item.read}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Need help?</p>
            <h3 className="mt-3 text-2xl font-semibold">Talk to Support</h3>
            <p className="mt-2 text-sm text-white/70">
              Our team responds within 2 hours on weekdays.
            </p>
            <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900">
              <LifeBuoy size={14} />
              Open Ticket
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <ArrowUpRight size={18} />
              <p className="text-sm font-medium">Latest updates</p>
            </div>
            <h3 className="mt-2 text-xl font-semibold text-slate-800">What’s new</h3>
            <div className="mt-5 space-y-3">
              {updates.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  );
};

export default KnowledgeBase;

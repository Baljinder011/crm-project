import React, { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Building,
  User,
  DollarSign,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileUp,
  LayoutGrid,
  Table as TableIcon,
  Sparkles,
  LoaderCircle,
  Brain,
  RefreshCcw,
  Phone,
  Mail,
  Target,
  AlertCircle,
  Flame,
  Activity,
  BadgeCheck,
  Clock3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { contactsApi } from '../services/contactsApi';

const stages = [
  { id: 'new', name: 'Lead' },
  { id: 'scheduled', name: 'Demo Scheduled' },
  { id: 'negotiation', name: 'Negotiation' },
  { id: 'proposal', name: 'Proposal Sent' },
  { id: 'won', name: 'Won' },
  { id: 'lost', name: 'Lost' },
];

const statusStyles = {
  not_started: 'bg-slate-100 text-slate-700 border border-slate-200',
  queued: 'bg-amber-50 text-amber-700 border border-amber-200',
  processing: 'bg-sky-50 text-sky-700 border border-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  failed: 'bg-rose-50 text-rose-700 border border-rose-200',
};

function formatBackendDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function mapContactToPipelineItem(contact) {
  return {
    id: String(contact.id),
    contactId: Number(contact.id),
    title: contact.full_name || contact.email || 'Unnamed Lead',
    company: contact.company || 'Unknown',
    email: contact.email || '',
    phone: contact.phone || '',
    message: contact.message || '',
    address: contact.address || '',
    createdAt: contact.created_at,
    date: formatBackendDate(contact.created_at),
    status: 'new',
    amount: contact.ai?.score ? String(contact.ai.score) : '0',
    ai: {
      status: contact.ai?.status || 'not_started',
      intent: contact.ai?.intent || '',
      industry: contact.ai?.industry || '',
      urgency: contact.ai?.urgency || '',
      score: Number(contact.ai?.score || 0),
      confidence: Number(contact.ai?.confidence || 0),
      companySummary: contact.ai?.company_summary || '',
      aiSummary: contact.ai?.ai_summary || '',
      recommendedAction: contact.ai?.recommended_action || '',
      painPoints: contact.ai?.pain_points || [],
      researchSources: contact.ai?.research_sources || [],
      errorMessage: contact.ai?.error_message || '',
      lastEnrichedAt: contact.ai?.last_enriched_at || null,
    },
    task: contact.task || null,
  };
}

function getScoreTone(score) {
  if (score >= 80) return 'text-emerald-700';
  if (score >= 50) return 'text-amber-700';
  return 'text-slate-700';
}

function StatCard({ icon: Icon, label, value, subText }) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            {label}
          </p>
          <div className="mt-3 text-3xl font-semibold text-slate-800">{value}</div>
          {subText ? <p className="mt-1 text-xs text-slate-500">{subText}</p> : null}
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-slate-600">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function DetailBox({ icon: Icon, title, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 text-slate-700">
        {Icon ? <Icon size={17} /> : null}
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <div className="mt-4 text-sm leading-7 text-slate-600">{children}</div>
    </div>
  );
}

function LeadDetailPanel({ lead, onRefresh, busyId, onEnrich }) {
  if (!lead) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-8 text-sm text-slate-500 shadow-sm xl:max-h-[calc(100vh-18rem)] xl:overflow-y-auto xl:pr-2">
        Select a contact to see the AI brief.
      </div>
    );
  }

  const scoreWidth = `${Math.max(0, Math.min(100, lead.ai.score || 0))}%`;

  return (
    <div className="space-y-5 xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto xl:pr-2">
      <div className="rounded-[30px] border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="truncate text-3xl font-semibold text-slate-800">{lead.title}</h3>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    statusStyles[lead.ai.status] || statusStyles.not_started
                  }`}
                >
                  {lead.ai.status.replace('_', ' ')}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-500">{lead.company || 'No company provided'}</p>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail size={15} />
                  <span className="truncate">{lead.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={15} />
                  <span>{lead.phone || 'No phone'}</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3">
              <button
                onClick={onRefresh}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
              >
                <RefreshCcw size={15} />
                Refresh
              </button>

              <button
                onClick={() => onEnrich(lead.contactId)}
                disabled={busyId === lead.contactId}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2596be] to-[#6d28d9] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {busyId === lead.contactId ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                Re-run AI
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Lead Score
                </p>
                <div className={`mt-2 text-2xl font-semibold ${getScoreTone(lead.ai.score)}`}>
                  {lead.ai.score || 0}/100
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Confidence {((lead.ai.confidence || 0) * 100).toFixed(0)}%
                </p>
              </div>

              <div className="min-w-[130px] flex-1">
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2596be] to-[#6d28d9]"
                    style={{ width: scoreWidth }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Intent
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {lead.ai.intent || 'Pending'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Industry
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {lead.ai.industry || 'Pending'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Urgency
              </p>
              <p className="mt-2 text-sm font-semibold capitalize text-slate-800">
                {lead.ai.urgency || 'Pending'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <DetailBox icon={Brain} title="AI Summary">
        {lead.ai.aiSummary || 'No AI summary available yet.'}
      </DetailBox>

      <DetailBox icon={Target} title="Recommended Action">
        {lead.ai.recommendedAction || 'No recommendation available yet.'}
      </DetailBox>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
        <DetailBox icon={AlertCircle} title="Pain Points">
          {(lead.ai.painPoints || []).length ? (
            <div className="flex flex-wrap gap-2">
              {lead.ai.painPoints.map((point) => (
                <span
                  key={point}
                  className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"
                >
                  {point}
                </span>
              ))}
            </div>
          ) : (
            <span>No pain points yet.</span>
          )}
        </DetailBox>

        <DetailBox icon={Calendar} title="Follow-up Task">
          {lead.task ? (
            <div className="space-y-2">
              <div className="font-semibold text-slate-800">{lead.task.title}</div>
              <div className="text-xs text-slate-500">
                Priority: {lead.task.priority} · Status: {lead.task.status}
              </div>
              <div className="text-xs text-slate-500">
                Due: {formatDateTime(lead.task.due_at)}
              </div>
            </div>
          ) : (
            <span>Task will appear after AI enrichment finishes.</span>
          )}
        </DetailBox>
      </div>

      <DetailBox icon={Search} title="Research Sources">
        {(lead.ai.researchSources || []).length ? (
          <div className="space-y-3">
            {lead.ai.researchSources.map((source, index) => (
              <a
                key={`${source.url}-${index}`}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 transition hover:border-indigo-200 hover:bg-white"
              >
                <div className="text-sm font-semibold text-slate-800">{source.title}</div>
                <div className="mt-1 truncate text-xs text-slate-500">{source.url}</div>
              </a>
            ))}
          </div>
        ) : (
          <span>No research sources yet.</span>
        )}
      </DetailBox>

      <DetailBox icon={Mail} title="Original Form Message">
        {lead.message || 'No message provided.'}
      </DetailBox>

      <DetailBox icon={User} title="Contact Details">
        <div className="space-y-2">
          <p>
            <span className="font-semibold text-slate-700">Email:</span> {lead.email || '—'}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Phone:</span> {lead.phone || '—'}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Address:</span> {lead.address || '—'}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Created:</span>{' '}
            {formatDateTime(lead.createdAt)}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Last AI Run:</span>{' '}
            {formatDateTime(lead.ai.lastEnrichedAt)}
          </p>
        </div>
      </DetailBox>

      {lead.ai.errorMessage ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertCircle size={17} />
            <p className="text-sm font-semibold">AI Error</p>
          </div>
          <p className="mt-3 text-sm leading-7 text-rose-600">{lead.ai.errorMessage}</p>
        </div>
      ) : null}
    </div>
  );
}

const Pipeline = () => {
  const { token } = useAuth();

  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('board');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [rangeLabel, setRangeLabel] = useState('Date range');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [summary, setSummary] = useState({
    total: 0,
    completed: 0,
    processing: 0,
    failed: 0,
    hot: 0,
  });

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  const datePickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showDatePicker) return;
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showDatePicker]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const formatDisplayDate = (date) => {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const isSameDay = (a, b) => {
    if (!a || !b) return false;
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const isInRange = (date) => {
    if (!startDate || !endDate) return false;
    return date >= startDate && date <= endDate;
  };

  const getMonthWeeks = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const weeks = [];
    let week = [];

    for (let i = 0; i < firstDay.getDay(); i += 1) week.push(null);

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      week.push(new Date(year, month, day));
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    if (week.length) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }

    return weeks;
  };

  const applyPreset = (preset) => {
    const today = new Date();
    let start = today;
    let end = today;

    switch (preset) {
      case 'today':
        setRangeLabel('Today');
        break;
      case 'yesterday': {
        const y = new Date();
        y.setDate(today.getDate() - 1);
        start = y;
        end = y;
        setRangeLabel('Yesterday');
        break;
      }
      case 'last7': {
        const s = new Date();
        s.setDate(today.getDate() - 6);
        start = s;
        end = today;
        setRangeLabel('Last 7 days');
        break;
      }
      case 'last30': {
        const s = new Date();
        s.setDate(today.getDate() - 29);
        start = s;
        end = today;
        setRangeLabel('Last 30 days');
        break;
      }
      case 'thisMonth': {
        const s = new Date(today.getFullYear(), today.getMonth(), 1);
        const e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        start = s;
        end = e;
        setRangeLabel('This month');
        break;
      }
      case 'lastMonth': {
        const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const e = new Date(today.getFullYear(), today.getMonth(), 0);
        start = s;
        end = e;
        setRangeLabel('Last month');
        break;
      }
      default:
        setRangeLabel('Custom');
        return;
    }

    setStartDate(start);
    setEndDate(end);
    setCalendarMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    setShowDatePicker(false);
  };

  const applyCustomRange = () => {
    if (startDate && endDate) {
      setRangeLabel(`${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`);
    } else {
      setRangeLabel('Custom');
    }
    setShowDatePicker(false);
  };

  const clearRange = () => {
    setStartDate(null);
    setEndDate(null);
    setRangeLabel('Date range');
    setShowDatePicker(false);
  };

  const handleDayClick = (date) => {
    if (!date) return;

    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
      setRangeLabel('Custom');
      return;
    }

    if (date < startDate) {
      setEndDate(startDate);
      setStartDate(date);
      setRangeLabel('Custom');
      return;
    }

    setEndDate(date);
    setRangeLabel('Custom');
  };

  async function loadContacts(showSpinner = true) {
    if (!token) return;

    if (showSpinner) setLoading(true);
    setError('');

    try {
      const response = await contactsApi.getContacts(token);
      const mapped = (response?.contacts || []).map(mapContactToPipelineItem);

      setLeads(mapped);
      setSummary(
        response?.summary || {
          total: 0,
          completed: 0,
          processing: 0,
          failed: 0,
          hot: 0,
        }
      );

      setSelectedLeadId((prev) => {
        if (prev && mapped.some((item) => item.id === prev)) return prev;
        return mapped?.[0]?.id || null;
      });
    } catch (fetchError) {
      console.error('Failed to load contacts:', fetchError);
      setError(fetchError.message || 'Failed to load contacts.');
      setLeads([]);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  useEffect(() => {
    loadContacts();
  }, [token]);

  const selectedLead =
    leads.find((item) => item.id === selectedLeadId) || leads[0] || null;

  useEffect(() => {
    if (!selectedLead) return;

    const currentStatus = selectedLead.ai?.status;
    if (currentStatus !== 'queued' && currentStatus !== 'processing') return;

    const intervalId = setInterval(() => {
      loadContacts(false);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [selectedLead?.id, selectedLead?.ai?.status, token]);

  const onDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === draggableId ? { ...lead, status: destination.droppableId } : lead
      )
    );
  };

  async function handleEnrich(contactId) {
    try {
      setBusyId(contactId);
      setError('');

      setLeads((prev) =>
        prev.map((lead) =>
          lead.contactId === contactId
            ? {
                ...lead,
                ai: {
                  ...lead.ai,
                  status: 'processing',
                  errorMessage: '',
                },
              }
            : lead
        )
      );

      await contactsApi.enrichContact(contactId, token);
      await loadContacts(false);
    } catch (enrichError) {
      setError(enrichError.message || 'Failed to queue AI enrichment.');
      await loadContacts(false);
    } finally {
      setBusyId(null);
    }
  }

  async function handleEnrichAll() {
    try {
      setBulkBusy(true);
      setError('');
      await contactsApi.enrichAll(token);
      await loadContacts(false);
    } catch (enrichError) {
      setError(enrichError.message || 'Failed to queue AI enrichment jobs.');
    } finally {
      setBulkBusy(false);
    }
  }

  const filteredLeads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesSearch =
        !term ||
        lead.title.toLowerCase().includes(term) ||
        lead.email.toLowerCase().includes(term) ||
        lead.company.toLowerCase().includes(term) ||
        lead.message.toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (!startDate || !endDate) return true;

      const createdAt = new Date(lead.createdAt);
      if (Number.isNaN(createdAt.getTime())) return true;

      const normalizedStart = new Date(startDate);
      normalizedStart.setHours(0, 0, 0, 0);

      const normalizedEnd = new Date(endDate);
      normalizedEnd.setHours(23, 59, 59, 999);

      return createdAt >= normalizedStart && createdAt <= normalizedEnd;
    });
  }, [leads, searchTerm, startDate, endDate]);

  const leftMonth = calendarMonth;
  const rightMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
  const leftWeeks = getMonthWeeks(leftMonth);
  const rightWeeks = getMonthWeeks(rightMonth);
  const isCustomRange = rangeLabel === 'Custom' || (rangeLabel && rangeLabel.includes('-'));

  const quickSelectClass = (active) =>
    `rounded-lg px-2 py-1 text-left text-sm transition ${
      active ? 'bg-white text-slate-800 font-semibold' : 'text-slate-600 hover:bg-white'
    }`;

  const statCards = [
    { label: 'Total Contacts', value: summary.total, icon: Activity, subText: 'All imported contacts' },
    { label: 'AI Completed', value: summary.completed, icon: BadgeCheck, subText: 'Fully enriched contacts' },
    { label: 'AI Running', value: summary.processing, icon: Clock3, subText: 'Queued or processing' },
    { label: 'Hot Contacts', value: summary.hot, icon: Flame, subText: 'Score 80 and above' },
  ];

  return (
    <AppLayout title="Presales Pipeline" eyebrow="CRM Overview">
      <div className="space-y-6">
        <div className="rounded-[32px] border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-medium text-slate-500">Contacts Intelligence</p>
              <h2 className="mt-1 text-3xl font-semibold text-slate-800">
                Pipeline from Contacts Table
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Your external website form saves into contacts. This page now reads those contacts
                directly and shows AI enrichment on top of them without the cluttered layout.
              </p>
            </div>

            <button
              onClick={handleEnrichAll}
              disabled={bulkBusy}
              className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-gradient-to-r from-[#2596be] to-[#6d28d9] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {bulkBusy ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Enrich All Contacts
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((item) => (
              <StatCard
                key={item.label}
                icon={item.icon}
                label={item.label}
                value={item.value}
                subText={item.subText}
              />
            ))}
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start">
          <div className="min-w-0 space-y-6 xl:sticky xl:top-6 xl:self-start">
            <div className="rounded-[30px] border border-slate-200/80 bg-white/95 p-5 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
                  <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search by name, email, company..."
                      className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex border border-slate-200/80 rounded-full bg-slate-50 p-1">
                    <button
                      onClick={() => setViewMode('table')}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                        viewMode === 'table'
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <TableIcon size={16} />
                      Table
                    </button>
                    <button
                      onClick={() => setViewMode('board')}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                        viewMode === 'board'
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <LayoutGrid size={16} />
                      Board
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative" ref={datePickerRef}>
                    <button
                      onClick={() => setShowDatePicker((prev) => !prev)}
                      className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                    >
                      <Calendar size={14} />
                      {rangeLabel}
                    </button>

                    {showDatePicker ? (
                      <div className="absolute right-0 z-20 mt-3 w-[700px] max-w-[95vw] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl">
                        <div className="grid grid-cols-[180px_1fr]">
                          <div className="border-r border-slate-100 bg-slate-50/70 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                              Quick select
                            </p>
                            <div className="mt-3 flex flex-col gap-2">
                              <button onClick={() => applyPreset('today')} className={quickSelectClass(rangeLabel === 'Today')}>Today</button>
                              <button onClick={() => applyPreset('yesterday')} className={quickSelectClass(rangeLabel === 'Yesterday')}>Yesterday</button>
                              <button onClick={() => applyPreset('last7')} className={quickSelectClass(rangeLabel === 'Last 7 days')}>Last 7 days</button>
                              <button onClick={() => applyPreset('last30')} className={quickSelectClass(rangeLabel === 'Last 30 days')}>Last 30 days</button>
                              <button onClick={() => applyPreset('thisMonth')} className={quickSelectClass(rangeLabel === 'This month')}>This month</button>
                              <button onClick={() => applyPreset('lastMonth')} className={quickSelectClass(rangeLabel === 'Last month')}>Last month</button>
                              <button onClick={() => setRangeLabel('Custom')} className={quickSelectClass(isCustomRange)}>Custom</button>
                            </div>
                          </div>

                          <div className="p-4">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() =>
                                  setCalendarMonth(
                                    (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                                  )
                                }
                                className="rounded-full border border-slate-200 bg-white p-1 text-slate-500 hover:text-slate-700"
                                aria-label="Previous month"
                              >
                                <ChevronLeft size={16} />
                              </button>

                              <div className="grid flex-1 grid-cols-2 text-center text-sm font-semibold text-slate-700">
                                <div>{monthNames[leftMonth.getMonth()]} {leftMonth.getFullYear()}</div>
                                <div>{monthNames[rightMonth.getMonth()]} {rightMonth.getFullYear()}</div>
                              </div>

                              <button
                                onClick={() =>
                                  setCalendarMonth(
                                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                                  )
                                }
                                className="rounded-full border border-slate-200 bg-white p-1 text-slate-500 hover:text-slate-700"
                                aria-label="Next month"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-6">
                              {[leftWeeks, rightWeeks].map((weeks, index) => (
                                <div key={index}>
                                  <div className="grid grid-cols-7 text-[11px] font-semibold text-slate-400">
                                    {dayNames.map((day) => (
                                      <div key={`${index}-${day}`} className="text-center">
                                        {day}
                                      </div>
                                    ))}
                                  </div>

                                  <div className="mt-2 space-y-1">
                                    {weeks.map((week, weekIndex) => (
                                      <div key={weekIndex} className="grid grid-cols-7 gap-1 text-center text-sm">
                                        {week.map((date, dayIndex) => {
                                          if (!date) {
                                            return <div key={`${weekIndex}-${dayIndex}`} className="h-8 w-8" />;
                                          }

                                          const isStart = isSameDay(date, startDate);
                                          const isEnd = isSameDay(date, endDate);
                                          const inRange = isInRange(date) && !isStart && !isEnd;

                                          const dayClass = `mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-sm transition ${
                                            isStart || isEnd
                                              ? 'bg-emerald-200 text-emerald-900 font-semibold'
                                              : inRange
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'text-slate-600 hover:bg-slate-100'
                                          }`;

                                          return (
                                            <button
                                              key={`${weekIndex}-${dayIndex}`}
                                              onClick={() => handleDayClick(date)}
                                              className={dayClass}
                                            >
                                              {date.getDate()}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="text-xs font-semibold text-slate-500">Start date</label>
                                <div className="relative mt-2">
                                  <input
                                    type="text"
                                    readOnly
                                    value={formatDisplayDate(startDate)}
                                    placeholder="Select start date"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                                  />
                                  <Calendar size={16} className="absolute right-3 top-3 text-slate-400" />
                                </div>
                              </div>

                              <div>
                                <label className="text-xs font-semibold text-slate-500">End date</label>
                                <div className="relative mt-2">
                                  <input
                                    type="text"
                                    readOnly
                                    value={formatDisplayDate(endDate)}
                                    placeholder="Select end date"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                                  />
                                  <Calendar size={16} className="absolute right-3 top-3 text-slate-400" />
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 flex items-center justify-between">
                              <button
                                onClick={clearRange}
                                className="text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                              >
                                Clear
                              </button>
                              <button
                                onClick={applyCustomRange}
                                className="rounded-full bg-gradient-to-r from-[#2596be] to-[#6d28d9] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <button className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2596be] to-[#6d28d9] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95">
                    <FileUp size={16} />
                    Import
                  </button>

                  <button className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2596be] to-[#6d28d9] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95">
                    <Plus size={16} />
                    Add Lead
                  </button>
                </div>
              </div>
            </div>

            {viewMode === 'table' ? (
              <div className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/95 shadow-sm">
                <div className="max-h-[720px] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 text-slate-500 backdrop-blur">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Contact</th>
                        <th className="px-5 py-4 font-semibold">Company</th>
                        <th className="px-5 py-4 font-semibold">AI Status</th>
                        <th className="px-5 py-4 font-semibold">Score</th>
                        <th className="px-5 py-4 font-semibold">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td colSpan="5" className="px-5 py-8 text-center text-slate-500">
                            Loading contacts...
                          </td>
                        </tr>
                      ) : filteredLeads.length ? (
                        filteredLeads.map((lead) => (
                          <tr
                            key={lead.id}
                            onClick={() => setSelectedLeadId(lead.id)}
                            className={`cursor-pointer transition hover:bg-slate-50 ${
                              selectedLead?.id === lead.id ? 'bg-indigo-50/60' : ''
                            }`}
                          >
                            <td className="px-5 py-4">
                              <div className="font-semibold text-slate-800">{lead.title}</div>
                              <div className="mt-1 text-xs text-slate-500">{lead.email || 'No email'}</div>
                            </td>
                            <td className="px-5 py-4 text-slate-700">{lead.company}</td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                  statusStyles[lead.ai.status] || statusStyles.not_started
                                }`}
                              >
                                {lead.ai.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className={`px-5 py-4 font-semibold ${getScoreTone(lead.ai.score)}`}>
                              {lead.ai.score || 0}
                            </td>
                            <td className="px-5 py-4 text-slate-500">{lead.date}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-5 py-8 text-center text-slate-500">
                            No contacts found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="overflow-x-auto pb-2">
                  <div className="flex min-w-max gap-5">
                    {stages.map((stage) => {
                      const stageLeads = filteredLeads.filter((lead) => lead.status === stage.id);

                      return (
                        <div key={stage.id} className="w-[300px] shrink-0">
                          <div className="mb-3 flex items-center justify-between px-1">
                            <h3 className="text-base font-semibold text-slate-700">{stage.name}</h3>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                              {stageLeads.length}
                            </span>
                          </div>

                          <Droppable droppableId={stage.id}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="min-h-[620px] rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-3"
                              >
                                {loading ? (
                                  <div className="flex min-h-[120px] items-center justify-center text-sm text-slate-500">
                                    Loading contacts...
                                  </div>
                                ) : (
                                  stageLeads.map((lead, index) => (
                                    <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                      {(draggableProvided) => (
                                        <div
                                          ref={draggableProvided.innerRef}
                                          {...draggableProvided.draggableProps}
                                          {...draggableProvided.dragHandleProps}
                                          onClick={() => setSelectedLeadId(lead.id)}
                                          className={`mb-3 cursor-pointer rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 ${
                                            selectedLead?.id === lead.id
                                              ? 'ring-2 ring-indigo-200'
                                              : ''
                                          }`}
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <div className="truncate text-base font-semibold text-slate-800">
                                                {lead.title}
                                              </div>
                                              <div className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500">
                                                <Building size={14} />
                                                <span className="truncate">{lead.company}</span>
                                              </div>
                                            </div>

                                            <span
                                              className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                                statusStyles[lead.ai.status] || statusStyles.not_started
                                              }`}
                                            >
                                              {lead.ai.status.replace('_', ' ')}
                                            </span>
                                          </div>

                                          <div className="mt-4 space-y-2 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                              <User size={14} />
                                              <span className="truncate">{lead.email || 'No email'}</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              <DollarSign size={14} />
                                              <span className={getScoreTone(lead.ai.score)}>
                                                Score {lead.ai.score || 0}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              <Calendar size={14} />
                                              {lead.date}
                                            </div>
                                          </div>

                                          {lead.ai.aiSummary ? (
                                            <p className="mt-4 line-clamp-3 text-xs leading-6 text-slate-500">
                                              {lead.ai.aiSummary}
                                            </p>
                                          ) : (
                                            <p className="mt-4 text-xs text-slate-400">
                                              AI summary not available yet.
                                            </p>
                                          )}

                                          <div className="mt-4 flex items-center justify-between gap-3">
                                            <div className="truncate text-xs text-slate-400">
                                              {lead.ai.intent || 'No intent yet'}
                                            </div>

                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEnrich(lead.contactId);
                                              }}
                                              disabled={busyId === lead.contactId}
                                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-70"
                                            >
                                              {busyId === lead.contactId ? (
                                                <LoaderCircle size={13} className="animate-spin" />
                                              ) : (
                                                <Sparkles size={13} />
                                              )}
                                              AI
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))
                                )}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </DragDropContext>
            )}
          </div>

          <LeadDetailPanel
            lead={selectedLead}
            onRefresh={() => loadContacts(true)}
            busyId={busyId}
            onEnrich={handleEnrich}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Pipeline;

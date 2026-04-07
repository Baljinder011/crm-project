import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Brain,
  Calendar,
  LoaderCircle,
  Mail,
  Phone,
  RefreshCcw,
  Search,
  Sparkles,
  Target,
  User,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { contactsApi } from '../services/contactsApi';

const statusStyles = {
  not_started: 'bg-slate-100 text-slate-700 border border-slate-200',
  queued: 'bg-amber-50 text-amber-700 border border-amber-200',
  processing: 'bg-sky-50 text-sky-700 border border-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  failed: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const AI_PENDING_STATUSES = new Set(['not_started', 'queued', 'processing']);
const AI_MANUAL_ACTION_STATUSES = new Set(['failed', 'not_started']);

function canManuallyRunAi(status) {
  return AI_MANUAL_ACTION_STATUSES.has(String(status || '').toLowerCase());
}

function isAiPending(status) {
  return AI_PENDING_STATUSES.has(String(status || '').toLowerCase());
}

function getAiActionLabel(status) {
  return String(status || '').toLowerCase() === 'failed' ? 'Run AI Again' : 'Run AI';
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function getScoreTone(score) {
  if (score >= 80) return 'text-emerald-700';
  if (score >= 50) return 'text-amber-700';
  return 'text-slate-700';
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

const LeadDetail = () => {
  const { token } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  const leadId = params.id || params.contactId;

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const title = useMemo(() => {
    if (lead?.full_name) return lead.full_name;
    if (lead?.email) return lead.email;
    return 'Lead Detail';
  }, [lead?.full_name, lead?.email]);

  async function loadLead(showSpinner = true) {
    if (!token || !leadId) return;
    if (showSpinner) setLoading(true);
    setError('');

    try {
      const response = await contactsApi.getContactById(leadId, token);
      setLead(response?.contact || null);
    } catch (fetchError) {
      console.error('Failed to load lead detail:', fetchError);
      setError(fetchError.message || 'Failed to load lead detail.');
      setLead(null);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  async function handleEnrich() {
    if (!lead?.id || !token) return;
    try {
      setBusy(true);
      setError('');
      await contactsApi.enrichContact(lead.id, token);
      await loadLead(false);
    } catch (enrichError) {
      setError(enrichError.message || 'Failed to queue AI enrichment.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }
    loadLead();
  }, [leadId, token]);

  useEffect(() => {
    if (!lead) return;
    if (!isAiPending(lead.ai?.status)) return;

    const intervalId = setInterval(() => {
      loadLead(false);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [lead?.id, lead?.ai?.status, token]);

  const score = Number(lead?.ai?.score || 0);
  const scoreWidth = `${Math.max(0, Math.min(100, score))}%`;

  return (
    <AppLayout title={title} eyebrow="Lead Detail">
      <div className="space-y-6">
        {!leadId ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/90 p-8 text-sm text-slate-500 shadow-sm">
            Lead id missing in URL.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {leadId ? (
          loading ? (
            <div className="rounded-[30px] border border-slate-200/80 bg-white/95 p-6 shadow-sm">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <LoaderCircle size={18} className="animate-spin" />
                Loading lead detail...
              </div>
            </div>
          ) : lead ? (
            <div className="space-y-6">
              <div className="rounded-[30px] border border-slate-200/80 bg-white/95 p-6 shadow-sm">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="truncate text-3xl font-semibold text-slate-800">
                          {lead.full_name || lead.email || 'Unnamed Lead'}
                        </h2>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            statusStyles[lead.ai?.status] || statusStyles.not_started
                          }`}
                        >
                          {(lead.ai?.status || 'not_started').replace('_', ' ')}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {lead.company || 'No company provided'}
                      </p>
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
                        onClick={() => navigate('/pipeline')}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => loadLead(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                      >
                        <RefreshCcw size={15} />
                        Refresh
                      </button>

                      {canManuallyRunAi(lead.ai?.status) ? (
                        <button
                          onClick={handleEnrich}
                          disabled={busy}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2596be] to-[#6d28d9] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
                          {getAiActionLabel(lead.ai?.status)}
                        </button>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
                          {isAiPending(lead.ai?.status)
                            ? 'AI will run automatically for this lead.'
                            : 'AI enrichment already completed.'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                          Lead Score
                        </p>
                        <div className={`mt-2 text-2xl font-semibold ${getScoreTone(score)}`}>
                          {score}/100
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Confidence {((lead.ai?.confidence || 0) * 100).toFixed(0)}%
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
                        {lead.ai?.intent || 'Pending'}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Industry
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {lead.ai?.industry || 'Pending'}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Urgency
                      </p>
                      <p className="mt-2 text-sm font-semibold capitalize text-slate-800">
                        {lead.ai?.urgency || 'Pending'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <DetailBox icon={Brain} title="AI Summary" className="h-full">
                  {lead.ai?.ai_summary || 'No AI summary available yet.'}
                </DetailBox>

                <DetailBox icon={Target} title="Recommended Action" className="h-full">
                  {lead.ai?.recommended_action || 'No recommendation available yet.'}
                </DetailBox>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <DetailBox icon={AlertCircle} title="Pain Points" className="h-full">
                  {(lead.ai?.pain_points || []).length ? (
                    <div className="flex flex-wrap gap-2">
                      {lead.ai?.pain_points.map((point) => (
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

                <DetailBox icon={Calendar} title="Follow-up Task" className="h-full">
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

                <DetailBox icon={User} title="Contact Details" className="h-full">
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
                      {formatDateTime(lead.created_at)}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Last AI Run:</span>{' '}
                      {formatDateTime(lead.ai?.last_enriched_at)}
                    </p>
                  </div>
                </DetailBox>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <DetailBox icon={Search} title="Research Sources" className="h-full">
                  {(lead.ai?.research_sources || []).length ? (
                    <div className="space-y-3">
                      {lead.ai?.research_sources.map((source, index) => (
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

                <DetailBox icon={Mail} title="Original Form Message" className="h-full">
                  {lead.message || 'No message provided.'}
                </DetailBox>
              </div>

              {lead.ai?.error_message ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-rose-700">
                    <AlertCircle size={17} />
                    <p className="text-sm font-semibold">AI Error</p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-rose-600">{lead.ai?.error_message}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[30px] border border-slate-200/80 bg-white/95 p-6 text-sm text-slate-500 shadow-sm">
              Lead not found.
            </div>
          )
        ) : null}
      </div>
    </AppLayout>
  );
};

export default LeadDetail;

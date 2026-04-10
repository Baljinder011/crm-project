import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Filter,
  Mail,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  UserRound,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { mailApi } from '../services/mailApi';

const categoryOptions = [
  { value: '', label: 'All categories' },
  { value: 'lead', label: 'Lead mails' },
  { value: 'support', label: 'Support' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
];

const replyOptions = [
  { value: '', label: 'All reply status' },
  { value: 'not_sent', label: 'Not sent' },
  { value: 'sent', label: 'Sent' },
  { value: 'skipped', label: 'Skipped' },
];

const spamOptions = [
  { value: '', label: 'Spam + non-spam' },
  { value: 'false', label: 'Only clean mails' },
  { value: 'true', label: 'Only spam mails' },
];

const replyNeedOptions = [
  { value: '', label: 'All mails' },
  { value: 'true', label: 'Needs reply' },
  { value: 'false', label: 'No reply needed' },
];

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getStatusPillClasses(mail) {
  if (mail.isSpam) return 'bg-rose-100 text-rose-700 border border-rose-200';
  if (mail.replyStatus === 'sent') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
  if (mail.shouldReply) return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
  return 'bg-slate-100 text-slate-600 border border-slate-200';
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function stripHtml(html = '') {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanMailText(value = '') {
  return String(value)
    .replace(/=\r?\n/g, '')
    .replace(/=0D/gi, ' ')
    .replace(/=0A/gi, ' ')
    .replace(/=09/gi, ' ')
    .replace(/\u0000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getMailContent(mail) {
  if (!mail) return '';
  const text = cleanMailText(mail.textBody || '');
  if (text) return text;
  return cleanMailText(stripHtml(mail.htmlBody || ''));
}

function getMailPreview(mail, max = 220) {
  const content = mail?.leadSummary || getMailContent(mail) || 'No content preview available.';
  return content.length > max ? `${content.slice(0, max)}...` : content;
}

const MailMarketing = () => {
  const { token } = useAuth();
  const [summary, setSummary] = useState({ total: 0, spam: 0, leads: 0, pending_replies: 0, sent: 0 });
  const [companyProfile, setCompanyProfile] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    replyStatus: '',
    isSpam: '',
    shouldReply: '',
    limit: 50,
  });
  const [mails, setMails] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedMail, setSelectedMail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [autoReplying, setAutoReplying] = useState(false);
  const [replySending, setReplySending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadSummary = useCallback(async () => {
    const response = await mailApi.getSummary(token);
    setSummary(response.summary || { total: 0, spam: 0, leads: 0, pending_replies: 0, sent: 0 });
    setCompanyProfile(response.companyProfile || null);
  }, [token]);

  const loadMails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await mailApi.getMails(filters, token);
      const nextMails = response.mails || [];
      setMails(nextMails);

      const nextSelectedId = selectedId && nextMails.some((mail) => mail.id === selectedId)
        ? selectedId
        : nextMails[0]?.id || null;
      setSelectedId(nextSelectedId);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load mails.');
    } finally {
      setLoading(false);
    }
  }, [filters, token, selectedId]);

  const loadDetail = useCallback(async (id) => {
    if (!id) {
      setSelectedMail(null);
      return;
    }

    setDetailLoading(true);
    setError('');
    try {
      const response = await mailApi.getMailById(id, token);
      setSelectedMail(response.mail || null);
    } catch (detailError) {
      setError(detailError.message || 'Failed to load mail detail.');
    } finally {
      setDetailLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadMails();
  }, [loadMails]);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const selectedRequirements = useMemo(() => toArray(selectedMail?.extractedRequirements), [selectedMail]);
  const selectedServices = useMemo(() => toArray(selectedMail?.matchedServices), [selectedMail]);
  const selectedSpamReasons = useMemo(() => toArray(selectedMail?.spamReasons), [selectedMail]);
  const selectedOriginalMessage = useMemo(() => getMailContent(selectedMail) || 'No mail body available.', [selectedMail]);

  const handleTopAction = async (type) => {
    setError('');
    setSuccess('');

    try {
      if (type === 'sync') {
        setSyncing(true);
        const response = await mailApi.syncInbox(token);
        setSuccess(response.message || 'Inbox synced successfully.');
      }

      if (type === 'process') {
        setProcessing(true);
        const response = await mailApi.processInbox(25, token);
        setSuccess(response.message || 'Inbox processed successfully.');
      }

      if (type === 'auto-reply') {
        setAutoReplying(true);
        const response = await mailApi.autoReply(15, token);
        setSuccess(response.message || 'Eligible replies sent.');
      }

      await Promise.all([loadSummary(), loadMails()]);
    } catch (actionError) {
      setError(actionError.message || 'Action failed.');
    } finally {
      setSyncing(false);
      setProcessing(false);
      setAutoReplying(false);
    }
  };

  const handleProcessSingle = async () => {
    if (!selectedMail) return;
    setError('');
    setSuccess('');
    setProcessing(true);
    try {
      const response = await mailApi.processMail(selectedMail.id, token);
      setSelectedMail(response.mail || null);
      setSuccess('Selected mail processed successfully.');
      await Promise.all([loadSummary(), loadMails()]);
    } catch (actionError) {
      setError(actionError.message || 'Failed to process selected mail.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendSuggestedReply = async () => {
    if (!selectedMail?.id) return;
    setError('');
    setSuccess('');
    setReplySending(true);
    try {
      const payload = {
        subject: selectedMail.suggestedReplySubject,
        text: selectedMail.suggestedReplyText,
        html: selectedMail.suggestedReplyHtml,
      };
      const response = await mailApi.replyMail(selectedMail.id, payload, token);
      setSelectedMail(response.mail || null);
      setSuccess(response.message || 'Reply sent successfully.');
      await Promise.all([loadSummary(), loadMails()]);
    } catch (actionError) {
      setError(actionError.message || 'Failed to send reply.');
    } finally {
      setReplySending(false);
    }
  };

  return (
    <AppLayout
      title="Mail Marketing"
      eyebrow="AI Inbox Agent"
      description="See all inbox mails, detect lead queries, filter spam, and review AI-generated replies for IndraQ."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Total mails', value: summary.total, icon: Mail },
            { label: 'Lead mails', value: summary.leads, icon: Sparkles },
            { label: 'Spam mails', value: summary.spam, icon: ShieldAlert },
            { label: 'Pending replies', value: summary.pending_replies, icon: Bot },
            { label: 'Replies sent', value: summary.sent, icon: Send },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                    <h3 className="mt-3 text-3xl font-semibold text-slate-800">{item.value || 0}</h3>
                  </div>
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-50 text-slate-600">
                    <Icon size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">IndraQ AI mail handling</p>
              <p className="mt-1 text-sm text-slate-500">
                AI checks inbox mails, marks spam, detects lead intent, and prepares replies based on IndraQ profile.
              </p>
              {companyProfile?.website ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1">{companyProfile.name || 'IndraQ'}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">{companyProfile.website}</span>
                  {toArray(companyProfile.services).slice(0, 4).map((service) => (
                    <span key={service} className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
                      {service}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleTopAction('sync')}
                disabled={syncing}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                Sync inbox
              </button>
              <button
                type="button"
                onClick={() => handleTopAction('process')}
                disabled={processing}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Bot size={16} />
                Process mails
              </button>
              <button
                type="button"
                onClick={() => handleTopAction('auto-reply')}
                disabled={autoReplying}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2596be] to-[#670bb8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={16} />
                Auto reply
              </button>
            </div>
          </div>

          {(error || success) && (
            <div className="mt-4 grid gap-3">
              {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
              {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}
            </div>
          )}
        </section>

        <section className="grid gap-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Filter size={16} />
              Filters
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="Search subject, sender, message..."
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 md:col-span-2"
              />

              <select
                value={filters.category}
                onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                ))}
              </select>

              <select
                value={filters.replyStatus}
                onChange={(event) => setFilters((prev) => ({ ...prev, replyStatus: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {replyOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                ))}
              </select>

              <select
                value={filters.isSpam}
                onChange={(event) => setFilters((prev) => ({ ...prev, isSpam: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {spamOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                ))}
              </select>

              <select
                value={filters.shouldReply}
                onChange={(event) => setFilters((prev) => ({ ...prev, shouldReply: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {replyNeedOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="mt-5 max-h-[860px] space-y-3 overflow-auto pr-1">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  Loading inbox mails...
                </div>
              ) : mails.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  No mails found for current filters.
                </div>
              ) : (
                mails.map((mail) => (
                  <button
                    type="button"
                    key={mail.id}
                    onClick={() => setSelectedId(mail.id)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${selectedId === mail.id ? 'border-indigo-300 bg-indigo-50/60 shadow-sm' : 'border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50/70'}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-semibold text-slate-800">{mail.subject || '(No subject)'}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusPillClasses(mail)}`}>
                        {mail.isSpam ? 'Spam' : mail.replyStatus === 'sent' ? 'Replied' : mail.shouldReply ? 'Needs reply' : mail.category || 'Unclassified'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <UserRound size={13} />
                      <span className="line-clamp-1">{mail.fromName || mail.fromEmail || 'Unknown sender'}</span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">{getMailPreview(mail)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{formatDate(mail.receivedAt)}</span>
                      {mail.category ? <span className="rounded-full bg-slate-100 px-2 py-1">{mail.category}</span> : null}
                      {mail.companyFit ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Company fit</span> : null}
                      {mail.leadScore ? <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Lead {mail.leadScore}</span> : null}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
            {detailLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-14 text-center text-sm text-slate-500">
                Loading mail detail...
              </div>
            ) : !selectedMail ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-14 text-center text-sm text-slate-500">
                Select a mail to view details.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Mail detail</p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-800">{selectedMail.subject || '(No subject)'}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusPillClasses(selectedMail)}`}>
                        {selectedMail.isSpam ? 'Spam mail' : selectedMail.replyStatus === 'sent' ? 'Reply sent' : selectedMail.shouldReply ? 'Needs reply' : 'Review only'}
                      </span>
                      {selectedMail.category ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          {selectedMail.category}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">From</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">{selectedMail.fromName || 'Unknown sender'}</p>
                      <p className="mt-1 text-sm text-slate-500">{selectedMail.fromEmail || '—'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Received</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">{formatDate(selectedMail.receivedAt)}</p>
                      <p className="mt-1 text-sm text-slate-500">Reply status: {selectedMail.replyStatus || 'not_sent'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Lead score</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-800">{selectedMail.leadScore || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Confidence</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-800">{selectedMail.confidence || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Spam score</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-800">{selectedMail.spamScore || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Company fit</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-800">{selectedMail.companyFit ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                  <div className="rounded-3xl border border-slate-200/70 bg-slate-50/70 p-5">
                    <h3 className="text-sm font-semibold text-slate-800">AI summary</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{selectedMail.leadSummary || 'No AI summary available yet.'}</p>

                    <div className="mt-5 space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Matched services</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedServices.length ? selectedServices.map((service) => (
                            <span key={service} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                              {service}
                            </span>
                          )) : <span className="text-sm text-slate-500">No matched services.</span>}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Requirements</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedRequirements.length ? selectedRequirements.map((item) => (
                            <span key={item} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              {item}
                            </span>
                          )) : <span className="text-sm text-slate-500">No requirements extracted.</span>}
                        </div>
                      </div>

                      {selectedSpamReasons.length ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Spam reasons</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedSpamReasons.map((item) => (
                              <span key={item} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-slate-50/70 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-800">Suggested reply</h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleProcessSingle}
                          disabled={processing}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Re-process mail
                        </button>
                        <button
                          type="button"
                          onClick={handleSendSuggestedReply}
                          disabled={replySending || !selectedMail.shouldReply || selectedMail.isSpam || selectedMail.replyStatus === 'sent'}
                          className="rounded-full bg-gradient-to-r from-[#2596be] to-[#670bb8] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Send suggested reply
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Subject</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">{selectedMail.suggestedReplySubject || 'No suggested subject yet.'}</p>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Reply preview</p>
                      <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-600">{selectedMail.suggestedReplyText || 'No suggested reply text available yet.'}</pre>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-slate-50/70 p-5">
                  <h3 className="text-sm font-semibold text-slate-800">Original message</h3>
                  <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-white p-4 font-sans text-sm leading-6 text-slate-600">
                    {selectedOriginalMessage}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default MailMarketing;

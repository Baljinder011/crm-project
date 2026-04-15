const {
  getEmbedFormByPublicKey,
  createEmbeddedContact,
} = require('../../models/embedFormModel');
const { enqueueLeadEnrichment } = require('../lead/leadQueueService');
const { sendEmail } = require('../../utils/sendEmail');

function normalizeDomain(input = '') {
  return String(input || '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .trim()
    .toLowerCase();
}

function isDomainAllowed(domain, allowedDomains = []) {
  if (!allowedDomains || !allowedDomains.length) return true;

  const normalized = normalizeDomain(domain);
  if (!normalized) return false;

  return allowedDomains.some((item) => {
    const allowed = normalizeDomain(item);
    return allowed === normalized || normalized.endsWith('.' + allowed);
  });
}

function valueFromBody(body, keys = []) {
  for (const key of keys) {
    const value = body?.[key];
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      const joined = value
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .join(', ');
      if (joined) return joined;
      continue;
    }

    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return '';
}

function sanitizeBody(body = {}) {
  const cleaned = {};

  for (const [key, value] of Object.entries(body || {})) {
    if (value === undefined || value === null) {
      cleaned[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      cleaned[key] = value.map((item) => String(item));
      continue;
    }

    if (typeof value === 'object') {
      cleaned[key] = value;
      continue;
    }

    cleaned[key] = String(value);
  }

  return cleaned;
}

function buildMappedPayload(body, mapping = {}) {
  const cleanedBody = sanitizeBody(body);

  const fullNameKeys = [
    mapping.full_name,
    'full_name',
    'fullname',
    'fullName',
    'name',
    'your_name',
    'contact_name',
    'customer_name',
    'first_name',
    'firstname'
  ].filter(Boolean);

  const emailKeys = [
    mapping.email,
    'email',
    'email_address',
    'work_email',
    'business_email'
  ].filter(Boolean);

  const phoneKeys = [
    mapping.phone,
    'phone',
    'mobile',
    'mobile_number',
    'phone_number',
    'contact_number',
    'whatsapp',
    'whatsapp_number'
  ].filter(Boolean);

  const companyKeys = [
    mapping.company,
    'company',
    'company_name',
    'organization',
    'organisation',
    'business_name'
  ].filter(Boolean);

  const addressKeys = [
    mapping.address,
    'address',
    'full_address',
    'location',
    'city'
  ].filter(Boolean);

  const messageKeys = [
    mapping.message,
    'message',
    'msg',
    'comments',
    'comment',
    'description',
    'details',
    'query',
    'requirement',
    'requirements',
    'note',
    'notes'
  ].filter(Boolean);

  let fullName = valueFromBody(cleanedBody, fullNameKeys);
  const firstName = valueFromBody(cleanedBody, [
    mapping.first_name,
    'first_name',
    'firstname',
    'fname'
  ].filter(Boolean));
  const lastName = valueFromBody(cleanedBody, [
    mapping.last_name,
    'last_name',
    'lastname',
    'lname'
  ].filter(Boolean));

  if (!fullName && (firstName || lastName)) {
    fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  }

  const email = valueFromBody(cleanedBody, emailKeys);
  const phone = valueFromBody(cleanedBody, phoneKeys);
  const company = valueFromBody(cleanedBody, companyKeys);
  const address = valueFromBody(cleanedBody, addressKeys);
  const message = valueFromBody(cleanedBody, messageKeys);

  return {
    fullName,
    email,
    phone,
    company,
    address,
    message,
    raw: cleanedBody,
  };
}

function buildFallbackMessage(mapped, body = {}) {
  const lines = [];

  if (mapped.company) lines.push('Company: ' + mapped.company);
  if (mapped.address) lines.push('Address: ' + mapped.address);

  const knownSystemKeys = new Set([
    'pageUrl',
    'pagePath',
    'pageTitle',
    'referrer',
    'userAgent',
    'submittedAt',
    'crmFormSelector',
    'crmKey',
    'cookies',
    'utm'
  ]);

  for (const [key, value] of Object.entries(body || {})) {
    if (knownSystemKeys.has(key)) continue;
    if (value === undefined || value === null || value === '') continue;

    if (typeof value === 'object') {
      try {
        lines.push(key + ': ' + JSON.stringify(value));
      } catch (err) {
        continue;
      }
      continue;
    }

    lines.push(key + ': ' + String(value));
  }

  return lines.join('\n').trim();
}

function buildImportantSummary(contact, sourceDomain) {
  return {
    fullName: contact.full_name,
    email: contact.email,
    phone: contact.phone,
    company: contact.company,
    message: contact.message,
    sourceDomain,
    createdAt: contact.created_at,
  };
}

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendLeadAlert(embedForm, summary) {
  const to = embedForm.notify_email || process.env.LEAD_ALERT_EMAIL;
  if (!to) return;

  await sendEmail({
    to,
    subject: `New lead from ${summary.sourceDomain || 'embedded form'}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>New CRM Lead</h2>
        <p><strong>Name:</strong> ${escapeHtml(summary.fullName || '-')}</p>
        <p><strong>Email:</strong> ${escapeHtml(summary.email || '-')}</p>
        <p><strong>Phone:</strong> ${escapeHtml(summary.phone || '-')}</p>
        <p><strong>Company:</strong> ${escapeHtml(summary.company || '-')}</p>
        <p><strong>Source Domain:</strong> ${escapeHtml(summary.sourceDomain || '-')}</p>
        <p><strong>Message:</strong><br/>${escapeHtml(summary.message || '-').replace(/\\n/g, '<br/>')}</p>
      </div>
    `,
    fallbackText: JSON.stringify(summary, null, 2),
  });
}

async function captureEmbeddedLead({ publicKey, body, originDomain }) {
  const embedForm = await getEmbedFormByPublicKey(publicKey);

  if (!embedForm || !embedForm.is_active) {
    const error = new Error('Embed form is invalid or inactive.');
    error.statusCode = 404;
    throw error;
  }

  const allowedDomains = Array.isArray(embedForm.allowed_domains)
    ? embedForm.allowed_domains
    : [];

  if (!isDomainAllowed(originDomain, allowedDomains)) {
    const error = new Error('Domain is not allowed for this script.');
    error.statusCode = 403;
    throw error;
  }

  const mapped = buildMappedPayload(body, embedForm.field_mapping || {});

  if (!mapped.fullName && !mapped.email && !mapped.phone) {
    const error = new Error('At least one contact field is required: name, email or phone.');
    error.statusCode = 400;
    throw error;
  }

  const finalMessage =
    mapped.message ||
    buildFallbackMessage(mapped, mapped.raw) ||
    'Lead captured from embedded form';

  const contact = await createEmbeddedContact({
    fullName: mapped.fullName || 'Website Lead',
    email: mapped.email,
    phone: mapped.phone,
    company: mapped.company,
    address: mapped.address,
    message: finalMessage,
    sourceDomain: normalizeDomain(originDomain),
    embedFormId: embedForm.id,
    extraData: {
      pageUrl: body.pageUrl || null,
      pagePath: body.pagePath || null,
      pageTitle: body.pageTitle || null,
      referrer: body.referrer || null,
      userAgent: body.userAgent || null,
      submittedAt: body.submittedAt || null,
      crmFormSelector: body.crmFormSelector || null,
      utm: body.utm || {},
      cookies: body.cookies || {},
      rawPayload: mapped.raw,
    },
  });

  try {
    await enqueueLeadEnrichment(contact.id, 'embed_script');
  } catch (error) {
    console.warn('Lead enrichment queue failed:', error.message);
  }

  try {
    await sendLeadAlert(embedForm, buildImportantSummary(contact, originDomain));
  } catch (error) {
    console.warn('Lead alert email failed:', error.message);
  }

  return {
    success: true,
    message: embedForm.success_message || 'Thank you. We received your message.',
    contactId: contact.id,
  };
}

module.exports = {
  captureEmbeddedLead,
};
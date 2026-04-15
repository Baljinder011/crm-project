function getMailboxConfig() {
  const mailboxEmail = process.env.MAILBOX_EMAIL || process.env.SMTP_USER;

  if (!mailboxEmail) {
    throw new Error('MAILBOX_EMAIL or SMTP_USER is required for inbox sync.');
  }

  return {
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT || 993),
    secure: String(process.env.IMAP_SECURE || 'true') === 'true',
    auth: {
      user: process.env.IMAP_USER || mailboxEmail,
      pass: process.env.IMAP_PASS || process.env.SMTP_PASS,
    },
    mailboxEmail,
    folder: process.env.IMAP_FOLDER || 'INBOX',
    syncLimit: Number(process.env.MAIL_SYNC_LIMIT || 50),
  };
}

function normalizeAddresses(addresses) {
  if (!Array.isArray(addresses)) return [];

  return addresses
    .filter(Boolean)
    .map((item) => ({
      name: item.name || '',
      address: item.address || '',
    }))
    .filter((item) => item.address);
}

function extractThreadKey(parsed, headers) {
  const references = headers?.references;
  if (Array.isArray(references) && references.length) return references[0];
  if (typeof references === 'string' && references.trim()) {
    return references.trim().split(/\s+/)[0];
  }
  return parsed?.inReplyTo || parsed?.messageId || null;
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

function cleanQuotedPrintableArtifacts(text = '') {
  return String(text)
    .replace(/=\r?\n/g, '')
    .replace(/=0D/gi, ' ')
    .replace(/=0A/gi, ' ')
    .replace(/=09/gi, ' ')
    .replace(/\u0000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getBestTextBody(parsed) {
  const rawText = cleanQuotedPrintableArtifacts(parsed?.text || '');
  if (rawText && rawText.length >= 20) return rawText;

  const htmlText = cleanQuotedPrintableArtifacts(stripHtml(parsed?.html || ''));
  return htmlText;
}

async function fetchRecentInboxMessages() {
  const { ImapFlow } = require('imapflow');
  const { simpleParser } = require('mailparser');
  const config = getMailboxConfig();

  if (!config.host) {
    throw new Error('IMAP_HOST is missing in environment variables.');
  }

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    logger: false,
  });

  const messages = [];

  await client.connect();

  try {
    const lock = await client.getMailboxLock(config.folder);

    try {
      const mailbox = await client.mailboxOpen(config.folder);
      const exists = Number(mailbox.exists || 0);

      if (!exists) return [];

      const fromSeq = Math.max(1, exists - config.syncLimit + 1);

      for await (const message of client.fetch(`${fromSeq}:${exists}`, {
        uid: true,
        envelope: true,
        source: true,
        flags: true,
        internalDate: true,
        headers: true,
      })) {
        const parsed = await simpleParser(message.source);
        const headers = Object.fromEntries(parsed.headers || []);
        const textBody = getBestTextBody(parsed);
        const htmlBody = String(parsed.html || '');

        messages.push({
          mailboxEmail: config.mailboxEmail,
          folder: config.folder,
          uid: Number(message.uid),
          messageId: parsed.messageId || message.envelope?.messageId || null,
          threadKey: extractThreadKey(parsed, headers),
          subject: parsed.subject || message.envelope?.subject || '',
          fromName: parsed.from?.value?.[0]?.name || '',
          fromEmail: parsed.from?.value?.[0]?.address || '',
          toEmails: normalizeAddresses(parsed.to?.value),
          ccEmails: normalizeAddresses(parsed.cc?.value),
          receivedAt: parsed.date || message.internalDate || new Date(),
          textBody,
          htmlBody,
          headers,
          flags: Array.from(message.flags || []).map(String),
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  return messages;
}

module.exports = {
  getMailboxConfig,
  fetchRecentInboxMessages,
};
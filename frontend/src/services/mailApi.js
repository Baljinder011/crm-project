import { apiRequest } from './apiClient';

export const mailApi = {
  getSummary(token) {
    return apiRequest('/mail/summary', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  getMails(params = {}, token) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      searchParams.set(key, value);
    });

    const query = searchParams.toString();

    return apiRequest(`/mail${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  getMailById(id, token) {
    return apiRequest(`/mail/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  syncInbox(token) {
    return apiRequest('/mail/sync', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  processInbox(limit, token) {
    return apiRequest('/mail/process', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ limit }),
    });
  },

  processMail(id, token) {
    return apiRequest(`/mail/${id}/process`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  autoReply(limit, token) {
    return apiRequest('/mail/auto-reply', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ limit }),
    });
  },

  replyMail(id, payload, token) {
    return apiRequest(`/mail/${id}/reply`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },
};

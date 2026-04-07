import { apiRequest } from './apiClient';

export const contactsApi = {
  getContacts(token) {
    return apiRequest('/contacts', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  getContactById(id, token) {
    return apiRequest(`/contacts/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  enrichContact(id, token) {
    return apiRequest(`/contacts/${id}/enrich`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  enrichAll(token) {
    return apiRequest('/contacts/enrich-all', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  updatePipeline(id, payload, token) {
    return apiRequest(`/contacts/${id}/pipeline`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },
};

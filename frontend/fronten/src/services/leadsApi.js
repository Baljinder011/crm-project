import { apiRequest } from './apiClient';

export const leadsApi = {
  getLeads(token) {
    return apiRequest('/leads', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  getLeadById(id, token) {
    return apiRequest(`/leads/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  enrichLead(id, token) {
    return apiRequest(`/leads/${id}/enrich`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  enrichAll(token) {
    return apiRequest('/leads/enrich-all', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
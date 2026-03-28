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
};
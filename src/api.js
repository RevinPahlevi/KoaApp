import { getHostTokenForCode } from './utils/storage';

async function request(url, options = {}) {
  const { headers: customHeaders, ...restOptions } = options;
  const res = await fetch(url, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(customHeaders || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Terjadi kesalahan pada server.');
  }
  return data;
}

export const api = {
  getSchedules: (status = 'all') => request(`/api/schedules?status=${encodeURIComponent(status)}`),

  getSchedule: (code, hostTokenOverride = '') => {
    const token = hostTokenOverride || getHostTokenForCode(code);
    return request(`/api/schedules/${encodeURIComponent(code)}`, {
      headers: token ? { 'x-host-token': token } : {},
    });
  },

  createSchedule: (payload) =>
    request('/api/schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateSchedule: (code, payload) => {
    const token = getHostTokenForCode(code);
    return request(`/api/schedules/${encodeURIComponent(code)}`, {
      method: 'PATCH',
      headers: token ? { 'x-host-token': token } : {},
      body: JSON.stringify(payload),
    });
  },

  voteSchedule: (code, payload) => {
    const token = getHostTokenForCode(code);
    return request(`/api/schedules/${encodeURIComponent(code)}/vote`, {
      method: 'POST',
      headers: token ? { 'x-host-token': token } : {},
      body: JSON.stringify(payload),
    });
  },

  rsvpSchedule: (code, payload) => {
    const token = getHostTokenForCode(code);
    return request(`/api/schedules/${encodeURIComponent(code)}/rsvp`, {
      method: 'POST',
      headers: token ? { 'x-host-token': token } : {},
      body: JSON.stringify(payload),
    });
  },

  shuffleTeams: (code) => {
    const token = getHostTokenForCode(code);
    return request(`/api/schedules/${encodeURIComponent(code)}/shuffle-teams`, {
      method: 'POST',
      headers: token ? { 'x-host-token': token } : {},
    });
  },

  deleteSchedule: (code) => {
    const token = getHostTokenForCode(code);
    return request(`/api/schedules/${encodeURIComponent(code)}`, {
      method: 'DELETE',
      headers: token ? { 'x-host-token': token } : {},
    });
  },

  getLocations: () => request('/api/locations'),
  createLocation: (payload) =>
    request('/api/locations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteLocation: (id) =>
    request(`/api/locations/${id}`, {
      method: 'DELETE',
    }),

  getStats: () => request('/api/stats'),
};

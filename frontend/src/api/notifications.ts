import client from './client'

export const getUnreadCount = () =>
  client.get<{ count: number }>('/api/notifications/unread-count')

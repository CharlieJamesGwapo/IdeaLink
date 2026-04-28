import client from './client'

export const getUnreadCount = () =>
  client.get<{ count: number }>('/api/notifications/unread-count')

// Marks every suggestion the current staff role can see as read in one shot.
// Backend scopes by role: registrar → Registrar Office, accounting → Finance
// Office, admin → all offices. The bell click in NotificationBell calls this
// to clear the badge Facebook-style.
export const markAllNotificationsRead = () =>
  client.post<{ marked: number }>('/api/notifications/mark-all-read')

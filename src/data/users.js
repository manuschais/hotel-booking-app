export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
}

// Hardcoded users — change passwords here
export const USERS = [
  { id: 'Admin',  password: 'admin1234', role: ROLES.ADMIN, displayName: 'Admin' },
  { id: 'User1',  password: 'user1234',  role: ROLES.STAFF, displayName: 'พนักงาน 1' },
  { id: 'User2',  password: 'user2234',  role: ROLES.STAFF, displayName: 'พนักงาน 2' },
]

export function authenticate(username, password) {
  return USERS.find(u => u.id === username && u.password === password) || null
}

export function canEdit(user) {
  return user && (user.role === ROLES.ADMIN || user.role === ROLES.STAFF)
}

export function canCancel(user) {
  return user && user.role === ROLES.ADMIN
}

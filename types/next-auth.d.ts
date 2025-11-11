/**
 * NextAuth类型扩展
 */

import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      avatar?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name: string
    avatar?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    name: string
  }
}


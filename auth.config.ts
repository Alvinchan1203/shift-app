import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      return session
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl
      const isLoggedIn = !!auth?.user
      const publicPaths = ['/login', '/register']

      if (publicPaths.includes(pathname)) {
        return isLoggedIn ? Response.redirect(new URL('/dashboard', request.url)) : true
      }

      if (!isLoggedIn) return false

      if (pathname.startsWith('/admin') && auth?.user?.role !== 'ADMIN') {
        return Response.redirect(new URL('/employee/preferences', request.url))
      }

      return true
    },
  },
  pages: { signIn: '/login' },
}

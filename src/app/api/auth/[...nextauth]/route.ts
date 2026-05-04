import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { supabase } from '@/lib/supabase'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        try {
          // Check if teacher exists in database or create new teacher
          const { data, error } = await supabase
            .from('rooms')
            .select('teacher_id')
            .eq('teacher_id', user.email)
            .single()
          
          // If no error, teacher exists; if error, it's a new teacher
          return true
        } catch (error) {
          console.error('Auth error:', error)
          return true // Allow new teachers
        }
      }
      return false
    },
    async session({ session, token }) {
      if (token.email && session.user) {
        session.user.email = token.email
        session.user.name = token.name
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email
        token.name = user.name
      }
      return token
    }
  },
  pages: {
    signIn: '/teacher',
  },
  session: {
    strategy: 'jwt',
  },
})

export { handler as GET, handler as POST }

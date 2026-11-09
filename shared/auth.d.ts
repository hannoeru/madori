declare module '#auth-utils' {
  interface User {
    role: 'agency' | 'buyer'
    id: string
    name: string
    email: string
  }
}

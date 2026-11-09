export default defineNuxtRouteMiddleware(() => {
  const { user } = useUserSession()
  if (user.value?.role !== 'agency')
    return navigateTo('/login')
})

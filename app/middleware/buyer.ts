export default defineNuxtRouteMiddleware(() => {
  const { user } = useUserSession()
  if (user.value?.role !== 'buyer')
    return navigateTo('/buyer/login')
})

export default defineNuxtRouteMiddleware(() => {
  const { loggedIn } = useUserSession()
  if (!loggedIn.value)
    return navigateTo({ path: '/login', query: { redirect: useRoute().fullPath } })
})

<script setup lang="ts">
const { user } = useUserSession()
const nuxtApp = useNuxtApp()
const route = useRouter().currentRoute
const viewEpoch = ref(0)
const principal = computed(() => user.value ? `${user.value.role}:${user.value.id}` : 'guest')
const requiredRole = computed(() => {
  const path = route.value.path.replace(/\/+$/, '').toLowerCase()
  if (path === '/admin' || path.startsWith('/admin/'))
    return 'agency'
  if ((path === '/buyer' || path.startsWith('/buyer/')) && path !== '/buyer/login' && path !== '/buyer/register')
    return 'buyer'
  return null
})
const allowed = computed(() => requiredRole.value === null || user.value?.role === requiredRole.value)

if (import.meta.client) {
  watch([principal, () => route.value.path], ([identity], [previousIdentity]) => {
    if (previousIdentity !== undefined && identity !== previousIdentity) {
      const keys = new Set([...Object.keys(nuxtApp.payload.data), ...Object.keys(nuxtApp._asyncData)])
      clearNuxtData([...keys])
      viewEpoch.value++
    }
    if (!allowed.value) {
      const destination = user.value?.role === 'agency' ? '/admin' : user.value?.role === 'buyer' ? '/buyer' : requiredRole.value === 'agency' ? '/login' : '/buyer/login'
      void navigateTo(destination, { replace: true })
    }
  }, { flush: 'sync', immediate: true })
}
</script>

<template>
  <NuxtPage v-if="allowed" :key="viewEpoch" />
</template>

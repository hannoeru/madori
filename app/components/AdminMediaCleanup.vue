<script setup lang="ts">
import { createAgencyViewScope } from '#shared/admin-property'

const busy = ref(false)
const message = ref('')
const { user } = useUserSession()
const view = createAgencyViewScope(() => user.value?.role === 'agency' ? user.value.id : undefined)
const initialScope = view.capture()
let clearData: (() => void) | undefined

function discard() {
  view.retire()
  busy.value = false
  message.value = ''
  clearData?.()
}

watch(() => user.value?.role === 'agency' ? user.value.id : undefined, () => {
  if (!view.ownsView())
    discard()
}, { flush: 'sync' })
onScopeDispose(discard)

const { data, error, refresh, clear } = await useFetch('/api/admin/media-cleanup', { key: `admin-media-cleanup:${initialScope?.agencyId}:${useId()}`, retry: 0 })
clearData = clear
if (!view.isCurrent(initialScope))
  clear()

async function retry() {
  const scope = view.capture()
  if (!view.isCurrent(scope) || busy.value)
    return
  busy.value = true
  message.value = ''
  try {
    const result = await $fetch('/api/admin/media-cleanup', { method: 'POST', retry: 0 })
    if (!view.isCurrent(scope))
      return
    await refresh()
    if (!view.isCurrent(scope))
      return
    message.value = result.cleanupPending ? '仍有圖片待清除。已儲存的物件與圖片變更不受影響，請再次重試。' : '圖片檔案已清除。'
  }
  catch (err) {
    if (view.isCurrent(scope))
      message.value = requestErrorMessage(err, '無法重試圖片清除。請稍後再試。')
  }
  finally {
    if (view.isCurrent(scope))
      busy.value = false
  }
}
</script>

<template>
  <UAlert v-if="view.ownsView() && (error || data?.pendingCount)" class="mb-6" color="warning" title="圖片檔案待清除" :description="error ? '無法載入清除狀態。請重試。' : `共有 ${data?.pendingCount} 個檔案待清除。檔案清除不影響已儲存的物件與圖片資料。`">
    <template #actions>
      <UButton class="min-h-11" color="neutral" variant="outline" :loading="busy" :disabled="busy" @click="retry">
        重試圖片清除
      </UButton>
    </template>
  </UAlert>
  <p v-if="view.ownsView() && message" class="mb-6 text-sm text-muted" role="status">
    {{ message }}
  </p>
</template>

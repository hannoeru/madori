<script setup lang="ts">
import type { AdminImageRecovery } from '#shared/admin-property'
import * as v from 'valibot'
import { adminImageRecoverySchema, createAgencyViewScope } from '#shared/admin-property'

const props = defineProps<{ disabled?: boolean }>()
const recoveries = defineModel<AdminImageRecovery[]>({ required: true })
const importInput = ref<HTMLInputElement>()
const busyKey = ref('')
const message = ref('')
const { user } = useUserSession()
const view = createAgencyViewScope(() => user.value?.role === 'agency' ? user.value.id : undefined)

watch(() => user.value?.role === 'agency' ? user.value.id : undefined, () => {
  if (!view.ownsView()) {
    view.retire()
    recoveries.value = []
    busyKey.value = ''
    message.value = ''
  }
}, { flush: 'sync' })
onScopeDispose(view.retire)

async function retry(recovery: AdminImageRecovery) {
  const scope = view.capture()
  if (!view.isCurrent(scope) || busyKey.value || props.disabled)
    return
  busyKey.value = recovery.objectKey
  message.value = ''
  try {
    await $fetch('/api/admin/media-recovery', { method: 'POST', body: recovery, retry: 0 })
    if (!view.isCurrent(scope))
      return
    recoveries.value = recoveries.value.filter(item => item.objectKey !== recovery.objectKey)
    message.value = '此上傳暫存檔案已清除。'
  }
  catch (error) {
    if (view.isCurrent(scope))
      message.value = requestErrorMessage(error, '尚未確認檔案已清除。請保留復原資料後重試。')
  }
  finally {
    if (view.isCurrent(scope))
      busyKey.value = ''
  }
}

function download(recovery: AdminImageRecovery) {
  const scope = view.capture()
  if (!view.isCurrent(scope))
    return
  const link = window.document.createElement('a')
  link.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(recovery))}`
  link.download = `madori-upload-recovery-${recovery.objectKey}.json`
  window.document.body.appendChild(link)
  link.click()
  link.remove()
}

async function restore(event: Event) {
  const scope = view.capture()
  if (!view.isCurrent(scope) || !(event.target instanceof HTMLInputElement))
    return
  const input = event.target
  const file = input.files?.[0]
  if (!file || busyKey.value || props.disabled)
    return
  try {
    if (file.size > 1024)
      throw new Error('復原檔案過大。')
    const text = await file.text()
    if (!view.isCurrent(scope))
      return
    const value: unknown = JSON.parse(text)
    const parsed = v.safeParse(adminImageRecoverySchema, value)
    if (!parsed.success)
      throw new Error('復原資料無效。')
    if (!recoveries.value.some(item => item.objectKey === parsed.output.objectKey))
      recoveries.value.push(parsed.output)
    message.value = '復原資料已載入。只有原上傳公司可重試此檔案清除。'
  }
  catch {
    if (view.isCurrent(scope))
      message.value = '無法載入復原資料。請選擇下載的1 KiB以內 JSON 檔案。'
  }
  finally {
    if (view.isCurrent(scope))
      input.value = ''
  }
}
</script>

<template>
  <div v-if="view.ownsView()" class="space-y-3">
    <UAlert v-for="recovery in recoveries" :key="recovery.objectKey" color="warning" title="上傳暫存檔案未確認已排入清除佇列" description="尚未確認檔案已清除。復原資料僅保留於本頁，離開前請下載並妥善保管。一般佇列重試無法保證處理此檔案。" role="alert">
      <template #actions>
        <UButton class="min-h-11" color="neutral" variant="outline" :loading="busyKey === recovery.objectKey" :disabled="!!busyKey || disabled" :aria-label="`重試暫存檔案 ${recovery.objectKey} 清除`" @click="retry(recovery)">
          重試此檔案清除
        </UButton>
        <UButton class="min-h-11" color="neutral" variant="outline" :aria-label="`下載暫存檔案 ${recovery.objectKey} 復原資料`" @click="download(recovery)">
          下載復原資料
        </UButton>
      </template>
    </UAlert>
    <UButton class="min-h-11" color="neutral" variant="ghost" :disabled="!!busyKey || disabled" @click="importInput?.click()">
      載入上傳復原資料
    </UButton>
    <input ref="importInput" type="file" accept="application/json,.json" class="hidden" aria-label="載入上傳復原資料" @change="restore">
    <p v-if="message" class="text-sm text-muted" role="status">
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ propertyId: string }>()
const { user } = useUserSession()
const { loaded, loading, loadError, busy, isSaved, isPending, actionError, ensureLoaded, refresh, toggle } = useSavedProperties()
const saved = computed(() => isSaved(props.propertyId))
const error = computed(() => actionError(props.propertyId))

onMounted(() => ensureLoaded())
</script>

<template>
  <div class="space-y-2">
    <UButton v-if="!user" to="/buyer/login" color="neutral" variant="outline" icon="i-lucide-heart" class="min-h-11">
      登入買方帳號以收藏
    </UButton>
    <p v-else-if="user.role === 'agency'" class="text-sm text-muted">
      房仲帳號無法收藏，請使用買方帳號。
    </p>
    <template v-else>
      <UButton
        :icon="saved ? 'i-lucide-heart-off' : 'i-lucide-heart'"
        :color="saved ? 'primary' : 'neutral'"
        variant="outline"
        :aria-pressed="saved"
        :loading="isPending(propertyId) || (!loaded && loading)"
        :disabled="busy || !loaded"
        class="min-h-11"
        @click="toggle(propertyId)"
      >
        {{ loaded ? saved ? '移除收藏' : '收藏物件' : '載入收藏' }}
      </UButton>
      <p v-if="error" role="alert" class="max-w-sm text-sm text-error">
        {{ error }}
      </p>
      <div v-if="loadError" class="max-w-sm space-y-2">
        <p role="alert" class="text-sm text-error">
          {{ loadError }}
        </p>
        <UButton color="neutral" variant="ghost" icon="i-lucide-refresh-cw" :loading="loading" :disabled="busy" class="min-h-11" @click="refresh">
          重新載入收藏
        </UButton>
      </div>
    </template>
  </div>
</template>

import type { SavedProperty } from '#shared/buyer'
import * as v from 'valibot'
import { savedPropertiesSchema } from '#shared/buyer'

interface SavedPropertiesState {
  ownerId: string | null
  items: SavedProperty[]
  savedIds: string[]
  loaded: boolean
  loading: boolean
  loadError: string | null
  pendingPropertyId: string | null
  actionErrors: Record<string, string>
}

export function useSavedProperties() {
  const { user } = useUserSession()
  const request = useRequestFetch()
  const buyerId = computed(() => user.value?.role === 'buyer' ? user.value.id : null)
  const state = useState<SavedPropertiesState>('buyer-saved-properties', () => ({
    ownerId: null,
    items: [],
    savedIds: [],
    loaded: false,
    loading: false,
    loadError: null,
    pendingPropertyId: null,
    actionErrors: {},
  }))

  watch(buyerId, (id) => {
    if (state.value.ownerId === id)
      return
    state.value = {
      ownerId: id,
      items: [],
      savedIds: [],
      loaded: false,
      loading: false,
      loadError: null,
      pendingPropertyId: null,
      actionErrors: {},
    }
    if (import.meta.client && id)
      void refresh()
  }, { immediate: true, flush: 'sync' })

  function isCurrent(current: SavedPropertiesState) {
    return state.value === current && current.ownerId === buyerId.value
  }

  async function load() {
    const current = state.value
    if (!buyerId.value || current.loading)
      return false
    current.loading = true
    try {
      const result = v.parse(savedPropertiesSchema, await request('/api/buyer/saved'))
      if (!isCurrent(current))
        return false
      current.items = result.items
      current.savedIds = result.items.map(item => item.propertyId)
      current.loaded = true
      current.loadError = null
      return true
    }
    catch (error) {
      if (isCurrent(current))
        current.loadError = requestErrorMessage(error, '無法載入收藏。請重試。')
      return false
    }
    finally {
      if (isCurrent(current))
        current.loading = false
    }
  }

  async function refresh() {
    if (state.value.pendingPropertyId)
      return false
    return load()
  }

  async function ensureLoaded() {
    if (state.value.loaded)
      return true
    return refresh()
  }

  async function toggle(propertyId: string) {
    const current = state.value
    if (!buyerId.value || !current.loaded || current.loading || current.pendingPropertyId)
      return
    const saved = current.savedIds.includes(propertyId)
    current.pendingPropertyId = propertyId
    try {
      const path = `/api/buyer/saved/${encodeURIComponent(propertyId)}`
      if (saved) {
        await request(path, { method: 'DELETE' })
        if (!isCurrent(current))
          return
        current.savedIds = current.savedIds.filter(id => id !== propertyId)
        current.items = current.items.filter(item => item.propertyId !== propertyId)
      }
      else {
        await request(path, { method: 'PUT' })
        if (!isCurrent(current))
          return
        current.savedIds = [...current.savedIds, propertyId]
        if (!await load()) {
          if (isCurrent(current))
            current.actionErrors[propertyId] = '收藏已儲存，但清單無法更新。請重新載入。'
          return
        }
      }
      delete current.actionErrors[propertyId]
    }
    catch (error) {
      if (isCurrent(current))
        current.actionErrors[propertyId] = requestErrorMessage(error, '收藏未能更新。請重試。')
    }
    finally {
      if (isCurrent(current))
        current.pendingPropertyId = null
    }
  }

  return {
    items: computed(() => buyerId.value && state.value.ownerId === buyerId.value ? state.value.items : []),
    loading: computed(() => state.value.loading),
    loaded: computed(() => state.value.loaded),
    loadError: computed(() => state.value.loadError),
    busy: computed(() => state.value.loading || state.value.pendingPropertyId !== null),
    isSaved: (propertyId: string) => state.value.ownerId === buyerId.value && state.value.savedIds.includes(propertyId),
    isPending: (propertyId: string) => state.value.pendingPropertyId === propertyId,
    actionError: (propertyId: string) => state.value.actionErrors[propertyId],
    ensureLoaded,
    refresh,
    toggle,
  }
}

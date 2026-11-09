<script setup lang="ts">
definePageMeta({ middleware: 'buyer' })
useSeoMeta({ title: '我的 Madori｜Madori', robots: 'noindex, nofollow' })
const { user } = useUserSession()
</script>

<template>
  <BuyerDashboardShell :title="`${user?.name ?? '買方'}，歡迎回來。`" description="把喜歡的物件留在收藏，並在諮詢紀錄查看已送出的訊息。">
    <div class="grid gap-6 md:grid-cols-2">
      <UCard>
        <UIcon name="i-lucide-heart" class="size-7 text-primary" />
        <h2 class="mt-4 text-xl font-semibold text-highlighted">
          我的收藏
        </h2>
        <p class="mt-3 leading-relaxed text-muted">
          保存想比較的物件。物件停止公開後，仍可從收藏中移除。
        </p>
        <UButton to="/buyer/saved" icon="i-lucide-arrow-right" trailing class="mt-6 min-h-11">
          查看收藏
        </UButton>
      </UCard>
      <UCard>
        <UIcon name="i-lucide-mail" class="size-7 text-primary" />
        <h2 class="mt-4 text-xl font-semibold text-highlighted">
          諮詢紀錄
        </h2>
        <p class="mt-3 leading-relaxed text-muted">
          查看送給房仲公司的訊息、送出時間與收件公司。
        </p>
        <UButton to="/buyer/inquiries" color="neutral" variant="outline" icon="i-lucide-arrow-right" trailing class="mt-6 min-h-11">
          查看諮詢紀錄
        </UButton>
      </UCard>
    </div>
  </BuyerDashboardShell>
</template>

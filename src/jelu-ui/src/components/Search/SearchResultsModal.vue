<script setup lang="ts">
import { Ref, ref, computed, ComputedRef } from "vue";
import { useI18n } from 'vue-i18n';
import { Metadata } from "../../model/Metadata";

const { t } = useI18n({
  inheritLocale: true,
  useScope: 'global'
})

const props = defineProps<{
  results?: Metadata[],
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', metadata: Metadata): void
}>()

const selectResult = (metadata: Metadata) => {
  emit('select', metadata)
  emit('close')
}

const close = () => {
  emit('close')
}
</script>

<template>
  <section class="edit-modal">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold">{{ t('labels.search_results') }}</h3>
      <button @click="close" class="btn btn-sm btn-circle">✕</button>
    </div>

    <!-- Loading indicator -->
    <div v-if="loading" class="text-center py-8">
      <span class="loading loading-spinner loading-lg"></span>
      <p class="mt-2">{{ t('labels.searching_external') }}</p>
    </div>

    <!-- Search Results -->
    <div v-else-if="results && results.length > 0" class="max-h-80 overflow-y-auto">
      <h4 class="text-sm font-semibold mb-2 opacity-70">{{ t('labels.search_results') }} ({{ results.length }})</h4>
      <div class="space-y-2">
        <div
          v-for="(metadata, index) in results"
          :key="index"
          class="flex items-center gap-3 p-2 border rounded hover:bg-base-200 cursor-pointer"
          @click="selectResult(metadata)"
        >
          <img
            v-if="metadata.image"
            :src="metadata.image?.startsWith('http') ? metadata.image : '/files/' + metadata.image"
            class="w-12 h-16 object-cover rounded flex-shrink-0"
            loading="lazy"
          >
          <img
            v-else
            src="../../assets/placeholder_asset.jpg"
            class="w-12 h-16 object-cover rounded flex-shrink-0"
          >
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold truncate">{{ metadata.title }}</p>
            <p class="text-xs opacity-70 truncate">
              {{ metadata.authors?.join(', ') }}
            </p>
          </div>
          <button class="btn btn-sm btn-primary">
            <i class="mdi mdi-check"></i>
            {{ t('labels.select') }}
          </button>
        </div>
      </div>
    </div>

    <!-- No results -->
    <div v-else-if="results && results.length === 0" class="text-center py-8">
      <p class="opacity-70">{{ t('labels.no_results_found') }}</p>
    </div>
  </section>
</template>
<script setup lang="ts">
import { Ref, ref, onMounted, computed, ComputedRef } from "vue";
import { useI18n } from 'vue-i18n';
import { useOruga } from "@oruga-ui/oruga-next";
import { Book } from "../../model/Book";
import { Metadata } from "../../model/Metadata";
import { ServerSettings } from "../../model/ServerSettings";
import { useStore } from 'vuex';
import { key } from '../../store';
import { useLocalStorage } from '@vueuse/core';
import dataService from "../../services/DataService";
import { StringUtils } from "../../utils/StringUtils";

const { t } = useI18n({
  inheritLocale: true,
  useScope: 'global'
})

const oruga = useOruga()
const store = useStore(key)

const props = defineProps<{
  title?: string,
  authors?: string,
  isbn?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', metadata: Metadata): void
}>()

const serverSettings: ComputedRef<ServerSettings> = computed(() => {
  return store != undefined && store.getters.getSettings
})

const storedLanguage = useLocalStorage("jelu_language", "en")

const searchTitle = ref(props.title || '')
const searchAuthor = ref(props.authors || '')
const searchIsbn = ref(props.isbn || '')

const searchResults: Ref<Metadata[]> = ref([])
const showResults = ref(false)
const searchLoading = ref(false)

// Auto-start external search when modal opens
onMounted(() => {
  if (searchTitle.value || searchAuthor.value || searchIsbn.value) {
    performSearch()
  }
})

const performSearch = async () => {
  if (!searchTitle.value && !searchAuthor.value && !searchIsbn.value) return

  searchLoading.value = true
  try {
    const plugins = serverSettings.value?.metadataPlugins || []
    const results = await dataService.searchMetadataWithPlugins({
      isbn: searchIsbn.value,
      title: searchTitle.value,
      authors: searchAuthor.value,
      plugins: plugins,
      language: storedLanguage.value
    })
    searchResults.value = results || []
    showResults.value = true
  } catch (error) {
    console.error('Search failed', error)
    searchResults.value = []
    showResults.value = true
  } finally {
    searchLoading.value = false
  }
}

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

    <!-- Search Fields -->
    <div class="flex flex-wrap gap-2 mb-4">
      <input 
        v-model="searchIsbn" 
        :placeholder="t('book.isbn')" 
        class="input input-bordered flex-1 min-w-24"
      >
      <input 
        v-model="searchTitle" 
        :placeholder="t('book.title')" 
        class="input input-bordered flex-1 min-w-32"
      >
      <input 
        v-model="searchAuthor" 
        :placeholder="t('book.author', 2)" 
        class="input input-bordered flex-1 min-w-32"
      >
      <button @click="performSearch" class="btn btn-primary" :disabled="searchLoading">
        <span v-if="searchLoading" class="loading loading-spinner loading-sm"></span>
        <span v-else>{{ t('labels.search') }}</span>
      </button>
    </div>

    <!-- Loading indicator -->
    <div v-if="searchLoading" class="text-center py-4">
      <span class="loading loading-spinner loading-lg"></span>
      <p class="mt-2">{{ t('labels.searching_external') }}</p>
    </div>

    <!-- Search Results -->
    <div v-else-if="showResults && searchResults.length > 0" class="max-h-64 overflow-y-auto">
      <h4 class="text-md font-semibold mb-2">{{ t('labels.search_results') }} ({{ searchResults.length }})</h4>
      <div class="space-y-2">
        <div 
          v-for="(metadata, index) in searchResults" 
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
    <div v-else-if="showResults && searchResults.length === 0" class="text-center py-4">
      <p>{{ t('labels.no_results_found') }}</p>
    </div>

    <div class="flex justify-end mt-4">
      <button @click="close" class="btn">{{ t('labels.cancel') }}</button>
    </div>
  </section>
</template>
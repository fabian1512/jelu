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
import MetadataDetail from '../Metadata/MetadataDetail.vue';

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
  (e: 'select', book: Book | Metadata): void
}>()

const serverSettings: ComputedRef<ServerSettings> = computed(() => {
  return store != undefined && store.getters.getSettings
})

const storedLanguage = useLocalStorage("jelu_language", "en")

const searchTitle = ref(props.title || '')
const searchAuthor = ref(props.authors || '')
const searchIsbn = ref(props.isbn || '')

const localResults: Ref<Book[]> = ref([])
const showLocalResults = ref(false)
const loading = ref(false)

const externalMetadata: Ref<Metadata | null> = ref(null)
const showExternalResult = ref(false)
const externalLoading = ref(false)

// Auto-start search when modal opens with search parameters
onMounted(() => {
  if (searchTitle.value || searchAuthor.value || searchIsbn.value) {
    searchLocal()
  }
})

const searchLocal = async () => {
  if (!searchTitle.value && !searchAuthor.value && !searchIsbn.value) return
  
  loading.value = true
  try {
    const queryParts: string[] = []
    if (searchTitle.value) queryParts.push(searchTitle.value)
    if (searchAuthor.value) queryParts.push(searchAuthor.value)
    if (searchIsbn.value) queryParts.push(searchIsbn.value)
    
    const response = await dataService.findBooks(
      queryParts.join(' '),
      0,
      10,
      undefined,
      'ANY'
    )
    localResults.value = response.content
    showLocalResults.value = true
    
    // If local results found, ONLY show local results (don't fetch external)
    if (localResults.value.length > 0) {
      return
    }
    
    // No local results - search external
    await searchExternal()
  } catch (error) {
    console.error('Local search failed', error)
  } finally {
    loading.value = false
  }
}

const searchExternal = async () => {
  externalLoading.value = true
  try {
    const plugins = serverSettings.value?.metadataPlugins || []
    const metadata = await dataService.fetchMetadataWithPlugins({
      isbn: searchIsbn.value,
      title: searchTitle.value,
      authors: searchAuthor.value,
      plugins: plugins,
      language: storedLanguage.value
    })
    if (metadata) {
      externalMetadata.value = metadata
      showExternalResult.value = true
    }
  } catch (error) {
    console.error('External search failed', error)
  } finally {
    externalLoading.value = false
  }
}

const selectLocalBook = (book: Book) => {
  emit('select', book)
  emit('close')
}

const selectExternalMetadata = () => {
  if (externalMetadata.value) {
    emit('select', externalMetadata.value)
    emit('close')
  }
}

const close = () => {
  emit('close')
}
</script>

<template>
  <section class="edit-modal">
    <div class="flex flex-col items-center">
      <div class="mb-2">
        <h1 class="text-2xl capitalize">{{ t('labels.search_results') }}</h1>
      </div>
      <div class="w-full sm:w-2xl">

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
      <button @click="searchLocal" class="btn btn-primary" :disabled="loading">
        <span v-if="loading" class="loading loading-spinner loading-sm"></span>
        <span v-else>{{ t('labels.search') }}</span>
      </button>
    </div>

    <!-- Local Results -->
    <div v-if="showLocalResults && localResults.length > 0" class="mb-4">
      <h4 class="text-md font-semibold mb-2">{{ t('labels.local_results') }} ({{ localResults.length }})</h4>
      <div class="max-h-96 overflow-y-auto space-y-2 border p-2 rounded">
        <div 
          v-for="book in localResults" 
          :key="book.id"
          class="flex items-center gap-3 p-2 border rounded hover:bg-base-200 cursor-pointer"
          @click="selectLocalBook(book)"
        >
          <img 
            :src="book.image ? StringUtils.thumbnailUrl(book.image, 'thumb') : '/files/placeholder_asset.jpg'" 
            class="w-12 h-16 object-cover rounded flex-shrink-0"
            loading="lazy"
          >
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold truncate">{{ book.title }}</p>
            <p class="text-xs opacity-70 truncate">
              {{ book.authors?.map(a => a.name).join(', ') }}
            </p>
            <p v-if="book.isbn13 || book.isbn10" class="text-xs opacity-50">
              {{ book.isbn13 || book.isbn10 }}
            </p>
          </div>
          <button class="btn btn-sm btn-primary">
            <i class="mdi mdi-check"></i>
            {{ t('labels.select') }}
          </button>
        </div>
      </div>
    </div>

    <!-- No local results yet, waiting for external -->
    <div v-else-if="showLocalResults && localResults.length === 0 && externalLoading" class="text-center py-4">
      <span class="loading loading-spinner loading-lg"></span>
      <p class="mt-2">{{ t('labels.searching_external') }}</p>
    </div>

    <!-- External Result (only shown if no local results) -->
    <div v-else-if="showExternalResult && externalMetadata">
      <h4 class="text-md font-semibold mb-2">{{ t('labels.external_result') }}</h4>
      <div class="border rounded p-3 bg-base-200">
        <MetadataDetail :metadata="externalMetadata" />
        <button @click="selectExternalMetadata" class="btn btn-primary mt-2">
          <i class="mdi mdi-check"></i>
          {{ t('labels.select') }}
        </button>
      </div>
    </div>

      <div class="mt-3 flex justify-end">
        <button @click="close" class="btn">{{ t('labels.cancel') }}</button>
      </div>
      </div>
    </div>
  </section>
</template>
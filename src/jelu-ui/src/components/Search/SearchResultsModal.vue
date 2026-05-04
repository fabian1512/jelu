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

const externalMetadata: Ref<Metadata | null> = ref(null)
const showExternalResult = ref(false)
const externalLoading = ref(false)

// Auto-start external search when modal opens
onMounted(() => {
  if (searchTitle.value || searchAuthor.value || searchIsbn.value) {
    searchExternal()
  }
})

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
      <button @click="searchExternal" class="btn btn-primary" :disabled="externalLoading">
        <span v-if="externalLoading" class="loading loading-spinner loading-sm"></span>
        <span v-else>{{ t('labels.search') }}</span>
      </button>
    </div>

    <!-- Loading indicator -->
    <div v-if="externalLoading" class="text-center py-4">
      <span class="loading loading-spinner loading-lg"></span>
      <p class="mt-2">{{ t('labels.searching_external') }}</p>
    </div>

    <!-- External Result -->
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
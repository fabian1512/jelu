<script setup lang="ts">
import { useOruga } from "@oruga-ui/oruga-next";
import { ComputedRef, Ref, computed, reactive, ref } from "vue";
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useLocalStorage } from '@vueuse/core';
import { Book } from "../../model/Book";
import { Metadata } from "../../model/Metadata";
import { PluginInfo } from "../../model/PluginInfo";
import { ServerSettings } from "../../model/ServerSettings";
import dataService from "../../services/DataService";
import { key } from '../../store';
import { StringUtils } from "../../utils/StringUtils";
import MetadataDetail from '../Metadata/MetadataDetail.vue';
import MetadataPluginsModal from '../Metadata/MetadataPluginsModal.vue';
import ScanModal from '../Book/ScanModal.vue';
import EditBookModal from '../Book/EditBookModal.vue';
import SearchResultsModal from '../Search/SearchResultsModal.vue';
import useTypography from "../../composables/typography";
import { useRouter } from 'vue-router';

const { t } = useI18n({
      inheritLocale: true,
      useScope: 'global'
    })
const store = useStore(key)

const oruga = useOruga();
const router = useRouter();

const props = defineProps<{
  book: Book|undefined,
}>()

const form = reactive({
  title: props.book?.title,
  isbn: props.book?.isbn13?.length != undefined && props.book?.isbn13?.length > 0 ? props.book?.isbn13 : props.book?.isbn10,
  authors: props.book?.authors?.map(a => a.name).join(','),
});

const serverSettings: ComputedRef<ServerSettings> = computed(() => {
  return store != undefined && store.getters.getSettings
})

const emit = defineEmits(['close', 'metadataReceived']);

const metadata: Ref<Metadata|null> = ref(null)

const errorMessage = ref("");

const displayForm: Ref<boolean> = ref(true)

const progress: Ref<boolean> = ref(false)

const plugins: Ref<PluginInfo[]> = ref([])

const storedLanguage = useLocalStorage("jelu_language", "en")

const localResults: Ref<Book[]> = ref([])
const showLocalResults = ref(false)
const isBlocked = ref(false)

const fetchMetadata = async () => {
  // Open SearchResultsModal as proper modal
  emit('close')
  oruga.modal.open({
    component: SearchResultsModal,
    trapFocus: true,
    active: true,
    canCancel: ['x', 'button', 'outside'],
    scroll: 'keep',
    props: {
      title: form.title,
      authors: form.authors,
      isbn: form.isbn
    },
    events: {
      select: (result: Book | Metadata) => {
        handleSearchResultSelect(result)
      }
    },
    onClose: () => {}
  })
}

const handleSearchResultSelect = (result: Book | Metadata) => {
  // Prepare metadata to pass to EditBookModal
  let metadataToSend: Metadata
  
  // Check if it's a Book (has id) or Metadata (no id)
  if ('id' in result) {
    // It's a Book from local DB - convert to Metadata format
    const bookResult = result as Book
    metadataToSend = {
      title: bookResult.title,
      authors: bookResult.authors?.map(a => a.name) || [],
      isbn: bookResult.isbn13 || bookResult.isbn10,
      isbn13: bookResult.isbn13,
      isbn10: bookResult.isbn10,
      publisher: bookResult.publisher,
      publishedDate: bookResult.publishedDate,
      pageCount: bookResult.pageCount,
      language: bookResult.language,
      summary: bookResult.summary,
      image: bookResult.image,
      tags: bookResult.tags?.map(t => t.name) || [],
      series: bookResult.series?.[0]?.name,
      numberInSeries: bookResult.series?.[0]?.numberInSeries,
    }
  } else {
    // It's Metadata from external provider
    metadataToSend = result as Metadata
  }
  
  // Open EditBookModal with metadata
  oruga.modal.open({
    component: EditBookModal,
    trapFocus: true,
    active: true,
    canCancel: ['x', 'button', 'outside'],
    scroll: 'clip',
    props: {
      book: metadataToSend,
      bookId: null,
      canAddEvent: true
    },
    onClose: () => {}
  })
}

const discard = () => {
    displayForm.value = true
    metadata.value = null
  }

const searchLocally = async () => {
  const queryParts: string[] = []
  // Search by title and author ONLY (without ISBN)
  if (form.title) queryParts.push(form.title)
  if (form.authors) queryParts.push(form.authors)
  
  if (queryParts.length > 0) {
    const response = await dataService.findBooks(
      queryParts.join(' '), 
      0, // page
      10, // size - show top 10
      undefined, 
      'ANY' // Search ALL books, not just user's
    )
    localResults.value = response.content
    if (localResults.value.length > 0) {
      showLocalResults.value = true
      isBlocked.value = true // BLOCK external search
    }
  }
}

const importData = () => {
    emit('metadataReceived', metadata.value)
    emit('close')
  }

const addToLibraryAndNavigate = async (bookId: string) => {
  try {
    // Get book as UserBook (creates entry if not exists)
    const userBook = await dataService.getBookAsUserBook(bookId)
    
    // Check if already in user's library (has UserBook entry)
    if (userBook != null && userBook.id != null) {
      oruga.info('Buch ist bereits in Ihrer Bibliothek')
      emit('close')
      router.push({ name: 'book-detail', params: { bookId: userBook.id } })
      return
    }
    
    // Convert UserBook to Metadata format for pre-filling AddBook.vue
    const metadata: Metadata = {
      title: userBook.book.title,
      authors: userBook.book.authors?.map(a => a.name) || [],
      isbn: userBook.book.isbn13 || userBook.book.isbn10,
      publisher: userBook.book.publisher,
      publishedDate: userBook.book.publishedDate,
      pageCount: userBook.book.pageCount,
      language: userBook.book.language,
      summary: userBook.book.summary,
      image: userBook.book.image,
      tags: userBook.book.tags?.map(t => t.name) || [],
      series: userBook.book.series?.name,
      numberInSeries: userBook.book.series?.numberInSeries,
    }
    
    // Emit metadataReceived event to pre-fill AddBook.vue
    emit('metadataReceived', metadata)
    emit('close')
    
    // Navigate to add-book page (form will be pre-filled)
    router.push({ name: 'add-book' })
  } catch (error: any) {
    console.error('Failed to add book to library', error)
    if (error.response?.status === 404) {
      oruga.error('Buch nicht in Datenbank gefunden (nur im Suchindex?)')
    } else {
      oruga.error('Fehler beim Hinzufügen zur Bibliothek')
    }
  }
}

const isValid = computed(() => StringUtils.isNotBlank(form.title)
|| StringUtils.isNotBlank(form.isbn)
|| StringUtils.isNotBlank(form.authors))

const formattedErrorMessage = computed(() => {
  return metadata.value?.pluginErrorMessage?.replace(/\n/g, '<br>') || ''
})

let barcodeReader: any = null

function toggleScanModal() {
    oruga.modal.open({
      component: ScanModal,
      trapFocus: true,
      active: true,
      canCancel: ['x', 'button', 'outside'],
      scroll: 'keep',
      props: {
      },
      events: {
        decoded: async (barcode: string|null) => {
          if (barcode != null) {
            // First search locally by ISBN
            try {
              const response = await dataService.findBooks(barcode, 0, 1, undefined, 'ANY')
              if (response.content.length > 0) {
                // Found locally - convert to Metadata and pass to EditBookModal
                const book = response.content[0]
                const metadata: Metadata = {
                  title: book.title,
                  authors: book.authors?.map(a => a.name) || [],
                  isbn: book.isbn13 || book.isbn10,
                  isbn13: book.isbn13,
                  isbn10: book.isbn10,
                  publisher: book.publisher,
                  publishedDate: book.publishedDate,
                  pageCount: book.pageCount,
                  language: book.language,
                  summary: book.summary,
                  image: book.image,
                  tags: book.tags?.map(t => t.name) || [],
                  series: book.series?.[0]?.name,
                  numberInSeries: book.series?.[0]?.numberInSeries,
                }
                oruga.modal.open({
                  component: EditBookModal,
                  trapFocus: true,
                  active: true,
                  canCancel: ['x', 'button', 'outside'],
                  scroll: 'clip',
                  props: {
                    book: metadata,
                    bookId: null,
                    canAddEvent: true
                  },
                  onClose: () => {}
                })
                return
              }
            } catch (e) {
              console.error('Local search failed', e)
            }
            
            // Not found locally - try external search
            try {
              const plugins = serverSettings.value?.metadataPlugins || []
              const metadata = await dataService.fetchMetadataWithPlugins({
                isbn: barcode,
                title: '',
                authors: '',
                plugins: plugins,
                language: storedLanguage.value
              })
              if (metadata && metadata.title) {
                oruga.modal.open({
                  component: EditBookModal,
                  trapFocus: true,
                  active: true,
                  canCancel: ['x', 'button', 'outside'],
                  scroll: 'clip',
                  props: {
                    book: metadata,
                    bookId: null,
                    canAddEvent: true
                  },
                  onClose: () => {}
                })
              } else {
                oruga.info('Keine Metadaten für diesen Barcode gefunden')
              }
            } catch (e) {
              console.error('External search failed', e)
              oruga.error('Suche fehlgeschlagen')
            }
          }
        },
        barcodeLoaded: (reader: any) => {
          barcodeReader = reader
        }
      },
      onClose: scanModalClosed
    });
}

function scanModalClosed() {
}

function togglePluginsModal() {
    oruga.modal.open({
      component: MetadataPluginsModal,
      trapFocus: true,
      active: true,
      canCancel: ['x', 'button', 'outside'],
      scroll: 'keep',
      props: { },
      events: {
        plugins: (received: Array<PluginInfo>) => { plugins.value = received }
      },
      onClose: pluginsModalClosed
    });
}

function pluginsModalClosed() {
}

const { typographyClasses } = useTypography()
</script>

<template>
  <section class="edit-modal">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold">
        {{ t('labels.import_book') }}
      </h3>
      <button @click="emit('close')" class="btn btn-sm btn-circle">✕</button>
    </div>

    <div v-if="displayForm" class="w-full sm:w-lg mb-3">
      <fieldset class="fieldset">
        <legend class="fieldset-legend capitalize">
          {{ t('book.isbn') }}
        </legend>
        <input
          v-model="form.isbn"
          class="input input-bordered focus:input-accent w-full"
          @keyup.enter="fetchMetadata"
        >
      </fieldset>
      <fieldset class="fieldset">
        <legend class="fieldset-legend capitalize">
          {{ t('book.title') }}
        </legend>
        <input
          v-model="form.title"
          class="input input-bordered focus:input-accent w-full"
          @keyup.enter="fetchMetadata"
        >
      </fieldset>
      <fieldset class="fieldset">
        <legend class="fieldset-legend capitalize">
          {{ t('book.author', 2) }}
        </legend>
        <input
          v-model="form.authors"
          class="input input-bordered focus:input-accent w-full"
          @keyup.enter="fetchMetadata"
        >
      </fieldset>
    </div>

    <div v-if="displayForm" class="flex flex-wrap gap-2 items-center">
      <button
        :disabled="!isValid"
        class="btn btn-primary uppercase"
        :class="{'btn-disabled' : progress}"
        @click="fetchMetadata"
      >
        <span
          v-if="progress"
          class="loading loading-spinner"
        />
        {{ t('labels.fetch_book') }}
      </button>
      <button
        class="btn btn-warning"
        :class="{'btn-disabled' : progress}"
        @click="toggleScanModal"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-5 h-5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
          />
        </svg>
      </button>
      <button
        class="btn btn-ghost btn-sm"
        :class="{'btn-disabled' : progress}"
        @click="togglePluginsModal"
        :title="t('labels.choose_plugins')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
      <p
        v-if="errorMessage"
        class="text-error w-full"
      >
        {{ errorMessage }}
      </p>
    </div>

<div v-if="displayForm" class="mt-2">
      <progress
        v-if="progress"
        class="animate-pulse progress progress-primary w-full"
        max="100"
      />
    </div>

    <div
      class="flex flex-col items-center"
    >
      <div
        v-if="metadata != null && metadata.errorType != undefined"
      >
        <p class="text-error">
          {{ t('errors.metadata.' + metadata.errorType) }}
        </p>
        <div class="collapse">
          <input type="checkbox">
          <div class="collapse-title text-xl font-medium capitalize">
            {{ t('errors.details') }}
          </div>
          <blockquote
            v-if="formattedErrorMessage"
            class="collapse-content"
          >
            <p
              class="whitespace-pre-line text-error"
              v-html="formattedErrorMessage"
            />
          </blockquote>
        </div>
      </div>

      <!-- Compact List with Small Cover Icons, OHNE ISBN -->
      <div v-if="showLocalResults && localResults.length > 0" class="mt-4 space-y-2">
        <h3 class="text-lg font-bold">In Datenbank gefunden ({{ localResults.length }}):</h3>
        <div class="max-h-80 overflow-y-auto space-y-2">
          <div 
            v-for="book in localResults" 
            :key="book.id"
            class="flex items-center gap-3 p-2 border rounded hover:bg-base-200"
          >
            <!-- Small Cover Icon (w-12 = 48px) -->
            <img 
              :src="book.image ? StringUtils.thumbnailUrl(book.image, 'thumb') : '/files/placeholder_asset.jpg'" 
              class="w-12 h-16 object-cover rounded flex-shrink-0"
              loading="lazy"
            >
            <!-- Book Info (OHNE ISBN) -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold truncate">{{ book.title }}</p>
              <p class="text-xs opacity-70 truncate">
                {{ book.authors?.map(a => a.name).join(', ') }}
              </p>
            </div>
            <!-- Zur Bibliothek Button -->
            <button 
              @click="addToLibraryAndNavigate(book.id)"
              class="btn btn-sm btn-primary"
            >
              <i class="mdi mdi-plus"></i>
              Zur Bibliothek
            </button>
          </div>
        </div>
      </div>

      <!-- Message if no local results (external search will proceed) -->
      <div v-if="showLocalResults && localResults.length === 0" class="alert alert-warning mt-4">
        Keine Bücher in der Datenbank gefunden. Externe Suche läuft...
      </div>
      
      <MetadataDetail
        v-else-if="metadata != null"
        :metadata="metadata"
      />
      <div
        v-if="!displayForm"
        class="col-span-5 space-x-5 mt-3"
      >
        <button
          class="btn btn-primary uppercase"
          @click="importData"
        >
          <span class="icon">
            <i class="mdi mdi-check mdi-18px" />
          </span><span>{{ t('labels.import') }}</span>
        </button>
        <button
          class="btn btn-warning uppercase"
          @click="discard"
        >
          <span class="icon">
            <i class="mdi mdi-cancel mdi-18px" />
          </span><span>{{ t('labels.discard') }}</span>
        </button>
      </div>

    </div>
  </section>
</template>

<style lang="scss">

</style>

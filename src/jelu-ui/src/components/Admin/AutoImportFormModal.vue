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
import MergeBookModal from '../Book/MergeBookModal.vue';
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
  book?: Book,
  hideBarcodeAndManual?: boolean,
}>()

const form = reactive({
  title: props.book?.title || '',
  isbn: props.book?.isbn13 || props.book?.isbn10 || '',
  authors: props.book?.authors?.map((a: any) => a.name).join(', ') || '',
})

console.log('AutoImportFormModal props:', props)

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
  progress.value = true
  try {
    const searchPlugins = plugins.value.length > 0
      ? plugins.value
      : serverSettings.value?.metadataPlugins || []

    const results = await dataService.searchMetadataWithPlugins({
      isbn: form.isbn,
      title: form.title,
      authors: form.authors,
      plugins: searchPlugins,
      language: storedLanguage.value
    })

    // Open SearchResultsModal with pre-fetched results
    oruga.modal.open({
      component: SearchResultsModal,
      trapFocus: true,
      active: true,
      cancelable: ['outside'],
      scroll: 'keep',
      props: {
        results: results || [],
        loading: false
      },
      events: {
        select: (result: Book | Metadata) => {
          handleSearchResultSelect(result)
        }
      },
      onClose: () => {}
    })
  } catch (error) {
    console.error('Search failed', error)
    oruga.error('Suche fehlgeschlagen')
  } finally {
    progress.value = false
  }
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
      googleId: bookResult.googleId,
      amazonId: bookResult.amazonId,
      goodreadsId: bookResult.goodreadsId,
      librarythingId: bookResult.librarythingId,
      isfdbId: bookResult.isfdbId,
      openlibraryId: bookResult.openlibraryId,
      noosfereId: bookResult.noosfereId,
      inventaireId: bookResult.inventaireId,
    }
  } else {
    // It's Metadata from external provider
    metadataToSend = result as Metadata
  }
  
  // Emit the metadataReceived event - the parent (EditBookModal) will handle opening MergeBookModal
  // Pass both the metadata AND whether there's an existing book
  emit('metadataReceived', { metadata: metadataToSend, hasExistingBook: !!props.book })
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
      cancelable: ['outside'],
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
                  googleId: book.googleId,
                  amazonId: book.amazonId,
                  goodreadsId: book.goodreadsId,
                  librarythingId: book.librarythingId,
                  isfdbId: book.isfdbId,
                  openlibraryId: book.openlibraryId,
                  noosfereId: book.noosfereId,
                  inventaireId: book.inventaireId,
                }
                oruga.modal.open({
                  component: EditBookModal,
                  trapFocus: true,
                  active: true,
                  cancelable: ['outside'],
                  scroll: 'clip',
                  props: {
                    book: metadata
                  },
                  onClose: (args: any) => {
                    if (args && args[0] === 'save') {
                      emit('close')
                    }
                  }
                })
                return
              }
            } catch (e) {
              console.error('Local search failed', e)
            }
            
            // Not found locally - try external search using searchMetadataWithPlugins (better for scan)
            progress.value = true
            try {
              console.log('Scanning barcode:', barcode)
              const plugins = serverSettings.value?.metadataPlugins || []
              console.log('Using plugins:', plugins)
              // ISBN search: use fetchMetadataWithPlugins (single result) for ISBN lookup
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
                  cancelable: ['outside'],
                  scroll: 'clip',
                  props: {
                    book: metadata
                  },
                  onClose: (args: any) => {
                    if (args && args[0] === 'save') {
                      emit('close')
                    }
                  }
                })
                return
              } else {
                console.log('No metadata found for barcode:', barcode)
                oruga.info('Keine Metadaten für diesen Barcode gefunden')
              }
            } catch (e) {
              console.error('External search failed', e)
              oruga.error('Suche fehlgeschlagen: ' + e.message)
            } finally {
              progress.value = false
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
      cancelable: ['outside'],
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

const openEmptyEditBook = () => {
  const emptyMetadata: Metadata = {
    title: '',
    authors: [],
    isbn: '',
    isbn13: '',
    isbn10: '',
    publisher: '',
    publishedDate: '',
    pageCount: 0,
    language: '',
    summary: '',
    image: '',
    tags: [],
    series: '',
    numberInSeries: 0,
  }
  oruga.modal.open({
    component: EditBookModal,
    trapFocus: true,
    active: true,
    cancelable: ['outside'],
    scroll: 'clip',
props: {
                    book: metadata
                  },
    onClose: (args: any) => {
      if (args && args[0] === 'save') {
        emit('close')
      }
    }
  })
}

const { typographyClasses } = useTypography()
</script>

<template>
  <section class="edit-modal">
    <!-- Header -->
    <div class="flex justify-between items-center mb-5">
      <h3 class="text-lg font-bold">
        {{ t('labels.import_book') }}
      </h3>
      <div class="flex gap-2">
        <button
          class="btn btn-ghost btn-sm"
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
        <button @click="emit('close')" class="btn btn-sm btn-circle">✕</button>
      </div>
    </div>

    <!-- SUCHE Section -->
    <div class="mb-4">
      <div class="text-xs font-semibold uppercase opacity-60 tracking-wider mb-1 px-1">Suche</div>
      <div class="bg-base-100 rounded-xl border border-base-300 overflow-hidden">
        <!-- Titel -->
        <div class="flex items-center gap-3 px-4 py-3 border-b border-base-200">
          <label class="text-sm font-medium w-14 shrink-0">Titel</label>
          <input
            v-model="form.title"
            placeholder="Titel oder Stichwort"
            class="flex-1 bg-transparent outline-none text-sm"
            @keyup.enter="fetchMetadata"
          >
        </div>
        <!-- Autor -->
        <div class="flex items-center gap-3 px-4 py-3 border-b border-base-200">
          <label class="text-sm font-medium w-14 shrink-0">Autor</label>
          <input
            v-model="form.authors"
            placeholder="Name des Autors"
            class="flex-1 bg-transparent outline-none text-sm"
            @keyup.enter="fetchMetadata"
          >
        </div>
        <!-- ISBN -->
        <div class="flex items-center gap-3 px-4 py-3 border-b border-base-200">
          <label class="text-sm font-medium w-14 shrink-0">ISBN</label>
          <input
            v-model="form.isbn"
            placeholder="13-stellige Nummer"
            class="flex-1 bg-transparent outline-none text-sm"
            @keyup.enter="fetchMetadata"
          >
        </div>
        <!-- Suche starten Button -->
        <button
          @click="fetchMetadata"
          :disabled="!isValid || progress"
          class="w-full py-3 font-medium text-center transition-colors"
          :class="progress ? 'text-base-content/50 cursor-wait' : 'text-error hover:bg-base-200'"
        >
          <span v-if="progress" class="loading loading-spinner loading-sm mr-2"></span>
          <span>Suche starten</span>
        </button>
      </div>
      <p v-if="errorMessage" class="text-error text-sm mt-1 px-1">{{ errorMessage }}</p>
    </div>

    <!-- BARCODE Section -->
    <div v-if="!props.hideBarcodeAndManual" class="mb-4">
      <div class="text-xs font-semibold uppercase opacity-60 tracking-wider mb-1 px-1">Barcode</div>
      <div class="bg-base-100 rounded-xl border border-base-300 overflow-hidden">
        <button
          @click="toggleScanModal"
          class="w-full py-3 text-error font-medium text-center hover:bg-base-200 transition-colors"
        >
          Barcode einscannen
        </button>
      </div>
    </div>

    <!-- MANUELL ERFASSEN Section -->
    <div v-if="!props.hideBarcodeAndManual" class="mb-4">
      <div class="text-xs font-semibold uppercase opacity-60 tracking-wider mb-1 px-1">Manuell erfassen</div>
      <div class="bg-base-100 rounded-xl border border-base-300 overflow-hidden">
        <button
          @click="openEmptyEditBook"
          class="w-full py-3 text-error font-medium text-center hover:bg-base-200 transition-colors"
        >
          Buch manuell erfassen
        </button>
      </div>
    </div>
  </section>
</template>

<style lang="scss">

</style>

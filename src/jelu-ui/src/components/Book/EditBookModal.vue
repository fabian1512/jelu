<script setup lang="ts">

import { useOruga } from "@oruga-ui/oruga-next";
import dayjs from "dayjs";
import { computed, Ref, ref, watch } from "vue";
import { useI18n } from 'vue-i18n';

import { Author } from "../../model/Author";
import { Wrapper } from "../../model/autocomplete-wrapper";
import { UserBook } from "../../model/Book";
import { Metadata } from "../../model/Metadata";
import { Path } from "../../model/DirectoryListing";
import { ReadingEventType } from "../../model/ReadingEvent";
import { SeriesOrder } from "../../model/Series";
import { Tag } from "../../model/Tag";
import dataService from "../../services/DataService";
import { ObjectUtils } from "../../utils/ObjectUtils";
import { StringUtils } from "../../utils/StringUtils";
import ImagePickerModal from '../Misc/ImagePickerModal.vue';
import SeriesCompleteInput from '../Series/SeriesCompleteInput.vue';
import ClosableBadge from '../Global/ClosableBadge.vue';
import FormField from '../Global/FormField.vue';
import { Role } from "../../model/Role";

const { t } = useI18n({
      inheritLocale: true,
      useScope: 'global'
    })

const props = defineProps<{ bookId: string, book: UserBook | Metadata | null, canAddEvent: boolean }>()
const oruga = useOruga()
const emit = defineEmits<{
  (e: 'close', reason?: 'save' | 'cancel'): void
}>();

const filteredAuthors: Ref<Array<Wrapper>> = ref([]);
const filteredTags: Ref<Array<Wrapper>> = ref([]);
const filteredTranslators: Ref<Array<Wrapper>> = ref([]);
const filteredNarrators: Ref<Array<Wrapper>> = ref([]);
const filteredPublishers: Ref<Array<string>> = ref([])
const userbook: Ref<UserBook> = ref(copyInput(props.book))
const hasImage: Ref<boolean> = ref(userbook.value.book.image != null)
const deleteImage: Ref<boolean> = ref(false)

const progress: Ref<boolean> = ref(false)

// Native date input uses YYYY-MM-DD string. Sync with userbook.book.publishedDate.
const publishedDateString = computed({
  get: () => userbook.value.book.publishedDate || '',
  set: (val: string) => {
    userbook.value.book.publishedDate = val || null
  }
})

function copyInput(book: UserBook | Metadata | null): any {
  if (book == null) {
    return {}
  }
  // Check if it's Metadata (no 'id' property) instead of UserBook
  if (!('id' in book)) {
    // It's Metadata - convert to UserBook format
    const meta = book as Metadata
    return {
      book: {
        title: meta.title || '',
        originalTitle: undefined,
        isbn10: meta.isbn10,
        isbn13: meta.isbn13,
        summary: meta.summary || '',
        publisher: meta.publisher || undefined,
        image: meta.image || null,
        pageCount: meta.pageCount || null,
        publishedDate: meta.publishedDate || null,
        authors: meta.authors?.map((a: string) => ({ name: a })) || [],
        translators: [],
        narrators: [],
        tags: meta.tags?.map((t: string) => ({ name: t })) || [],
        series: meta.series ? [{ name: meta.series, numberInSeries: meta.numberInSeries }] : [],
        language: meta.language || '',
        googleId: meta.googleId,
        amazonId: meta.amazonId,
        goodreadsId: meta.goodreadsId,
        librarythingId: meta.librarythingId,
        isfdbId: meta.isfdbId,
        openlibraryId: meta.openlibraryId,
      },
      lastReadingEvent: null,
      lastReadingEventDate: null,
      creationDate: null,
      modificationDate: null,
      owned: false,
      toRead: false,
      borrowed: false,
      price: 0,
      currentPageNumber: 0,
      percentRead: 0,
      personalNotes: null,
      userBookId: undefined,
      userbook: undefined,
    }
  }
  // It's UserBook
  const b = ObjectUtils.deepCopy(book)
  return b
}

const handleFileUpload = (event: any) => {
  file.value = event.target.files[0];
};

const imageUrl = ref<string | null>(null);
const imagePath = ref<string | null>(null);
const uploadType = ref('web');

const smallCoverUrl = computed(() => {
  if (!userbook.value?.book?.image) return null
  // HTTP-URLs (external cover from provider) return directly
  if (userbook.value.book.image.startsWith('http')) {
    return userbook.value.book.image
  }
  return StringUtils.thumbnailUrl(userbook.value.book.image, "thumb") ?? "/files/" + userbook.value.book.image
})

const clearImageField = () => {
  imageUrl.value = "";
};

const showImagePickerModal: Ref<boolean> = ref(false)

const file = ref(null);

const uploadPercentage = ref(0);
const errorMessage = ref("");

const seriesCopy: Array<SeriesOrder> = userbook.value.book.series ?? []

const importBook = () => {
  userbook.value.book.series = seriesCopy.filter(s => s.name != null && s.name.trim().length > 0)
  if (!props.canAddEvent || userbook.value.lastReadingEvent === ReadingEventType.NONE) {
    userbook.value.lastReadingEvent = null
  }
  if (StringUtils.isNotBlank(imageUrl.value)) {
    userbook.value.book.image = imageUrl.value
  } else if (imagePath.value != null && StringUtils.isNotBlank(imagePath.value)) {
      userbook.value.book.image = imagePath.value
  } else if (deleteImage.value) {
    userbook.value.book.image = null
  }
  if (userbook.value.price != null) {
    if (userbook.value.price <= 0) {
      userbook.value.price = null
    }
  }

  let promise: Promise<UserBook>
  progress.value = true
  // no id on userbook -> we have a book and save the userbook
  if (StringUtils.isBlank(userbook.value.id)) {
    promise = dataService.saveUserBookImage(
      userbook.value,
      file.value,
      (event: { loaded: number; total: number }) => {
        const percent = Math.round((100 * event.loaded) / event.total);
        uploadPercentage.value = percent;
      }
    )
  }
  // just update the existing userbook
  else {
    promise = dataService.updateUserBookImage(
      userbook.value,
      file.value,
      (event: { loaded: number; total: number }) => {
        const percent = Math.round((100 * event.loaded) / event.total);
        uploadPercentage.value = percent;
      }
    )
  }
  promise
    .then(res => {
      progress.value = false
      ObjectUtils.toast(oruga, "success", t('labels.book_title_updated', { title : res.book.title}), 4000);
      emit('close', 'save')
    })
    .catch(err => {
      progress.value = false
      ObjectUtils.toast(oruga, "danger", t('labels.error_message', {msg : err.message}), 4000);
    })

}

function getFilteredData(text: string, target: Array<Wrapper>) {
  dataService.findAuthorByCriteria(Role.ANY, text).then((data) => {
    target.splice(0, target.length)
    data.content.forEach(a => target.push(ObjectUtils.wrapForOptions(a)))
  })
}

function getFilteredTags(text: string) {
  dataService.findTagsByCriteria(text).then((data) => {
    filteredTags.value.splice(0, filteredTags.value.length)
    data.content.forEach(t => filteredTags.value.push(ObjectUtils.wrapForOptions(t)))
  })
}

// Separate input buffer for publisher autocomplete.
// o-autocomplete's v-model would overwrite the real publisher on mount
// (Oruga fires an internal modelValue update with empty string before user
// interaction). We decouple the input field from the data model:
// - publisherInput holds what the text field shows
// - userbook.book.publisher holds the committed value (only written on @select or @input after user typed)
const publisherInput = ref(userbook.value.book.publisher ?? '')
let publisherMounted = false

function getFilteredPublishers(text: string) {
  // First @input event fires synchronously on mount — skip it to avoid
  // overwriting the pre-filled publisher with an empty string.
  if (!publisherMounted) {
    publisherMounted = true
    return
  }
  // User is actually typing: keep the visible buffer and real model in sync
  publisherInput.value = text
  userbook.value.book.publisher = text
  dataService.findPublisherByCriteria(text).then(data => {
    filteredPublishers.value = data.content
    if (text !== '' && !filteredPublishers.value.includes(text)) {
      filteredPublishers.value.push(text)
    }
  })
}

function beforeAdd(item: Author | string, target: Array<Author>) {
  let shouldAdd = true
  if (item instanceof Object) {
    target.forEach(author => {
      if (author.name === item.name) {
        shouldAdd = false;
      }
    });
  }
  else {
    target.forEach(author => {
      if (author.name === item) {
        shouldAdd = false;
      }
    });
  }
  return shouldAdd
}

function beforeAddTag(item: Tag | string) {
  let shouldAdd = true
  if (item instanceof Object) {
    userbook.value.book?.tags?.forEach(tag => {
      if (tag.name === item.name) {
        shouldAdd = false;
      }
    });
  }
  else {
    userbook.value.book?.tags?.forEach(tag => {
      if (tag.name === item) {
        shouldAdd = false;
      }
    });
  }
  return shouldAdd
}

function selectPublisher(publisher: string) {
  // we receive from oruga weird events while nothing is selected
  // so try to get rid of those null data we receive
  if (publisher != null) {
    publisherInput.value = publisher
    userbook.value.book.publisher = publisher
  }
}

const toggleImagePickerModal = () => {
  showImagePickerModal.value = !showImagePickerModal.value
  oruga.modal.open({
    parent: this,
    component: ImagePickerModal,
    trapFocus: true,
    active: true,
    cancelable: ['outside'],
    scroll: 'keep',
    events: {
      choose: (path: Path) => {
        imagePath.value = path.path
      }
    },
    onClose: modalClosed
  });
}

function modalClosed() {
}

function toggleRemoveImage() {
  deleteImage.value = !deleteImage.value
}

watch(() => [userbook.value.currentPageNumber, userbook.value.percentRead, userbook.value.book.pageCount],(newVal, oldVal) => {
  if (userbook.value.book.pageCount != null) {
    ObjectUtils.computePages(newVal, oldVal, userbook.value, userbook.value.book.pageCount)
  }
})



if (userbook.value.book.publisher != null && userbook.value.book.publisher !== '') {
  filteredPublishers.value.push(userbook.value.book.publisher as string) // prefill editor autocomplete. oruga workaround
}

// Separate reactive ref for the percent-read slider.
// v-model.number on a nested property of a deeply reactive ref sometimes
// fails to update in Vue 3 when the initial value is 0 (falsy).
const sliderPercent = ref(userbook.value.percentRead || 0)

watch(() => userbook.value.percentRead, (newVal) => {
  sliderPercent.value = newVal || 0
})

watch(() => sliderPercent.value, (newVal) => {
  userbook.value.percentRead = newVal
})
</script>

<template>
  <section id="edit-modal-content" class="edit-modal p-4 relative overflow-visible">
    <div class="flex justify-between items-center mb-5">
      <button @click="importBook" class="btn btn-sm btn-primary" :class="{'btn-disabled' : progress}">
        <span v-if="progress" class="loading loading-spinner loading-xs"></span>
        <span v-else>{{ t('labels.save_changes') }}</span>
      </button>
      <button @click="emit('close', 'cancel')" class="btn btn-sm btn-circle">✕</button>
    </div>

    <div class="flex gap-4 mb-6">
      <div class="shrink-0 relative">
        <figure v-if="userbook.book.image && !deleteImage" class="w-24 h-36 rounded-lg overflow-hidden shadow-md">
          <img :src="smallCoverUrl" class="w-full h-full object-cover" loading="lazy">
        </figure>
        <div v-else class="w-24 h-36 bg-base-200 rounded-lg flex items-center justify-center text-3xl">📖</div>
        <button v-if="userbook.book.image && !deleteImage" @click="toggleRemoveImage" class="absolute -bottom-2 -right-2 btn btn-xs btn-circle btn-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        <button v-else-if="deleteImage" @click="toggleRemoveImage" class="absolute -bottom-2 -right-2 btn btn-xs btn-circle btn-success">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      <div class="flex-1 min-w-0">
        <input v-model="userbook.book.title" :placeholder="t('book.title')" class="text-xl font-bold bg-transparent w-full outline-none mb-2 block border-b border-base-300 focus:border-primary pb-1">
        <div class="flex flex-wrap gap-1 mb-2">
          <span v-for="author in userbook.book.authors" :key="author.name" class="badge badge-primary badge-sm">{{ author.name }}</span>
        </div>
        <div class="flex flex-wrap gap-1">
          <span v-for="tag in userbook.book.tags" :key="tag.name" class="badge badge-xs badge-secondary">{{ tag.name }}</span>
        </div>
      </div>
    </div>

    <div class="mb-4">
      <div class="text-xs font-semibold uppercase opacity-60 tracking-wider mb-1 px-1">{{ t('book.summary') }}</div>
      <details class="bg-base-100 rounded-xl border border-base-300 overflow-hidden group">
        <summary class="px-4 py-3 cursor-pointer flex justify-between items-center select-none list-none">
          <span class="text-sm truncate pr-4 opacity-70">
            {{ userbook.book.summary ? userbook.book.summary.substring(0, 60) + '...' : t('labels.no_summary') }}
          </span>
          <span class="text-base-content/40 transition-transform group-open:rotate-90">›</span>
        </summary>
        <div class="px-4 pb-3">
          <textarea v-model="userbook.book.summary" rows="4" class="w-full bg-transparent resize-none outline-none text-sm" :placeholder="t('book.summary')"></textarea>
        </div>
      </details>
    </div>

    <div class="mb-4">
      <div class="text-xs font-semibold uppercase opacity-60 tracking-wider mb-1 px-1">{{ t('book.details') }}</div>
      <div class="bg-base-100 rounded-xl border border-base-300">
        <div class="flex items-center gap-3 px-4 py-3 border-b border-base-200">
           <label class="text-sm opacity-60 w-24 shrink-0">{{ t('book.original_title') }}</label>
          <input v-model="userbook.book.originalTitle" class="flex-1 bg-transparent outline-none text-sm text-right" :placeholder="t('book.original_title')">
        </div>
        <div class="px-4 py-3 border-b border-base-200">
          <label class="text-sm opacity-60 block mb-1">{{ t('book.author', 2) }}</label>
          <o-taginput
            v-model="userbook.book.authors"
            :options="filteredAuthors"
            :allow-autocomplete="true"
            autocomplete="off"
            :allow-new="true"
            :allow-duplicates="false"
            :open-on-focus="true"
            :validate-item="(item: Author|string) => beforeAdd(item, userbook.book.authors as Array<Author>)"
            :create-item="ObjectUtils.createNamedItem"
            icon-pack="mdi"
            icon="account-plus"
            :placeholder="t('labels.add_author')"
            @input="(v: string) => getFilteredData(v, filteredAuthors)"
            root-class="w-full"
          >
            <template #default="{ value }">
              <div class="jl-taginput-item">{{ value.name }}</div>
            </template>
            <template #selected="{ removeItem, items }">
              <ClosableBadge v-for="(item, index) in items" :key="item.name" :content="item.name" class="badge-primary badge-sm" @closed="removeItem(index, $event)" />
            </template>
          </o-taginput>
        </div>
        <div class="px-4 py-3 border-b border-base-200">
          <label class="text-sm opacity-60 block mb-1">{{ t('book.tag', 2) }}</label>
          <o-taginput
            v-model="userbook.book.tags"
            :options="filteredTags"
            :allow-autocomplete="true"
            autocomplete="off"
            :allow-new="true"
            :allow-duplicates="false"
            :open-on-focus="true"
            :validate-item="beforeAddTag"
            :create-item="ObjectUtils.createNamedItem"
            icon-pack="mdi"
            icon="tag-plus"
            :placeholder="t('labels.add_tag')"
            @input="getFilteredTags"
            root-class="w-full"
          >
            <template #default="{ value }">
              <div class="jl-taginput-item">{{ value.name }}</div>
            </template>
            <template #selected="{ removeItem, items }">
              <ClosableBadge v-for="(item, index) in items" :key="item.name" :content="item.name" class="badge-secondary badge-sm" @closed="removeItem(index, $event)" />
            </template>
          </o-taginput>
        </div>
        <div class="flex items-center gap-3 px-4 py-3 border-b border-base-200">
          <label class="text-sm opacity-60 w-24 shrink-0">{{ t('book.isbn10') }}</label>
          <input v-model="userbook.book.isbn10" class="flex-1 bg-transparent outline-none text-sm text-right font-mono" :placeholder="t('book.isbn10')">
        </div>
        <div class="flex items-center gap-3 px-4 py-3 border-b border-base-200">
          <label class="text-sm opacity-60 w-24 shrink-0">{{ t('book.isbn13') }}</label>
          <input v-model="userbook.book.isbn13" class="flex-1 bg-transparent outline-none text-sm text-right font-mono" :placeholder="t('book.isbn13')">
        </div>
        <div class="flex items-center gap-3 px-4 py-3 border-b border-base-200">
          <label class="text-sm opacity-60 w-24 shrink-0">{{ t('book.publisher') }}</label>
          <o-autocomplete :model-value="publisherInput" :options="filteredPublishers" :clear-on-select="false" :debounce="100" @input="getFilteredPublishers" @select="selectPublisher" root-class="flex-1 borderless-autocomplete" expanded :placeholder="t('book.publisher')">
            <template #default="{ value }">
              <div class="jl-taginput-item">{{ value }}</div>
            </template>
          </o-autocomplete>
        </div>
        <div class="flex items-center gap-3 px-4 py-3 border-b border-base-200">
          <label class="text-sm opacity-60 w-24 shrink-0">{{ t('book.published_date') }}</label>
          <input v-model="publishedDateString" type="text" class="flex-1 bg-transparent outline-none text-sm text-right" placeholder="YYYY-MM-DD" />
        </div>
        <div class="flex items-center gap-3 px-4 py-3 border-b border-base-200">
          <label class="text-sm opacity-60 w-24 shrink-0">{{ t('book.language') }}</label>
          <input v-model="userbook.book.language" class="flex-1 bg-transparent outline-none text-sm text-right" :placeholder="t('book.language')">
        </div>
        <div class="flex items-center gap-3 px-4 py-3 border-b border-base-200">
          <label class="text-sm opacity-60 w-24 shrink-0">{{ t('book.page_count') }}</label>
          <input v-model.number="userbook.book.pageCount" type="number" class="flex-1 bg-transparent outline-none text-sm text-right" :placeholder="t('book.page_count')">
        </div>
        <div class="flex items-center gap-3 px-4 py-3">
          <label class="text-sm opacity-60 w-24 shrink-0">{{ t('book.series') }}</label>
          <SeriesCompleteInput v-model="seriesCopy" class="flex-1 borderless-autocomplete text-right" />
        </div>
      </div>
    </div>

    <details class="bg-base-100 rounded-xl border border-base-300 mb-4 group">
      <summary class="text-xs font-semibold uppercase opacity-60 tracking-wider px-4 py-2 cursor-pointer flex justify-between items-center select-none bg-base-200 list-none">
        <span>{{ t('labels.more_options') }}</span>
        <span class="text-base-content/40 transition-transform group-open:rotate-90">›</span>
      </summary>
      <div class="px-4 py-3 space-y-3">
        <div class="field px-4 py-3 border-b border-base-200">
          <label class="text-sm opacity-60 block mb-1">{{ t('book.translator', 2) }}</label>
          <o-taginput
            v-model="userbook.book.translators"
            :options="filteredTranslators"
            :allow-autocomplete="true"
            autocomplete="off"
            :allow-new="true"
            :allow-duplicates="false"
            :open-on-focus="true"
            :validate-item="(item: Author|string) => beforeAdd(item, userbook.book.translators as Array<Author>)"
            :create-item="ObjectUtils.createNamedItem"
            icon-pack="mdi"
            icon="account-plus"
            :placeholder="t('labels.add_translator')"
            @input="(v: string) => getFilteredData(v, filteredTranslators)"
            root-class="w-full"
          >
            <template #default="{ value }">
              <div class="jl-taginput-item">{{ value.name }}</div>
            </template>
            <template #selected="{ removeItem, items }">
              <ClosableBadge v-for="(item, index) in items" :key="item.name" :content="item.name" class="badge-primary badge-sm" @closed="removeItem(index, $event)" />
            </template>
          </o-taginput>
        </div>
        <div class="field px-4 py-3 border-b border-base-200">
          <label class="text-sm opacity-60 block mb-1">{{ t('book.narrator', 2) }}</label>
          <o-taginput
            v-model="userbook.book.narrators"
            :options="filteredNarrators"
            :allow-autocomplete="true"
            autocomplete="off"
            :allow-new="true"
            :allow-duplicates="false"
            :open-on-focus="true"
            :validate-item="(item: Author|string) => beforeAdd(item, userbook.book.narrators as Array<Author>)"
            :create-item="ObjectUtils.createNamedItem"
            icon-pack="mdi"
            icon="account-plus"
            :placeholder="t('labels.add_narrator')"
            @input="(v: string) => getFilteredData(v, filteredNarrators)"
            root-class="w-full"
          >
            <template #default="{ value }">
              <div class="jl-taginput-item">{{ value.name }}</div>
            </template>
            <template #selected="{ removeItem, items }">
              <ClosableBadge v-for="(item, index) in items" :key="item.name" :content="item.name" class="badge-primary badge-sm" @closed="removeItem(index, $event)" />
            </template>
          </o-taginput>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input v-model="userbook.book.googleId" :placeholder="t('book.google_id')" class="bg-transparent outline-none text-sm py-1 w-full">
          <input v-model="userbook.book.goodreadsId" :placeholder="t('book.goodreads_id')" class="bg-transparent outline-none text-sm py-1 w-full">
          <input v-model="userbook.book.amazonId" :placeholder="t('book.amazon_id')" class="bg-transparent outline-none text-sm py-1 w-full">
          <input v-model="userbook.book.openlibraryId" :placeholder="t('book.openlibrary_id')" class="bg-transparent outline-none text-sm py-1 w-full">
          <input v-model="userbook.book.isfdbId" :placeholder="t('book.isfdb_id')" class="bg-transparent outline-none text-sm py-1 w-full">
          <input v-model="userbook.book.librarythingId" :placeholder="t('book.librarything_id')" class="bg-transparent outline-none text-sm py-1 w-full">
          <input v-model="userbook.book.noosfereId" :placeholder="t('book.noosfere_id')" class="bg-transparent outline-none text-sm py-1 w-full">
          <input v-model="userbook.book.inventaireId" :placeholder="t('book.inventaire_id')" class="bg-transparent outline-none text-sm py-1 w-full">
        </div>
      </div>
    </details>

    <div v-if="props.canAddEvent" class="mb-4">
      <div class="text-xs font-semibold uppercase opacity-60 tracking-wider mb-1 px-1">{{ t('book.personal') }}</div>
      <div class="bg-base-100 rounded-xl border border-base-300">
        <div class="px-4 py-3 border-b border-base-200">
          <label class="text-sm opacity-60 block mb-2">{{ t('book.status') }}</label>
          <div class="flex gap-3 flex-wrap">
            <label class="label cursor-pointer gap-1 mb-0">
              <input v-model="userbook.lastReadingEvent" type="radio" value="FINISHED" class="radio radio-sm radio-primary">
              <span class="label-text text-sm">{{ t('reading_events.finished') }}</span>
            </label>
            <label class="label cursor-pointer gap-1 mb-0">
              <input v-model="userbook.lastReadingEvent" type="radio" value="CURRENTLY_READING" class="radio radio-sm radio-primary">
              <span class="label-text text-sm">{{ t('reading_events.currently_reading') }}</span>
            </label>
            <label class="label cursor-pointer gap-1 mb-0">
              <input v-model="userbook.lastReadingEvent" type="radio" value="DROPPED" class="radio radio-sm radio-primary">
              <span class="label-text text-sm">{{ t('reading_events.dropped') }}</span>
            </label>
            <label class="label cursor-pointer gap-1 mb-0">
              <input v-model="userbook.lastReadingEvent" type="radio" value="NONE" class="radio radio-sm radio-primary">
              <span class="label-text text-sm">{{ t('reading_events.none') }}</span>
            </label>
          </div>
        </div>
        <div class="px-4 py-3 border-b border-base-200">
          <label class="text-sm opacity-60 block mb-2">{{ t('book.properties') }}</label>
          <div class="flex gap-4 flex-wrap">
            <label class="label cursor-pointer gap-2 mb-0">
              <input v-model="userbook.owned" type="checkbox" class="checkbox checkbox-sm checkbox-primary">
              <span class="label-text text-sm">{{ t('book.owned') }}</span>
            </label>
            <label class="label cursor-pointer gap-2 mb-0">
              <input v-model="userbook.toRead" type="checkbox" class="checkbox checkbox-sm checkbox-primary">
              <span class="label-text text-sm">{{ t('book.to_read') }}</span>
            </label>
            <label class="label cursor-pointer gap-2 mb-0">
              <input v-model="userbook.borrowed" type="checkbox" class="checkbox checkbox-sm checkbox-primary">
              <span class="label-text text-sm">{{ t('book.borrowed') }}</span>
            </label>
          </div>
        </div>
        <div class="px-4 py-3 border-b border-base-200">
          <label class="text-sm opacity-60 block mb-1">{{ t('book.personal_notes') }}</label>
          <input v-model="userbook.personalNotes" :placeholder="t('book.personal_notes')" class="w-full bg-transparent outline-none text-sm">
        </div>
        <div class="flex items-center gap-3 px-4 py-3 border-b border-base-200">
          <label class="text-sm opacity-60 w-24 shrink-0">{{ t('book.price') }}</label>
          <input v-model.number="userbook.price" type="number" step="0.01" class="flex-1 bg-transparent outline-none text-sm text-right" :placeholder="t('book.price')">
        </div>
        <div class="flex items-center gap-3 px-4 py-3">
          <label class="text-sm opacity-60 w-24 shrink-0">{{ t('book.current_page_number') }}</label>
          <input v-model.number="userbook.currentPageNumber" type="number" class="flex-1 bg-transparent outline-none text-sm text-right" :placeholder="t('book.current_page_number')">
        </div>
        <div class="px-4 py-3">
          <label class="text-sm opacity-60 block mb-1">{{ t('book.percent_read') }}</label>
          <input v-model.number="sliderPercent" type="range" min="0" max="100" class="w-full range range-primary range-xs">
          <div class="text-right text-xs opacity-60 mt-1">{{ sliderPercent }}%</div>
        </div>
      </div>
    </div>

    <div v-if="!hasImage || deleteImage" class="mb-4">
      <div class="text-xs font-semibold uppercase opacity-60 tracking-wider mb-1 px-1">{{ t('labels.upload_cover') }}</div>
      <div class="bg-base-100 rounded-xl border border-base-300 overflow-hidden p-4">
        <div class="flex gap-3 mb-3 justify-center">
          <label class="label cursor-pointer gap-1 mb-0">
            <input v-model="uploadType" type="radio" value="web" class="radio radio-sm">
            <span class="label-text text-sm">{{ t('labels.upload_from_web') }}</span>
          </label>
          <label class="label cursor-pointer gap-1 mb-0">
            <input v-model="uploadType" type="radio" value="computer" class="radio radio-sm">
            <span class="label-text text-sm">{{ t('labels.upload_from_computer') }}</span>
          </label>
          <label class="label cursor-pointer gap-1 mb-0">
            <input v-model="uploadType" type="radio" value="server" class="radio radio-sm">
            <span class="label-text text-sm">{{ t('labels.upload_from_server') }}</span>
          </label>
        </div>
        <div v-if="uploadType === 'web'" class="mt-2">
          <input v-model="imageUrl" :placeholder="t('labels.url_must_start')" class="input input-sm w-full">
        </div>
        <div v-else-if="uploadType === 'computer'" class="mt-2">
          <input type="file" accept="image/*" @change="handleFileUpload" class="file-input file-input-sm w-full">
          <progress v-if="uploadPercentage > 0" :value="uploadPercentage" max="100" class="progress progress-primary w-full mt-2"></progress>
        </div>
        <div v-else class="mt-2 text-center">
          <button @click="toggleImagePickerModal" class="btn btn-sm btn-primary">{{ t('labels.choose_file') }}</button>
          <span v-if="imagePath" class="block text-xs mt-1 opacity-60">{{ imagePath }}</span>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="text-error text-center text-sm mb-3">{{ errorMessage }}</p>
    <progress v-if="progress" class="animate-pulse progress progress-success w-full" max="100" />
  </section>
</template>

<style lang="scss">
details > summary {
  list-style: none;
}
details > summary::-webkit-details-marker {
  display: none;
}

/* Modal width constraint (desktop only) */
@media (min-width: 640px) {
  .edit-modal {
    max-width: 36rem;
    margin: 0 auto;
  }
}
</style>

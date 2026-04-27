<script setup lang="ts">
import { useOruga } from "@oruga-ui/oruga-next";
import { ComputedRef, Ref, computed, reactive, ref } from "vue";
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useLocalStorage } from '@vueuse/core';
import { Book } from "../../model/Book";
import { Metadata } from "../../model/Metadata";
import { ServerSettings } from "../../model/ServerSettings";
import dataService from "../../services/DataService";
import { key } from '../../store';
import { StringUtils } from "../../utils/StringUtils";
import MetadataDetail from '../Metadata/MetadataDetail.vue';
import ScanModal from '../Book/ScanModal.vue';
import useTypography from "../../composables/typography";

const { t } = useI18n({
      inheritLocale: true,
      useScope: 'global'
    })
const store = useStore(key)

const oruga = useOruga();

const props = defineProps<{
  book: Book|undefined,
}>()

const form = reactive({
  title: props.book?.title,
  isbn: props.book?.isbn10?.length != undefined && props.book?.isbn10?.length > 0 ? props.book?.isbn10 : props.book?.isbn13,
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

const storedLanguage = useLocalStorage("jelu_language", "en")

const fetchMetadata = async () => {
    progress.value = true
    dataService.fetchMetadataWithPlugins({isbn: form.isbn, title: form.title, authors: form.authors, plugins: [], language: storedLanguage.value})
    .then(res => {
        progress.value = false
        metadata.value = res
        displayForm.value = false
        }
    )
}

const discard = () => {
    displayForm.value = true
    metadata.value = null
}

const importData = () => {
    emit('metadataReceived', metadata.value)
    emit('close')
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
        decoded: (barcode: string|null) => {
          if (barcode != null) {
            form.isbn = barcode
            fetchMetadata()
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

const { typographyClasses } = useTypography()
</script>

<template>
  <section class="edit-modal">
    <div class="flex flex-col items-center">
      <div class="mb-2">
        <h1
          class="text-2xl capitalize"
          :class="typographyClasses"
        >
          {{ t('labels.import_book') }}
        </h1>
      </div>
      <div
        v-if="displayForm"
        class="sm:w-lg"
      >
        <fieldset class="fieldset">
          <legend class="fieldset-legend capitalize">
            {{ t('book.isbn') }}
          </legend>
          <input
            v-model="form.isbn"
            class="input focus:input-accent w-full"
            @keyup.enter="fetchMetadata"
          >
        </fieldset>
        <fieldset class="fieldset">
          <legend class="fieldset-legend capitalize">
            {{ t('book.title') }}
          </legend>
          <input
            v-model="form.title"
            class="input focus:input-accent w-full"
            @keyup.enter="fetchMetadata"
          >
        </fieldset>
        <fieldset class="fieldset">
          <legend class="fieldset-legend capitalize">
            {{ t('book.author', 2) }}
          </legend>
          <input
            v-model="form.authors"
            class="input focus:input-accent w-full"
            @keyup.enter="fetchMetadata"
          >
        </fieldset>
      </div>
      <div
        v-if="displayForm"
      >
        <div class="field">
          <div class="flex gap-1">
            <button
              :disabled="!isValid"
              class="btn btn-success uppercase"
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
              class="btn btn-warning p-2"
              :class="{'btn-disabled' : progress}"
              @click="toggleScanModal"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-6 h-6"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
                />
              </svg>
            </button>
          </div>
          <p
            v-if="errorMessage"
            class="text-error"
          >
            {{ errorMessage }}
          </p>
        </div>
      </div>
      <div
        v-if="displayForm"
      >
        <progress
          v-if="progress"
          class="animate-pulse progress progress-success mt-5"
          max="100"
        />
      </div>
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

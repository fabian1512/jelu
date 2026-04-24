<script setup lang="ts">
import { computed, Ref, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { useOruga } from '@oruga-ui/oruga-next'
import { key } from '../../store'
import { StringUtils } from '../../utils/StringUtils'
import ScanModal from '../Book/ScanModal.vue'

const store = useStore(key)
const router = useRouter()
const route = useRoute()
const oruga = useOruga()
const { t } = useI18n({ inheritLocale: true, useScope: 'global' })

const isLogged = computed(() => store.getters.getLogged)

const searchQuery = ref('')

const showSearchBar = computed(() => route.name === 'home' || route.name === 'my-books')

const search = () => {
  if (StringUtils.isNotBlank(searchQuery.value)) {
    router.push({ path: '/search', query: { q: searchQuery.value } })
  }
}

let barcodeReader: any = null

function toggleScanModal() {
  oruga.modal.open({
    component: ScanModal,
    trapFocus: true,
    active: true,
    canCancel: ['x', 'button', 'outside'],
    scroll: 'keep',
    props: {},
    events: {
      decoded: (barcode: string | null) => {
        if (barcode != null) {
          searchQuery.value = barcode
          search()
        }
      },
      barcodeLoaded: (reader: any) => {
        barcodeReader = reader
      }
    },
  })
}
</script>

<template>
  <div v-if="isLogged && showSearchBar" class="bg-base-200 px-4 py-3">
    <div class="max-w-2xl mx-auto">
      <div class="join w-full">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('labels.search_query')"
          class="input input-bordered join-item flex-1 min-w-0"
          @keyup.enter="search"
        />
        <button class="btn btn-primary join-item" @click="search">
          <i class="mdi mdi-magnify text-xl" />
        </button>
        <button class="btn btn-warning join-item" @click="toggleScanModal">
          <i class="mdi mdi-barcode text-xl" />
        </button>
      </div>
    </div>
  </div>
</template>

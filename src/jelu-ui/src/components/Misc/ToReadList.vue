<script setup lang="ts">
import { useThrottleFn, useTitle } from '@vueuse/core';
import { useRouteQuery } from '@vueuse/router';
import { computed, Ref, ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import usePagination from '../../composables/pagination';
import useSort from '../../composables/sort';
import useBulkEdition from '../../composables/bulkEdition';
import { UserBook } from '../../model/Book';
import { ReadingEventType } from '../../model/ReadingEvent';
import dataService from "../../services/DataService";
import BookCard from '../Global/BookCard.vue';
import SortFilterBarVue from '../Global/SortFilterBar.vue';
import useTypography from '../../composables/typography';

const { t } = useI18n({
      inheritLocale: true,
      useScope: 'global'
    })

useTitle('Jelu | ' + t('nav.to_read'))

const books: Ref<Array<UserBook>> = ref([]);

const { total, page, pageAsNumber, perPage, updatePage, getPageIsLoading, updatePageLoading, pageCount } = usePagination()

const { sortQuery, sortOrder, sortBy, sortOrderUpdated } = useSort('creationDate,desc')

const { showSelect, selectAll, checkedCards, cardChecked, toggleEdit } = useBulkEdition(modalClosed)

// Initialize empty - event types are not used for to-read list filtering
const eventTypes: Ref<Array<ReadingEventType>> = ref([])

const userId: Ref<string|null> = useRouteQuery('userId', null)
const username = ref("")

const getUsername = async () => {
  if (userId.value != null) {
    username.value = await dataService.usernameById(userId.value)
  }
}

getUsername()

const open = ref(false)

const owned: Ref<string|null> = useRouteQuery('owned', "null")
const ownedAsBool = computed(() => {
  if (owned.value?.toLowerCase() === "null") {
    return null
  } else if (owned.value?.toLowerCase() === "true") {
    return true
  } else {
    return false
  }
  }
)

const getToReadIsLoading: Ref<boolean> = ref(false)

const getToRead = async () => {
  getToReadIsLoading.value = true
  try {
    const res = await dataService.findUserBookByCriteria(
      eventTypes.value, null, userId.value,
    true, ownedAsBool.value, null,
    pageAsNumber.value - 1, perPage.value, sortQuery.value)
    total.value = res.totalElements
    books.value = res.content
    if (! res.empty) {
      page.value =  (res.number + 1).toString(10)
    }
    else {
      page.value = "1"
    }
    getToReadIsLoading.value = false
    updatePageLoading(false)
    removeIds()
  } catch (error) {
    getToReadIsLoading.value = false
    updatePageLoading(false)
  }
};

const removeIds = () => {
  if (userId.value != null) {
    books.value.forEach(b => b.id = undefined)
  }
}

// --- LocalStorage keys for ToReadList ---
const SORT_BY_KEY = "toReadSortBy";
const SORT_ORDER_KEY = "toReadSortOrder";
const OWNED_KEY = "toReadOwned";

// Restore saved settings (but NOT eventTypes - always use empty for to-read page)
// Event types should NOT filter the to-read list
onMounted(() => {
  const savedSortBy = localStorage.getItem(SORT_BY_KEY);
  const savedSortOrder = localStorage.getItem(SORT_ORDER_KEY);
  if (savedSortBy) sortBy.value = savedSortBy;
  if (savedSortOrder) sortOrder.value = savedSortOrder;

  // Note: We intentionally do NOT restore eventTypes from localStorage
  // The to-read page should always show ALL books marked as to-read,
  // regardless of their reading status

  const savedOwned = localStorage.getItem(OWNED_KEY);
  if (savedOwned) owned.value = savedOwned;
});

// Persist changes
watch(sortBy, (newVal) => {
  localStorage.setItem(SORT_BY_KEY, newVal);
});
watch(sortOrder, (newVal) => {
  localStorage.setItem(SORT_ORDER_KEY, newVal);
});
watch(owned, (newVal) => {
  localStorage.setItem(OWNED_KEY, newVal ?? "null");
});



// watches set above sometimes called twice
// so getBooks was sometimes called twice at the same instant
const throttledGetToRead = useThrottleFn(() => {
  getToRead()
}, 100, false)

watch([page, sortQuery, owned], (newVal, oldVal) => {
  if (newVal !== oldVal) {
    throttledGetToRead()
  }
})

function modalClosed() {
  throttledGetToRead()
}

const message = computed(() => {
  if (userId.value != null) {
    return t('labels.reading_list_from_name', { name: username.value })
  } else {
    return t('nav.to_read')
  }
} )

getToRead()

const { typographyClasses } = useTypography()
</script>

<template>
  <sort-filter-bar-vue
    :open="open"
    :order="sortOrder"
    @update:open="open = $event"
    @update:sort-order="sortOrderUpdated"
  >
    <template #sort-fields>
      <p class="px-4 py-2 text-xs font-bold opacity-80 uppercase tracking-wide border-t border-base-300 mt-2">{{ t('sorting.sort_by') }}</p>
      <div class="field">
        <input
          v-model="sortBy"
          type="radio"
          name="radio-20"
          class="radio radio-primary"
          value="creationDate"
        >
        <span class="label-text">{{ t('sorting.date_added_to_list') }}</span>
      </div>
      <div class="field">
        <input
          v-model="sortBy"
          type="radio"
          name="radio-20"
          class="radio radio-primary"
          value="lastReadingEventDate"
        >
        <span class="label-text">{{ t('sorting.last_reading_event_date') }}</span>
      </div>
      <div class="field">
        <input
          v-model="sortBy"
          type="radio"
          name="radio-20"
          class="radio radio-primary"
          value="title"
        >
        <span class="label-text">{{ t('sorting.title') }}</span>
      </div>
      <div class="field">
        <input
          v-model="sortBy"
          type="radio"
          name="radio-20"
          class="radio radio-primary"
          value="publisher"
        >
        <span class="label-text">{{ t('sorting.publisher') }}</span>
      </div>
      <div class="field">
        <input
          v-model="sortBy"
          type="radio"
          name="radio-20"
          class="radio radio-primary"
          value="pageCount"
        >
        <span class="label-text">{{ t('sorting.page_count') }}</span>
      </div>
      <div class="field">
        <input
          v-model="sortBy"
          type="radio"
          name="radio-20"
          class="radio radio-primary"
          value="usrAvgRating"
        >
        <span class="label-text">{{ t('sorting.user_avg_rating') }}</span>
      </div>
      <div class="field">
        <input
          v-model="sortBy"
          type="radio"
          name="radio-20"
          class="radio radio-primary"
          value="avgRating"
        >
        <span class="label-text">{{ t('sorting.avg_rating') }}</span>
      </div>
      <div class="field">
        <input
          v-model="sortBy"
          type="radio"
          name="radio-20"
          class="radio radio-primary"
          value="random"
        >
        <span class="label-text">{{ t('sorting.random') }}</span>
      </div>
    </template>
    <template #filters>
      <div class="field flex flex-col items-start">
        <p class="px-4 py-2 text-xs font-bold opacity-80 uppercase tracking-wide border-t border-base-300 mt-2">{{ t('filtering.owned') }}</p>
        <div class="field">
          <input
            v-model="owned"
            type="radio"
            name="radio-31"
            class="radio radio-primary"
            value="null"
          >
          <span class="label-text">{{ t('filtering.unset') }}</span>
        </div>
        <div class="field">
          <input
            v-model="owned"
            type="radio"
            name="radio-31"
            class="radio radio-primary"
            value="false"
          >
          <span class="label-text">{{ t('labels.false') }}</span>
        </div>
        <div class="field">
          <input
            v-model="owned"
            type="radio"
            name="radio-31"
            class="radio radio-primary"
            value="true"
          >
          <span class="label-text">{{ t('labels.true') }}</span>
        </div>
      </div>
    </template>
  </sort-filter-bar-vue>
  <div class="flex flex-row flex-wrap justify-between mb-2">
    <h2
      class="text-xl sm:text-2xl md:text-3xl capitalize truncate"
      :class="typographyClasses"
    >
      {{ message }} :
    </h2>
    <div class="flex flex-row flex-wrap gap-1">
      <button
        class="btn btn-outline btn-success"
        @click="open = !open"
      >
        <span class="icon text-lg">
          <i class="mdi mdi-filter-variant" />
        </span>
      </button>
      <button
        v-tooltip="t('bulk.toggle')"
        class="btn btn-outline btn-primary"
        @click="showSelect = !showSelect"
      >
        <span class="icon text-lg">
          <i class="mdi mdi-pencil" />
        </span>
      </button>
      <button
        v-if="showSelect"
        v-tooltip="t('bulk.select_all')"
        class="btn btn-outline btn-accent"
        @click="selectAll = !selectAll"
      >
        <span class="icon text-lg">
          <i class="mdi mdi-checkbox-multiple-marked" />
        </span>
      </button>
      <button
        v-if="showSelect && checkedCards.length > 0"
        v-tooltip="t('bulk.edit')"
        class="btn btn-outline btn-info"
        @click="toggleEdit(checkedCards)"
      >
        <span class="icon text-lg">
          <i class="mdi mdi-book-edit" />
        </span>
      </button>
    </div>
  </div>
  <o-pagination
    v-if="books.length > 0 && pageCount > 1"
    v-model:current="pageAsNumber"
    :total="total"
    order="centered"
    :per-page="perPage"
    @change="updatePage"
  />
  <div
    v-if="books.length > 0"
    class="grid gap-[12px] grid-cols-1 sm:grid-cols-3 md:grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] my-3"
  >
    <div
      v-for="book in books"
      :key="book.id"
      class="books-grid-item m-2 h-full"
    >
      <book-card
        :book="book"
        :force-select="selectAll"
        :public="false"
        :show-select="showSelect"
        :propose-add="userId == null"
        class="h-full"
        @update:modal-closed="modalClosed"
        @update:checked="cardChecked"
      />
    </div>
  </div>
  <div
    v-else-if="getToReadIsLoading"
    class="flex flex-row justify-center justify-items-center gap-3"
  >
    <o-skeleton
      class="justify-self-center basis-36"
      height="250px"
      :animated="true"
    />
    <o-skeleton
      class="justify-self-center basis-36"
      height="250px"
      :animated="true"
    />
    <o-skeleton
      class="justify-self-center basis-36"
      height="250px"
      :animated="true"
    />
  </div>
  <div v-else>
    <h2
      class="text-xl sm:text-2xl md:text-3xl"
      :class="typographyClasses"
    >
      {{ t('labels.nothing_to_read') }}
    </h2>
    <span class="icon">
      <i class="mdi mdi-book-open-page-variant-outline mdi-48px" />
    </span>
  </div>
  <o-pagination
    v-if="books.length > 0"
    v-model:current="pageAsNumber"
    :total="total"
    order="centered"
    :per-page="perPage"
    @change="updatePage"
  />
  <o-loading
    v-model:active="getPageIsLoading"
    :full-page="true"
    :cancelable="true"
  />
</template>

<style scoped>
</style>

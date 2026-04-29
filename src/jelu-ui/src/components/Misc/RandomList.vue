<script setup lang="ts">
import { useThrottleFn, useTitle } from '@vueuse/core';
import { useRouteQuery } from '@vueuse/router';
import { computed, Ref, ref, watch } from 'vue';
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

useTitle('Jelu | ' + t('nav.random'))

const books: Ref<Array<UserBook>> = ref([]);

const { total, page, pageAsNumber, perPage, updatePage, getPageIsLoading, updatePageLoading } = usePagination()

const { sortQuery, sortOrder, sortBy, sortOrderUpdated } = useSort('random,desc')

const { showSelect, selectAll, checkedCards, cardChecked, toggleEdit } = useBulkEdition(modalClosed)

const eventTypes: Ref<Array<ReadingEventType>> = useRouteQuery('lastEventTypes', [])

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

const getRandomIsLoading: Ref<boolean> = ref(false)

const getRandom = async () => {
  getRandomIsLoading.value = true
  try {
    const res = await dataService.findUserBookByCriteria(
      eventTypes.value, null, userId.value,
    null, ownedAsBool.value, null,
    pageAsNumber.value - 1, perPage.value, sortQuery.value)
    total.value = res.totalElements
    books.value = res.content
    if (! res.empty) {
      page.value =  (res.number + 1).toString(10)
    }
    else {
      page.value = "1"
    }
    getRandomIsLoading.value = false
    updatePageLoading(false)
  } catch (error) {
    getRandomIsLoading.value = false
    updatePageLoading(false)
  }
};

// watches set above sometimes called twice
// so getBooks was sometimes called twice at the same instant
const throttledGetRandom = useThrottleFn(() => {
  getRandom()
}, 100, false)

watch([page, eventTypes, sortQuery, owned], (newVal, oldVal) => {
  if (newVal !== oldVal) {
    throttledGetRandom()
  }
})

function modalClosed() {
  throttledGetRandom()
}

getRandom()

const { typographyClasses } = useTypography()
</script>

<template>
  <sort-filter-bar-vue
    :open="open"
    :order="sortOrder"
    class="sort-filter-bar"
    @update:open="open = $event"
    @update:sort-order="sortOrderUpdated"
  >
    <template #filters>
      <div class="field flex flex-col items-start">
        <p class="px-4 py-2 text-xs font-bold opacity-80 uppercase tracking-wide border-t border-base-300 mt-2">{{ t('reading_events.last_event_type') }}</p>
        <div class="field">
          <input
            v-model="eventTypes"
            type="checkbox"
            class="checkbox checkbox-primary"
            value="FINISHED"
          >
          <span class="label-text">{{ t('reading_events.finished') }}</span>
        </div>
        <div class="field">
          <input
            v-model="eventTypes"
            type="checkbox"
            class="checkbox checkbox-primary"
            value="CURRENTLY_READING"
          >
          <span class="label-text">{{ t('reading_events.currently_reading') }}</span>
        </div>
        <div class="field">
          <input
            v-model="eventTypes"
            type="checkbox"
            class="checkbox checkbox-primary"
            value="DROPPED"
          >
          <span class="label-text">{{ t('reading_events.dropped') }}</span>
        </div>
      </div>
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
  <div class="flex flex-row justify-between">
    <h2
      class="text-3xl capitalize"
      :class="typographyClasses"
    >
      {{ t('nav.random') }} :
    </h2>
    <div class="flex flex-row gap-1">
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
  <div
    v-if="books.length > 0"
    class="grid gap-[12px] grid-cols-3 md:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] my-3"
  >
    <div
      v-for="book in books"
      :key="book.id"
      class="books-grid-item"
    >
      <book-card
        :book="book"
        :force-select="selectAll"
        :public="false"
        :show-select="showSelect"
        :propose-add="true"
        class="h-full"
        @update:modal-closed="modalClosed"
        @update:checked="cardChecked"
      />
    </div>
  </div>
  <div
    v-else-if="getRandomIsLoading"
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
      class="text-3xl"
      :class="typographyClasses"
    >
      {{ t('nav.random') }}
    </h2>
    <span class="icon">
      <i class="mdi mdi-book-open-page-variant-outline mdi-48px" />
    </span>
  </div>
  <o-loading
    v-model:active="getPageIsLoading"
    :full-page="true"
    :can-cancel="true"
  />
</template>

<style scoped>
</style>

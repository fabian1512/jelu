<script setup lang="ts">
import { useThrottleFn, useTitle } from '@vueuse/core';
import { Ref, ref, watch } from "vue";
import { useI18n } from 'vue-i18n';
import usePagination from '../../composables/pagination';
import useSort from "../../composables/sort";
import { Review } from '../../model/Review';
import dataService from "../../services/DataService";
import ReviewBookCard from '../Global/ReviewBookCard.vue';
import SortFilterBarVue from '../Global/SortFilterBar.vue';
import useTypography from '../../composables/typography';

const { t } = useI18n({
  inheritLocale: true,
  useScope: 'global'
})

useTitle('Jelu | ' + t('nav.activity'))

const reviews: Ref<Array<Review>> = ref([]);

const { total, page, pageAsNumber, perPage, updatePage, getPageIsLoading, updatePageLoading, pageCount } = usePagination(16)

const { sortQuery, sortOrder, sortBy, sortOrderUpdated } = useSort('reviewDate,desc')

const open = ref(false)

const getBookIsLoading: Ref<boolean> = ref(false)

watch([page, sortQuery], (newVal, oldVal) => {
  if (newVal !== oldVal) {
    throttledGetReviews()
  }
})

const getReviews = () => {
  getBookIsLoading.value = true
  dataService.findReviews(undefined, undefined, null,
  null, null,
  pageAsNumber.value - 1, perPage.value, sortQuery.value)
  .then(res => {
          total.value = res.totalElements
          reviews.value = res.content
        if (! res.empty) {
          page.value =  (res.number + 1).toString(10)
        }
        else {
          page.value = "1"
        }
        getBookIsLoading.value = false
        updatePageLoading(false)
    }
    )
    .catch(e => {
      getBookIsLoading.value = false
      updatePageLoading(false)
    })

};

// watches set above sometimes called twice
// so getBooks was sometimes called twice at the same instant
const throttledGetReviews = useThrottleFn(() => {
  getReviews()
}, 100, false)

try {
  getReviews();
} catch (error) {
}

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
          name="radio-sort"
          class="radio radio-primary my-2"
          value="reviewDate"
        >
        <span class="label-text">{{ t('sorting.review_date') }}</span>
      </div>
      <div class="field">
        <input
          v-model="sortBy"
          type="radio"
          name="radio-sort"
          class="radio radio-primary mb-2"
          value="creationDate"
        >
        <span class="label-text">{{ t('sorting.date_added') }}</span>
      </div>
      <div class="field">
        <input
          v-model="sortBy"
          type="radio"
          name="radio-sort"
          class="radio radio-primary mb-2"
          value="rating"
        >
        <span class="label-text">{{ t('sorting.rating') }}</span>
      </div>
    </template>
  </sort-filter-bar-vue>
  <div class="flex flex-row justify-between mb-2">
    <h2
      class="text-xl sm:text-2xl md:text-3xl capitalize"
      :class="typographyClasses"
    >
      {{ t('nav.activity') }} :
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
    </div>
  </div>
  <o-pagination
    v-if="reviews.length > 0 && pageCount > 1"
    :current="pageAsNumber"
    :total="total"
    order="centered"
    :per-page="perPage"
    @change="updatePage"
  />
  <div
    v-if="reviews.length > 0"
    class="flex flex-wrap gap-3 justify-center"
  >
    <TransitionGroup name="list">
      <div
        v-for="review in reviews"
        :key="review.id"
        class="m-1"
      >
        <ReviewBookCard
          :review="review"
          :book-reviews-link="true"
          :show-user-name="true"
        />
      </div>
    </TransitionGroup>
  </div>
  <div
    v-else-if="getBookIsLoading"
    class="flex flex-row flex-wrap justify-center justify-items-center gap-3"
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
      class="justify-self-center basis-36 hidden sm:block"
      height="250px"
      :animated="true"
    />
  </div>
  <div v-else>
    <h2
      class="text-3xl capitalize"
      :class="typographyClasses"
    >
      {{ t('labels.library_empty') }}
    </h2>
    <span class="icon">
      <i class="mdi mdi-book-open-page-variant-outline mdi-48px" />
    </span>
  </div>

  <o-pagination
    v-if="reviews.length > 0"
    :current="pageAsNumber"
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



.list-enter-active,
.list-leave-active {
  transition: all 0.2s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
}

</style>

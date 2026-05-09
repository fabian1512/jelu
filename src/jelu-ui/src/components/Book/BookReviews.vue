<script setup lang="ts">
import { useTitle } from '@vueuse/core';
import { computed, Ref, ref, watch } from "vue";
import { useRoute, useRouter } from 'vue-router';
import { Book } from "../../model/Book";
import { Review } from "../../model/Review";
import dataService from "../../services/DataService";
import ReviewCard from "../Global/ReviewCard.vue";
import { useStore } from 'vuex'
import { key } from '../../store'
import useDates from '../../composables/dates'
import { useI18n } from 'vue-i18n'
import useTypography from "../../composables/typography";

const route = useRoute()
const router = useRouter()
const store = useStore(key)
const { d, stringToDate } = useDates()
const { t } = useI18n({ inheritLocale: true, useScope: 'global' })
const { typographyClasses } = useTypography()

const logged = computed(() => store.getters.getLogged)

useTitle('Jelu | Reviews')
const reviews: Ref<Array<Review>> = ref([])
const book: Ref<Book> = ref({title:""})
const totalReviews: Ref<number> = ref(0)

const displaySummary = computed(() => {
  if (book.value?.summary) {
    return book.value.summary.replace(/\n/g, '<br>')
  }
  return ''
})

const publisherQuery = computed(() => {
  if (book.value?.publisher) {
    return encodeURIComponent(book.value.publisher)
  }
  return ''
})

const hasExternalLink = computed(() => book.value?.amazonId != null
  || book.value?.goodreadsId != null
  || book.value?.googleId != null
  || book.value?.librarythingId != null
  || book.value?.inventaireId != null
  || book.value?.isfdbId != null
  || book.value?.noosfereId != null
  || book.value?.openlibraryId != null)

watch(() => route.params.bookId, (newVal, oldVal) => {
  if (newVal !== oldVal && route.params.bookId !== undefined) {
    getBook()
    getReviews()
  }
})

const getBook = async () => {
  try {
    book.value = await dataService.findBookById(route.params.bookId as string)
  } catch (error) {
  }
};

const getReviews = async () => {
  dataService.findReviews(undefined, 
    route.params.bookId as string, null, null, null, 0, 50, null)
    .then(res => {
        if (!res.empty) {
            reviews.value = res.content
            totalReviews.value = res.totalElements
        }
    })
    
};

getBook()
getReviews()
</script>

<template>
  <div class="grid grid-cols-1 justify-center">
    <div class="space-y-4 w-full sm:w-3/4 mx-auto">
      <div
        class="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6"
      >
      <div class="sm:justify-self-start flex justify-center">
        <figure class="sm:justify-self-start relative">
          <img
            v-if="book?.image"
            :src="'/files/' + book.image + (book.modificationDate ? '?v=' + book.modificationDate : '')"
            alt="cover image"
            class="max-h-64 sm:max-h-96 max-w-full"
            fetchpriority="high"
            loading="eager"
            decoding="async"
          >
          <img
            v-else
            src="../../assets/placeholder_asset.jpg"
            alt="cover placeholder"
            fetchpriority="high"
            loading="eager"
            decoding="async"
            class="max-h-64 sm:max-h-96 max-w-full"
          >
        </figure>
      </div>
      <div class="text-left">
        <h3
          class="text-xl sm:text-2xl md:text-3xl"
          :class="typographyClasses"
        >
          {{ book?.title }}
        </h3>
        <h4
          v-if="book?.originalTitle"
          :class="typographyClasses"
        >
          {{ book.originalTitle }}
        </h4>
        <p class="flex flex-wrap items-center gap-1">
          <span class="font-semibold capitalize">{{ t('book.author', 2) }} :</span>
          <span v-if="book?.authors && book.authors.length > 0">
            <span
              v-for="author in book?.authors"
              :key="author.id"
            >
              <router-link
                class="link hover:underline hover:decoration-4 hover:decoration-secondary"
                :to="{ name: 'author-detail', params: { authorId: author.id } }"
              >
                {{ author.name }}
              </router-link>
            </span>
          </span>
          <span v-else class="opacity-60">-</span>
        </p>
        <p>
          <span class="font-semibold capitalize">{{ t('book.publisher') }} :&nbsp;</span>
          <router-link
            v-if="book?.publisher"
            class="link hover:underline hover:decoration-4 hover:decoration-secondary"
            :to="{ name: 'search', query: { q: `publisher:` + publisherQuery } }"
          >
            {{ book.publisher }}
          </router-link>
          <span v-else class="opacity-60">-</span>
        </p>
        <p>
          <span class="font-semibold uppercase">{{ t('book.isbn10') }} :</span>
          <span :class="book?.isbn10 ? '' : 'opacity-60'">{{ book?.isbn10 || '-' }}</span>
        </p>
        <p>
          <span class="font-semibold uppercase">{{ t('book.isbn13') }} :</span>
          <span :class="book?.isbn13 ? '' : 'opacity-60'">{{ book?.isbn13 || '-' }}</span>
        </p>
        <p>
          <span class="font-semibold capitalize">{{ t('book.page', 2) }} :</span>
          <span v-if="book?.pageCount" class="opacity-60">{{ book.pageCount }}</span>
          <span v-else class="opacity-60">-</span>
        </p>
        <p>
          <span class="font-semibold capitalize">{{ t('book.published_date') }} :</span>
          <span v-if="book?.publishedDate">{{ d(stringToDate(book.publishedDate) ?? '', 'short') }}</span>
          <span v-else class="opacity-60">-</span>
        </p>
        <p class="font-semibold capitalize">
          {{ t('book.summary') }} :
        </p>
        <div
          v-if="book?.summary"
          class="h-48 overflow-y-auto text-left"
        >
          <p v-html="displaySummary" />
        </div>
        <div v-else class="h-48 overflow-y-auto text-left opacity-60">
          -
        </div>
      </div>
      </div>

      <!-- Book-ID and external links -->
      <div
        v-if="hasExternalLink || book?.id"
        class="mt-2"
      >
        <p class="font-semibold capitalize">{{ t('book.book_id') }} :</p>
        <div class="flex flex-wrap justify-center gap-1 mt-1">
          <span
            v-if="book?.id"
            class="badge badge-ghost"
          >
            {{ book.id }}
          </span>
          <span
            v-if="book?.goodreadsId"
            class="badge badge-warning hover:font-bold"
          >
            <a
              :href="'https://www.goodreads.com/book/show/' + book.goodreadsId"
              target="_blank"
            >goodreads</a>
          </span>
          <span
            v-if="book?.googleId"
            class="badge badge-warning hover:font-bold"
          >
            <a
              :href="'https://books.google.com/books?id=' + book.googleId"
              target="_blank"
            >google</a>
          </span>
          <span
            v-if="book?.amazonId"
            class="badge badge-warning hover:font-bold"
          >
            <a
              :href="'https://www.amazon.com/dp/' + book.amazonId"
              target="_blank"
            >amazon</a>
          </span>
          <span
            v-if="book?.librarythingId"
            class="badge badge-warning hover:font-bold"
          >
            <a
              :href="'https://www.librarything.com/work/' + book.librarythingId"
              target="_blank"
            >librarything</a>
          </span>
          <span
            v-if="book?.isfdbId"
            class="badge badge-warning hover:font-bold"
          >
            <a
              :href="'https://www.isfdb.org/cgi-bin/title.cgi?' + book.isfdbId"
              target="_blank"
            >ISFDB</a>
          </span>
          <span
            v-if="book?.openlibraryId"
            class="badge badge-warning hover:font-bold"
          >
            <a
              :href="`https://openlibrary.org/works/${book.openlibraryId}?mode=all`"
              target="_blank"
            >Openlibrary</a>
          </span>
          <span
            v-if="book?.noosfereId"
            class="badge badge-warning hover:font-bold"
          >
            <a
              :href="'https://www.noosfere.org/livres/EditionsLivre.asp?numitem=' + book.noosfereId"
              target="_blank"
            >Noosfere</a>
          </span>
        </div>
      </div>

      <!-- Back button -->
      <div class="mt-4">
        <button
          class="btn btn-outline"
          @click="router.back()"
        >
          {{ t('labels.back') }}
        </button>
      </div>

      <!-- Reviews section -->
      <div class="space-y-4 mt-6">
        <p
          class="text-2xl capitalize"
          :class="typographyClasses"
        >
          {{ t('reviews.all_reviews') }} ({{ totalReviews }})
        </p>
        <div
          v-for="review in reviews"
          :key="review.id"
          class="w-full"
        >
          <review-card
            v-if="review != null"
            :review="review"
            :show-delete="false"
            :show-edit="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
</style>
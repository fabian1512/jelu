<script setup lang="ts">
import { computed, Ref, ref, watch } from "vue";
import { useI18n } from 'vue-i18n';
import { UserBook } from "../../model/Book";
import { ReadingEventType } from "../../model/ReadingEvent";
import { StringUtils } from "../../utils/StringUtils";

const { t } = useI18n({
      inheritLocale: true,
      useScope: 'global'
    })

const props = defineProps<{
  book: UserBook,
  forceSelect: boolean,
  showSelect: boolean,
  proposeAdd: boolean,
  seriesId?: string,
  public: boolean // is it on a public facing page (so hide links etc...)
}>();

const emit = defineEmits<{
  (e: 'update:modalClosed', open: boolean): void,
  (e: 'update:checked', id: string|null, checked: boolean): void
}>()

const checked: Ref<boolean> = ref(false)

watch(() => props.forceSelect, (newVal, oldVal) => {
  checked.value = props.forceSelect
})

const eventClass = computed(() => {
  if (props.book.lastReadingEvent) {
    if (props.book.lastReadingEvent === ReadingEventType.FINISHED) {
      return "badge-info";
    } else if (props.book.lastReadingEvent === ReadingEventType.DROPPED) {
      return "badge-error";
    } else if (
      props.book.lastReadingEvent === ReadingEventType.CURRENTLY_READING
    ) {
      return "badge-success";
    } else if (
      props.book.lastReadingEvent === ReadingEventType.MARKED_TO_READ
    ) {
      return "badge-info";
    } else if (
      props.book.lastReadingEvent === ReadingEventType.MARKED_OWNED
    ) {
      return "badge-success";
    } else if (
      props.book.lastReadingEvent === ReadingEventType.MARKED_BORROWED
    ) {
      return "badge-warning";
    } else return "";
  }
  return "";
});

const eventText = computed(() => {
  if (props.book.lastReadingEvent) {
    if (props.book.lastReadingEvent === ReadingEventType.CURRENTLY_READING) {
      return t('reading_events.reading');
    } else if (props.book.lastReadingEvent === ReadingEventType.DROPPED) {
      return t('reading_events.dropped');
    } else if (props.book.lastReadingEvent === ReadingEventType.FINISHED) {
      return t('reading_events.finished');
    } else if (props.book.lastReadingEvent === ReadingEventType.MARKED_TO_READ) {
      return t('labels.in_read_list');
    } else if (props.book.lastReadingEvent === ReadingEventType.MARKED_OWNED) {
      return t('book.owned');
    } else if (props.book.lastReadingEvent === ReadingEventType.MARKED_BORROWED) {
      return t('book.borrowed');
    }
  }
  return "";
});

const authorsText = computed(() => {
  let txt = "";
  if (props.book.book.authors && props.book.book.authors.length > 0) {
    let first = true;
    for (let author of props.book.book.authors) {
      if (first) {
        txt += "";
        first = false;
      } else {
        txt += ", ";
      }
      txt += author.name;
    }
  }
  return txt;
});

const showProgressBar = (book: UserBook) => {
  return book.percentRead
      && book.percentRead > 0
      && book.lastReadingEvent != null
      && book.lastReadingEvent === ReadingEventType.CURRENTLY_READING
}

const progressBarTooltip = computed(() => {
  return props.book.currentPageNumber != null ? `p. ${props.book.currentPageNumber}` : `${props.book.percentRead} %`
})

const cardImageUrl = computed(() => {
  return StringUtils.thumbnailUrl(props.book.book.image, "card") ?? "/files/" + props.book.book.image
})

const thumbImageUrl = computed(() => {
  return StringUtils.thumbnailUrl(props.book.book.image, "thumb") ?? "/files/" + props.book.book.image
})

const currentSeries = computed(() => {
  if (props.book.book.series != null &&      props.book.book.series?.length > 0) {
    if (props.seriesId != null) {
      return props.book.book.series?.find(s => s.seriesId === props.seriesId)
    } else {
      return props.book.book.series[0]
    }
  }
  return null
})

watch(checked, (newVal, oldVal) => {
  emit("update:checked", props.book.id != null ? props.book.id as string : props.book.book.id as string , checked.value)
})

const bookRoute = computed(() => {
  return { name: 'book-detail', params: { bookId: props.book.id ?? props.book.book.id } }
})

</script>

<template>
  <!-- MOBILE: compact horizontal -->
  <div
    class="sm:hidden"
  >
    <div
    class="flex flex-row bg-base-100 shadow-md rounded-box w-full"
    style="height: 144px; min-height: 144px; max-height: 144px"
  >
    <router-link :to="bookRoute" class="shrink-0">
      <figure class="w-24 h-full">
        <img
          v-if="book.book.image"
          :src="thumbImageUrl + (book.book.modificationDate ? '?v=' + book.book.modificationDate : '')"
          alt="cover image"
          loading="lazy"
          decoding="async"
          class="object-cover aspect-[2/3] w-full h-full"
        >
        <img
          v-else
          src="../../assets/placeholder_asset.jpg"
          alt="cover placeholder"
          loading="lazy"
          decoding="async"
          class="object-cover aspect-[2/3] w-full h-full"
        >
        <div
          v-if="showProgressBar(book)"
          v-tooltip="progressBarTooltip"
          class="bg-success absolute bottom-0 left-0 h-1"
          :style="{ width: book.percentRead + '%' }"
        />
      </figure>
    </router-link>
    <div class="flex flex-col justify-between gap-1 px-3 py-2 min-w-0 flex-1 text-left">
      <router-link :to="bookRoute">
        <h2 v-tooltip="book.book.title" class="text-sm font-bold line-clamp-2 hover:link">
          {{ book.book.title }}
        </h2>
      </router-link>
      <p v-if="book.book.authors != null && book.book.authors.length > 0" class="text-xs opacity-70 line-clamp-1">
        <span v-for="author in book.book.authors.slice(0,2)" :key="author.id">
          <router-link v-if="!public" class="link link-hover" :to="{ name: 'author-detail', params: { authorId: author.id } }">{{ author.name }}</router-link>
          <span v-else>{{ author.name }}</span>
          <span>,&nbsp;</span>
        </span>
        <span v-if="book.book.authors.length > 2" v-tooltip="authorsText">&#8230;</span>
      </p>
      <div class="flex items-center gap-1 flex-wrap">
        <span v-if="book.lastReadingEvent" :class="eventClass" class="badge badge-sm">{{ eventText }}</span>
        <router-link v-if="currentSeries != null && !props.public" v-tooltip="currentSeries.name" class="badge badge-sm" :to="{ name: 'series', params: { seriesId: currentSeries.seriesId } }">#{{ currentSeries.numberInSeries }}</router-link>
        <span v-if="book.userAvgRating" class="text-xs text-info flex items-center gap-0.5"><i class="mdi mdi-star mdi-18px" />{{ book.userAvgRating }}</span>
        <span v-if="book.owned" v-tooltip="t('book.owned')" class="icon text-info"><i class="mdi mdi-bookshelf mdi-18px" /></span>
        <span v-if="book.toRead" v-tooltip="t('book.in_read_list')" class="icon text-info"><i class="mdi mdi-eye mdi-18px" /></span>
        <router-link v-if="proposeAdd === true && book.id == null" v-tooltip="t('labels.book_not_yet_in_books')" class="icon text-error" :to="bookRoute"><i class="mdi mdi-plus-circle mdi-18px" /></router-link>
        <slot name="icon" />
        <slot name="date" />
      </div>
    </div>
  </div>
  </div>

  <!-- DESKTOP/TABLET: unveränderte Original-Karte aus Commit 36d1cd2 -->
  <div class="hidden sm:block h-full">
    <div
    class="card card-sm bg-base-100 shadow-2xl shadow-base-300 max-w-56 h-full"
  >
    <div>
      <router-link
        :to="{ name: 'book-detail', params: { bookId: book.id ?? book.book.id } }"
      >
        <figure>
           <img
             v-if="book.book.image"
             :src="cardImageUrl + (book.book.modificationDate ? '?v=' + book.book.modificationDate : '')"
             alt="cover image"
             loading="lazy"
             decoding="async"
             class="object-cover aspect-[2/3] w-full"
           >
           <img
             v-else
             src="../../assets/placeholder_asset.jpg"
             alt="cover placeholder"
             loading="lazy"
             decoding="async"
             class="object-cover aspect-[2/3] w-full"
           >
        </figure>
      </router-link>
      <div
        v-if="showProgressBar(book)"
        v-tooltip="progressBarTooltip"
        class="bg-success absolute h-1.5"
        :style="{ width: book.percentRead + '%' }"
      />
      <div
        v-if="props.showSelect"
        class="absolute top-0 left-1"
      >
        <input
          v-model="checked"
          type="checkbox"
          class="checkbox checkbox-accent rounded-full border-2 hover:border-4"
        >
      </div>
    </div>
    <div class="card-body">
      <router-link
        class="grow"
        :to="{ name: 'book-detail', params: { bookId: book.id ?? book.book.id } }"
      >
        <h2
          v-tooltip="book.book.title"
          class="card-title text-base max-h-11 line-clamp-2 hover:link"
        >
          {{ book.book.title }}
        </h2>
      </router-link>
      <div v-if="book.book.authors != null && book.book.authors.length > 0">
        <span
          v-for="author in book.book.authors.slice(0,3)"
          :key="author.id"
        >
          <router-link
            v-if="!public"
            class="link hover:underline hover:decoration-4 hover:decoration-secondary line-clamp-2 inline-block"
            :to="{ name: 'author-detail', params: { authorId: author.id } }"
          >
            {{ author.name }}
          </router-link>
          <span v-else>{{ author.name }}</span>
          <span>&nbsp;</span>
        </span>
        <span
          v-if="book.book.authors.length > 3"
          v-tooltip="authorsText"
        >&#8230;</span>
      </div>
      <div class="card-actions justify-end items-center gap-1">
        <span
          v-if="book.lastReadingEvent"
          :class="eventClass"
          class="badge truncate max-w-full"
        >{{ eventText }}</span>
        <div class="flex items-center gap-1">
          <router-link
            v-if="currentSeries != null && ! props.public"
            v-tooltip="currentSeries.name"
            class="badge mx-1"
            :to="{ name: 'series', params: { seriesId: currentSeries.seriesId } }"
          >
            #{{ currentSeries.numberInSeries }}
          </router-link>
          <span v-if="currentSeries != null && props.public">#{{ currentSeries.numberInSeries }}</span>
          <span
            v-if="book.userAvgRating"
            v-tooltip="t('labels.user_avg_rating', {rating : book.userAvgRating})"
            class="icon text-info"
          >
            <i class="mdi mdi-star mdi-18px" />
            {{ book.userAvgRating }}
          </span>
          <span
            v-if="book.avgRating"
            v-tooltip="t('labels.avg_rating', {rating : book.avgRating})"
            class="icon text-info"
          >
            <i class="mdi mdi-star-outline mdi-18px" />
            {{ book.avgRating }}
          </span>
          <span
            v-if="book.owned"
            v-tooltip="t('book.owned')"
            class="icon text-info"
          >
            <i class="mdi mdi-bookshelf mdi-18px" />
          </span>
          <span
            v-if="book.toRead"
            v-tooltip="t('book.in_read_list')"
            class="icon text-info"
          >
            <i class="mdi mdi-eye mdi-18px" />
          </span>
          <router-link
            v-if="proposeAdd === true && book.id == null"
            v-tooltip="t('labels.book_not_yet_in_books')"
            class="icon text-error"
            :to="{ name: 'book-detail', params: { bookId: book.book.id } }"
          >
            <i class="mdi mdi-plus-circle mdi-18px" />
          </router-link>
          <slot name="icon" />
          <slot name="date" />
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<style lang="scss" scoped>

</style>

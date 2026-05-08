<script setup lang="ts">
import { useOruga } from "@oruga-ui/oruga-next"
import { until, useClipboard, useLocalStorage, usePermission, useTitle } from '@vueuse/core'
import dayjs from 'dayjs'
import { computed, ComputedRef, Ref, ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import useDates from '../../composables/dates'
import { Book, UserBook } from '../../model/Book'
import { BookQuote } from "../../model/BookQuote"
import { Metadata } from "../../model/Metadata"
import { CreateReadingEvent, ReadingEvent, ReadingEventType } from '../../model/ReadingEvent'
import { Review } from '../../model/Review'
import { Series } from '../../model/Series'
import { User } from '../../model/User'
import dataService from "../../services/DataService"
import { key } from '../../store'
import { ObjectUtils } from '../../utils/ObjectUtils'
import AutoImportFormModalVue from '../Admin/AutoImportFormModal.vue'
import BookQuoteCard from '../Global/BookQuoteCard.vue'
import BookQuoteModalVue from './BookQuoteModal.vue'
import MergeBookModal from './MergeBookModal.vue'
import ReadingEventModalVue from '../Misc/ReadingEventModal.vue'
import ReadProgressModal from './ReadProgressModal.vue'
import ReviewModalVue from '../Review/ReviewModal.vue'
import ReviewCard from '../Global/ReviewCard.vue'
import EditBookModal from './EditBookModal.vue'
import useTypography from "../../composables/typography"

const { t, d } = useI18n({
      inheritLocale: true,
      useScope: 'global'
    })

const { isSupported, copy } = useClipboard()
usePermission('clipboard-read')
usePermission('clipboard-write')

const props = defineProps<{ bookId: string }>()

const store = useStore(key)
const router = useRouter()
const oruga = useOruga();

const { stringToDate } = useDates()

const isAdmin = computed(() => {
  return store !== undefined && store.getters.isAdmin
})
const user: ComputedRef<User> = computed(() => {
  return store !== undefined && store.getters.getUser
})

let currency = localStorage.getItem("JL_CURRENCY")
if (currency == null) {
  currency = "EUR"
}

const book: Ref<UserBook | null> = ref(null)
const edit: Ref<boolean> = ref(false)
const showModal: Ref<boolean> = ref(false)

const getBookIsLoading: Ref<boolean> = ref(false)
const summaryExpanded: Ref<boolean> = ref(false)
const showBookMenu: Ref<boolean> = ref(false)

const closeBookMenu = (event: MouseEvent) => {
  const target = event.target as Node
  const menuEl = document.querySelector('.book-menu-dropdown')
  const triggerEl = document.querySelector('.book-menu-trigger')
  if (showBookMenu.value && menuEl && !menuEl.contains(target) && !triggerEl?.contains(target)) {
    showBookMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeBookMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeBookMenu)
})

const displaySummary = computed(() => {
  const text = book.value?.book?.summary || ''
  if (!text) return ''
  const plainText = text.replace(/<[^>]*>/g, '')
  if (plainText.length <= 300 || summaryExpanded.value) return text
  return plainText.substring(0, 300) + '...'
})

const needsReadMore = computed(() => {
  const plainText = (book.value?.book?.summary || '').replace(/<[^>]*>/g, '')
  return plainText.length > 300
})

const userReviews: Ref<Array<Review>> = ref([])

const bookQuotes: Ref<Array<BookQuote>> = ref([])

const getBook = async () => {
  try {
    getBookIsLoading.value = true
    try {
      book.value = await dataService.getUserBookById(props.bookId)
    } catch {
      book.value = await dataService.getBookAsUserBook(props.bookId)
    }
    getBookIsLoading.value = false
    useTitle('Jelu | ' + book.value.book.title)
    if (book.value.id != null) {
      getUserReviewsForBook()
      getBookQuotesForBook()
      getAllSeriesInfo()
    }
  } catch (error) {
    getBookIsLoading.value = false
  }
};

const getAllSeriesInfo = async () => {
  book.value?.book.series?.forEach(s => {
    fetchSeries(s.seriesId as string)
  })
}

const getUserReviewsForBook = async() => {
  await until(user.value).not.toBeNull()
  dataService.findReviews(user.value.id, book.value?.book.id, null, null, null, 0, 20)
  .then(res => {
    userReviews.value = res.content
  })
  .catch(err => {
  })
}

const getBookQuotesForBook = async() => {
  await until(user.value).not.toBeNull()
  dataService.findBookQuotes(user.value.id, book.value?.book.id, null, 0, 20)
  .then(res => {
    bookQuotes.value = res.content
  })
  .catch(err => {
  })
}

watch(() => props.bookId, (newValue, oldValue) => {
})

const sortedEvents = computed(() => {
  if (book.value && book.value.readingEvents) {
    return [...book.value.readingEvents].sort((a, b) => dayjs(a.startDate).isAfter(dayjs(b.startDate)) ? -1 : 1)
  }
  else {
    return []
  }
}
)

const hasExternalLink = computed(() => book.value?.book.amazonId != null
  || book.value?.book.goodreadsId != null
  || book.value?.book.googleId != null
  || book.value?.book.librarythingId != null
  || book.value?.book.openlibraryId != null
  || book.value?.book.isfdbId != null
  || book.value?.book.noosfereId != null
  || book.value?.book.inventaireId != null)

function modalClosed() {
  setTimeout(() => getBook(), 100)
}

function reviewModalClosed() {
  getUserReviewsForBook()
}

function bookQuoteModalClosed() {
    getBookQuotesForBook()
}

const toggleEdit = () => {
  edit.value = !edit.value
  oruga.modal.open({
    parent: this,
    component: EditBookModal,
    trapFocus: true,
    active: true,
    cancelable: ['outside'],
    scroll: 'clip',
    props: {
      "book": book.value
    },
    onClose: modalClosed
  });
}

const dropdownTrigger = ref<HTMLElement | null>(null)

const toggleDropdown = () => {
  const label = document.getElementById('book-detail-dropdown')?.querySelector('label')
  if (label) {
    (label as HTMLElement).click()
  }
}

function toggleReadingEventModal(currentEvent: ReadingEvent, edit: boolean) {
  showModal.value = !showModal.value
  oruga.modal.open({
    component: ReadingEventModalVue,
    trapFocus: true,
    active: true,
    cancelable: ['outside'],
    scroll: 'keep',
    props: {
      "readingEvent": currentEvent,
      "edit": edit,
      "userBookId": book.value?.id,
      "pageCount": book.value?.book?.pageCount,
      "currentProgress": book.value?.percentRead,
      "currentPage": book.value?.currentPageNumber
    },
    onClose: modalClosed
  });
}

function toggleReviewModal(currentBook: Book|undefined, edit: boolean, review: Review|null) {
  if (currentBook != null && currentBook != undefined) {
    oruga.modal.open({
      component: ReviewModalVue,
      trapFocus: true,
      active: true,
      cancelable: ['outside'],
      scroll: 'keep',
      props: {
        "book": currentBook,
        "edit" : edit,
        "review": review
      },
      onClose: reviewModalClosed
    });
  }
}

function toggleBookQuoteModal(currentBook: Book|undefined, edit: boolean, bookQuote: BookQuote|null) {
  if (currentBook != null && currentBook != undefined) {
    oruga.modal.open({
      component: BookQuoteModalVue,
      trapFocus: true,
      active: true,
      cancelable: ['outside'],
      scroll: 'keep',
      props: {
        "book": currentBook,
        "edit" : edit,
        "bookQuote": bookQuote
      },
      onClose: bookQuoteModalClosed
    });
  }
}

const toggleFetchMetadataModal = (currentBook: Book|undefined) => {
  oruga.modal.open({
    parent: this,
    component: AutoImportFormModalVue,
    trapFocus: true,
    active: true,
    cancelable: ['outside'],
    scroll: 'keep',
    props: {
        "book": currentBook,
      },
    events: {
      metadataReceived: (modalMetadata: Metadata) => {
        toggleMergeBookModal(currentBook, modalMetadata)
      }
    },
    onClose: modalClosed
  });
}

const toggleMergeBookModal = (currentBook: Book|undefined, metadata: Metadata) => {
  oruga.modal.open({
    parent: this,
    component: MergeBookModal,
    trapFocus: true,
    active: true,
    cancelable: ['outside'],
    scroll: 'keep',
    props: {
        "book": currentBook,
        "metadata": metadata
      },
    onClose: modalClosed
  });
}

const toggleReadProgressModal = (userBookId: string, pageCount: number|null, currentProgress: number|null, currentPage: number|null) => {
  oruga.modal.open({
    component: ReadProgressModal,
    trapFocus: true,
    active: true,
    cancelable: ['outside'],
    scroll: 'keep',
    props: {
      "userBookId": userBookId,
      "pageCount": pageCount,
      "currentProgress": currentProgress,
      "currentPage": currentPage,
    },
    onClose: modalClosed
  });
}

const deleteBook = async () => {
  let deleteForUserOnly = true
  let abort = false
  if (isAdmin.value === true) {
    await ObjectUtils.swalMixin.fire({
      html: `<p>${t('labels.delete_for_all_or_only_you')}</p>`,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: t('labels.only_me'),
      denyButtonText: t('labels.all_users'),
      cancelButtonText: t('labels.dont_delete'),
    }).then((result) => {
      if (result.isDenied) {
        deleteForUserOnly = false
      } else if (result.isDismissed) {
        abort = true
        return;
      }
    })
  }
  else {
    await ObjectUtils.swalYesNoMixin.fire({
      html: `<p>${t('labels.delete_this_book')}</p>`,
      showCancelButton: true,
      showConfirmButton: true,
      showDenyButton: false,
      confirmButtonText: t('labels.delete'),
      cancelButtonText: t('labels.dont_delete'),
    }).then((result) => {
      if (result.isDismissed) {
        abort = true
        return;
      }
    })
  }
  if (abort) {
    return
  }
  let promise
  if (deleteForUserOnly) {
    if (book.value?.id) {
      promise = dataService.deleteUserBook(book.value?.id)
    }
  }
  else {
    if (book.value?.book?.id) {
      promise = dataService.deleteBook(book.value?.book?.id)
    }
  }
  promise?.then(res => {
    ObjectUtils.toast(oruga, "success", t('labels.book_was_deleted'), 4000);
    router.push({ name: 'home' })
  })
    .catch(err => {
      ObjectUtils.toast(oruga, "danger", t('labels.error_deleting', {msg : err.message}), 4000);
    })
}

const eventClass = (event: ReadingEvent) => {
  if (event.eventType === ReadingEventType.FINISHED) {
    return "bg-info";
  } else if (event.eventType === ReadingEventType.DROPPED) {
    return "bg-error";
  } else if (
    event.eventType === ReadingEventType.CURRENTLY_READING
  ) {
    return "bg-success";
  } else if (event.eventType === ReadingEventType.MARKED_OWNED) {
    return "bg-accent";
  } else if (event.eventType === ReadingEventType.MARKED_TO_READ) {
    return "bg-warning";
  } else if (event.eventType === ReadingEventType.MARKED_BORROWED) {
    return "bg-secondary";
  }
  else return "";
};

const iconClass = (event: ReadingEvent) => {
  if (event.eventType === ReadingEventType.FINISHED) {
    return "mdi-checkbox-marked-circle";
  } else if (event.eventType === ReadingEventType.DROPPED) {
    return "mdi-close-octagon";
  } else if (
    event.eventType === ReadingEventType.CURRENTLY_READING
  ) {
    return "mdi-book-open-page-variant";
  } else if (event.eventType === ReadingEventType.MARKED_OWNED) {
    return "mdi-bookshelf";
  } else if (event.eventType === ReadingEventType.MARKED_BORROWED) {
    return "mdi-handshake";
  }
  else return "";
};

const eventLabel = (type: ReadingEventType) => {
    if (type === ReadingEventType.FINISHED) {
      return t('reading_events.finished');
    } else if (type === ReadingEventType.DROPPED) {
      return t('reading_events.dropped');
    } else if (type === ReadingEventType.CURRENTLY_READING) {
      return t('reading_events.reading');
    } else if (type === ReadingEventType.MARKED_OWNED) {
      return t('book.owned');
    } else if (type === ReadingEventType.MARKED_TO_READ) {
      return t('book.in_read_list');
    } else if (type === ReadingEventType.MARKED_BORROWED) {
      return t('book.borrowed');
    } else return "";
};

function defaultCreateEvent(): CreateReadingEvent {
  return {
    eventType: ReadingEventType.CURRENTLY_READING,
    eventDate: new Date(),
    startDate: new Date(),
    bookId: book.value?.book.id
  }
}

const publisherQuery = computed(() => {
  if (book.value?.book.publisher) {
    return "\"" + book.value.book.publisher + "\""
  }
  return ""
})

const embedCode = computed(() => {
  if (book.value) {
    return generateEmbed(book.value)
  }
  return ''
})

function generateEmbed(book: UserBook) {
  let baseUrl = window.location.origin
  let bookUrl = router.resolve({ name: 'book-detail', params: { bookId: book.id } }).href
  let top = `<div id="embed-body" style="padding: 5px; width: 150px; border: 1px solid #cccccc;}"><div class="embed-element" style="overflow: hidden;list-style: none; text-align: center; padding: 5px; margin: 0px;">`
  if (book.book.image != null) {
     let couv = `<div class="embed-cover"> <a href="${baseUrl}${bookUrl}" target="_blank"><img src="${baseUrl}/files/${book.book.image}" title="${book.book.title}" alt="${book.book.title}" loading="lazy" decoding="async" style="border: 1px solid #cccccc;border-width:1px; padding: 3px; background-color: #fff;width:80px;"></a></div>`
     top = top.concat(couv)
   }
  let body = `<div class="embed-book" style="margin: 0px 3px 5px 5px;font-size: 13px;font-family:sans-serif; font-weight : bold;"><a href="${baseUrl}${bookUrl}" target="_blank" style="text-decoration:none;">${book.book.title}</a></div>`
  top = top.concat(body)
  if (book.book.authors != undefined && book.book.authors?.length > 0) {
      let firstAuthor = book?.book.authors[0]
      let authorId = firstAuthor.id
      let rout = router.resolve({ name: 'author-detail', params: { authorId: authorId } }).href
  let authorPart = `<div class="embed-author" style="margin: 0px 3px 5px 5px;font-size: 12px;color: gray;"><a href="${baseUrl}${rout}" target="_blank" style="text-decoration:none;">${firstAuthor.name}</a></div>`
      top = top.concat(authorPart)
    }
  let bottom = `<div class="embed-tail" style="clear:both;"></div></div></div>`
  top = top.concat(bottom)
  return top
}

function copyToClipboard(content: string) {
  copy(content)
  ObjectUtils.toast(oruga, "success", t('labels.saved'), 1000)

}

const deleteReview = async (reviewId: string) => {
  let abort = false
  await ObjectUtils.swalYesNoMixin.fire({
      html: `<p>${t('reviews.delete_review')}</p>`,
      showCancelButton: true,
      showConfirmButton: true,
      showDenyButton: false,
      confirmButtonText: t('labels.delete'),
      cancelButtonText: t('labels.dont_delete'),
      denyButtonText: t('labels.delete'),
    }).then((result) => {
      if (result.isDismissed) {
        abort = true
        return;
      }
    })
    if (abort) {
      return
    }
    dataService.deleteReview(reviewId)
    .then(res => {
      getUserReviewsForBook()
    })
    .catch(err => {
    })
}

const deleteBookQuote = async (bookQuoteId: string) => {
  let abort = false
  await ObjectUtils.swalYesNoMixin.fire({
      html: `<p>${t('book_quotes.delete_quote')}</p>`,
      showCancelButton: true,
      showConfirmButton: true,
      showDenyButton: false,
      confirmButtonText: t('labels.delete'),
      cancelButtonText: t('labels.dont_delete'),
      denyButtonText: t('labels.delete'),
    }).then((result) => {
      if (result.isDismissed) {
        abort = true
        return;
      }
    })
    if (abort) {
      return
    }
    dataService.deleteBookQuote(bookQuoteId)
    .then(res => {
      getBookQuotesForBook()
    })
    .catch(err => {
    })
}

const seriesmap: Map<string, Series> = new Map()

const fetchSeries = async (seriesId: string) => {
  dataService.getSeriesById(seriesId)
    .then(data => {
        seriesmap.set(seriesId, data)
    })
    .catch(e => {
    })
}

const getSeriesInfo = async (seriesId: string) => {
    if (seriesmap.get(seriesId) != null) {
        const s = seriesmap.get(seriesId)
        return await formatSeries(s as Series)
    }
    dataService.getSeriesById(seriesId)
    .then(data => {
        seriesmap.set(seriesId, data)
        return formatSeries(data)
    })
    .catch(e => {
        return "error"
    })
}

const formatSeries = async (series: Series)  => {
    let txt = ""
    if (series.description != null && series.description.length > 0) {
        txt += series.description.substring(0, 40)
        txt += " | "
    }
    if (series.avgRating != null) {
        txt += "avg : "
        txt += series.avgRating
        txt += " "
    }
    if (series.userRating != null) {
        txt += "me : "
        txt += series.userRating
    }
    if (txt.trim().length < 1) {
      return 'no data'
    }
    return txt
}

// No cache-busting query params for cover images.
// When covers change, the filename is expected to change as well.

const getIsbn = (): string|null => {
  if (book.value?.book.isbn13 && book.value.book.isbn13.length > 0) {
    return book.value.book.isbn13.replaceAll("-", "")
  }
  if (book.value?.book.isbn10 && book.value.book.isbn10.length > 0) {
    return book.value.book.isbn10.replaceAll("-", "")
  }
  return null
}

const storedLanguage = useLocalStorage("jelu_language", "en")

const { typographyClasses } = useTypography()

getBook()

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
            v-if="book?.book?.image"
            :src="'/files/' + book.book.image + (book.book.modificationDate ? '?v=' + book.book.modificationDate : '')"
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
          >
          <button @click="toggleEdit" class="absolute top-2 right-2 btn btn-x btn-circle btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            v-tooltip="t('labels.more_options')"
            class="absolute bottom-2 right-2 btn btn-x btn-circle btn-primary book-menu-trigger"
            @click="showBookMenu = !showBookMenu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
          </button>
          <div v-if="showBookMenu" class="absolute bottom-8 right-2 z-50 book-menu-dropdown">
            <ul class="menu p-2 shadow-sm bg-base-100 rounded-box w-52 border border-base-300">
              <li>
                <button @click="toggleReviewModal(book?.book, false, null); showBookMenu = false">
                  {{ t('reviews.create_review') }}
                </button>
              </li>
              <li>
                <button @click="toggleReadProgressModal(book?.id ?? '', book?.book.pageCount ?? null, book?.percentRead ?? null, book?.currentPageNumber ?? null); showBookMenu = false">
                  {{ t('labels.set_progress') }}
                </button>
              </li>
              <li>
                <button @click="toggleBookQuoteModal(book?.book, false, null); showBookMenu = false">
                  {{ t('labels.add_quote') }}
                </button>
              </li>
              <li>
                <label :for="'my-modal-4'" class="btn btn-circle btn-outline border-none" @click="showBookMenu = false">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                  </svg>
                </label>
              </li>
            </ul>
          </div>
        </figure>
      </div>
      <div class="text-left">
        <h3
          class="text-xl sm:text-2xl md:text-3xl"
          :class="typographyClasses"
        >
          {{ book?.book?.title }}
        </h3>
        <h4
          v-if="book?.book.originalTitle"
          :class="typographyClasses"
        >
          {{ book.book.originalTitle }}
        </h4>
        <p
          v-if="book != null && book.book != null && book.book.authors != null && book?.book?.authors?.length > 0"
        >
          <span class="font-semibold capitalize">{{ t('book.author', 2) }} :</span>
        </p>
        <ul
          v-if="book != null && book.book != null && book.book.authors != null && book?.book?.authors?.length > 0"
        >
          <li
            v-for="author in book?.book?.authors"
            :key="author.id"
          >
            <router-link
              class="link hover:underline hover:decoration-4 hover:decoration-secondary"
              :to="{ name: 'author-detail', params: { authorId: author.id } }"
            >
              {{ author.name }}&nbsp;
            </router-link>
          </li>
        </ul>
        <p
          v-if="book != null && book.book != null && book.book.translators != null && book?.book?.translators?.length > 0"
        >
          <span class="font-semibold capitalize">{{ t('book.translator', 2) }} :</span>
        </p>
        <ul
          v-if="book != null && book.book != null && book.book.translators != null && book?.book?.translators?.length > 0"
        >
          <li
            v-for="translator in book?.book?.translators"
            :key="translator.id"
          >
            <router-link
              class="link hover:underline hover:decoration-4 hover:decoration-secondary"
              :to="{ name: 'author-detail', params: { authorId: translator.id } }"
            >
              {{ translator.name }}&nbsp;
            </router-link>
          </li>
        </ul>
        <p
          v-if="book != null && book.book != null && book.book.narrators != null && book?.book?.narrators?.length > 0"
        >
          <span class="font-semibold capitalize">{{ t('book.narrator', 2) }} :</span>
        </p>
        <ul
          v-if="book != null && book.book != null && book.book.narrators != null && book?.book?.narrators?.length > 0"
        >
          <li
            v-for="narrator in book?.book?.narrators"
            :key="narrator.id"
          >
            <router-link
              class="link hover:underline hover:decoration-4 hover:decoration-secondary"
              :to="{ name: 'author-detail', params: { authorId: narrator.id } }"
            >
              {{ narrator.name }}&nbsp;
            </router-link>
          </li>
        </ul>
        <p v-if="book?.book?.publisher">
          <span class="font-semibold capitalize">{{ t('book.publisher') }} :&nbsp;</span>
          <router-link
            class="link hover:underline hover:decoration-4 hover:decoration-secondary"
            :to="{ name: 'search', query: { q: `publisher:` + publisherQuery } }"
          >
            {{ book.book.publisher }}
          </router-link>
        </p>
        <p v-if="book?.book?.isbn10">
          <span class="font-semibold uppercase">{{ t('book.isbn10') }} :</span>
          {{ book.book.isbn10 }}
        </p>
        <p v-if="book?.book?.isbn13">
          <span class="font-semibold uppercase">{{ t('book.isbn13') }} :</span>
          {{ book.book.isbn13 }}
        </p>
        <p v-if="book?.book?.pageCount || book?.currentPageNumber">
          <span v-if="book?.book?.pageCount">
            <span class="font-semibold capitalize">{{ t('book.page', 2) }} :</span>
            {{ book.book.pageCount }}
          </span>
          <span v-if="book?.currentPageNumber">&nbsp;(<span class="font-semibold capitalize">{{ t('labels.current') }}</span> : {{ book.currentPageNumber }})</span>
        </p>
        <p
          v-if="book?.book.pageCount == null && book?.currentPageNumber == null && book?.percentRead != null"
          class="capitalize"
        >
          {{ t('book.percent_read') }} {{ book.percentRead }} %
        </p>
        <p v-if="book?.book?.publishedDate">
          <span class="font-semibold capitalize">{{ t('book.published_date') }} :</span>
          {{ d(stringToDate(book.book.publishedDate) ?? '', 'short') }}
        </p>
        <p v-if="book?.book?.series && book?.book?.series != null && book?.book?.series.length > 0">
          <span class="font-semibold capitalize">{{ t('book.series') }} :&nbsp;</span>
          <ul>
            <li
              v-for="seriesItem in book?.book?.series"
              :key="seriesItem.seriesId"
              v-tooltip="{
                content: () => getSeriesInfo(seriesItem.seriesId as string)
              }"
            >
              <router-link
                class="link hover:underline hover:decoration-4 hover:decoration-secondary"
                :to="{ name: 'series', params: { seriesId: seriesItem.seriesId } }"
              >
                {{ seriesItem.name }}&nbsp;
                <span
                  v-if="seriesItem.numberInSeries"
                >-&nbsp;{{ seriesItem.numberInSeries }}</span>
              </router-link>
            </li>
          </ul>
        </p>
        <p v-if="book?.book?.language">
          <span class="font-semibold capitalize">{{ t('book.language') }} :</span>
          {{ book.book.language }}
        </p>
        <p v-if="book?.price">
          <span class="font-semibold capitalize">{{ t('book.price') }} :</span>
          {{ ObjectUtils.amountInLocale(book.price, storedLanguage, currency) }}
        </p>
        <div v-if="book?.owned || book?.toRead || book?.borrowed">
          <span
            v-if="book?.owned"
            class="badge badge-accent"
          >{{ t('book.owned') }}</span>
          <span
            v-if="book?.toRead"
            class="badge badge-warning mx-1"
          >{{ t('book.to_read') }}</span>
          <span
            v-if="book?.borrowed"
            class="badge badge-secondary"
          >{{ t('book.borrowed') }}</span>
        </div>
      </div>
    </div>
    <div
      v-if="book?.book?.summary"
      class="card bg-base-100 shadow-md p-2.5"
    >
      <p class="font-semibold capitalize">
        {{ t('book.summary') }} :
      </p>
      <p v-html="displaySummary" />
      <button
        v-if="needsReadMore"
        class="link link-primary text-sm mt-1"
        @click="summaryExpanded = !summaryExpanded"
      >
        {{ summaryExpanded ? t('labels.read_less') : t('labels.read_more') }}
      </button>
    </div>
    <div class="flex flex-wrap justify-center gap-1 mt-2">
      <span
        v-for="tag in book?.book?.tags"
        :key="tag.id"
        class="badge badge-primary mt-3 m-1 hover:font-bold hover:border-4"
      >
        <router-link :to="{ name: 'tag-detail', params: { tagId: tag.id } }">{{ tag.name }}&nbsp;</router-link>
      </span>
    </div>
    <div
      v-if="hasExternalLink"
      class="flex flex-wrap justify-center gap-1 mt-2"
    >
      <span
        v-if="book?.book.goodreadsId"
        class="badge badge-warning hover:font-bold"
      >
        <a
          :href="'https://www.goodreads.com/book/show/' + book.book.goodreadsId"
          target="_blank"
        >goodreads</a>
      </span>
      <span
        v-if="book?.book.googleId"
        class="badge badge-warning hover:font-bold"
      >
        <a
          :href="'https://books.google.com/books?id=' + book.book.googleId"
          target="_blank"
        >google</a>
      </span>
      <span
        v-if="book?.book.amazonId"
        class="badge badge-warning hover:font-bold"
      >
        <a
          :href="'https://www.amazon.com/dp/' + book.book.amazonId"
          target="_blank"
        >amazon</a>
      </span>
      <span
        v-if="book?.book.librarythingId"
        class="badge badge-warning hover:font-bold"
      >
        <a
          :href="'https://www.librarything.com/work/' + book.book.librarythingId"
          target="_blank"
        >librarything</a>
      </span>
      <span
        v-if="book?.book.isfdbId"
        class="badge badge-warning hover:font-bold"
      >
        <a
          :href="'https://www.isfdb.org/cgi-bin/title.cgi?' + book.book.isfdbId"
          target="_blank"
        >ISFDB</a>
      </span>
      <span
        v-if="book?.book.openlibraryId"
        class="badge badge-warning hover:font-bold"
      >
        <a
          :href="`https://openlibrary.org/works/${book.book.openlibraryId}?mode=all`"
          target="_blank"
        >Openlibrary</a>
      </span>
      <span
        v-if="book?.book.noosfereId"
        class="badge badge-warning hover:font-bold"
      >
        <a
          :href="'https://www.noosfere.org/livres/EditionsLivre.asp?numitem=' + book.book.noosfereId"
          target="_blank"
        >Noosfere</a>
      </span>
      <span
        v-if="getIsbn() != null"
        class="badge badge-warning hover:font-bold"
      >
        <a
          :href="'https://inventaire.io/entity/isbn:' + getIsbn()"
          target="_blank"
        >inventaire</a>
      </span>
      <span
        v-else-if="book?.book.inventaireId"
        class="badge badge-warning hover:font-bold"
      >
        <a
          :href="'https://inventaire.io/entity/inv:' + book.book.inventaireId"
          target="_blank"
        >inventaire</a>
      </span>
    </div>
    <div
      v-if="book?.personalNotes"
      class="mt-4"
    >
      <p
        v-if="book?.personalNotes"
        class="font-semibold capitalize"
      >
        {{ t('book.personal_notes') }} :
      </p>
      <p v-if="book?.personalNotes">
        {{ book.personalNotes }}
      </p>
    </div>
    <div class="mt-2">
      <router-link
        class="link text-2xl"
        :class="typographyClasses"
        :to="{ name: 'book-reviews', params: { bookId: book?.book.id } }"
      >
        {{ t('reviews.all_reviews') }}
      </router-link>
    </div>
    <div
      v-if="userReviews != null && userReviews.length > 0"
      class="space-y-4"
    >
      <p
        class="text-2xl capitalize"
        :class="typographyClasses"
      >
        {{ t('reviews.my_reviews') }} :
      </p>
      <div
        v-for="review in userReviews"
        :key="review.id"
      >
        <review-card
          v-if="review != null"
          :review="review"
          :show-delete="true"
          :show-edit="true"
          @update:delete="deleteReview($event)"
          @update:edit="toggleReviewModal(book?.book, true, review)"
        />
      </div>
    </div>
    <div
      v-if="bookQuotes != null && bookQuotes.length > 0"
      class="space-y-4"
    >
      <router-link
        class="link text-2xl"
        :class="typographyClasses"
        :to="{ name: 'book-quotes', params: { bookId: book?.book.id } }"
      >
        {{ t('book_quotes.quote', 2) }}
      </router-link>
      <div
        v-for="quote in bookQuotes"
        :key="quote.id"
      >
        <book-quote-card
          v-if="quote != null"
          :book-quote="quote"
          :show-delete="true"
          :show-edit="true"
          @update:delete="deleteBookQuote($event)"
          @update:edit="toggleBookQuoteModal(book?.book, true, quote)"
        />
      </div>
    </div>
    <!-- https://tailwindcomponents.com/component/vertical-timeline -->
    <div
      v-if="book?.readingEvents != null && book?.readingEvents?.length > 0"
      class="mt-4"
    >
      <p
        v-if="book?.readingEvents != null && book?.readingEvents?.length > 0"
        class="text-2xl mb-3 capitalize"
        :class="typographyClasses"
      >
        {{ t('reading_events.reading_events') }} :
      </p>
      <div class="grid grid-cols-[1fr_24px_1fr] md:grid-cols-9 mx-auto max-w-full p-2 text-blue-50">
        <div class="col-span-3 md:col-start-5 mb-3 p-2 font-semibold timeline-item capitalize text-center">
          {{ t('reading_events.now') }}
        </div>

        <div
          v-for="(event, index) in sortedEvents"
          :key="event.id"
          class="contents"
        >
          <div
            v-if="index % 2 === 0"
            class="col-start-1 md:col-start-1 md:col-end-5 p-2 my-4 md:ml-auto shadow-md timeline-item"
          >
            <div
              v-if="event.endDate != null"
              class="sm:flex sm:gap-2"
            >
              <h3 class="font-semibold">
                {{ d(event.endDate, 'short') }}
              </h3>
              <p class="capitalize">
                {{ eventLabel(event.eventType) }}&nbsp;-
              </p>
              <h3 class="font-semibold">
                {{ d(event.startDate ?? '', 'short') }}
              </h3>
              <p class="capitalize">
                {{ t('reading_events.started') }}
              </p>
            </div>
            <div v-else>
              <h3 class="font-semibold">
                {{ d(event.startDate ?? '', 'short') }}
              </h3>
              <p class="capitalize">
                {{ eventLabel(event.eventType) }}
              </p>
            </div>
            <button
              class="btn btn-md btn-circle btn-outline mb-0 border-0"
              @click="toggleReadingEventModal(event, true)"
            >
              <i class="mdi mdi-pencil mdi-18px" />
            </button>
          </div>
          <div
            v-if="index % 2 === 0"
            class="col-start-2 md:col-start-5 md:col-end-6 flex flex-col items-center relative"
          >
            <div class="h-full w-6 flex items-center justify-center">
              <div class="h-full w-1 bg-base-content pointer-events-none" />
            </div>
            <div
              v-tooltip="{ content: t('labels.double_click_to_edit'), delay: { show: 5, hide: 2 } }"
              class="w-6 h-6 absolute top-1/2 -mt-3 rounded-full shadow"
              :class="eventClass(event)"
              @dblclick="toggleReadingEventModal(event, true)"
            >
              <i
                class="mdi"
                :class="iconClass(event)"
              />
            </div>
          </div>
          <div
            v-if="index % 2 !== 0"
            class="col-start-2 md:col-start-5 md:col-end-6 flex flex-col items-center relative"
          >
            <div class="h-full w-6 flex items-center justify-center">
              <div class="h-full w-1 bg-base-content pointer-events-none" />
            </div>
            <div
              v-tooltip="{ content: t('labels.double_click_to_edit'), delay: { show: 5, hide: 2 } }"
              class="w-6 h-6 absolute top-1/2 -mt-3 rounded-full shadow"
              :class="eventClass(event)"
              @dblclick="toggleReadingEventModal(event, true)"
            >
              <i
                class="mdi"
                :class="iconClass(event)"
              />
            </div>
          </div>
          <div
            v-if="index % 2 !== 0"
            class="col-start-3 md:col-start-6 md:col-end-10 p-2 my-4 md:mr-auto shadow-md timeline-item"
          >
            <div
              v-if="event.endDate != null"
              class="sm:flex sm:gap-2"
            >
              <h3 class="font-semibold">
                {{ d(event.endDate, 'short') }}
              </h3>
              <p class="capitalize">
                {{ eventLabel(event.eventType) }}&nbsp;-
              </p>
              <h3 class="font-semibold">
                {{ d(event.startDate ?? '', 'short') }}
              </h3>
              <p class="capitalize">
                {{ t('reading_events.started') }}
              </p>
            </div>
            <div v-else>
              <h3 class="font-semibold">
                {{ d(event.startDate ?? '', 'short') }}
              </h3>
              <p class="capitalize">
                {{ eventLabel(event.eventType) }}
              </p>
            </div>
            <button
              class="btn btn-md btn-circle btn-outline mb-0 border-0"
              @click="toggleReadingEventModal(event, true)"
            >
              <i class="mdi mdi-pencil mdi-18px" />
            </button>
          </div>
        </div>
        <div class="col-span-3 md:col-start-5 mt-3 p-2 font-semibold timeline-item capitalize text-center">
          {{ t('reading_events.before') }}
        </div>
      </div>
    </div>
    </div>
  </div>
  <o-loading
    v-model:active="getBookIsLoading"
    :full-page="true"
    :cancelable="true"
  />
  <input
    id="my-modal-4"
    type="checkbox"
    class="modal-toggle"
  >
  <label
    for="my-modal-4"
    class="modal cursor-pointer"
  >
    <label
      class="modal-box relative"
      for=""
    >
      <div class="flex justify-center items-center">
        <h3 class="text-lg font-bold first-letter:capitalize">{{ t('labels.copy_paste_code') }}</h3>
        <button
          v-if="isSupported"
          class="btn btn-outline btn-md btn-circle border-none ml-1"
          @click="copyToClipboard(embedCode)"
        ><svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
          />
        </svg></button>
      </div>
      <div class="py-4 prose overflow-x-auto"><pre><code>{{ embedCode }}</code></pre></div>
      <div class="mt-2 capitalize">{{ t('labels.preview') }} : </div>
      <div
        class="inline-block mt-2"
        v-html="embedCode"
      />
    </label>
  </label>
</template>

<style scoped>

.dropdown-content.menu {
  width: fit-content !important;
  max-width: 90vw !important;
}

</style>

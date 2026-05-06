<script setup lang="ts">
import { Ref, ref, watch, computed } from "vue";
import { CreateReadingEvent, ReadingEvent, ReadingEventType } from "../../model/ReadingEvent";
import { UserBookUpdate } from "../../model/Book";
import dataService from "../../services/DataService";
import { ObjectUtils } from "../../utils/ObjectUtils";
import { useI18n } from 'vue-i18n'
import useTypography from "../../composables/typography";

const { t } = useI18n({
      inheritLocale: true,
      useScope: 'global'
    })

const props = defineProps<{
  readingEvent: ReadingEvent|CreateReadingEvent,
  edit: boolean,
  userBookId?: string,
  pageCount?: number | null,
  currentProgress?: number | null,
  currentPage?: number | null,
}>()

const currentEvent: Ref<ReadingEvent> = ref(props.readingEvent)
const currentCreateEvent: Ref<CreateReadingEvent> = ref(props.readingEvent)

watch(() => currentCreateEvent.value.eventType, (newValue, oldValue) => {
  if (currentCreateEvent.value.eventType == ReadingEventType.CURRENTLY_READING) {
    currentCreateEvent.value.eventDate = undefined
    currentCreateEvent.value.startDate = new Date()
  } else if (
    currentCreateEvent.value.eventType == ReadingEventType.MARKED_OWNED ||
    currentCreateEvent.value.eventType == ReadingEventType.MARKED_TO_READ ||
    currentCreateEvent.value.eventType == ReadingEventType.MARKED_BORROWED
  ) {
    currentCreateEvent.value.eventDate = undefined
    currentCreateEvent.value.startDate = undefined
  } else {
    currentCreateEvent.value.startDate = undefined
    currentCreateEvent.value.eventDate = new Date()
  }
})

// Date conversion computed properties for edit mode
const startDateString = computed({
  get: () => {
    if (!currentEvent.value.startDate) return ''
    const d = new Date(currentEvent.value.startDate)
    return d.toISOString().split('T')[0]
  },
  set: (val: string) => {
    currentEvent.value.startDate = val ? new Date(val + 'T00:00:00') : undefined
  }
})

const endDateString = computed({
  get: () => {
    if (!currentEvent.value.endDate) return ''
    const d = new Date(currentEvent.value.endDate)
    return d.toISOString().split('T')[0]
  },
  set: (val: string) => {
    currentEvent.value.endDate = val ? new Date(val + 'T00:00:00') : undefined
  }
})

// Date conversion computed properties for create mode
const createStartDateString = computed({
  get: () => {
    if (!currentCreateEvent.value.startDate) return ''
    const d = new Date(currentCreateEvent.value.startDate)
    return d.toISOString().split('T')[0]
  },
  set: (val: string) => {
    currentCreateEvent.value.startDate = val ? new Date(val + 'T00:00:00') : undefined
  }
})

const createEventDateString = computed({
  get: () => {
    if (!currentCreateEvent.value.eventDate) return ''
    const d = new Date(currentCreateEvent.value.eventDate)
    return d.toISOString().split('T')[0]
  },
  set: (val: string) => {
    currentCreateEvent.value.eventDate = val ? new Date(val + 'T00:00:00') : undefined
  }
})

const progress: Ref<boolean> = ref(false)

// Progress tracking
const percentRead: Ref<number | null> = ref(props.currentProgress ?? null)
const currentPageNumber: Ref<number | null> = ref(props.currentPage ?? null)

watch([percentRead, currentPageNumber], (newVals, oldVals) => {
  if (props.pageCount != null) {
    ObjectUtils.computePages(newVals, oldVals, { percentRead: percentRead.value, currentPageNumber: currentPageNumber.value } as UserBookUpdate, props.pageCount)
  }
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const create = () => {
  progress.value = true
  dataService.createReadingEvent(currentCreateEvent.value)
    .then(res => {
      // Also save progress if userBookId is provided
      if (props.userBookId && (percentRead.value !== null || currentPageNumber !== null)) {
        const userBookUpdate: UserBookUpdate = {
          id: props.userBookId,
          percentRead: percentRead.value ?? undefined,
          currentPageNumber: currentPageNumber.value ?? undefined
        }
        dataService.updateUserBook(userBookUpdate).catch(e => console.error('Failed to update progress:', e))
      }
      progress.value = false
      emit('close')
    })
    .catch(e => {
      progress.value = false
    })
}

const update = () => {
  progress.value = true
  // if user changed a finished event to a currently reading -> remove end date
  if (currentEvent.value.eventType === ReadingEventType.CURRENTLY_READING) {
    currentEvent.value.endDate = undefined
  }
  dataService.updateReadingEvent(currentEvent.value)
    .then(res => {
      // Also save progress if userBookId is provided
      if (props.userBookId && (percentRead.value !== null || currentPageNumber !== null)) {
        const userBookUpdate: UserBookUpdate = {
          id: props.userBookId,
          percentRead: percentRead.value ?? undefined,
          currentPageNumber: currentPageNumber.value ?? undefined
        }
        dataService.updateUserBook(userBookUpdate).catch(e => console.error('Failed to update progress:', e))
      }
      progress.value = false
      emit('close')
    })
    .catch(e => {
      progress.value = false
    })
}

const deleteEvent = () => {
  if (currentEvent.value.id != null) {
    progress.value = true
    dataService.deleteReadingEvent(currentEvent.value.id)
    .then(res => {
      progress.value = false
      emit('close')
    })
    .catch(e => {
      progress.value = false
    })
  }
}

const { typographyClasses } = useTypography()
</script>

<template>
  <section class="event-modal">
    <div class="flex justify-between items-center mb-4">
      <div></div>
      <h1 v-if="props.edit" class="text-xl first-letter:capitalize" :class="typographyClasses">
        {{ t('reading_events.edit_event') }}
      </h1>
      <h1 v-else class="text-xl first-letter:capitalize" :class="typographyClasses">
        {{ t('reading_events.add_event') }}
      </h1>
      <button @click="emit('close')" class="btn btn-sm btn-circle">✕</button>
    </div>
    <div v-if="props.edit">
      <!-- Ereignis-Typ -->
      <div class="rounded-xl border border-base-300 mb-3">
        <div class="text-xs font-semibold uppercase opacity-60 tracking-wider px-4 py-2 bg-base-200">
          {{ t('reading_events.last_event_type') }}
        </div>
        <div class="bg-base-100 px-4 py-3">
          <div class="flex gap-3 flex-wrap">
            <label class="label cursor-pointer gap-1 mb-0">
              <input
                v-model="currentCreateEvent.eventType"
                type="radio"
                name="radio-event-edit"
                class="radio radio-sm radio-primary"
                style="width: 18px; height: 18px;"
                value="FINISHED"
              >
              <span class="label-text text-sm">{{ t('reading_events.finished') }}</span>
            </label>
            <label class="label cursor-pointer gap-1 mb-0">
              <input
                v-model="currentCreateEvent.eventType"
                type="radio"
                name="radio-event-edit"
                class="radio radio-sm radio-primary"
                style="width: 18px; height: 18px;"
                value="CURRENTLY_READING"
              >
              <span class="label-text text-sm">{{ t('reading_events.currently_reading') }}</span>
            </label>
            <label class="label cursor-pointer gap-1 mb-0">
              <input
                v-model="currentCreateEvent.eventType"
                type="radio"
                name="radio-event-edit"
                class="radio radio-sm radio-primary"
                style="width: 18px; height: 18px;"
                value="DROPPED"
              >
              <span class="label-text text-sm">{{ t('reading_events.dropped') }}</span>
            </label>
          </div>
        </div>
      </div>
      <!-- Status -->
      <div class="rounded-xl border border-base-300 mb-3">
        <div class="text-xs font-semibold uppercase opacity-60 tracking-wider px-4 py-2 bg-base-200">
          {{ t('book.status') }}
        </div>
        <div class="bg-base-100 px-4 py-3">
          <div class="flex gap-3 flex-wrap">
            <label class="label cursor-pointer gap-2 mb-0">
              <input
                v-model="currentCreateEvent.eventType"
                type="radio"
                name="radio-status-edit"
                class="radio radio-sm radio-primary"
                style="width: 18px; height: 18px;"
                value="MARKED_OWNED"
              >
              <span class="label-text text-sm">{{ t('book.owned') }}</span>
            </label>
            <label class="label cursor-pointer gap-2 mb-0">
              <input
                v-model="currentCreateEvent.eventType"
                type="radio"
                name="radio-status-edit"
                class="radio radio-sm radio-primary"
                style="width: 18px; height: 18px;"
                value="MARKED_TO_READ"
              >
              <span class="label-text text-sm">{{ t('book.in_read_list') }}</span>
            </label>
            <label class="label cursor-pointer gap-2 mb-0">
              <input
                v-model="currentCreateEvent.eventType"
                type="radio"
                name="radio-status-edit"
                class="radio radio-sm radio-primary"
                style="width: 18px; height: 18px;"
                value="MARKED_BORROWED"
              >
              <span class="label-text text-sm">{{ t('book.borrowed') }}</span>
            </label>
          </div>
        </div>
      </div>
      <div
        v-if="currentEvent.eventType !== ReadingEventType.MARKED_OWNED && currentEvent.eventType !== ReadingEventType.MARKED_TO_READ && currentEvent.eventType !== ReadingEventType.MARKED_BORROWED"
        class="flex items-center gap-3 px-4 py-3 border-b border-base-200"
      >
        <label class="text-sm opacity-60 w-24 shrink-0">{{ t('reading_events.start_date') }}</label>
        <input
          v-model="startDateString"
          type="date"
          class="ml-auto w-auto bg-transparent outline-none text-sm text-right"
        >
      </div>
      <div
        v-if="currentEvent.eventType !== ReadingEventType.CURRENTLY_READING && currentEvent.eventType !== ReadingEventType.MARKED_OWNED && currentEvent.eventType !== ReadingEventType.MARKED_TO_READ && currentEvent.eventType !== ReadingEventType.MARKED_BORROWED"
        class="flex items-center gap-3 px-4 py-3 border-b border-base-200"
      >
        <label class="text-sm opacity-60 w-24 shrink-0">{{ t('reading_events.event_date') }}</label>
        <input
          v-model="endDateString"
          type="date"
          class="ml-auto w-auto bg-transparent outline-none text-sm text-right"
        >
      </div>
      <div v-if="props.userBookId" class="rounded-xl border border-base-300 mb-3 mt-3">
        <div class="text-xs font-semibold uppercase opacity-60 tracking-wider px-4 py-2 bg-base-200">
          {{ t('labels.set_progress') }}
        </div>
        <div class="bg-base-100 px-4 py-3">
          <div class="field">
            <label class="label">
              <span class="label-text font-semibold first-letter:capitalize">{{ t('book.percent_read') }} : </span>
            </label>
            <input
              v-model="percentRead"
              type="range"
              min="0"
              max="100"
              :disabled="props.pageCount != null && props.pageCount > 0"
              class="range range-xs range-primary"
            >
          </div>
          <div v-if="props.pageCount != null && props.pageCount > 0" class="field mt-2">
            <label class="label">
              <span class="label-text font-semibold first-letter:capitalize">{{ t('book.current_page_number') }} : </span>
            </label>
            <input
              v-model="currentPageNumber"
              type="number"
              min="0"
              :max="props.pageCount"
              class="input focus:input-accent"
            >
          </div>
        </div>
      </div>
        <div class="flex gap-2 mt-3">
          <button
            class="btn btn-secondary flex-1 uppercase"
            @click="update"
          >
            <span class="icon">
              <i class="mdi mdi-pencil mdi-18px" />
            </span>
            <span>{{ t('labels.submit') }}</span>
          </button>
          <button
            class="btn btn-error flex-1 uppercase"
            @click="deleteEvent"
          >
            <span class="icon">
              <i class="mdi mdi-delete mdi-18px" />
            </span>
            <span>{{ t('labels.delete') }}</span>
          </button>
        </div>
    </div>
    <div v-else>
      <!-- Ereignis-Typ -->
      <div class="rounded-xl border border-base-300 mb-3">
        <div class="text-xs font-semibold uppercase opacity-60 tracking-wider px-4 py-2 bg-base-200">
          {{ t('reading_events.last_event_type') }}
        </div>
        <div class="bg-base-100 px-4 py-3">
          <div class="flex gap-3 flex-wrap">
            <label class="label cursor-pointer gap-1 mb-0">
              <input
                v-model="currentCreateEvent.eventType"
                type="radio"
                name="radio-event"
                class="radio radio-sm radio-primary"
                style="width: 18px; height: 18px;"
                value="FINISHED"
              >
              <span class="label-text text-sm">{{ t('reading_events.finished') }}</span>
            </label>
            <label class="label cursor-pointer gap-1 mb-0">
              <input
                v-model="currentCreateEvent.eventType"
                type="radio"
                name="radio-event"
                class="radio radio-sm radio-primary"
                style="width: 18px; height: 18px;"
                value="CURRENTLY_READING"
              >
              <span class="label-text text-sm">{{ t('reading_events.currently_reading') }}</span>
            </label>
            <label class="label cursor-pointer gap-1 mb-0">
              <input
                v-model="currentCreateEvent.eventType"
                type="radio"
                name="radio-event"
                class="radio radio-sm radio-primary"
                style="width: 18px; height: 18px;"
                value="DROPPED"
              >
              <span class="label-text text-sm">{{ t('reading_events.dropped') }}</span>
            </label>
          </div>
        </div>
      </div>
      <!-- Status -->
      <div class="rounded-xl border border-base-300 mb-3">
        <div class="text-xs font-semibold uppercase opacity-60 tracking-wider px-4 py-2 bg-base-200">
          {{ t('book.status') }}
        </div>
        <div class="bg-base-100 px-4 py-3">
          <div class="flex gap-3 flex-wrap">
            <label class="label cursor-pointer gap-2 mb-0">
              <input
                v-model="currentCreateEvent.eventType"
                type="radio"
                name="radio-status"
                class="radio radio-sm radio-primary"
                style="width: 18px; height: 18px;"
                value="MARKED_OWNED"
              >
              <span class="label-text text-sm">{{ t('book.owned') }}</span>
            </label>
            <label class="label cursor-pointer gap-2 mb-0">
              <input
                v-model="currentCreateEvent.eventType"
                type="radio"
                name="radio-status"
                class="radio radio-sm radio-primary"
                style="width: 18px; height: 18px;"
                value="MARKED_TO_READ"
              >
              <span class="label-text text-sm">{{ t('book.in_read_list') }}</span>
            </label>
            <label class="label cursor-pointer gap-2 mb-0">
              <input
                v-model="currentCreateEvent.eventType"
                type="radio"
                name="radio-status"
                class="radio radio-sm radio-primary"
                style="width: 18px; height: 18px;"
                value="MARKED_BORROWED"
              >
              <span class="label-text text-sm">{{ t('book.borrowed') }}</span>
            </label>
          </div>
        </div>
      </div>
        <div
          v-if="currentCreateEvent.eventType === ReadingEventType.CURRENTLY_READING"
          class="flex items-center gap-3 px-4 py-3 border-b border-base-200"
        >
          <label class="text-sm opacity-60 w-24 shrink-0">{{ t('reading_events.start_date') }}</label>
          <input
            v-model="createStartDateString"
            type="date"
            class="ml-auto w-auto bg-transparent outline-none text-sm text-right"
          >
        </div>
        <div
          v-if="currentCreateEvent.eventType != ReadingEventType.CURRENTLY_READING && currentCreateEvent.eventType != ReadingEventType.MARKED_OWNED && currentCreateEvent.eventType != ReadingEventType.MARKED_TO_READ && currentCreateEvent.eventType != ReadingEventType.MARKED_BORROWED"
          class="flex items-center gap-3 px-4 py-3 border-b border-base-200"
        >
          <label class="text-sm opacity-60 w-24 shrink-0">{{ t('reading_events.event_date') }}</label>
          <input
            v-model="createEventDateString"
            type="date"
            class="ml-auto w-auto bg-transparent outline-none text-sm text-right"
          >
        </div>
        <div v-if="props.userBookId" class="rounded-xl border border-base-300 mb-3 mt-3">
          <div class="text-xs font-semibold uppercase opacity-60 tracking-wider px-4 py-2 bg-base-200">
            {{ t('labels.set_progress') }}
          </div>
          <div class="bg-base-100 px-4 py-3">
            <div class="field">
              <label class="label">
                <span class="label-text font-semibold first-letter:capitalize">{{ t('book.percent_read') }} : </span>
              </label>
              <input
                v-model="percentRead"
                type="range"
                min="0"
                max="100"
                :disabled="props.pageCount != null && props.pageCount > 0"
                class="range range-xs range-primary"
              >
            </div>
            <div v-if="props.pageCount != null && props.pageCount > 0" class="field mt-2">
              <label class="label">
                <span class="label-text font-semibold first-letter:capitalize">{{ t('book.current_page_number') }} : </span>
              </label>
              <input
                v-model="currentPageNumber"
                type="number"
                min="0"
                :max="props.pageCount"
                class="input focus:input-accent"
              >
            </div>
          </div>
        </div>
        <div>
          <button
            class="btn btn-secondary btn-outline mt-3 uppercase"
            @click="create"
          >
            <span class="icon">
              <i class="mdi mdi-pencil mdi-18px" />
            </span>
            <span>{{ t('labels.create') }}</span>
          </button>
        </div>
      </div>
    <progress
      v-if="progress"
      class="animate-pulse progress progress-success mt-5"
      max="100"
    />
  </section>
</template>

<style lang="scss">

</style>

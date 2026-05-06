<script setup lang="ts">
import { Ref, ref, watch, computed } from "vue";
import { CreateReadingEvent, ReadingEvent, ReadingEventType } from "../../model/ReadingEvent";
import dataService from "../../services/DataService";
import { useI18n } from 'vue-i18n'
import useTypography from "../../composables/typography";

const { t } = useI18n({
      inheritLocale: true,
      useScope: 'global'
    })

const props = defineProps<{
  readingEvent: ReadingEvent|CreateReadingEvent,
  edit: boolean
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

const emit = defineEmits<{
  (e: 'close'): void
}>()

const create = () => {
  progress.value = true
  dataService.createReadingEvent(currentCreateEvent.value)
    .then(res => {
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
      <div class="field">
          <label class="label">
            <span class="label-text font-semibold">{{ t('reading_events.last_event_type') }} : </span>
          </label>
          <div class="field">
            <input
              v-model="currentCreateEvent.eventType"
              type="radio"
              name="radio-28"
              class="radio radio-sm radio-primary my-1"
              value="FINISHED"
            >
            <span class="label-text ml-2">
              {{ t('reading_events.finished') }}
            </span>
          </div>
          <div class="field">
            <input
              v-model="currentCreateEvent.eventType"
              type="radio"
              name="radio-28"
              class="radio radio-sm radio-primary my-1"
              value="CURRENTLY_READING"
            >
            <span class="label-text ml-2">
              {{ t('reading_events.currently_reading') }}
            </span>
          </div>
          <div class="field">
            <input
              v-model="currentCreateEvent.eventType"
              type="radio"
              name="radio-28"
              class="radio radio-sm radio-primary my-1"
              value="DROPPED"
            >
            <span class="label-text ml-2">
              {{ t('reading_events.dropped') }}
            </span>
          </div>
          <div class="field">
            <input
              v-model="currentCreateEvent.eventType"
              type="radio"
              name="radio-28"
              class="radio radio-sm radio-primary my-1"
              value="MARKED_OWNED"
            >
            <span class="label-text ml-2">
              {{ t('book.owned') }}
            </span>
          </div>
          <div class="field">
            <input
              v-model="currentCreateEvent.eventType"
              type="radio"
              name="radio-28"
              class="radio radio-sm radio-primary my-1"
              value="MARKED_TO_READ"
            >
            <span class="label-text ml-2">
              {{ t('book.in_read_list') }}

            </span>
          </div>
          <div class="field">
            <input
              v-model="currentCreateEvent.eventType"
              type="radio"
              name="radio-28"
              class="radio radio-sm radio-primary my-1"
              value="MARKED_BORROWED"
            >
            <span class="label-text ml-2">
              {{ t('book.borrowed') }}
            </span>
          </div>
        </div>
        <div class="field">
          <label class="label">
            <span class="label-text font-semibold first-letter:capitalize">{{ t('reading_events.start_date') }} : </span>
          </label>
          <input
            v-if="currentEvent.eventType !== ReadingEventType.MARKED_OWNED && currentEvent.eventType !== ReadingEventType.MARKED_TO_READ && currentEvent.eventType !== ReadingEventType.MARKED_BORROWED"
            v-model="startDateString"
            type="date"
            class="input input-primary w-full"
          >
        </div>
        <div
          v-if="currentEvent.eventType !== ReadingEventType.CURRENTLY_READING && currentEvent.eventType !== ReadingEventType.MARKED_OWNED && currentEvent.eventType !== ReadingEventType.MARKED_TO_READ && currentEvent.eventType !== ReadingEventType.MARKED_BORROWED"
          class="field"
        >
          <label class="label">
            <span class="label-text font-semibold first-letter:capitalize">{{ t('reading_events.event_date') }} : </span>
          </label>
          <input
            v-model="endDateString"
            type="date"
            class="input input-primary w-full"
          >
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
    <div
      v-else
    >
      <h1
        class="text-xl capitalize mb-3"
        :class="typographyClasses"
      >
        {{ t('reading_events.choose_event') }}
      </h1>
      <div>
        <div class="field">
          <label class="label">
            <span class="label-text font-semibold first-letter:capitalize">{{ t('reading_events.event_type') }} : </span>
          </label>
          <div class="field">
            <input
              v-model="currentCreateEvent.eventType"
              type="radio"
              name="radio-29"
              class="radio radio-sm radio-primary my-1"
              value="FINISHED"
            >
            <span class="label-text ml-2">
              {{ t('reading_events.finished') }}
            </span>
          </div>
          <div class="field">
            <input
              v-model="currentCreateEvent.eventType"
              type="radio"
              name="radio-29"
              class="radio radio-sm radio-primary my-1"
              value="CURRENTLY_READING"
            >
            <span class="label-text ml-2">
              {{ t('reading_events.currently_reading') }}
            </span>
          </div>
          <div class="field">
            <input
              v-model="currentCreateEvent.eventType"
              type="radio"
              name="radio-29"
              class="radio radio-sm radio-primary my-1"
              value="DROPPED"
            >
            <span class="label-text ml-2">
              {{ t('reading_events.dropped') }}
            </span>
          </div>
          <div class="field">
            <input
              v-model="currentCreateEvent.eventType"
              type="radio"
              name="radio-29"
              class="radio radio-sm radio-primary my-1"
              value="MARKED_OWNED"
            >
            <span class="label-text ml-2">
              {{ t('book.owned') }}
            </span>
          </div>
          <div class="field">
            <input
              v-model="currentCreateEvent.eventType"
              type="radio"
              name="radio-29"
              class="radio radio-sm radio-primary my-1"
              value="MARKED_TO_READ"
            >
            <span class="label-text ml-2">
              {{ t('book.in_read_list') }}
            </span>
          </div>
          <div class="field">
            <input
              v-model="currentCreateEvent.eventType"
              type="radio"
              name="radio-29"
              class="radio radio-sm radio-primary my-1"
              value="MARKED_BORROWED"
            >
            <span class="label-text ml-2">
              {{ t('book.borrowed') }}
            </span>
          </div>
        </div>
        <div
          v-if="currentCreateEvent.eventType === ReadingEventType.CURRENTLY_READING"
          class="field"
        >
          <label class="label">
            <span class="label-text font-semibold first-letter:capitalize">{{ t('reading_events.start_date') }} :</span>
          </label>
          <input
            v-model="createStartDateString"
            type="date"
            class="input input-primary w-full"
          >
        </div>
        <div
          v-if="currentCreateEvent.eventType != ReadingEventType.CURRENTLY_READING && currentCreateEvent.eventType != ReadingEventType.MARKED_OWNED && currentCreateEvent.eventType != ReadingEventType.MARKED_TO_READ && currentCreateEvent.eventType != ReadingEventType.MARKED_BORROWED"
          class="field"
        >
          <label class="label">
            <span class="label-text font-semibold first-letter:capitalize">{{ t('reading_events.event_date') }} :</span>
          </label>
          <input
            v-model="createEventDateString"
            type="date"
            class="input input-primary w-full"
          >
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

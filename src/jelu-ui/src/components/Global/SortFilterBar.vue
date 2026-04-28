<script setup lang="ts">
import { useMagicKeys } from '@vueuse/core';
import { ref, watch } from "vue";
import { useI18n } from 'vue-i18n';

const { t } = useI18n({
      inheritLocale: true,
      useScope: 'global'
    })

import useTypography from '../../composables/typography';

const keys = useMagicKeys()
const shiftF = keys['Shift+F']

const { typographyClasses } = useTypography()

const props = defineProps<{
  order: string
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:sortOrder', newval: string): void
  (e: 'update:open', open: boolean): void
}>()

const sortOrder = ref(props.order)


watch(sortOrder, (newVal, oldVal) => {
  if (newVal !== oldVal) {
      emit("update:sortOrder", newVal)
  }
})

watch(shiftF, (v) => {
  if (v) {
    emit('update:open', !props.open)
  }
})

</script>

<template>
  <o-sidebar
    :active="props.open"
    :fullheight="true"
    :fullwidth="false"
    :overlay="true"
    class="jl-sidebar"
    :teleport="true"
    @close="emit('update:open', false)"
  >
    <div :class="['p-5 flex flex-col items-start gap-2', typographyClasses]">
      <label class="label font-bold">{{ t('sorting.sort_order') }} : </label>
      <div class="field">
        <input
          v-model="sortOrder"
          type="radio"
          name="radio-10"
          class="radio radio-primary my-2"
          value="desc"
        >
        <span class="label-text">{{ t('sorting.descending') }}</span>
      </div>
      <div class="field mt-1">
        <input
          v-model="sortOrder"
          type="radio"
          name="radio-10"
          class="radio radio-primary mb-2"
          value="asc"
        >
        <span class="label-text">{{ t('sorting.ascending') }}</span>
      </div>
      <slot name="sort-fields" />
      <slot name="filters" />
    </div>
  </o-sidebar>
</template>

<style>
.jl-sidebar {
  &, * { font-size: 0.875rem !important; }
  .label { font-size: 0.875rem !important; font-weight: 400; }
  .label-text { white-space: normal; word-break: break-word; font-weight: 400; }
  .field { width: 100%; }
  .radio + .label-text { margin-left: 0.25rem; }
}
</style>

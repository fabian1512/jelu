<script setup lang="ts">
import { useMagicKeys } from '@vueuse/core';
import { ref, watch } from "vue";
import { useI18n } from 'vue-i18n';

const { t } = useI18n({
      inheritLocale: true,
      useScope: 'global'
    })

const keys = useMagicKeys()
const shiftF = keys['Shift+F']

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
    <div class="p-5 flex flex-col items-start gap-0.5">
      <p class="px-4 py-2 text-xs font-bold opacity-60 uppercase tracking-wide">{{ t('sorting.sort_order') }}</p>
      <div class="field">
        <input
          v-model="sortOrder"
          type="radio"
          name="radio-10"
          class="radio radio-primary my-1"
          value="desc"
        >
        <span class="label-text">{{ t('sorting.descending') }}</span>
      </div>
      <div class="field">
        <input
          v-model="sortOrder"
          type="radio"
          name="radio-10"
          class="radio radio-primary"
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
  .field { width: 100%; }
}
</style>

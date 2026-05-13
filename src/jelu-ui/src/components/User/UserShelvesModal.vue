<script setup lang="ts">
import { useTitle } from '@vueuse/core'
import UserShelvesList from './UserShelvesList.vue'

useTitle('Jelu | User page')
const emit = defineEmits<{
  (e: 'close'): void,
  (e: 'shelves-changed'): void
}>()

</script>

<template>
  <div class="jl-modal" style="--modal-width: min(450px, calc(100vw - 24px)); --modal-min-height: 8rem;">
    <div class="flex justify-end mb-2">
      <button @click="emit('close')" class="btn btn-sm btn-circle">✕</button>
    </div>
    <user-shelves-list
      class="mx-4"
      :allow-delete="false"
      :allow-create="false"
      @close="emit('close')"
    />
  </div>
</template>

<style scoped>
</style>

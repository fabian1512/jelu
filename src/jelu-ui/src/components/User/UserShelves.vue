<script setup lang="ts">
import { useTitle } from '@vueuse/core'
import UserShelvesList from './UserShelvesList.vue'


useTitle('Jelu | User page')


</script>

<template>
  <div>
    <user-shelves-list
      class="mx-4"
      :allow-delete="true"
      :allow-create="true"
    />
  </div>
</template>

<style scoped>
.o-dropdown.o-dropdown--position-auto.o-autocomplete,
.o-dropdown.o-dropdown--position-bottom.o-autocomplete {
  @apply w-full;
}
</style>

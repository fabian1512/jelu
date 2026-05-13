<script setup lang="ts">
import { useTitle } from '@vueuse/core'
import { useStore } from 'vuex'
import { key } from '../../store'

useTitle('Jelu | User page')

const store = useStore(key)
</script>

<template>
  <router-view />
</template>

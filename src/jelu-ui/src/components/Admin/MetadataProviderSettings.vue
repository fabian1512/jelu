<script setup lang="ts">
import { useTitle } from '@vueuse/core'
import { onMounted, Ref, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import dataService from "../../services/DataService"

const { t } = useI18n({
  inheritLocale: true,
  useScope: 'global'
})

useTitle('Jelu | Metadata Provider')

interface ProviderSetting {
  name: string
  isEnabled: boolean
  order: number
  apiKey?: string | null
  config?: string | null
}

const providers: Ref<Array<ProviderSetting>> = ref([])
const progress = ref(false)
const saved = ref(false)
const error = ref("")

const loadProviders = async () => {
  progress.value = true
  try {
    providers.value = await dataService.fetchMetadataProviders()
  } catch (e) {
    error.value = String(e)
  }
  progress.value = false
}

const toggleProvider = (provider: ProviderSetting) => {
  provider.isEnabled = !provider.isEnabled
}

const save = async () => {
  progress.value = true
  saved.value = false
  error.value = ""
  try {
    await dataService.saveMetadataProviders(providers.value)
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } catch (e) {
    error.value = String(e)
  }
  progress.value = false
}

onMounted(() => {
  loadProviders()
})
</script>

<template>
  <div class="w-full max-w-3xl mx-auto p-4">
    <h1 class="text-2xl font-bold capitalize mb-4">
      {{ t('settings.metadata_providers') }}
    </h1>

    <div v-if="error" class="alert alert-error mb-4">
      {{ error }}
    </div>

    <div v-if="saved" class="alert alert-success mb-4">
      {{ t('labels.saved') }}
    </div>

    <div v-if="progress && providers.length === 0" class="flex justify-center">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <div v-else class="overflow-x-auto">
      <table class="table table-zebra w-full">
        <thead>
          <tr>
            <th class="w-8" />
            <th>{{ t('metadata.provider') }}</th>
            <th class="w-20">{{ t('metadata.enabled') }}</th>
            <th class="w-24">{{ t('metadata.order') }}</th>
            <th class="w-48">{{ t('metadata.api_key') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="provider in providers" :key="provider.name">
            <td>
              <i class="mdi mdi-tune text-lg" />
            </td>
            <td class="font-mono">{{ provider.name }}</td>
            <td>
              <input
                :checked="provider.isEnabled"
                type="checkbox"
                class="checkbox checkbox-primary checkbox-sm"
                @change="toggleProvider(provider)"
              >
            </td>
            <td>
              <input
                v-model="provider.order"
                type="number"
                class="input input-bordered input-sm w-20"
                min="-1000"
                max="1000"
              >
            </td>
            <td>
              <input
                v-if="provider.name === 'google'"
                v-model="provider.apiKey"
                type="text"
                class="input input-bordered input-sm w-full"
                :placeholder="t('metadata.api_key')"
              >
              <span v-else class="text-base-content/50">&mdash;</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-6">
      <button
        class="btn btn-primary"
        :class="{ 'btn-disabled': progress }"
        @click="save"
      >
        <span v-if="progress" class="loading loading-spinner" />
        <span v-else class="icon">
          <i class="mdi mdi-content-save mdi-18px" />
        </span>
        <span>{{ t('labels.save') }}</span>
      </button>
    </div>
  </div>
</template>

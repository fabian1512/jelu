<script setup lang="ts">
import { onMounted, Ref, ref } from "vue";
import { useI18n } from 'vue-i18n';
import { PluginInfo } from "../../model/PluginInfo";
import dataService from "../../services/DataService";
import useTypography from "../../composables/typography";

const { t } = useI18n({
  inheritLocale: true,
  useScope: 'global'
})

const emit = defineEmits<{
  (e: 'close'): void,
  (e: 'plugins', plugins: Array<PluginInfo>): void
}>()

interface ProviderItem {
  name: string
  enabled: boolean
}

const items: Ref<Array<ProviderItem>> = ref([])
const progress: Ref<boolean> = ref(false)
const loaded: Ref<boolean> = ref(false)

onMounted(async () => {
  progress.value = true
  try {
    const providers = await dataService.fetchMetadataProviders()
    items.value = providers
      .filter((p: any) => p.name !== 'calibre' && p.name !== 'jelu-debug')
      .map((p: any) => ({ name: p.name, enabled: p.isEnabled }))
  } catch (_) {
    // keep empty list on error
  }
  loaded.value = true
  progress.value = false
})

const submit = () => {
  const selected: PluginInfo[] = items.value
    .filter(p => p.enabled)
    .map(p => ({ name: p.name, order: 0 }))
  emit('plugins', selected)
  emit('close')
}

const dismiss = () => {
  emit('close')
}

const { typographyClasses } = useTypography()
</script>

<template>
  <section class="edit-modal">
    <div class="flex flex-col items-center justify-items-center">
      <h1
        class="text-2xl first-letter:capitalize"
        :class="typographyClasses"
      >
        {{ t('metadata.reorder_plugins') }}
      </h1>
      <p class="text-justify my-2">
        {{ t('metadata.description') }}
      </p>
      <div
        v-if="progress"
        class="loading loading-spinner my-4"
      />
      <div class="flex flex-col w-full max-w-xs my-3">
        <div
          v-for="item in items"
          :key="item.name"
          class="flex flex-row justify-between items-center border-b border-base-300 p-2"
        >
          <span class="font-semibold">{{ item.name }}</span>
          <input
            v-model="item.enabled"
            type="checkbox"
            class="toggle toggle-accent"
          >
        </div>
      </div>
      <div class="m-3 flex gap-2">
        <button
          class="btn btn-primary uppercase"
          :disabled="progress"
          @click="submit"
        >
          <span class="icon">
            <i class="mdi mdi-check mdi-18px" />
          </span>
          <span>{{ t('labels.apply') }}</span>
        </button>
        <button
          class="btn btn-secondary uppercase"
          :disabled="progress"
          @click="dismiss"
        >
          <span class="icon">
            <i class="mdi mdi-cancel mdi-18px" />
          </span>
          <span>{{ t('labels.discard') }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style lang="scss">
</style>

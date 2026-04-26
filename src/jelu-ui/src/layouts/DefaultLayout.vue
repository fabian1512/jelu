<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { key } from '../store'
import dataService from '../services/DataService'
import AppSidebar from '../components/Global/AppSidebar.vue'
import SearchBar from '../components/Global/SearchBar.vue'
import useTypography from '../composables/typography'

const props = defineProps<{
  hideNavbar?: boolean
  hideFooter?: boolean
}>()

const store = useStore(key)
const router = useRouter()
const route = useRoute()
const { t } = useI18n({ inheritLocale: true, useScope: 'global' })
const { typographyClasses } = useTypography()

const username = computed(() => store.getters.getUsername)
const isLogged = computed(() => store.getters.getLogged)

const sidebarOpen = ref(false)

const logout = () => {
  dataService.logout().then(() => {
    store.dispatch('logout')
  })
}
</script>

<template>
  <div class="drawer min-h-screen drawer-mobile-overlay">
    <!-- Mobile Toggle (versteckt) -->
    <input
      type="checkbox"
      class="drawer-toggle"
      :checked="sidebarOpen"
      @change="sidebarOpen = ($event.target as HTMLInputElement).checked"
    />

    <!-- Hauptinhalt -->
    <div class="drawer-content flex flex-col">
      <!-- Header -->
      <header v-if="!hideNavbar" class="navbar bg-base-100 shadow-sm sticky top-0 z-30 w-full px-2 sm:px-4">
        <div class="navbar-start gap-2">
          <label
            class="btn btn-ghost"
            @click="sidebarOpen = !sidebarOpen"
          >
            <i class="mdi mdi-menu text-xl" />
          </label>
          <router-link to="/" class="flex items-center gap-2">
            <img src="../assets/jelu_logo.svg" alt="Jelu" class="w-10" />
            <span class="text-xl font-bold hidden sm:inline">Jelu</span>
          </router-link>
        </div>
        <div class="navbar-end">
          <button
            v-if="isLogged"
            @click="logout()"
            class="btn btn-ghost"
          >
            <i class="mdi mdi-logout text-xl" />
            <span>{{ t('nav.logout') }}</span>
          </button>
          <router-link
            v-else
            to="/login"
            class="btn btn-ghost"
          >
            <i class="mdi mdi-login text-xl" />
            <span>{{ t('nav.login') }}</span>
          </router-link>
        </div>
      </header>

      <!-- Suchleiste (nur auf Home) -->
      <SearchBar />

      <!-- Seiteninhalt -->
      <main class="flex-1 p-4">
        <slot />
      </main>
    </div>

    <!-- Sidebar -->
    <div class="drawer-side z-40 top-16">
      <label
        class="drawer-overlay"
        @click="sidebarOpen = false"
      />
      <AppSidebar @close="sidebarOpen = false" />
    </div>
  </div>

  <!-- Keyboard Shortcuts Modal -->
  <input id="shortcuts-modal" type="checkbox" class="modal-toggle">
  <label for="shortcuts-modal" class="modal cursor-pointer">
    <label class="modal-box relative" for="">
      <h1 class="text-2xl mb-3 capitalize" :class="typographyClasses">
        {{ t('settings.shortcuts') }} :
      </h1>
      <div class="flex flex-row flex-wrap justify-center basis-10/12 sm:basis-1/3">
        <p class="basis-full mt-2">
          <kbd class="kbd">shift</kbd> + <kbd class="kbd">f</kbd> : {{ t('shortcuts.toggle_bar') }}
        </p>
        <p class="basis-full mt-2">
          <kbd class="kbd">shift</kbd> + <kbd class="kbd">◀︎</kbd> : {{ t('shortcuts.page_previous') }}
        </p>
        <p class="basis-full mt-2">
          <kbd class="kbd">shift</kbd> + <kbd class="kbd">▶︎</kbd> : {{ t('shortcuts.page_next') }}
        </p>
      </div>
    </label>
  </label>
</template>

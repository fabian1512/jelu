<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import Avatar from 'vue-avatar-sdh'
import { key } from '../store'
import dataService from '../services/DataService'
import AppSidebar from '../components/Global/AppSidebar.vue'

const store = useStore(key)
const router = useRouter()
const { t } = useI18n({ inheritLocale: true, useScope: 'global' })

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
  <div class="drawer lg:drawer-open min-h-screen">
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
      <header class="navbar bg-base-100 shadow-sm sticky top-0 z-30 px-2 sm:px-4">
        <div class="navbar-start gap-2">
          <label
            class="btn btn-ghost lg:hidden"
            @click="sidebarOpen = !sidebarOpen"
          >
            <i class="mdi mdi-menu text-xl" />
          </label>
          <router-link to="/" class="flex items-center gap-2">
            <img src="../assets/jelu_logo.svg" alt="Jelu" class="w-10" />
            <span class="text-xl font-bold hidden sm:inline">Jelu</span>
          </router-link>
          <span class="text-xl font-medium hidden sm:inline opacity-60">
            {{ t('nav.dashboard') }}
          </span>
        </div>
        <div class="navbar-end">
          <div class="dropdown dropdown-end">
            <label tabindex="0" class="btn btn-ghost btn-circle avatar">
              <Avatar :size="40" :username="username" />
            </label>
            <ul class="mt-3 p-2 shadow menu menu-sm dropdown-content z-50 bg-base-100 rounded-box w-52">
              <li v-if="isLogged">
                <router-link class="capitalize" to="/profile">
                  {{ t('nav.dashboard') }}
                </router-link>
              </li>
              <li v-if="isLogged">
                <router-link class="capitalize" to="/books">
                  {{ t('nav.my_books') }}
                </router-link>
              </li>
              <li v-if="isLogged">
                <a class="capitalize" @click="logout()">
                  {{ t('nav.logout') }}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <!-- Seiteninhalt -->
      <main class="flex-1 p-4">
        <slot />
      </main>
    </div>

    <!-- Sidebar -->
    <div class="drawer-side z-40">
      <label
        class="drawer-overlay"
        @click="sidebarOpen = false"
      />
      <AppSidebar @close="sidebarOpen = false" />
    </div>
  </div>
</template>

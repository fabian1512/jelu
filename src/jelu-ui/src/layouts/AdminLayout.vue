<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import { key } from '../store';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const store = useStore(key);
const { t } = useI18n({ inheritLocale: true, useScope: 'global' });
const router = useRouter();

const isLogged = computed(() => store.getters.getLogged);
const isAdmin = computed(() => store.getters.isAdmin);

const collapseDropdown = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};
</script>

<template>
  <div>
    <div class="navbar bg-base-100 shadow-lg">
      <div class="navbar-start">
        <div class="dropdown lg:hidden">
          <label tabindex="0" class="btn btn-ghost">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
          </label>
          <ul tabindex="0" class="menu menu-compact dropdown-content z-[1] mt-3 p-2 shadow-sm bg-base-100 rounded-box w-52">
            <li @click="collapseDropdown()">
              <router-link :to="{ name: 'home' }">{{ t('nav.home') }}</router-link>
            </li>
            <li @click="collapseDropdown()">
              <router-link :to="{ name: 'profile-page' }">{{ t('nav.dashboard') }}</router-link>
            </li>
            <li @click="collapseDropdown()">
              <router-link :to="{ name: 'my-books' }">{{ t('nav.my_books') }}</router-link>
            </li>
          </ul>
        </div>
        <router-link :to="{ name: 'home' }">
          <img src="../assets/jelu_logo.svg" alt="home" class="w-14">
        </router-link>
        <span class="btn btn-ghost text-xl ml-4 hidden sm:inline">{{ t('nav.dashboard') }}</span>
      </div>
      <div class="navbar-end">
        <router-link :to="{ name: 'profile-page' }" class="btn btn-ghost hidden sm:inline">
          {{ t('nav.profile') }}
        </router-link>
        <router-link :to="{ name: 'my-books' }" class="btn btn-ghost">
          <i class="mdi mdi-bookshelf mdi-24px" />
        </router-link>
      </div>
    </div>
    <div class="divider mt-0" />
    <div class="container mx-auto px-4 py-8">
      <slot />
    </div>
  </div>
</template>

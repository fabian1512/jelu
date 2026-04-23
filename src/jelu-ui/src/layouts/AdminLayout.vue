<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import { key } from '../store';
import { useI18n } from 'vue-i18n';

const store = useStore(key);
const { t } = useI18n({ inheritLocale: true, useScope: 'global' });

const isLogged = computed(() => store.getters.getLogged);
const isAdmin = computed(() => store.getters.isAdmin);
</script>

<template>
  <div>
    <div class="navbar bg-base-100 shadow-lg">
      <div class="navbar-start">
        <router-link :to="{ name: 'home' }">
          <img src="../assets/jelu_logo.svg" alt="home" class="w-14">
        </router-link>
        <span class="btn btn-ghost text-xl ml-4">{{ t('nav.dashboard') }}</span>
      </div>
      <div class="navbar-end">
        <router-link :to="{ name: 'profile-page' }" class="btn btn-ghost">
          {{ t('nav.profile') }}
        </router-link>
      </div>
    </div>
    <div class="divider mt-0" />
    <div class="container mx-auto px-4 py-8">
      <slot />
    </div>
  </div>
</template>

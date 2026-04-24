<script setup lang="ts">
import { themeChange } from 'theme-change';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { computed, onMounted, Ref, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { key } from './store';
import DefaultLayout from './layouts/DefaultLayout.vue';
import AuthLayout from './layouts/AuthLayout.vue';
import BlankLayout from './layouts/BlankLayout.vue';

const {
  offlineReady,
  needRefresh,
  updateServiceWorker,
} = useRegisterSW()

const close = async() => {
  offlineReady.value = false
  needRefresh.value = false
}

const store = useStore(key)
const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n({
  inheritLocale: true,
  useScope: 'global'
})

const initialLoad : Ref<boolean> = ref(false)

store.dispatch('setupStatus')
initialLoad.value = true
store.dispatch('getUser')
  .then(async () => {
    if (store.state.route != null) {
      await router.push(store.state.route)
    }
    initialLoad.value = false
    store.dispatch('getServerSettings')
  })
  .catch(() => {
    if (store.state.route != null && (
      store.state.route.name === "review-detail" ||
      store.state.route.name === "list-detail"||
      store.state.route.name === "book-reviews")) {
      router.push(store.state.route)
      initialLoad.value = false
      return
    }
    initialLoad.value = false
    router.push({ name: 'login' })
  })

onMounted(() => {
  themeChange(false);
})

const currentLayout = computed(() => {
  const routeName = route.name;
  if (routeName === 'login') {
    return 'auth';
  }
  if (routeName === 'review-detail' || routeName === 'book-reviews' || routeName === 'list-detail') {
    return 'blank';
  }
  // Default layout für alles (inkl. Admin/Bereich)
  // Die Sidebar zeigt Admin-Links nur für Admins
  return 'default';
});
</script>

<template>
  <div v-if="offlineReady || needRefresh" class="pwa-toast" role="alert">
    <div class="message">
      <span v-if="offlineReady">App ready to work offline</span>
      <span v-else>New content available, click on reload button to update.</span>
    </div>
    <button v-if="needRefresh" @click="updateServiceWorker()">Reload</button>
    <button @click="close">Close</button>
  </div>

  <DefaultLayout v-if="currentLayout === 'default'">
    <router-view />
  </DefaultLayout>

  <AuthLayout v-else-if="currentLayout === 'auth'">
    <router-view />
  </AuthLayout>

  <BlankLayout v-else>
    <router-view />
  </BlankLayout>

  <o-loading v-model:active="initialLoad" :full-page="true" :cancelable="false">
    <div class="lds-facebook"><div /><div /><div /></div>
  </o-loading>
</template>

<style lang="css">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
}

.v-enter-active,
.v-leave-active {
  transition: opacity 0.7s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.pwa-toast {
  position: fixed;
  right: 0;
  bottom: 0;
  margin: 16px;
  padding: 12px;
  border: 1px solid #8885;
  border-radius: 4px;
  z-index: 1;
  text-align: left;
  box-shadow: 3px 4px 5px 0 #8885;
  background-color: white;
}

.pwa-toast .message {
  margin-bottom: 8px;
}

.pwa-toast button {
  border: 1px solid #8885;
  outline: none;
  margin-right: 5px;
  border-radius: 2px;
  padding: 8px 16px;
  min-height: 44px;
  font-size: 14px;
}
</style>

import { createRouter, createWebHistory } from 'vue-router'
import store from './store'
import AdminBaseVue from './components/Admin/AdminBase.vue'
import urls from './urls'

const isLogged = () => {
    if (!store.getters.getLogged) {
        console.log("is not logged")
        return false
    }
}

const isAdmin = () => {
    if (!store.getters.isAdmin) {
        console.log("is not admin")
        return false
    }
}

const router = createRouter({
    history: createWebHistory(),
    linkActiveClass: 'is-active',
    linkExactActiveClass: 'is-active',
    routes: [
        {
            path: '/',
            component: () => import(/* webpackChunkName: "recommend" */ './components/Misc/Welcome.vue'),
            name: 'home'
        },
        {
            path: '/books/:bookId/reviews',
            component: () => import(/* webpackChunkName: "recommend" */ './components/Book/BookReviews.vue'),
            name: 'book-reviews',
        },
        {
            path: '/books/:bookId/quotes',
            component: () => import(/* webpackChunkName: "recommend" */ './components/Book/BookQuotes.vue'),
            name: 'book-quotes',
            beforeEnter: [isLogged],
        },
        {
            path: '/books/:bookId',
            component: () => import(/* webpackChunkName: "recommend" */ './components/Book/BookDetail.vue'),
            name: 'book-detail',
            props: true,
            beforeEnter: [isLogged],
        },
        {
            path: '/books',
            component: () => import(/* webpackChunkName: "recommend" */ './components/Book/BookList.vue'),
            name: 'my-books',
            beforeEnter: [isLogged],
        },
        {
            path: '/login',
            component: () => import(/* webpackChunkName: "recommend" */ './components/Misc/Login.vue'),
            name: 'login'
        },
        {
            path: '/add-book',
            component: () => import(/* webpackChunkName: "recommend" */ './components/Book/AddBook.vue'),
            name: 'add-book',
            beforeEnter: [isLogged],
        },
        {
            path: '/to-read',
            component: () => import(/* webpackChunkName: "recommend" */ './components/Misc/ToReadList.vue'),
            name: 'to-read',
            beforeEnter: [isLogged],
        },
        {
            path: '/random',
            component: () => import(/* webpackChunkName: "recommend" */ './components/Misc/RandomList.vue'),
            name: 'random',
            beforeEnter: [isLogged],
        },
        {
            path: '/history',
            component: () => import(/* webpackChunkName: "recommend" */ './components/Misc/History.vue'),
            name: 'history',
            beforeEnter: [isLogged],
        },
        {
            path: '/tags/:tagId',
            component: () => import(/* webpackChunkName: "recommend" */ './components/Tag/TagBooks.vue'),
            name: 'tag-detail',
            beforeEnter: [isLogged],
        },
        {
            path: '/authors/:authorId',
            component: () => import(/* webpackChunkName: "recommend" */ './components/Author/AuthorBooks.vue'),
            name: 'author-detail',
            beforeEnter: [isLogged],
        },
        {
            path: '/authors',
            component: () => import(/* webpackChunkName: "recommend" */ './components/Author/AuthorsList.vue'),
            name: 'authors',
            beforeEnter: [isLogged],
        },
        {
            path: '/reviews/:reviewId',
            component: () => import(/* webpackChunkName: "recommend" */ './components/Review/ReviewDetail.vue'),
            name: 'review-detail',
        },
        {
            path: '/reviews',
            component: () => import(/* webpackChunkName: "recommend" */ './components/Review/ReviewList.vue'),
            name: 'reviews',
            beforeEnter: [isLogged]
        },
        {
            path: '/search',
            component: () => import(/* webpackChunkName: "recommend" */ './components/Search/SearchResultsDisplay.vue'),
            name: 'search',
            beforeEnter: [isLogged],
        },
        {
            path: '/series/:seriesId',
            component: () => import(/* webpackChunkName: "recommend" */ './components/Series/SeriesBooks.vue'),
            name: 'series',
            beforeEnter: [isLogged],
        },
        {
            path: '/users/:userId',
            component: () => import(/* webpackChunkName: "recommend" */ './components/User/UserDetail.vue'),
            name: 'user-detail',
        },
        {
            path: '/custom-lists/:listId',
            component: () => import(/* webpackChunkName: "recommend" */ './components/List/CustomListDetail.vue'),
            name: 'list-detail'
        },
        {
            path: '/profile',
            component: AdminBaseVue,
            name: 'profile-page',
            redirect: '/profile/me',
            beforeEnter: [isLogged],
            children: [
                { path : 'me', component: () => import(/* webpackChunkName: "recommend" */ './components/Admin/ProfilePage.vue')},
                { path : 'admin/authors', component: () => import(/* webpackChunkName: "recommend" */ './components/Author/AdminAuthors.vue')},
                { path : 'admin/users', beforeEnter: [isAdmin], component: () => import(/* webpackChunkName: "recommend" */ './components/User/AdminUsers.vue')},
                { path : 'users', component: () => import(/* webpackChunkName: "recommend" */ './components/User/UsersList.vue')},
                { path: 'imports', component: () => import(/* webpackChunkName: "recommend" */ './components/Admin/Imports.vue')},
                { path: 'settings', component: () => import(/* webpackChunkName: "recommend" */ './components/User/UserSettings.vue')},
                { path: 'messages', component: () => import(/* webpackChunkName: "recommend" */ './components/User/UserMessages.vue')},
                { path: 'stats', component: () => import(/* webpackChunkName: "recommend" */ './components/User/UserStats.vue')},
                { path: 'tags', component: () => import(/* webpackChunkName: "recommend" */ './components/Tag/TagsAdmin.vue')},
                { path: 'data', component: () => import(/* webpackChunkName: "recommend" */ './components/Admin/DataAdmin.vue')},
                { path: 'api-tokens', component: () => import(/* webpackChunkName: "recommend" */ './components/Admin/ApiTokens.vue')},
            ]
        },
    ],
})

router.beforeEach((to, from, next) => {
    console.log(`to : ${to.name?.toString()}`)
    console.log(to)
    console.log(`from : ${from.name?.toString()}`)
    console.log(from)
    console.log(store.getters.getLogged)
    
    if (window.opener !== null &&
    window.name === 'oauth2Login' &&
    to.query.server_redirect === 'Y'
  ) {
    if (!to.query.error) {
      // authentication succeeded, we redirect the parent window so that it can login via cookie
      window.opener.location.href = urls.BASE_URL
    } else {
      // authentication failed, we cascade the error message to the parent
      window.opener.location.href = window.location
    }
    // we can close the popup
    window.close()
  }
    if (from.name == undefined 
        && from.matched.length < 1) {
        console.log('undefined wanting to go to ' + to.name?.toString())
        console.log('undefined wanting to go to ' + to.query['page'])
        console.log(to.query)
        if (to.name !== 'login') {
            // store.commit('entryPoint', to.path)
            store.commit('route', to)
            // if (to.query != null && to.query != undefined) {
            //     store.commit('query', to.query)
            // }
        }
    }
    // if (to.name !== 'login' && !store.getters.getLogged) {
    //     next({ name: 'login' })
    // }
    // else next()
    next()
}
)

export default router

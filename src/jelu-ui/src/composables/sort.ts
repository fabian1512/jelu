import { ref, Ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export default function useSort(defaultSort: string) {
    const route = useRoute()
    const router = useRouter()
    const sortQuery: Ref<string> = ref(route.query.sort as string || defaultSort)

    const { field, order } = splitVal(sortQuery.value)
    const sortOrder = ref(order)
    const sortBy = ref(field)

    watch([sortBy, sortOrder], () => {
        const val = sortBy.value + ',' + sortOrder.value
        sortQuery.value = val
        router.replace({ query: { ...route.query, sort: val } })
    }, { immediate: true })

    const sortOrderUpdated = (newval: string) => {
        sortOrder.value = newval
    }

    return {
        sortQuery,
        sortOrder,
        sortBy,
        sortOrderUpdated
    }
}

const splitVal = (input: string) => {
    const ret = input.split(",")
    return {"field" :ret[0], "order" : ret[1]}
  }
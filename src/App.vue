<template>
    <OlMap :style="{ width: '500px', height: '500px' }" />
</template>

<script setup lang="ts">
import { fromLonLat } from 'ol/proj'
import { onMounted, ref } from 'vue'
import { useOl, OlMap } from 'vue-ol-comp'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import Draw, {
    createBox,
} from 'ol/interaction/Draw'
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'

const chosenExtent = ref([])


const { map } = useOl()

onMounted(() => {
    const drawSource = new VectorSource({ wrapX: false })
    const draw = new Draw({
        source: drawSource,
        type: "Circle",
        geometryFunction: createBox(),
    });

    draw.on(['drawstart', 'drawabort'], () => {
        drawSource.clear()
    })

    map.value.addInteraction(draw);

    const drawLayer = new VectorLayer({
        source: drawSource
    })

    map.value.addLayer(
        new TileLayer({
            source: new OSM()
        })
    )

    map.value.addLayer(drawLayer)

    map.value.getView().setCenter(fromLonLat([11, 47]))
    map.value.getView().setZoom(15)
})
</script>

<style scoped></style>

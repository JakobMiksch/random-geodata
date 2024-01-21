<template>
    <OlMap :style="{ width: '500px', height: '500px' }" />
    <div>Extent: {{ displayExtent }}</div>
    <button @click="showPoints">Show points</button>
</template>

<script setup lang="ts">
import { toLonLat, transformExtent, useGeographic } from 'ol/proj'
import { computed, onMounted, ref, type Ref } from 'vue'
import { useOl, OlMap } from 'vue-ol-comp'
import {GeoJSON} from 'ol/format'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import Draw, {
    createBox,
} from 'ol/interaction/Draw'
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'
import type { Extent } from 'ol/extent'
import {Feature as OlFeature} from "ol"
import { type Feature, type FeatureCollection, type GeoJsonProperties, type Point } from "geojson"
useGeographic()

const chosenExtent: Ref<Extent> = ref([])
const displayExtent: Ref<Extent> = computed(() => chosenExtent.value.map((x) => parseFloat(x.toFixed(2))))

const pointSource = ref(new VectorSource({}))

const createRandomPoints = (extent: Extent, count: number = 100): FeatureCollection<Point, GeoJsonProperties> => {
    const result: FeatureCollection<Point, GeoJsonProperties> = { features: [], type: 'FeatureCollection' }
    const extent3857 = transformExtent(extent, 'EPSG:4326', 'EPSG:3857')
    const xMin = extent3857[0]
    const xMax = extent3857[2]
    const yMin = extent3857[1]
    const yMax = extent3857[3]
    for (let i = 0; i < count; i++) {
        const newX = Math.random() * (xMax - xMin) + xMin
        const newY = Math.random() * (yMax - yMin) + yMin
        const coord3857 = [newX, newY]
        const coord4326 = toLonLat(coord3857)
        const newFeature: Feature<Point> = {type: 'Feature', geometry: {type: 'Point', coordinates: coord4326}, properties: {}}
        result.features.push(newFeature)
    }
    return result
}

const showPoints = () => {
    const points = createRandomPoints(chosenExtent.value)
    const olFeatures = new GeoJSON().readFeatures(points) as OlFeature[]
    pointSource.value.addFeatures(olFeatures)
}

const { map } = useOl()

onMounted(() => {
    const drawSource = new VectorSource({ wrapX: false })

    drawSource.on('clear', () => {
        chosenExtent.value = []
    })

    drawSource.on('addfeature', (event) => {
        chosenExtent.value = event?.feature?.getGeometry()?.getExtent() ?? []
        showPoints()
    })

    const draw = new Draw({
        source: drawSource,
        type: "Circle",
        geometryFunction: createBox(),
    });

    draw.on(['drawstart', 'drawabort'], () => {
        drawSource.clear()
        pointSource.value.clear()
    })

    map.value.addInteraction(draw);

    const drawLayer = new VectorLayer({
        source: drawSource
    })
    const pointLayer = new VectorLayer({
        source: pointSource.value as VectorSource
    })

    map.value.addLayer(
        new TileLayer({
            source: new OSM()
        })
    )

    map.value.addLayer(drawLayer)
    map.value.addLayer(pointLayer)

    map.value.getView().setCenter([11, 47])
    map.value.getView().setZoom(4)
})
</script>

<style scoped></style>

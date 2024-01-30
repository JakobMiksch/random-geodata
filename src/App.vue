<template>
  <header>
    <h1 :style="{ marginTop: 0, marginBottom: 0 }">Random Geodata</h1>
  </header>
  <main :style="{ paddingTop: 0 }">
    <OlMap :style="{ width: '100%', height: '500px' }" />
    <button v-if="!extentEmpty" @click="downloadGeoJson()">GeoJSON</button>
    <button v-if="!extentEmpty" @click="downloadShapefile()">Shapefile</button>
  </main>
</template>

<script setup lang="ts">
import { toLonLat, transformExtent, useGeographic } from 'ol/proj'
import { computed, onMounted, ref, type Ref } from 'vue'
import { useOl, OlMap } from 'vue-ol-comp'
import { GeoJSON } from 'ol/format'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import Draw, { createBox } from 'ol/interaction/Draw'
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'
import type { Extent } from 'ol/extent'
import { Feature as OlFeature } from 'ol'
import type { Feature, FeatureCollection, GeoJsonProperties, Point } from 'geojson'

import shpwrite from '@mapbox/shp-write'

useGeographic()

const chosenExtent: Ref<Extent> = ref([])
const displayExtent: Ref<Extent> = computed(() =>
  chosenExtent.value.map((x) => parseFloat(x.toFixed(2)))
)
const extentEmpty = computed(() => chosenExtent.value.length === 0)

const pointFeatureCollection = ref<FeatureCollection<Point, GeoJsonProperties>>()
const pointSource = ref(new VectorSource({}))

const createRandomPoints = (
  extent: Extent,
  count: number = 100
): FeatureCollection<Point, GeoJsonProperties> => {
  const result: FeatureCollection<Point, GeoJsonProperties> = {
    features: [],
    type: 'FeatureCollection'
  }
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
    const newFeature: Feature<Point> = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coord4326 },
      properties: {
        id: i + 1 // ensure ID starts with 1
      }
    }
    result.features.push(newFeature)
  }
  return result
}

const showPoints = () => {
  pointFeatureCollection.value = createRandomPoints(chosenExtent.value)
  const olFeatures = new GeoJSON().readFeatures(pointFeatureCollection.value) as OlFeature[]
  pointSource.value.addFeatures(olFeatures)
}

const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

const fileName = computed(() => 'random-geodata-' + displayExtent.value.join('-'))

const downloadGeoJson = () => {
  const jsonData = JSON.stringify(pointFeatureCollection.value, null, 2)
  const blob = new Blob([jsonData], { type: 'application/json' })
  const name = fileName.value + '.geojson'
  downloadBlob(blob, name)
}

const downloadShapefile = async () => {
  const options: shpwrite.DownloadOptions & shpwrite.ZipOptions = {
    outputType: 'blob',
    compression: 'DEFLATE',
    types: {
      point: fileName.value
    }
  }
  if (!pointFeatureCollection.value) return
  const shpArrayBuffer = await shpwrite.zip(pointFeatureCollection.value, options)
  const blob = new Blob([shpArrayBuffer], { type: 'application/octet-stream' })

  downloadBlob(blob, fileName.value + '.shp.zip')
}

const { map } = useOl()

onMounted(async () => {
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
    type: 'Circle',
    geometryFunction: createBox()
  })

  draw.on(['drawstart', 'drawabort'], () => {
    drawSource.clear()
    pointSource.value.clear()
  })

  map.value.addInteraction(draw)

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

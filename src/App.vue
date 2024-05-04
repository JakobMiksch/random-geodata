<template>
  <div
    :style="{
      position: 'absolute',
      pointerEvents: 'none',
      zIndex: 2,
      width: '100vw',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }"
  >
    <div
      :style="{
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: '10px',
        padding: '20px',
        display: 'inline-block'
      }"
    >
      <h1 :style="{ marginTop: 0, marginBottom: 0 }">Random Geodata</h1>
      <p>Draw a rectangle on the map to generate random points</p>
    </div>
  </div>
  <OlMap :style="{ width: '100vw', height: '100vh' }" />

  <div
    :style="{
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      borderRadius: '10px',
      position: 'absolute',
      pointerEvents: 'none',
      zIndex: 2,
      bottom: 0,
      top: 'auto',
      padding: '10px'
    }"
  >
    <h2>Download</h2>

    <div>
      <label for="projectionsSelect" :style="{ display: 'unset', marginRight: '4px' }"
        >Projection:</label
      >
      <select
        id="projectionsSelect"
        v-model="selectedProjection"
        :style="{
          pointerEvents: 'auto',
          display: 'unset'
        }"
      >
        <option v-for="option in projectionOptions" :value="option.name" :key="option.name">
          {{ option.name }}
        </option>
      </select>
    </div>

    <button
      :disabled="extentEmpty"
      :style="{
        marginRight: '5px',
        pointerEvents: 'auto',
        fontSize: 'small',
        padding: '8px 16px 8px 16px'
      }"
      v-for="driver in drivers"
      :key="driver.name"
      @click="downloadGdal(driver)"
    >
      {{ driver.name }}
    </button>
  </div>
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
import { getCenter, type Extent } from 'ol/extent'
import { Feature as OlFeature } from 'ol'
import type { Feature, FeatureCollection, GeoJsonProperties, Point } from 'geojson'
import { getUtmEpsgFromCoordinate } from '@/util/projectionUtil'

import workerUrl from 'gdal3.js/dist/package/gdal3.js?url'
import dataUrl from 'gdal3.js/dist/package/gdal3WebAssembly.data?url'
import wasmUrl from 'gdal3.js/dist/package/gdal3WebAssembly.wasm?url'
import initGdalJs from 'gdal3.js'

const paths = {
  wasm: wasmUrl,
  data: dataUrl,
  js: workerUrl
}

useGeographic()

const chosenExtent: Ref<Extent> = ref([])
const chosenExtentCenter = computed(() => getCenter(chosenExtent.value))

const displayExtent: Ref<Extent> = computed(() =>
  chosenExtent.value.map((x) => parseFloat(x.toFixed(2)))
)
const fileName = computed(() => 'random-geodata-' + displayExtent.value.join('-'))

const extentEmpty = computed(() => chosenExtent.value.length === 0)

const pointFeatureCollection = ref<FeatureCollection<Point, GeoJsonProperties>>()
const pointSource = ref(new VectorSource({}))

type DriverProperties = { name: string; extraOptions?: string[] }

const drivers: DriverProperties[] = [
  { name: 'GeoJSON' },
  { name: 'GPKG' },
  { name: 'FlatGeobuf' },
  { name: 'CSV', extraOptions: ['-lco', 'GEOMETRY=AS_WKT'] },
  { name: 'PGDUMP' }
]
// additional DRIVERS of interest:  Shape, GML,  GPX,  KML, ODS, XLSX

type ProjectionOption = { name: string }
const projectionOptions: ProjectionOption[] = [{ name: 'WGS84' }, { name: 'UTM' }]

const selectedProjection = ref<string>(projectionOptions[0].name)
const selectedEpsgCode = computed(() => {
  if (selectedProjection.value === 'WGS84') return '4326'
  else if (selectedProjection.value === 'UTM') return utmEpsgCode.value
  else return undefined
})

const downloadGdal = (driverProperties: DriverProperties) => {
  initGdalJs({ paths }).then(async (Gdal) => {
    if (!selectedEpsgCode.value) {
      alert('Error with selected CRS')
      return
    }
    const blob = new Blob([JSON.stringify(pointFeatureCollection.value)], {
      type: 'application/json'
    })

    const { name: driverName, extraOptions } = driverProperties

    const mygeojsonFile = new File([blob], 'input.geojson')

    const datasetList = await Gdal.open(mygeojsonFile)
    const geojsonDs = datasetList.datasets[0]

    const vectorDrivers = Gdal.drivers.vector

    // @ts-ignore
    const chosenDriver = vectorDrivers[driverName]

    const outputLayerName = 'random_points'

    let options = [
      '-f',
      chosenDriver.shortName,
      '-t_srs',
      'EPSG:' + selectedEpsgCode.value,
      '-nln',
      outputLayerName
    ]
    if (extraOptions) {
      options = options.concat(extraOptions)
    }

    const output = await Gdal.ogr2ogr(geojsonDs, options)
    // for debugging
    // const outputFiles = await Gdal.getOutputFiles()
    // console.log(outputFiles)
    const bytes = await Gdal.getFileBytes(output)
    const outBlob = new Blob([bytes])
    downloadBlob(outBlob, fileName.value + '.' + chosenDriver.extension)
  })
}

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

const { map } = useOl()

const utmEpsgCode = computed(() => {
  if (chosenExtentCenter.value) {
    return getUtmEpsgFromCoordinate([...chosenExtentCenter.value])
  } else {
    return undefined
  }
})

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

import type { Coordinate } from 'ol/coordinate'

// inspired by https://stackoverflow.com/a/9188972
const utmZoneFromLongitude = (longitude: number) => (Math.floor((longitude + 180) / 6) % 60) + 1

// inspired by https://gis.stackexchange.com/a/375285
const getUtmEpsgCode = (utmZone: number, latitude: number) => {
  const digitOneAndTwo = '32'
  const isNorth = latitude > 0
  const digitThree = isNorth ? '6' : '7'
  const digitFourFive = String(utmZone)
  return digitOneAndTwo + digitThree + String(digitFourFive)
}

export const getUtmEpsgFromCoordinate = (coordinate: Coordinate) => {
  const [longitude, latitude] = coordinate
  const zone = utmZoneFromLongitude(longitude)
  return getUtmEpsgCode(zone, latitude)
}

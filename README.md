# Random Geodata Generator

Webapp to generate random points and download it in various formats and coordinate reference systems. The format conversion and reprojection is done using the [gdal3.js](https://gdal3.js.org/docs/) WebAssembly library that makes [GDAL/OGR](https://gdal.org/) available in the web browser.

[**--> Link to demo website <--**](https://jakobmiksch.github.io/random-geodata/)

![demo screencast](/screencast/demo.gif)

## Development

```shell
# install
npm i

# start dev server at http://localhost:5173/
npm run dev
```


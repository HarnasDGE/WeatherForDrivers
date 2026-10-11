# Server data

## `powiaty.json` - county (powiat) boundaries of Poland

Used by `src/lib/server/services/powiaty.ts` to map route points to TERYT county codes, the area ids of
IMGW-PIB meteorological warnings (`/api/route-warnings`).

- **Source:** Państwowy Rejestr Granic (PRG), Główny Urząd Geodezji i Kartografii (GUGiK), WFS
  `https://mapy.geoportal.gov.pl/wss/service/PZGIK/PRG/WFS/AdministrativeBoundaries`, layer
  `ms:A02_Granice_powiatow` (fields `JPT_KOD_JE` = 4-digit TERYT code, `JPT_NAZWA_` = name), downloaded
  2026-10-11 in EPSG:4326.
- **Licence:** PRG is one of the GUGiK datasets released free of charge for any use, including commercial
  ("dane bez opłat", Prawo geodezyjne i kartograficzne, art. 40a, since 31 July 2020).
  Attribution: "Źródło: Państwowy Rejestr Granic, GUGiK".
- **Processing:** GML pages converted to GeoJSON, simplified with mapshaper 0.6
  (`-simplify visvalingam weighted 2.5% keep-shapes -clean`, topology kept, so neighbours share edges and
  there are no gaps), coordinates rounded to 0.001° (about 110 m by 70 m). On 2 700 random points in Poland,
  99.5% resolve to the same county as the full-resolution boundaries (mismatches lie next to county
  borders).
- **Format:** `{ scale: 1000, areas: [teryt, name, bbox, polygons][] }`, sorted by TERYT.
  `bbox` = `[minLon, minLat, maxLon, maxLat]`, `polygons` = `rings[][]` (first ring outer, then holes).
  Coordinates are integers (degrees × `scale`); each ring is a flat array `[lon0, lat0, dLon1, dLat1, …]`
  of deltas from the previous vertex, without the closing vertex.

To refresh it (e.g. after a change of county borders), download the layer again with
`service=WFS&version=2.0.0&request=GetFeature&typeNames=ms:A02_Granice_powiatow&propertyName=JPT_KOD_JE,JPT_NAZWA_,msGeometry&srsName=urn:ogc:def:crs:EPSG::4326`
(in pages of 50 with `count`/`startIndex`; axis order is lat, lon) and repeat the steps above.

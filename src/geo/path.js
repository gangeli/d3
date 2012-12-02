/**
 * Returns a function that, given a GeoJSON object (e.g., a feature), returns
 * the corresponding SVG path. The function can be customized by overriding the
 * projection. Point features are mapped to circles with a default radius of
 * 4.5px; the radius can be specified either as a constant or a function that
 * is evaluated per object.
 */
d3.geo.path = function() {
  var pointRadius = 4.5,
      pointCircle = d3_path_circle(pointRadius),
      projection = d3.geo.albersUsa(),
      buffer = [];

  function path(d, i) {
    if (typeof pointRadius === "function")
      pointCircle = d3_path_circle(pointRadius.apply(this, arguments));
    pathType(d);
    var result = buffer.length ? buffer.join("") : null;
    buffer = [];
    return result;
  }

  /*
   * Project a path onto the map, taking into account whether or not the
   * polygon wraps around the edge of the map.
   */
  function projectPath(buffer, coordinates, isPolygon) {
    isPolygon = false;
    var projected = [],
        paths = {},
        n = coordinates.length,
        i = -1;
    // Step 1: get projection
    i = -1;
    while (++i < n) {
      projected[i] = projection(coordinates[i]);
    }
    // Step 2: split into independent paths
    paths[[false, false]]  = []
    paths[[true, false]]  = []
    paths[[false, true]]  = []
    paths[[true, true]] = []
    i = -1;
    var loopState = [false, false];
    function sign(x) { return x < 0 ? -1 : 1; }
    while (++i < n) {
      if (i == 0) {
        paths[loopState].push( projected[i] );
        continue;
      }
      var dxTrue = coordinates[i][0] - coordinates[i-1][0],
          dyTrue = coordinates[i][1] - coordinates[i-1][1],
          dxProj = projected[i][1] - projected[i-1][1],
          dyProj = projected[i][1] - projected[i-1][1];
      if (sign(dxTrue) == sign(dxProj) && sign(dyTrue) == sign(dyProj)) {
        paths[loopState].push( projected[i] );
      } else if (sign(dxTrue) != sign(dxProj) && sign(dyTrue) != sign(dyProj)) {
        if (isPolygon) paths[loopState].push(["THUNK", i]);
        loopState = [!loopState[0], !loopState[1]];
        paths[loopState].push( projected[i] );
      } else if (sign(dxTrue) != sign(dxProj)) {
        if (isPolygon) paths[loopState].push(["THUNK", i]);
        loopState = [!loopState[0], loopState[1]];
        paths[loopState].push( projected[i] );
      } else if (sign(dyTrue) != sign(dyProj)) {
        if (isPolygon) paths[loopState].push(["THUNK", i]);
        loopState = [loopState[0], !loopState[1]];
        paths[loopState].push( projected[i] );
      } else { /* impossible */ }
    }
    // Step 3: interpolate jagged edges
    if (isPolygon) {
      for (loopState in paths) {
        var points    = paths[loopState],
            newPoints = [];
        paths[loopState] = [];
        i = -1;
        while (++i < points.length) {
          if (points[i][0] == "THUNK") {
            var lastPoint = coordinates[points[i][1] - 1],
                nextPoint = projection.invert(points[(i + 1) % points.length]),
                j = 1;
            for (j = 1; j <= 10; ++j) {
              newPoints.push( projection(
                [(10 - j) / 10 * lastPoint[0] + j / 10 * nextPoint[0],
                 (10 - j) / 10 * lastPoint[1] + j / 10 * nextPoint[1]]));
            }
          } else {
            newPoints.push(points[i]);
          }
        }
        paths[loopState] = newPoints;
      }
    }
    // Step 4: fill buffer
//    for (loopState in paths) {
      i = -1;
      var points = paths[[false,false]],
          n = points.length;
      if (n > 0) {
        buffer.push("M")
        while (++i < n) {
          buffer.push(points[i].join(","), "L");
        }
        buffer.pop();
        buffer.push("Z");
      }
//    }
  }

  var pathType = d3_geo_type({

    FeatureCollection: function(o) {
      var features = o.features,
          i = -1, // features.index
          n = features.length;
      while (++i < n) buffer.push(pathType(features[i].geometry));
    },

    Feature: function(o) {
      pathType(o.geometry);
    },

    Point: function(o) {
      buffer.push("M", projection(o.coordinates).join(","), pointCircle);
    },

    MultiPoint: function(o) {
      var coordinates = o.coordinates,
          i = -1, // coordinates.index
          n = coordinates.length;
      while (++i < n) buffer.push("M", projection(coordinates[i]).join(","), pointCircle);
    },

    LineString: function(o) {
      projectPath(buffer, o.coordinates, false);
    },

    MultiLineString: function(o) {
      var coordinates = o.coordinates,
          i = -1, // coordinates.index
          n = coordinates.length,
          subcoordinates, // coordinates[i]
          j, // subcoordinates.index
          m; // subcoordinates.length
      while (++i < n) {
        subcoordinates = coordinates[i];
        j = -1;
        m = subcoordinates.length;
        projectPath(buffer, subcoordinates, false);
      }
    },

    Polygon: function(o) {
      var coordinates = o.coordinates,
          i = -1, // coordinates.index
          n = coordinates.length,
          subcoordinates, // coordinates[i]
          j, // subcoordinates.index
          m; // subcoordinates.length
      while (++i < n) {
        subcoordinates = coordinates[i];
        j = -1;
        if ((m = subcoordinates.length - 1) > 0) {
          projectPath(buffer, subcoordinates, true);
        }
      }
    },

    MultiPolygon: function(o) {
      var coordinates = o.coordinates,
          i = -1, // coordinates index
          n = coordinates.length,
          subcoordinates, // coordinates[i]
          j, // subcoordinates index
          m, // subcoordinates.length
          subsubcoordinates, // subcoordinates[j]
          k, // subsubcoordinates index
          p; // subsubcoordinates.length
      while (++i < n) {
        subcoordinates = coordinates[i];
        j = -1;
        m = subcoordinates.length;
        while (++j < m) {
          subsubcoordinates = subcoordinates[j];
          k = -1;
          if ((p = subsubcoordinates.length - 1) > 0) {
            projectPath(buffer, subsubcoordinates, true);
          }
        }
      }
    },

    GeometryCollection: function(o) {
      var geometries = o.geometries,
          i = -1, // geometries index
          n = geometries.length;
      while (++i < n) buffer.push(pathType(geometries[i]));
    }

  });

  var areaType = path.area = d3_geo_type({

    FeatureCollection: function(o) {
      var area = 0,
          features = o.features,
          i = -1, // features.index
          n = features.length;
      while (++i < n) area += areaType(features[i]);
      return area;
    },

    Feature: function(o) {
      return areaType(o.geometry);
    },

    Polygon: function(o) {
      return polygonArea(o.coordinates);
    },

    MultiPolygon: function(o) {
      var sum = 0,
          coordinates = o.coordinates,
          i = -1, // coordinates index
          n = coordinates.length;
      while (++i < n) sum += polygonArea(coordinates[i]);
      return sum;
    },

    GeometryCollection: function(o) {
      var sum = 0,
          geometries = o.geometries,
          i = -1, // geometries index
          n = geometries.length;
      while (++i < n) sum += areaType(geometries[i]);
      return sum;
    }

  }, 0);

  function polygonArea(coordinates) {
    var sum = area(coordinates[0]), // exterior ring
        i = 0, // coordinates.index
        n = coordinates.length;
    while (++i < n) sum -= area(coordinates[i]); // holes
    return sum;
  }

  function polygonCentroid(coordinates) {
    var polygon = d3.geom.polygon(coordinates[0].map(projection)), // exterior ring
        area = polygon.area(),
        centroid = polygon.centroid(area < 0 ? (area *= -1, 1) : -1),
        x = centroid[0],
        y = centroid[1],
        z = area,
        i = 0, // coordinates index
        n = coordinates.length;
    while (++i < n) {
      polygon = d3.geom.polygon(coordinates[i].map(projection)); // holes
      area = polygon.area();
      centroid = polygon.centroid(area < 0 ? (area *= -1, 1) : -1);
      x -= centroid[0];
      y -= centroid[1];
      z -= area;
    }
    return [x, y, 6 * z]; // weighted centroid
  }

  var centroidType = path.centroid = d3_geo_type({

    // TODO FeatureCollection
    // TODO Point
    // TODO MultiPoint
    // TODO LineString
    // TODO MultiLineString
    // TODO GeometryCollection

    Feature: function(o) {
      return centroidType(o.geometry);
    },

    Polygon: function(o) {
      var centroid = polygonCentroid(o.coordinates);
      return [centroid[0] / centroid[2], centroid[1] / centroid[2]];
    },

    MultiPolygon: function(o) {
      var area = 0,
          coordinates = o.coordinates,
          centroid,
          x = 0,
          y = 0,
          z = 0,
          i = -1, // coordinates index
          n = coordinates.length;
      while (++i < n) {
        centroid = polygonCentroid(coordinates[i]);
        x += centroid[0];
        y += centroid[1];
        z += centroid[2];
      }
      return [x / z, y / z];
    }

  });

  function area(coordinates) {
    return Math.abs(d3.geom.polygon(coordinates.map(projection)).area());
  }

  path.projection = function(x) {
    projection = x;
    return path;
  };

  path.pointRadius = function(x) {
    if (typeof x === "function") pointRadius = x;
    else {
      pointRadius = +x;
      pointCircle = d3_path_circle(pointRadius);
    }
    return path;
  };

  return path;
};

function d3_path_circle(radius) {
  return "m0," + radius
      + "a" + radius + "," + radius + " 0 1,1 0," + (-2 * radius)
      + "a" + radius + "," + radius + " 0 1,1 0," + (+2 * radius)
      + "z";
}

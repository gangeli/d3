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
    // Variables and helpers
    var projected = [],
        n = coordinates.length,
        i = -1,
        // (interpolation parameters)
        acceptableLength = 25,
        magnitudeMargin = 2.0;
    function normdiff(v1, v2) {
      return Math.sqrt((v1[0]-v2[0])*(v1[0]-v2[0]) + (v1[1]-v2[1])*(v1[1]-v2[1]));
    }
    // Get projection
    i = -1;
    while (++i < n) {
      projected[i] = projection(coordinates[i]);
    }
    // Fill buffer
    var trees = [];
    if (n > 0) {
      i = 0;
      while (++i < n) {
        function interpolate(a, b, origA, origB, depth,
                             expectedMagnitude, parentVector) {
          var midpoint = [(origA[0] + origB[0]) / 2.0, (origA[1] + origB[1]) / 2.0],
              projectedMidpoint = projection(midpoint),
              a2midpoint = normdiff(a, projectedMidpoint),
              midpoint2b = normdiff(projectedMidpoint, b),
              norm       = normdiff(a, b),
              tree = {};
          tree.left = a;
          tree.right = b;
          if (norm < acceptableLength) {
            tree.render = function(){
              buffer.push("L", b.join(","));
            }
            tree.yield = function(lst) { lst.push(b); }
            tree.yieldCount = 1;
          } else if (midpoint2b > Math.pow(a2midpoint, magnitudeMargin)) {
            var leftChild = interpolate(a, projectedMidpoint,
                                        origA, midpoint,
                                        depth + 1);
            tree.render = function(){
              leftChild.render();
              buffer.push("M", b.join(","));
            }
            tree.left = leftChild.left;
            tree.yield = function(lst) { leftChild.yield(lst); lst.push(b); }
            tree.yieldCount = leftChild.yieldCount + 1;
          } else {
            var leftChild = interpolate(a, projectedMidpoint,
                                        origA, midpoint,
                                        depth + 1),
                rightChild = interpolate(projectedMidpoint, b,
                                        midpoint, origB,
                                        depth + 1);
            tree.render = function(){
              leftChild.render();
              rightChild.render();
            }
            tree.left = leftChild.left;
            tree.right = rightChild.right;
            tree.yield = function(lst) { leftChild.yield(lst); rightChild.yield(lst); }
            tree.yieldCount = leftChild.yieldCount + rightChild.yieldCount;
          }
          return tree;
        }   // close interpolate
        // Draw points
        var path = interpolate(projected[i-1], projected[i],
                    coordinates[i-1], coordinates[i],
                    0);
        trees.push(path);
      }     //  close while
    }       //  close if
    buffer.push("M", projected[0].join(","))
    for (var i = 0; i < trees.length; ++i) { trees[i].render(); }
    buffer.push("Z");
  }

  var pathType = d3_geo_type({

    FeatureCollection: function(o) {
      var features = o.features,
          i = -1, // features.index
          n = features.length;
//      while (++i < n) buffer.push(pathType(features[i].geometry));
    },

    Feature: function(o) {
      pathType(o.geometry);
    },

    Point: function(o) {
//      buffer.push("M", projection(o.coordinates).join(","), pointCircle);
    },

    MultiPoint: function(o) {
      var coordinates = o.coordinates,
          i = -1, // coordinates.index
          n = coordinates.length;
//      while (++i < n) buffer.push("M", projection(coordinates[i]).join(","), pointCircle);
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
//      while (++i < n) buffer.push(pathType(geometries[i]));
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

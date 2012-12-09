// Generalized Hammer projection; encompasses Lambert Azimuthal
//
// Implemented by Sukolsak Sakshuwong and Gabor Angeli

var d3_geo_radians = Math.PI / 180;

d3.geo.hammer = function(B) {
  if (B == undefined) B = 2.0;
  var origin,
      scale  = 500.0,
      translate = [480, 250];

  function rotate(forward, δλ, δφ, δγ) {
    return δλ ? (δφ || δγ ? rotateλ(rotateφγ(forward, δφ, δγ), δλ)
      : rotateλ(forward, δλ))
      : (δφ || δγ ? rotateφγ(forward, δφ, δγ)
      : forward);
  }

  function rotateλ(forward, δλ) {
    return function(λ, φ) {
      return forward(
        (λ += δλ) > π ? λ - 2 * π : λ < -π ? λ + 2 * π : λ,
        φ
      );
    };
  }

  function rotateLatitude(longitude, latitude, delta) {
    var cosdelta = Math.cos(delta),
        sindelta = Math.sin(delta),
        clat = Math.cos(latitude),
        x = Math.cos(longitude) * clat,
        y = Math.sin(longitude) * clat,
        z = Math.sin(latitude),
        k = x * sindelta + z * cosdelta;
    return [
      Math.atan2(y, x * cosdelta - z * sindelta),
      Math.asin(Math.max(-1, Math.min(1, k)))
    ];
  }

  function hammer(coordinates_degrees) {
    // Adjust Lat/Lon
    var lon = coordinates_degrees[0] * d3_geo_radians - origin[0],
        lat = coordinates_degrees[1] * d3_geo_radians;
    while (lon < -Math.PI) lon += Math.PI * 2.0;
    while (lon > Math.PI) lon -= Math.PI * 2.0;
    var center = rotateLatitude(lon, lat, -origin[1]),
        lon = center[0],
        lat = center[1];
    // Projection
    var sqrt2 = Math.sqrt(2),
        clat = Math.cos(lat),
        slat = Math.sin(lat),
        sin_lon_over_b = Math.sin(lon / B),
        cos_lon_over_b = Math.cos(lon / B),
        nu = Math.sqrt(1 + clat * cos_lon_over_b),
        x = B * sqrt2 * clat * sin_lon_over_b / nu,
        y = - sqrt2 * slat / nu;
    return [
      scale * 0.5 * x + translate[0],
      scale * 0.5 * y + translate[1]
    ];
  }
  
  function aasin(v) {
    var ONE_TOL = 1.00000000000001;
    var av = Math.abs(v);
    if (av >= 1) {
      if (av > ONE_TOL) {
        return NaN;
      }
      return v < 0 ? -Math.PI / 2 : Math.PI / 2;
    }
    return Math.asin(v);
  }

  function aatan2(n, d) {
    var ATOL = 1.0e-50;
    return ((Math.abs(n) < ATOL && Math.abs(d) < ATOL) ? 0 : Math.atan2(n, d));
  }

  hammer.invert = function(coordinates) {
    var x = (coordinates[0] - translate[0]) / (scale * 0.5),
    y = -(coordinates[1] - translate[1]) / (scale * 0.5);
    var wx = x / B;
    var lon, lat;
    var z = Math.sqrt(1 - 0.25 * (wx * wx + y * y));
    var zz2_1 = 2 * z * z - 1;
    if(Math.abs(zz2_1) < 1e-10) {
      lon = NaN;
      lat = NaN;
    } else {
      lon = aatan2(wx * z, zz2_1) * B;
      lat = aasin(z * y);
    }
    return [(lon + origin[0]) / d3_geo_radians, (lat + origin[1]) / d3_geo_radians];
  };

  hammer.origin = function(origin_degrees) {
    if (!arguments.length) {
      return [
        origin[0] / d3_geo_radians,
        origin[1] / d3_geo_radians
      ];
    }
    origin = [
      origin_degrees[0] * d3_geo_radians,
      origin_degrees[1] * d3_geo_radians
    ];
    return hammer;
  };

  hammer.scale = function(x) {
    if (!arguments.length) return scale;
    scale = +x;
    return hammer;
  };
  
  hammer.translate = function(x) {
    if (!arguments.length) return translate;
    translate = [+x[0], +x[1]];
    return hammer;
  };

  hammer.shouldInterpolate = function() { return true; }

  // TODO(Gabor Angeli)
  // Detect the case when a polygon spans the crescent on both the left and
  // right edges of the globe (or top and bottom). In this case, a solid grey
  // circle appears covering the entire projection.
  // This is a bit of a hack; it would be better for this to be handled in
  // path.js, but it's very hard to detect.
  hammer.validatePath = function(path) {
    if (B > 1.25) return true; // only a problem for Lambert Azimuthal
    for (var i = 0; i < path.length; ++i) {
      var lon = path[i][0] * d3_geo_radians - origin[0],
          lat = path[i][1] * d3_geo_radians;
      while (lon < -Math.PI) lon += Math.PI * 2.0;
      while (lon > Math.PI) lon -= Math.PI * 2.0;
      var center = rotateLatitude(lon, lat, -origin[1]),
          lon = center[0],
          lat = center[1],
          toleranceLon = Math.PI / 4,
          toleranceLat = Math.PI / 12;
      if (lon < Math.PI - toleranceLon && lon > -Math.PI + toleranceLon &&
          lat < Math.PI / 2 - toleranceLat && lat > -Math.PI / 2 + toleranceLat) {
        return true;
      }
    }
    // case: every point is somewhere near the edge of the globe; be safe
    //       and ignore the path.
    return false;
  }

  return hammer.origin([0, 0]);
};

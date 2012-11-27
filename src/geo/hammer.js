// Generalized Hammer projection; encompasses Lambert Azimuthal
//
// Implemented by Sukolsak Sakshuwong and Gabor Angeli

d3.geo.hammer = function(B) {
  if (B == undefined) B = 2.0;
  var origin,
      scale  = 500.0,
      translate = [480, 250];

  function hammer(coordinates_degrees, return_wrap) {
    // Core variables
    var lon = coordinates_degrees[0] * d3_geo_radians - origin[0],
        lat = coordinates_degrees[1] * d3_geo_radians - origin[1],
        clon = Math.cos(lon),
        slon = Math.sin(lon),
        clat = Math.cos(lat),
        slat = Math.sin(lat);
    var have_wrapped = false;
    while (lon < -Math.PI) {
      lon += Math.PI * 2.0;
      have_wrapped = !have_wrapped;
    }
    while (lon > Math.PI) {
      lon -= Math.PI * 2.0;
      have_wrapped = !have_wrapped;
    }
    // Projection
    var sqrt2 = Math.sqrt(2),
        sin_lon_over_b = Math.sin(lon / B),
        cos_lon_over_b = Math.cos(lon / B),
        nu = Math.sqrt(1 + clat * cos_lon_over_b),
        x = B * sqrt2 * clat * sin_lon_over_b / nu,
        y = - sqrt2 * slat / nu;
    if( return_wrap ) {
      return [
        scale * 0.5 * x + translate[0],
        scale * 0.5 * y + translate[1],
        have_wrapped
      ];
    } else {
      return [
        scale * 0.5 * x + translate[0],
        scale * 0.5 * y + translate[1]
      ];
    }
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
    var EPS10 = 1.e-10;
    var lon, lat;
    var z = Math.sqrt(1 - 0.25 * (wx * wx + y * y));
    var zz2_1 = 2 * z * z - 1;
    if(Math.abs(zz2_1) < EPS10) {
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

  return hammer.origin([0, 0]);
};

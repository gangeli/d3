// Generalized Hammer projection; encompasses Lambert Azimuthal
//
// Implemented by Sukolsak Sakshuwong and Gabor Angeli

d3.geo.hammer = function(B) {
  if (B == undefined) B = 2.0;
  var origin,
      scale  = 500.0,
      translate = [480, 250];

  function hammer(coordinates_degrees, return_wrap) {
    var lon = coordinates_degrees[0] * d3_geo_radians - origin[0],
        lat = coordinates_degrees[1] * d3_geo_radians - origin[1],
        clon = Math.cos(lon),
        slon = Math.sin(lon),
        clat = Math.cos(lat),
        slat = Math.sin(lat);
    var have_wrapped = false;
    if (lon < -Math.PI) {
      lon += Math.PI * 2.0;
      have_wrapped = true;
    }
    if (lon > Math.PI) {
      lon -= Math.PI * 2.0;
      have_wrapped = true;
    }
    var sqrt2 = Math.sqrt(2),
        sin_lon_over_b = Math.sin(lon / B),
        cos_lon_over_b = Math.cos(lon / B),
        nu = Math.sqrt(1 + clat * cos_lon_over_b)
        x = B * sqrt2 * clat * sin_lon_over_b / nu,
        y = - sqrt2 * slat / nu;
    if( return_wrap ) {
      return [
        scale * 0.375 * x + translate[0],
        scale * 0.375 * y + translate[1],
        have_wrapped
      ];
    } else {
      return [
        scale * 1.5 * x + translate[0],
        scale * 1.5 * y + translate[1]
      ];
    }
  }

  hammer.invert = function(coordinates) {
    console.log("invert hammer");
    // TODO(gangeli): Implement Me!
    return [0.0, 0.0]
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

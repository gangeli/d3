// Composite projection, as described in:
// "Adaptive Composite Map Projections" by Bernhard Jenny 2012
// http://cartography.oregonstate.edu/pdf/2012_Jenny_AdaptiveCompositeMapProjections.pdf
//
// Implemented by Sukolsak Sakshuwong and Gabor Angeli

var d3_geo_radians = Math.PI / 180;

d3.geo.composite = function(viewport) {
  var origin,
      scale  = 1.0,
      width  = viewport[2] - viewport[0],
      height = viewport[3] - viewport[1],
      smaller_dimension = Math.min(width, height),
      viewport_center = [viewport[0] + width/2, viewport[1] + height/2]
 
  var albers   = d3.geo.albers(),
      mercator = d3.geo.mercator();
  albers.translate(viewport_center);
  mercator.translate(viewport_center);

  var update_albers = function() {
    var origin_degrees = [
        origin[0] / d3_geo_radians,
        origin[1] / d3_geo_radians
      ];
    var top_latitude    = origin[1] + Math.sin( 1.0 / (4.0 * scale) );
    var bottom_latitude = origin[1] - Math.sin( 1.0 / (4.0 * scale) );
    var latitude_range = top_latitude - bottom_latitude;
    console.log(
      (bottom_latitude + 15.0 * latitude_range / 100.0) / d3_geo_radians,
      (top_latitude - 15.0 * latitude_range / 100.0) / d3_geo_radians);
    albers.parallels([
      (bottom_latitude + 15.0 * latitude_range / 100.0) / d3_geo_radians,
      (top_latitude - 15.0 * latitude_range / 100.0) / d3_geo_radians
      ]);
    albers.origin(origin_degrees);
    albers.scale(scale * smaller_dimension / 2.0);
  }

  function composite(coordinates_degrees, return_wrap) {
    var lon = coordinates_degrees[0] * d3_geo_radians - origin[0],
        lat = coordinates_degrees[1] * d3_geo_radians - origin[1],
        clon = Math.cos(lon),
        slon = Math.sin(lon),
        clat = Math.cos(lat),
        slat = Math.sin(lat);
    var have_wrapped = false;
    if (lon < -3.1415926535) {
      lon += 3.1415926535 * 2.0;
      have_wrapped = true;
    }
    if (lon > 3.1415926535) {
      lon -= 3.1415926535 * 2.0;
      have_wrapped = true;
    }
    // Encompasses Hammer (B = 2) and Lambert Azimuthal (B = 1)
    function generalized_hammer(B) {
      var sqrt2 = Math.sqrt(2),
          sin_lon_over_b = Math.sin(lon / B),
          cos_lon_over_b = Math.cos(lon / B),
          nu = 2.0 * Math.sqrt(1 + clat * cos_lon_over_b)
          x = B * sqrt2 * clat * sin_lon_over_b / nu,
          y = - sqrt2 * slat / nu;
      if( return_wrap ) {
        return [
          scale * smaller_dimension * x  + viewport_center[0],
          scale * smaller_dimension * y  + viewport_center[1],
          have_wrapped
        ];
      } else {
        return [
          scale * smaller_dimension * x  + viewport_center[0],
          scale * smaller_dimension * y  + viewport_center[1]
        ];
      }
    }
    // Decision Tree
    if (scale <= 1.5) {
      return generalized_hammer(2.0);
    } else if (scale <= 2.0) {
      return generalized_hammer( 2.0 - (scale-1.5) * 2.0 );
    } else if (scale <= 5.0) {
      return generalized_hammer(1.0);
    } else if (scale <= 13) {
      return albers(coordinates_degrees);
    } else if (scale <= 15) {
      var lambda = (scale - 13.0) / 2.0,
          a = albers(coordinates_degrees),
          b = mercator(coordinates_degrees);
      return [(1.0 - lambda)*a[0] + lambda*b[0],
              (1.0 - lambda)*a[1] + lambda*b[1]];
    } else {
      return mercator(coordinates_degrees);
    }
  }

  composite.invert = function(coordinates) {
    console.log("I was called");
    // TODO(gangeli): Implement Me!
    return [0.0, 0.0]
  };

  composite.origin = function(origin_degrees) {
    if (!arguments.length) {
      return [
        origin[0] / d3_geo_radians,
        origin[1] / d3_geo_radians
      ];
    }
    origin = [
      origin_degrees[0] * d3_geo_radians,
      origin_degrees[1] * d3_geo_radians
    ]
    update_albers()
    return composite;
  };

  composite.scale = function(x) {
    if (!arguments.length) return scale;
    scale = +x;
    mercator.scale(x * smaller_dimension);
    update_albers()
    return composite;
  };

  return composite.origin([0, 0]);
};

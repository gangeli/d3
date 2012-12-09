// Composite projection, as described in:
// "Adaptive Composite Map Projections" by Bernhard Jenny 2012
// http://cartography.oregonstate.edu/pdf/2012_Jenny_AdaptiveCompositeMapProjections.pdf
//
// Implemented by Sukolsak Sakshuwong and Gabor Angeli

var d3_geo_radians = Math.PI / 180;

d3.geo.composite = function(viewport) {
  var origin = [0, 0],
      scale  = 1.0,
      width  = viewport[2] - viewport[0],
      height = viewport[3] - viewport[1],
      smaller_dimension = Math.min(width, height),
      viewport_center = [viewport[0] + width/2, viewport[1] + height/2];

  var albers_conic = function(origin, scale, alpha, dest_parallel) {
         var origin_degrees = [
             origin[0] / d3_geo_radians,
             origin[1] / d3_geo_radians
           ];
         var top_coord = [viewport_center[0], viewport[1]],
             bot_coord = [viewport_center[0], viewport[3]],
             top_latitude = impl.invert(top_coord)[1], // FIXME: which impl?
             bottom_latitude = impl.invert(bot_coord)[1],
             latitude_range = top_latitude - bottom_latitude,
             top_parallel = top_latitude - 15 * latitude_range / 100.0,
             bottom_parallel = bottom_latitude + 15 * latitude_range / 100.0;
         if (typeof alpha != "undefined") {
           top_parallel = (1 - alpha) * top_parallel + alpha * dest_parallel;
           bottom_parallel = (1 - alpha) * bottom_parallel + alpha * dest_parallel;
         }
         return d3.geo.albers()
           .parallels([
             bottom_parallel,
             top_parallel])
           .origin(origin_degrees)
           .scale(scale * smaller_dimension * 0.5)
       },
     hammer = function(B, origin, scale) {
         return d3.geo.hammer(B)
           .scale(scale * smaller_dimension)
           .origin([origin[0] / d3_geo_radians, origin[1] / d3_geo_radians]);
       },
     lambert_azimuthal = function(origin, scale) {
         return d3.geo.lambert_azimuthal()
           .scale(scale * smaller_dimension)
           .origin([origin[0] / d3_geo_radians, origin[1] / d3_geo_radians]);
       },
     lambert_cylindrical = function(origin, scale) {
         return d3.geo.lambert_cylindrical()
           .scale(scale * smaller_dimension)
           .origin([origin[0] / d3_geo_radians, origin[1] / d3_geo_radians]);
       },
     mercator = function(origin, scale) {
         var merc = d3.geo.mercator()
           .scale(scale * smaller_dimension * 3.14) // FIXME: magic number
           .translate([-480, -250]);
         var origin_degrees = [origin[0] / d3_geo_radians, origin[1] / d3_geo_radians],
             tmp = merc(origin_degrees);
         return merc
           .translate([-tmp[0], -tmp[1]]);
       },
     mercator_interpolated = function(origin, scale, alpha) {
       var impl1 = select_impl(origin, scale, true)[0],
           impl2 = mercator(origin, scale);
       var ret = function(coordinates) {
         var xy = impl1(coordinates),
             xy2 = impl2(coordinates);
         return [(1 - alpha) * xy[0] + alpha * xy2[0], (1 - alpha) * xy[1] + alpha * xy2[1]];
       };
       ret.invert = function(coordinates) {
         var xy = impl1.invert(coordinates),
             xy2 = impl2.invert(coordinates);
         return [(1 - alpha) * xy[0] + alpha * xy2[0], (1 - alpha) * xy[1] + alpha * xy2[1]];
       };
       ret.shouldInterpolate = true;
       return ret;
     },

     impl,
     impl_name = "",
     select_impl = function(origin, scale, dontInterpolate) {
         var lat = Math.abs(origin[1]) * 180 / Math.PI;
         if (scale <= 1.5) {
           return [hammer(2.0, origin, scale), "Hammer"];
         } else if (scale <= 2.0) {
           return [hammer(2.0 - (scale-1.5) * 2.0, origin, scale), "Modified Hammer"];
         } else if (scale <= 4.0) {
           return [lambert_azimuthal(origin, scale), "Lambert azimuthal"];
         } else if (scale <= 6.0 && lat < 22) {
           var lat2 = (scale - 4.0) * 15 / 2;
           if (lat < lat2) {
             return [lambert_cylindrical(origin, scale), "Lambert cylindrical"];
           } else {
             return [albers_conic(origin, scale, (22 - lat) / (22 - lat2), 0),
               "Albers conic with adjusted standard parallels"];
           }
         } else if (scale <= 13 || (scale < 15 && dontInterpolate)) {
           if (lat <= 15) {
             return [lambert_cylindrical(origin, scale), "Lambert cylindrical"];
           } else if (lat >= 75) {
             return [lambert_azimuthal(origin, scale), "Lambert azimuthal"];
           } else {
             if (lat < 22) {
               return [albers_conic(origin, scale, (22 - lat) / (22 - 15), 0),
                 "Albers conic with adjusted standard parallels"];
             } else if (lat > 60) {
               return [albers_conic(origin, scale, (lat - 60) / (75 - 60), 90),
                 "Albers conic with adjusted standard parallels"];
             } else {
               return [albers_conic(origin, scale), "Albers conic"];
             }
           }
         } else if (scale < 15) {
           return [mercator_interpolated(origin, scale, (scale - 13) / 2), "Interpolation with Mercator"];
         } else {
           return [mercator(origin, scale), "Mercator"];
         }
       },
     update_impl = function(origin, scale) {
       var tmp = select_impl(origin, scale);
       impl = tmp[0];
       impl_name = tmp[1];
     }

     update_impl(origin, scale);

  function composite(coordinates_degrees, return_wrap) {
    return impl(coordinates_degrees, return_wrap);
  }

  composite.invert = function(coordinates) {
    return impl.invert(coordinates);
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
    ];
    while (origin[0] < -Math.PI) origin[0] += Math.PI * 2.0;
    while (origin[0] > Math.PI) origin[0] -= Math.PI * 2.0;
    while (origin[1] < -Math.PI) origin[1] += Math.PI * 2.0;
    while (origin[1] > Math.PI) origin[1] -= Math.PI * 2.0;
    update_impl(origin, scale);
    return composite;
  };

  composite.scale = function(x) {
    if (!arguments.length) return scale;
    scale = +x;
    update_impl(origin, scale);
    return composite;
  };
  
  composite.projectionName = function() {
    return impl_name;
  };

  composite.shouldInterpolate = function() {
    return impl.shouldInterpolate;
  }

  composite.validatePath = function(path) {
    if (impl.validatePath != undefined) { return impl.validatePath(path); }
    return true;
  }

  return composite;
};

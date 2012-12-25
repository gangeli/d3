// Composite projection, as described in:
// "Adaptive Composite Map Projections" by Bernhard Jenny 2012
// http://cartography.oregonstate.edu/pdf/2012_Jenny_AdaptiveCompositeMapProjections.pdf
//
// Implemented by Sukolsak Sakshuwong and Gabor Angeli

d3.geo.composite = function(viewport) {
  if (viewport == undefined) {
    viewport = [0, 0, 960, 500];
  }
  var origin = [0, 0],
      scale  = 100.0,
      width  = viewport[2] - viewport[0],
      height = viewport[3] - viewport[1],
      smaller_dimension = Math.min(width, height) * 0.5,
      viewport_center = [viewport[0] + width/2, viewport[1] + height/2];

  var albers_conic = function(origin, scale, alpha, dest_parallel) {
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
           .rotate([-origin[0], 0])
           .center([0, origin[1]])
           .scale(scale * smaller_dimension)
           ;
       },
     hammer = function(B, origin, scale) {
         return d3.geo.hammer()
           .B(B)
           .scale(scale * smaller_dimension)
           .rotate([-origin[0], -origin[1]]);
       },
     lambert_azimuthal = function(origin, scale) {
        return d3.geo.azimuthalEqualArea()
           .scale(scale * smaller_dimension)
           .rotate([-origin[0], -origin[1]]);
       },
     lambert_cylindrical = function(origin, scale) {
         return d3.geo.lambert_cylindrical()
           .scale(scale * smaller_dimension)
           .rotate([-origin[0], 0])
           .center([0, origin[1]]);
       },
     mercator = function(origin, scale) {
         return d3.geo.mercator()
           .scale(scale * smaller_dimension * 2 * π)
           .rotate([-origin[0], 0])
           .center([0, origin[1]]);
       },
     interpolation = function(impl1, impl2, α, δλ) {
       var rotateλ = function(projection, δλ) {
         var rotate = projection.rotate();
         rotate[0] += δλ;
         return projection.rotate(rotate);
       }
       impl1 = rotateλ(impl1, δλ);
       impl2 = rotateλ(impl2, δλ);
       var p = function(λ, φ) {
         var point = [λ * d3_degrees, φ * d3_degrees],
             xy = impl1(point),
             xy2 = impl2(point);
         return [
           ((1 - α) * xy[0] + α * xy2[0]),
           -((1 - α) * xy[1] + α * xy2[1])
         ];
       };
       p.invert = function(x, y) {
         var point = [x, -y];
         var xy = impl1.invert(point),
             xy2 = impl2.invert(point);
         return [
           ((1 - α) * xy[0] + α * xy2[0]) * d3_radians,
           ((1 - α) * xy[1] + α * xy2[1]) * d3_radians
         ];
       };
       
       var center = p(0, 0);
       var ret = d3_geo_projection(p)
         .rotate([-δλ, 0]) // need to rotate here to make the antimeridian cutting work
         .scale(1)
         .translate([center[0], -center[1]]);
       ret.raw = p;
       return ret;
     },
     mercator_interpolated = function(origin, scale, α) {     
       var impl1 = select_impl(origin, scale, true)[0],
           impl2 = mercator(origin, scale);
       return interpolation(impl1, impl2, α, origin[0]);
     },

     impl,
     impl_name = "",
     select_impl = function(origin, scale, dontInterpolate) {
         var lat = Math.abs(origin[1]);
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
               return [albers_conic(origin, scale, (lat - 60) / (75 - 60), (origin[1] > 0) ? 90 : -90),
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
       scale /= smaller_dimension;
       var tmp = select_impl(origin, scale);
       impl = tmp[0];
       composite.precision = impl.precision;
       impl_name = tmp[1];
     }

     update_impl(origin, scale);

  function composite(point) {
    return impl(point);
  }

  composite.invert = function(point) {
    return impl.invert(point);
  };
  
  composite.stream = function(stream) {
    return impl.stream(stream);
  }
  
  composite.clipAngle = function(_) {
    if (!arguments.length) return impl.clipAngle;
    //FIXME: not persistent
    impl = impl.clipAngle(_);
    return composite;
  };
  
  composite.translate = function(_) {
    if (!arguments.length) return impl.translate();
    //FIXME: not persistent
    impl = impl.translate(_);
    return composite;
  };
  
  composite.origin = function(_) {
    if (!arguments.length) return origin;
    origin = _;
    update_impl(origin, scale);
    return composite;
  }

  composite.scale = function(_) {
    if (!arguments.length) return scale;
    scale = +_;
    update_impl(origin, scale);
    return composite;
  };
  
  composite.projectionName = function() {
    return impl_name;
  };

  return composite;
};

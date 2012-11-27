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

  var albers_conic = function(origin, scale) {
         // TODO(gangeli)
         var origin_degrees = [
             origin[0] / d3_geo_radians,
             origin[1] / d3_geo_radians
           ];
         var top_latitude    = origin[1] + Math.sin( 1.0 / (4.0 * scale) );
         var bottom_latitude = origin[1] - Math.sin( 1.0 / (4.0 * scale) );
         var latitude_range = top_latitude - bottom_latitude;
         return d3.geo.albers().scale(smaller_dimension)
          .parallels([
            (bottom_latitude + 15.0 * latitude_range / 100.0) / d3_geo_radians,
            (top_latitude - 15.0 * latitude_range / 100.0) / d3_geo_radians]);
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
         // TODO(gangeli)
         return d3.geo.lambert_cylindrical()
           .scale(scale * smaller_dimension)
       },
     mercator = function(origin, scale) {
         // TODO(gangeli)
         return d3.geo.mercator();
       },

     select_impl = function(origin, scale) {
         if (scale <= 1.5) {
           console.log("hammer");
           return hammer(2.0, origin, scale);
         } else if (scale <= 2.0) {
           console.log("modified hammer");
           return hammer(2.0 - (scale-1.5) * 2.0, origin, scale);
         } else if (scale <= 4.0) {
           console.log("lambert azimuthal");
           return lambert_azimuthal(origin, scale);
         } else if (scale <= 6.0 && Math.abs(origin[1]) < Math.PI / 12) {
           if (Math.abs(origin[1]) < (scale - 4.0) * Math.PI / 6) {
             console.log("lambert cylindrical");
             return lambert_cylindrical(origin, scale);
           } else {
             console.log("albers conic");
             return albers_conic(origin, scale);
           }
         } else if (scale <= 13) {
           if (Math.abs(origin[1]) <= Math.PI / 12) {
             console.log("lambert cylindrical");
             return lambert_cylindrical(origin, scale);
           } else if (Math.abs(origin[1]) >= 5.0 * Math.PI / 12) {
             console.log("lambert azimuthal");
             return lambert_azimuthal(origin, scale);
           } else {
             console.log("albers conic");
             return albers_conic(origin, scale);
           }
         } else {
           console.log("Mercator not implemented yet!");
         }
       },

     impl = select_impl(origin, scale);

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
    impl = select_impl(origin, scale);
    return composite;
  };

  composite.scale = function(x) {
    if (!arguments.length) return scale;
    scale = +x;
    impl = select_impl(origin, scale);
    return composite;
  };

  return composite;
};

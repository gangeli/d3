// Lambert Azimuthal and Lambert Cylindrical projections
//
// Implemented by Sukolsak Sakshuwong and Gabor Angeli

d3.geo.lambert_azimuthal   = function() { return d3.geo.hammer(1.0); }

d3.geo.lambert_cylindrical = function() {
  var scale  = 500.0,
      translate = [480, 250];

  function lambert_cylindrical(coordinates_degrees) {
    var lon = coordinates_degrees[0] * d3_geo_radians,
        lat = coordinates_degrees[1] * d3_geo_radians,
        slat = Math.sin(lat),
        x_unnormalized = lon,
        y_unnormalized = -slat;
    return [x_unnormalized * scale / 2.0 - translate[0],
            y_unnormalized * scale / 2.0 - translate[1]];
  }

  lambert_cylindrical.invert = function(coordinates) {
    var x = coordinates[0],
        y = coordinates[1],
        lon_radians = x - translate[0] * Math.PI / scale,
        lat_radians = Math.asin(-(y - translate[1] * 2.0 / scale)),
        lon = lon_radians / d3_geo_radians,
        lat = lat_radians / d3_geo_radians;
    return [lon, lat];
  };

  lambert_cylindrical.scale = function(x) {
    if (!arguments.length) return scale;
    scale = +x;
    return lambert_cylindrical;
  };
  
  lambert_cylindrical.translate = function(x) {
    if (!arguments.length) return translate;
    translate = [+x[0], +x[1]];
    return lambert_cylindrical;
  };
  
  lambert_cylindrical.origin = function(origin_degrees) {
    if (!arguments.length) return lambert_cylindrical.invert(translate);
    translate = lambert_cylindrical(origin_degrees);
    return lambert_cylindrical;
  };

  return lambert_cylindrical;
}

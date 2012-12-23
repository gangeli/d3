// Lambert Azimuthal and Lambert Cylindrical projections
//
// Implemented by Sukolsak Sakshuwong and Gabor Angeli

//d3.geo.lambert_azimuthal   = function() { return d3.geo.hammer(1.0); }

function d3_geo_lambert_cylindrical() {
  function lambert_cylindrical(λ, φ) {
    return [λ / 2,
            Math.sin(φ) / 2];
  }

  lambert_cylindrical.invert = function(x, y) {
    return [x * 2,
            Math.asin(y * 2)];
  };

  return lambert_cylindrical;
}

(d3.geo.lambert_cylindrical = function() {
  return d3_geo_projection(d3_geo_lambert_cylindrical()).scale(500);
}).raw = d3_geo_lambert_cylindrical;

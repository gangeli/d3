// Generalized Hammer projection; encompasses Lambert Azimuthal
//
// Implemented by Sukolsak Sakshuwong and Gabor Angeli


function d3_geo_hammer(B) {
  if (B == undefined) B = 2.0;

  function hammer(λ, φ) {
    // Adjust Lat/Lon
    var lon = λ,
        lat = φ;

    // Projection
    var sqrt2 = Math.sqrt(2),
        clat = Math.cos(lat),
        slat = Math.sin(lat),
        sin_lon_over_b = Math.sin(lon / B),
        cos_lon_over_b = Math.cos(lon / B),
        nu = Math.sqrt(1 + clat * cos_lon_over_b);
    if (nu == 0)
      nu = 1e-12;
    var x = B * sqrt2 * clat * sin_lon_over_b / nu,
        y = sqrt2 * slat / nu;
    return [
      0.5 * x,
      0.5 * y
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

  hammer.invert = function(_x, _y) {
    var x = _x / 0.5,
    y = _y / 0.5;
    var wx = x / B;
    var lon, lat;
    var z = Math.sqrt(1 - 0.25 * (wx * wx + y * y));
    var zz2_1 = 2 * z * z - 1;
    if (zz2_1 == 0)
      zz2_1 = 1e-10;
    lon = aatan2(wx * z, zz2_1) * B;
    lat = aasin(z * y);
    return [lon, lat];
  };

  return hammer;
};

(d3.geo.hammer = function() {
  var B = 2.0,
      m = d3_geo_projectionMutator(d3_geo_hammer),
      p = m(B);

  p.B = function(_) {
    if (!arguments.length) return B;
    return m(B = _);
  };

  return p.scale(500);
}).raw = d3_geo_hammer;

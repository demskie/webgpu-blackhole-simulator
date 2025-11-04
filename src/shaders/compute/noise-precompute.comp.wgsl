// Compute shader to precompute multi-octave noise into 3D textures
// X: radial distance (normalized), Y: angular position, Z: vertical distance from disc

@group(0) @binding(0) var noiseSampler: sampler;
@group(0) @binding(1) var noiseTexture: texture_2d<f32>;
@group(0) @binding(2) var outputTexture: texture_storage_3d<rgba16float, write>;

override NOISE_TYPE: u32;  // 1 for noise1 (4 octaves), 2 for noise2 (6 octaves)

// Simplified noise function that matches the original
fn noise(x: vec3<f32>) -> f32 {
  let p = floor(x);
  let f = fract(x);
  let ff = f * f * (3.0 - 2.0 * f);
  let uv = (p.xy + vec2<f32>(37.0, 17.0) * p.z) + ff.xy;
  let rg = textureSampleLevel(noiseTexture, noiseSampler, (uv + 0.5) / 256.0, 0.0).yx;
  return -1.0 + 2.0 * mix(rg.x, rg.y, ff.z);
}

@compute @workgroup_size(8, 8, 4)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(outputTexture);
  if (gid.x >= dims.x || gid.y >= dims.y || gid.z >= dims.z) { return; }

  // Convert to normalized coordinates
  let coord = vec3<f32>(gid) / vec3<f32>(dims);
  
  // Map coordinates to physical space
  // X: radial distance (0 to ~8 to cover disc inner/outer with margin)
  // Y: angular position (0 to 2π)
  // Z: vertical distance (-2 to 2 to cover disc thickness with margin)
  var radialCoords: vec3<f32>;
  radialCoords.x = coord.x * 8.0;  // Maps to distance range
  radialCoords.y = coord.y * 6.28318530718;  // Maps to 0-2π
  radialCoords.z = (coord.z - 0.5) * 4.0;  // Maps to -2 to 2
  
  // Scale the coordinates as done in original shader
  radialCoords *= 0.95;
  
  var result = 1.0;
  
  if (NOISE_TYPE == 1u) {
    // noise1: 4 octaves (scales 3, 6, 12, 24)
    var rc = radialCoords;
    result *= noise(rc * 3.0) * 0.5 + 0.5;
    result *= noise(rc * 6.0) * 0.5 + 0.5;
    result *= noise(rc * 12.0) * 0.5 + 0.5;
    result *= noise(rc * 24.0) * 0.5 + 0.5;
  } else if (NOISE_TYPE == 2u) {
    // noise2: 6 octaves (scales 3, 6, 12, 24, 48, 92) with offset
    result = 2.0;  // Start with 2.0 as in original
    var rc = radialCoords + 30.0;  // Apply offset as in original
    result *= noise(rc * 3.0) * 0.5 + 0.5;
    result *= noise(rc * 6.0) * 0.5 + 0.5;
    result *= noise(rc * 12.0) * 0.5 + 0.5;
    result *= noise(rc * 24.0) * 0.5 + 0.5;
    result *= noise(rc * 48.0) * 0.5 + 0.5;
    result *= noise(rc * 92.0) * 0.5 + 0.5;
  }
  
  // Store result in all channels (we only need one channel but RGBA is standard)
  textureStore(outputTexture, gid, vec4<f32>(result, result, result, 1.0));
}

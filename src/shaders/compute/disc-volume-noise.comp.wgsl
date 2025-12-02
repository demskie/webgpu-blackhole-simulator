// Compute shader to precompute multi-octave noise into 3D textures
// X: radial distance (normalized), Y: angular position, Z: vertical distance from disc

struct NoiseParams {
  octaveCount: u32,
  _padding1: u32,
  _padding2: u32,
  _padding3: u32,
}

@group(0) @binding(0) var noiseSampler: sampler;
@group(0) @binding(1) var noiseTexture: texture_2d<f32>;
@group(0) @binding(2) var outputTexture: texture_storage_3d<rgba16float, write>;
@group(0) @binding(3) var<uniform> params: NoiseParams;

override NOISE_TYPE: u32;  // 1 for noise1 (fine detail), 2 for noise2 (coarse detail with offset)

// Simplified noise function that matches the original
fn noise(x: vec3<f32>) -> f32 {
  let p = floor(x);
  let f = fract(x);
  let ff = f * f * (3.0 - 2.0 * f);
  let uv = (p.xy + vec2<f32>(37.0, 17.0) * p.z) + ff.xy;
  let rg = textureSampleLevel(noiseTexture, noiseSampler, (uv + 0.5) / 256.0, 0.0).yx;
  return -1.0 + 2.0 * mix(rg.x, rg.y, ff.z);
}

// Octave scales for noise1 (fine detail): 3, 6, 12, 24, 48, 96, 192, 384
fn getScale1(octave: u32) -> f32 {
  switch (octave) {
    case 0u: { return 3.0; }
    case 1u: { return 6.0; }
    case 2u: { return 12.0; }
    case 3u: { return 24.0; }
    case 4u: { return 48.0; }
    case 5u: { return 96.0; }
    case 6u: { return 192.0; }
    case 7u: { return 384.0; }
    case 8u: { return 768.0; }
    case 9u: { return 1536.0; }
    case 10u: { return 3072.0; }
    case 11u: { return 6144.0; }
    case 12u: { return 12288.0; }
    case 13u: { return 24576.0; }
    case 14u: { return 49152.0; }
    case 15u: { return 98304.0; }
    case 16u: { return 196608.0; }
    default: { return 3.0; }
  }
}

// Octave scales for noise2 (coarse detail): 3, 6, 12, 24, 48, 92, 184, 368
fn getScale2(octave: u32) -> f32 {
  switch (octave) {
    case 0u: { return 3.0; }
    case 1u: { return 6.0; }
    case 2u: { return 12.0; }
    case 3u: { return 24.0; }
    case 4u: { return 48.0; }
    case 5u: { return 92.0; }
    case 6u: { return 184.0; }
    case 7u: { return 368.0; }
    case 8u: { return 736.0; }
    case 9u: { return 1472.0; }
    case 10u: { return 2944.0; }
    case 11u: { return 5888.0; }
    case 12u: { return 11776.0; }
    case 13u: { return 23552.0; }
    case 14u: { return 47104.0; }
    case 15u: { return 94208.0; }
    case 16u: { return 188416.0; }
    default: { return 3.0; }
  }
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

  let octaveCount = params.octaveCount;

  if (NOISE_TYPE == 1u) {
    // noise1: Fine detail pattern (default 6 octaves)
    var result = 1.0;
    let rc = radialCoords;

    for (var i = 0u; i < octaveCount && i < 17u; i = i + 1u) {
        let scale = getScale1(i);
        result *= noise(rc * scale) * 0.5 + 0.5;
      }

      textureStore(outputTexture, gid, vec4<f32>(result, result, result, 1.0));
    } else if (NOISE_TYPE == 2u) {
      // noise2: Coarse detail pattern (default 8 octaves) with offset
      var result = 2.0;  // Start with 2.0 as in original
      let rc = radialCoords + 30.0;  // Apply offset as in original

      for (var i = 0u; i < octaveCount && i < 17u; i = i + 1u) {
        let scale = getScale2(i);
        result *= noise(rc * scale) * 0.5 + 0.5;
      }

    textureStore(outputTexture, gid, vec4<f32>(result, result, result, 1.0));
  }
}

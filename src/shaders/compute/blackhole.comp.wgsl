// Black hole raymarching moved to compute. Outputs RGBA color per pixel directly to storage texture.

struct Uniforms {
  time: f32,
  iterations: f32,
  warpAmount: f32,
  discRadius: f32,
  discWidth: f32,
  discThickness: f32,
  discSpeed: f32,
  discBrightness: f32,
  discTemperature: f32,
  discInnerFalloff: f32,
  discOuterFalloff: f32,
  discTexturePower: f32,
  discMinCoverage: f32,
  discOuterTransparency: f32,
  hazeIntensity: f32,
  temporalBlendWeight: f32,
  cameraRotationX: f32,
  cameraRotationY: f32,
  brightnessFactor: f32,
  cameraPanX: f32,
  cameraPanY: f32,
  blackHoleRotationX: f32,
  blackHoleRotationY: f32,
  blackHoleRotationZ: f32,
  stepMinScale: f32,
  stepMaxScale: f32,
  stepNearFactor: f32,
  stepFarFactor: f32,
  // Palette colors (added for in-shader colorization)
  centerColorR: f32,
  centerColorG: f32,
  centerColorB: f32,
  discInnerColorR: f32,
  discInnerColorG: f32,
  discInnerColorB: f32,
  discOuterColorR: f32,
  discOuterColorG: f32,
  discOuterColorB: f32,
  // Overall color intensity multiplier
  colorIntensity: f32,
  // Color transition thresholds along proximity t (0 outer -> 1 inner)
  colorOuterToInnerPoint: f32,
  colorInnerToCenterPoint: f32,
}

struct Resolution {
  width: f32,
  height: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<uniform> resolution: Resolution;
@group(0) @binding(2) var noiseSampler: sampler;
@group(0) @binding(3) var noiseTexture: texture_2d<f32>;
@group(0) @binding(4) var proceduralSampler: sampler;
@group(0) @binding(5) var proceduralTexture: texture_2d<f32>;
@group(0) @binding(6) var previousFrameSampler: sampler;
@group(0) @binding(7) var previousFrameTexture: texture_2d<f32>;
@group(0) @binding(8) var outputTexture: texture_storage_2d<rgba16float, write>;
// Precomputed 3D noise textures
@group(0) @binding(9) var noise3DSampler: sampler;
@group(0) @binding(10) var noise1Texture: texture_3d<f32>;
@group(0) @binding(11) var noise2Texture: texture_3d<f32>;

const PI: f32 = 3.14159265;


fn pcgHash(seed: u32) -> u32 {
    let state = seed * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

// fn rand(seed: u32) -> i32 {
//     return bitcast<i32>(pcgHash(seed));
// }

// fn randRange(seed: u32, min: i32, max: i32) -> i32 {
//     return (rand(seed) % (max - min)) + min;
// }

// fn randNormalRange(seed: u32, min: i32, max: i32) -> i32 {
//     let a = pcgHash(seed) / 3u;
//     let b = pcgHash(seed + 1u) / 3u;
//     let c = pcgHash(seed + 2u) / 3u;
//     return (bitcast<i32>(a + b + c) % (max - min)) + min;
// }

fn saturate_f32(x: f32) -> f32 { return clamp(x, 0.0, 1.0); }
fn saturate_vec3(x: vec3<f32>) -> vec3<f32> { return clamp(x, vec3<f32>(0.0), vec3<f32>(1.0)); }

fn rand(coord: vec2<f32>) -> f32 {
  return saturate_f32(fract(sin(dot(coord, vec2<f32>(12.9898, 78.223))) * 43758.5453));
}

fn smootherstep(edge0: f32, edge1: f32, x: f32) -> f32 {
  let t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

fn paletteColor(t: f32) -> vec3<f32> {
  // t: 0 = outer disc, 1 = inner disc (toward center)
  // Interpret uniforms as relative widths (percentages)
  var outerWidth = clamp(uniforms.colorOuterToInnerPoint, 0.0, 1.0);
  var centerWidth = clamp(uniforms.colorInnerToCenterPoint, 0.0, 1.0);
  let sumWidths = outerWidth + centerWidth;
  if (sumWidths > 0.98) {
    let s = 0.98 / sumWidths;
    outerWidth *= s;
    centerWidth *= s;
  }
  let o2iEnd = outerWidth;            // end of outer region
  let i2cStart = 1.0 - centerWidth;   // start of center region

  // Smooth transitions across the computed regions
  let tOuterInner = smootherstep(0.0, max(o2iEnd, 0.0001), t);
  let tInnerCenter = smootherstep(i2cStart, 1.0, t);
  var c = mix(
    vec3<f32>(uniforms.discOuterColorR, uniforms.discOuterColorG, uniforms.discOuterColorB),
    vec3<f32>(uniforms.discInnerColorR, uniforms.discInnerColorG, uniforms.discInnerColorB),
    tOuterInner
  );
  c = mix(
    c,
    vec3<f32>(uniforms.centerColorR, uniforms.centerColorG, uniforms.centerColorB),
    tInnerCenter
  );
  return c;
}

fn noise(x: vec3<f32>) -> f32 {
  let p = floor(x);
  let f = fract(x);
  let ff = f * f * (3.0 - 2.0 * f);
  let uv = (p.xy + vec2<f32>(37.0, 17.0) * p.z) + ff.xy;
  let rg = textureSampleLevel(noiseTexture, noiseSampler, (uv + 0.5) / 256.0, 0.0).yx;
  return -1.0 + 2.0 * mix(rg.x, rg.y, ff.z);
}

fn pcurve(x: f32, a: f32, b: f32) -> f32 {
  let k = pow(a + b, a + b) / (pow(a, a) * pow(b, b));
  return k * pow(x, a) * pow(1.0 - x, b);
}

fn sdTorus(p: vec3<f32>, t: vec2<f32>) -> f32 {
  let q = vec2<f32>(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

fn rotate(p: vec3<f32>, x: f32, y: f32, z: f32) -> vec3<f32> {
  let matx = mat3x3<f32>(
    1.0, 0.0, 0.0,
    0.0, cos(x), sin(x),
    0.0, -sin(x), cos(x)
  );
  let maty = mat3x3<f32>(
    cos(y), 0.0, -sin(y),
    0.0, 1.0, 0.0,
    sin(y), 0.0, cos(y)
  );
  let matz = mat3x3<f32>(
    cos(z), sin(z), 0.0,
    -sin(z), cos(z), 0.0,
    0.0, 0.0, 1.0
  );
  var result = maty * p;  // Yaw
  result = matx * result; // Pitch
  result = matz * result; // Roll
  return result;
}

fn rotation_matrix(x: f32, y: f32, z: f32) -> mat3x3<f32> {
  let cx = cos(x); let sx = sin(x);
  let cy = cos(y); let sy = sin(y);
  let cz = cos(z); let sz = sin(z);

  let matx = mat3x3<f32>(
    1.0, 0.0, 0.0,
    0.0, cx,  sx,
    0.0, -sx, cx
  );
  let maty = mat3x3<f32>(
    cy,  0.0, -sy,
    0.0, 1.0,  0.0,
    sy,  0.0,  cy
  );
  let matz = mat3x3<f32>(
    cz,  sz, 0.0,
    -sz, cz, 0.0,
    0.0, 0.0, 1.0
  );
  return matz * matx * maty;
}

// Returns intensity value for grayscale output (0.0 = black, 1.0 = white)
fn calculateIntensity(radialGradient: f32, distFromCenter: f32, bloomFactor: f32) -> f32 {
  // radialGradient is 1.0 at inner edge, 0.0 at outer edge
  // Use it to create smooth intensity transitions
  let baseIntensity = radialGradient * radialGradient; // Quadratic falloff
  
  // Add bloom contribution
  let bloomContribution = saturate_f32(bloomFactor * bloomFactor * 0.5);
  
  // Combine intensities with artistic control
  return saturate_f32(baseIntensity + bloomContribution);
}

fn haze(color: ptr<function, vec3<f32>>, pos: vec3<f32>, alpha: f32, invIterations: f32) {
  let t = vec2<f32>(1.0, 0.01);
  let torusDist = length(sdTorus(pos + vec3<f32>(0.0, -0.05, 0.0), t));
  var bloomDisc = 1.0 / (torusDist * torusDist + 0.001);
  bloomDisc *= select(1.0, 0.0, length(pos) < 0.5);
  let hazeAmount = bloomDisc * (uniforms.hazeIntensity * invIterations) * (1.0 - alpha * 1.0);
  *color = *color + vec3<f32>(hazeAmount) * (1.0 - alpha);
}

fn gasDisc(color: ptr<function, vec3<f32>>, alpha: ptr<function, f32>, pos: vec3<f32>, invIterations: f32) {
  let discInner = uniforms.discRadius - uniforms.discWidth * 0.5;
  let discOuter = uniforms.discRadius + uniforms.discWidth * 0.5;

  let origin = vec3<f32>(0.0, 0.0, 0.0);
  let discNormal = vec3<f32>(0.0, 1.0, 0.0);
  var discThickness = uniforms.discThickness;

  let distFromCenter = distance(pos, origin);
  let distFromDisc = dot(discNormal, pos - origin);

  // Early rejection: quick bounds test before expensive shaping/noise
  let margin = uniforms.discThickness * 3.0; // Conservative margin for bloom/haze effects
  if (distFromCenter < discInner - margin || distFromCenter > discOuter + margin) { return; }
  if (abs(distFromDisc) > margin) { return; }

  // Normalize radial position across the full disc width: 0 at outer edge, 1 at inner edge
  let normalizedRadial = saturate_f32((distFromCenter - discInner) / (discOuter - discInner));
  let radialGradient = 1.0 - normalizedRadial;
  var coverage = pcurve(radialGradient, 4.0, 0.9);

  discThickness *= radialGradient;
  coverage *= saturate_f32(1.0 - abs(distFromDisc) / discThickness);

  let rg_inv = 1.0 - radialGradient;
  let dustGlow = 1.0 / (rg_inv * rg_inv * 290.0 + 0.002);
  var dustIntensity = dustGlow * 8.2;

  coverage = saturate_f32(coverage * 0.7);

  let t = abs(distFromCenter - discInner) + 0.4;
  let t2 = t * t;
  let fade = (t2 * t2) * 0.04;
  let bloomFactor = 1.0 / (distFromDisc * distFromDisc * 40.0 + fade + 0.00002);
  var bloomIntensity = bloomFactor * sqrt(bloomFactor);

  // Mix dust and bloom intensities
  dustIntensity = mix(dustIntensity, bloomIntensity * 150.0, saturate_f32(1.0 - coverage * 1.0));
  coverage = saturate_f32(coverage + bloomFactor * bloomFactor * 0.1);

  if (coverage < 0.01) { return; }

  var radialCoords: vec3<f32>;
  radialCoords.x = distFromCenter * 1.5 + 0.55;
  radialCoords.y = atan2(-pos.x, -pos.z) * 1.5;
  radialCoords.z = distFromDisc * 1.5;
  radialCoords *= 0.95;

  let speed = uniforms.discSpeed;

  // Convert to texture coordinates for 3D lookup
  // X: radial distance (0 to 8 mapped to 0-1)
  // Y: angular position with time-based rotation (wrapped)
  // Z: vertical distance (-2 to 2 mapped to 0-1)
  var lookupCoords: vec3<f32>;
  lookupCoords.x = radialCoords.x / 8.0;
  lookupCoords.y = fract((radialCoords.y / 6.28318530718) + uniforms.time * speed * 0.5);
  lookupCoords.z = (radialCoords.z / 4.0) + 0.5;

  // Single texture lookup for precomputed multi-octave noise
  let noise1 = textureSampleLevel(noise1Texture, noise3DSampler, lookupCoords, 0.0).r;
  let noise2 = textureSampleLevel(noise2Texture, noise3DSampler, lookupCoords, 0.0).r;

  dustIntensity *= noise1 * 0.998 + 0.002;
  coverage *= max(noise2, uniforms.discMinCoverage);

  radialCoords.y += uniforms.time * speed * 0.5;
  let proceduralSample = textureSampleLevel(proceduralTexture, proceduralSampler, radialCoords.yx * vec2<f32>(0.15, 0.27), 0.0).r;
  dustIntensity *= pow(proceduralSample, uniforms.discTexturePower) * uniforms.discBrightness;

  coverage = saturate_f32(coverage * 1200.0 * invIterations);
  dustIntensity = max(0.0, dustIntensity);
  coverage *= pcurve(radialGradient, uniforms.discInnerFalloff, uniforms.discOuterFalloff);

  // Apply outer edge transparency to eliminate black shadow
  // radialGradient is 1.0 at inner edge, 0.0 at outer edge
  // So we want to fade out when radialGradient approaches 0
  let outerFade = mix(uniforms.discOuterTransparency, 1.0, radialGradient);
  coverage *= outerFade;

  // Accumulate color using palette based on radial position (inner->outer)
  let tint = paletteColor(radialGradient);
  let energy = dustIntensity * coverage;
  *color = *color + (1.0 - *alpha) * tint * energy;
  *alpha = (1.0 - *alpha) * coverage + *alpha;
}

fn rotateCamera(eyevec: ptr<function, vec3<f32>>, eyepos: ptr<function, vec3<f32>>) {
  let angle = vec3<f32>(0.0, 0.0, 0.0);
  *eyevec = rotate(*eyevec, angle.x, angle.y, angle.z);
  *eyepos = rotate(*eyepos, angle.x, angle.y, angle.z);
}

fn rotateBlackhole(pos: vec3<f32>) -> vec3<f32> {
  return rotate(pos, -uniforms.blackHoleRotationX, -uniforms.blackHoleRotationY, -uniforms.blackHoleRotationZ);
}

fn warpSpace(eyevec: ptr<function, vec3<f32>>, raypos: vec3<f32>, invIterations: f32) {
  let origin = vec3<f32>(0.0, 0.0, 0.0);
  let singularityDist = distance(raypos, origin);
  let warpFactor = 1.0 / (singularityDist * singularityDist + 0.000001);
  let singularityVector = normalize(origin - raypos);
  *eyevec = normalize(*eyevec + singularityVector * warpFactor * uniforms.warpAmount * invIterations);
}

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let width = u32(resolution.width);
  let height = u32(resolution.height);
  let x = gid.x;
  let y = gid.y;
  if (x >= width || y >= height) { return; }

  // UV and indexing
  let uv = (vec2<f32>(f32(x) + 0.5, f32(y) + 0.5)) / vec2<f32>(f32(width), f32(height));
  let aspect = resolution.width / resolution.height;

  var uveye = uv;
  uveye.x += (rand(uv + sin(uniforms.time * 1.0)) / resolution.width) * 1.0;
  uveye.y += (rand(uv + 1.0 + sin(uniforms.time * 1.0)) / resolution.height) * 1.0;

  var ndc = (uveye * 2.0 - 1.0) * vec2<f32>(aspect, 1.0);
  ndc.y = -ndc.y;
  var eyevec = normalize(vec3<f32>(ndc, 6.0));
  var eyepos = vec3<f32>(0.0, -0.0, -10.0);

  eyepos.x += uniforms.cameraPanX * 3.0;
  eyepos.y += uniforms.cameraPanY * 3.0;

  let far = 15.0;
  rotateCamera(&eyevec, &eyepos);

  // Precompute values used in the loop
  let invIterations = 1.0 / uniforms.iterations;
  let baseStep = far * invIterations;
  let rotBH = rotation_matrix(-uniforms.blackHoleRotationX, -uniforms.blackHoleRotationY, -uniforms.blackHoleRotationZ);

  var accumColor = vec3<f32>(0.0);
  let dither = rand(uv + sin(uniforms.time * 1.0)) * 2.0;

  var alpha = 0.0;
  var travelled = dither * baseStep;
  var raypos = eyepos + eyevec * travelled;

  let iterations = i32(uniforms.iterations);
  for (var i = 0; i < iterations; i++) {
    // Distance-based adaptive step scaling
    let r = length(raypos);
    let rNear = max(0.5, uniforms.discRadius - uniforms.discWidth * uniforms.stepNearFactor);
    let rFar  = uniforms.discRadius + uniforms.discWidth * uniforms.stepFarFactor;
    let t = smoothstep(rNear, rFar, r);
    let stepScale = mix(uniforms.stepMinScale, uniforms.stepMaxScale, t);
    let localStep = baseStep * stepScale;
    let stepWeight = invIterations * stepScale; // equals localStep / far

    warpSpace(&eyevec, raypos, stepWeight);
    raypos += eyevec * localStep;
    let rotatedPos = rotBH * raypos;
    gasDisc(&accumColor, &alpha, rotatedPos, stepWeight);
    haze(&accumColor, rotatedPos, alpha, stepWeight);

    travelled += localStep;

    // Early out when fully opaque or ray travelled beyond far plane
    if (alpha > 0.999 || travelled >= far) { break; }
  }

  // Scale accumulated color
  accumColor *= 0.0001;
  accumColor *= uniforms.brightnessFactor * uniforms.colorIntensity;

  // Temporal accumulation (removed no-op pow operations)
  let previous = textureSampleLevel(previousFrameTexture, previousFrameSampler, uv, 0.0).rgb;
  let blendWeight = uniforms.temporalBlendWeight;
  let finalColor = mix(accumColor, previous, blendWeight);

  textureStore(outputTexture, vec2<u32>(x, y), vec4<f32>(finalColor, 1.0));
}



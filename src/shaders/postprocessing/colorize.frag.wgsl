// Colorization shader - converts grayscale intensity to custom colors

struct ColorizeParams {
  // Core colors
  centerColor: vec3<f32>,
  _padding1: f32,
  discInnerColor: vec3<f32>,
  _padding2: f32,
  discOuterColor: vec3<f32>,
  _padding3: f32,
  backgroundTint: vec3<f32>,
  _padding4: f32,
  
  // Transition controls
  whitePoint: f32, // Intensity where color becomes white (0.0-1.0)
  blackPoint: f32, // Intensity where color becomes black (0.0-1.0)
  transparencyStart: f32, // Radial position where transparency begins (0.0-1.0)
  transparencyEnd: f32, // Radial position of full transparency (0.0-1.0)
  colorIntensity: f32, // Overall intensity multiplier to prevent blown-out colors
}

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var grayscaleTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: ColorizeParams;

struct FragmentInput {
  @location(0) uv: vec2<f32>,
}

fn smootherstep(edge0: f32, edge1: f32, x: f32) -> f32 {
  let t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
  // Sample the tone-mapped grayscale - already in 0-1 range
  let toneMappedGray = textureSample(grayscaleTex, samp, input.uv).rgb;
  
  // Use the luminance of the tone-mapped value
  let intensity = dot(toneMappedGray, vec3<f32>(0.2126, 0.7152, 0.0722));
  
  // Apply intensity scaling for overall brightness control
  let scaledIntensity = intensity * params.colorIntensity;
  
  // For color selection, use the intensity directly (already normalized by tone mapping)
  let colorSelector = smootherstep(params.blackPoint, params.whitePoint, scaledIntensity);
  
  // Select color based on intensity zones
  var tintColor: vec3<f32>;
  
  if (colorSelector > 0.85) {
    // Very hot center - trend toward white
    let t = smootherstep(0.85, 1.0, colorSelector);
    tintColor = mix(params.centerColor, vec3<f32>(1.0), t);
  } else if (colorSelector > 0.4) {
    // Inner disc to center transition
    let t = smootherstep(0.4, 0.85, colorSelector);
    tintColor = mix(params.discInnerColor, params.centerColor, t);
  } else if (colorSelector > 0.1) {
    // Outer disc to inner disc transition
    let t = smootherstep(0.1, 0.4, colorSelector);
    tintColor = mix(params.discOuterColor, params.discInnerColor, t);
  } else {
    // Fade to black for very low intensities
    let t = smootherstep(0.0, 0.1, colorSelector);
    tintColor = params.discOuterColor * t;
  }
  
  // Since we're working with tone-mapped values, we want to preserve
  // the luminance while applying the color tint
  var finalColor = tintColor * scaledIntensity;
  
  // Add subtle background tint only if there's some intensity
  if (scaledIntensity > 0.001 && scaledIntensity < 0.05) {
    let tintStrength = scaledIntensity / 0.05;
    finalColor += params.backgroundTint * tintStrength * 0.02;
  }
  
  return vec4<f32>(finalColor, 1.0);
}

// Simple pass-through shader to copy from HDR texture to canvas

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;

struct FragmentInput {
  @location(0) uv: vec2<f32>,
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
  // Simply pass through the color from the input texture
  let color = textureSample(inputTex, samp, input.uv).rgb;
  return vec4<f32>(color, 1.0);
}

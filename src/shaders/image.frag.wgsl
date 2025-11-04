// Minimal blit fragment shader: reads from storage buffer and outputs to target

struct Resolution {
  width: f32,
  height: f32,
}

@group(0) @binding(0) var<storage, read> pixels: array<vec4<f32>>;
@group(0) @binding(1) var<uniform> resolution: Resolution;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let w = max(u32(resolution.width), 1u);
  let h = max(u32(resolution.height), 1u);
  // Clamp to bounds to avoid OOB on edge pixels
  let x = min(u32(pos.x), w - 1u);
  let y = min(u32(pos.y), h - 1u);
  let idx = y * w + x;
  return pixels[idx];
}



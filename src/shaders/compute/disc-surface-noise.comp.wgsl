// Procedural texture generation compute shader
// Generates 512x512 grayscale noise texture using FBM
// Only the red channel is used in the main shader for brightness modulation

// Noise function using sin-based hash
fn noise(x: f32, y: f32) -> f32 {
    let n = sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return fract(n);
}

// Fractal Brownian Motion (FBM)
fn fbm(x: f32, y: f32) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var frequency = 1.0;

    for (var i = 0; i < 4; i++) {
        value += amplitude * noise(x * frequency, y * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

struct ProceduralTexture {
    data: array<vec4<f32>>,
};

@group(0) @binding(0) var<storage, read_write> proceduralTexture: ProceduralTexture;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let width = 512u;
    let height = 512u;

    if (gid.x >= width || gid.y >= height) {
        return;
    }

    let index = gid.y * width + gid.x;

    // Normalize coordinates to [0, 1]
    let fx = f32(gid.x) / f32(width);
    let fy = f32(gid.y) / f32(height);

    // Generate FBM noise
    let val = fbm(fx * 4.0, fy * 4.0);

    // Apply brightness scaling with a minimum floor to prevent pure black
    let brightness = clamp(val * 0.6 + 0.2, 0.0, 1.0);

    // Output grayscale value to all channels
    proceduralTexture.data[index] = vec4<f32>(brightness, brightness, brightness, 1.0);
}

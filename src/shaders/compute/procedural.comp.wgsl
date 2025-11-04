// Procedural texture generation compute shader
// Generates 512x512 RGBA fractal noise texture using FBM

// Improved integer hash -> [0,1)  (based on PCG hash)
fn pcg_hash(input: u32) -> u32 {
    var state = input * 747796405u + 2891336453u;
    var word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

// Multi-dimensional hash for better distribution
fn hash2(p: vec2<u32>) -> f32 {
    // Combine two dimensions with different large primes
    let n = p.x * 1597334677u + p.y * 3812015801u;
    return f32(pcg_hash(n)) * (1.0 / 4294967295.0);
}

fn hash3(p: vec3<u32>) -> f32 {
    // Combine three dimensions
    let n = p.x * 1597334677u + p.y * 3812015801u + p.z * 2922600713u;
    return f32(pcg_hash(n)) * (1.0 / 4294967295.0);
}

// Noise function using hash - matches CPU implementation
fn noise(x: f32, y: f32) -> f32 {
    // Use sin-based noise to match the original CPU implementation
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

// Cubic interpolation helper
fn cubic(x: f32, a: f32, b: f32, c: f32, d: f32) -> f32 {
    return a * pow(x, 3.0) + b * pow(x, 2.0) + c * x + d;
}

// DO NOT CHANGE - IT'S FINELY TUNED AND PURPOSEFULLY INACCURATE (from galaxy simulator)
fn colorFromTemperature(kelvin: f32) -> vec3<f32> {
    let k = clamp(kelvin, params.minColorTemperature, params.maxColorTemperature);
    let percent = (k - params.minColorTemperature) / (params.maxColorTemperature - params.minColorTemperature);
    var r = 0.0;
    var g = 0.0;
    var b = 0.0;
    if (percent <= 0.615) {
        r = 1.0;
        g = cubic(percent, 0.1597, -1.575, 2.46, -0.01768);
        b = cubic(percent, -4.729, 6.219, -0.4015, -0.0143);
    } else {
        r = cubic(percent, -3.19, 9.571, -10.14, 4.36);
        g = cubic(percent, -1.483, 4.582, -5.094, 2.687);
        b = 1.0;
    }
    return vec3<f32>(r, g, b);
}

struct ProceduralTexture {
    data: array<vec4<f32>>,
};

struct ProceduralParams {
    baseTemperature: f32,
    temperatureRadiusFactor: f32,
    minColorTemperature: f32,
    maxColorTemperature: f32,
};

@group(0) @binding(0) var<storage, read_write> proceduralTexture: ProceduralTexture;
@group(0) @binding(1) var<uniform> params: ProceduralParams;

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

    // Calculate radius from center (0.0 to ~0.707 for corners)
    let centerX = fx - 0.5;
    let centerY = fy - 0.5;
    let radius = sqrt(centerX * centerX + centerY * centerY);

    // Generate FBM noise
    let val = fbm(fx * 4.0, fy * 4.0);

    // Apply brightness scaling with a minimum floor to prevent pure black
    let brightness = clamp(val * 0.6 + 0.2, 0.0, 1.0);

    // Calculate temperature based on radius (like galaxy particles)
    // Farther from center = hotter (matching accretion disc physics)
    let temperature = params.baseTemperature + radius * params.temperatureRadiusFactor;

    // Get temperature-based color
    let tempColor = colorFromTemperature(temperature);

    // Multiply temperature color by brightness to create the final texture
    // Add small base to prevent complete darkness
    let r = clamp(brightness * tempColor.r + 0.01, 0.0, 1.0);
    let g = clamp(brightness * tempColor.g + 0.01, 0.0, 1.0);
    let b = clamp(brightness * tempColor.b + 0.01, 0.0, 1.0);
    let a = 1.0; // Always fully opaque

    proceduralTexture.data[index] = vec4<f32>(r, g, b, a);
}

// Noise texture generation compute shader
// Generates 256x256 RGBA noise texture for use in fragment shaders

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

struct NoiseTexture {
    data: array<vec4<f32>>,
};

@group(0) @binding(0) var<storage, read_write> noiseTexture: NoiseTexture;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let width = 256u;
    let height = 256u;

    if (gid.x >= width || gid.y >= height) {
        return;
    }

    let index = gid.y * width + gid.x;

    // Generate random RGBA values using the position as seed
    let r = hash3(vec3<u32>(gid.x, gid.y, 0u));
    let g = hash3(vec3<u32>(gid.x, gid.y, 1u));
    let b = hash3(vec3<u32>(gid.x, gid.y, 2u));
    let a = 1.0; // Always fully opaque

    noiseTexture.data[index] = vec4<f32>(r, g, b, a);
}

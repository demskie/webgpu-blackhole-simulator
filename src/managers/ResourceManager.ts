import { BlackholeSimulator } from "../BlackholeSimulator";
import { HDRResources } from "../resources/HDRResources";
import { BloomResources } from "../resources/BloomResources";
import { ToneMapResources } from "../resources/ToneMapResources";
import { ColorizeResources } from "../resources/ColorizeResources";
import { TextureCompute } from "../compute/TextureCompute";
import { BlackholeCompute } from "../compute/BlackholeCompute";
import { PerformanceProfiler } from "../profilers/PerformanceProfiler";

export class ResourceManager {
  private simulator: BlackholeSimulator;

  hdrResources: HDRResources;
  bloomResources: BloomResources;
  toneMapResources: ToneMapResources;
  colorizeResources: ColorizeResources;
  textureCompute: TextureCompute;
  blackholeCompute: BlackholeCompute;

  // Existing resources
  private uniformBuffer: GPUBuffer | null = null;
  private resolutionBuffer: GPUBuffer | null = null;
  private previousFrameTexture: GPUTexture | null = null;
  private previousFrameView: GPUTextureView | null = null;
  private bufferATexture: GPUTexture | null = null;
  private bufferAView: GPUTextureView | null = null;
  private sampler: GPUSampler | null = null;
  private repeatSampler: GPUSampler | null = null;
  private noiseTexture: GPUTexture | null = null;
  private noiseView: GPUTextureView | null = null;
  private proceduralTexture: GPUTexture | null = null;
  private proceduralView: GPUTextureView | null = null;
  private bufferWidth: number = 0;
  private bufferHeight: number = 0;

  constructor(simulator: BlackholeSimulator) {
    this.simulator = simulator;

    // Initialize HDR/Bloom/ToneMap resources
    this.hdrResources = new HDRResources(simulator);
    this.bloomResources = new BloomResources(simulator);
    this.toneMapResources = new ToneMapResources(simulator);
    this.colorizeResources = new ColorizeResources(simulator);
    this.textureCompute = new TextureCompute(simulator);
    this.blackholeCompute = new BlackholeCompute(simulator);
  }

  setup() {
    console.log(`🟠 ResourceManager.setup()`);
    this.dispose();
    const device = this.simulator.device;
    const scale = 1.0; // Always use full resolution
    const width = Math.max(1, Math.floor(this.simulator.canvas.width * scale));
    const height = Math.max(
      1,
      Math.floor(this.simulator.canvas.height * scale)
    );
    this.bufferWidth = width;
    this.bufferHeight = height;

    // Create uniform buffer for black hole parameters
    this.uniformBuffer = device.createBuffer({
      label: "uniformBuffer",
      size: 40 * 4, // 40 floats (added palette colors + colorIntensity + 2 thresholds)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create resolution buffer
    this.resolutionBuffer = device.createBuffer({
      label: "resolutionBuffer",
      size: 8, // 2 floats
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create textures for ping-pong buffers
    this.createBufferTexture(device, width, height, "bufferA");
    this.createBufferTexture(device, width, height, "previousFrame");

    // Create sampler for clamp-to-edge textures
    this.sampler = device.createSampler({
      label: "sampler",
      minFilter: "linear",
      magFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });

    // Create repeat sampler for noise and procedural textures (matching WebGL2)
    this.repeatSampler = device.createSampler({
      label: "repeatSampler",
      minFilter: "linear",
      magFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "repeat",
    });

    // Setup texture compute resources
    this.textureCompute.setup();
    this.blackholeCompute.setup();

    // Create noise and procedural textures using compute shaders
    this.createNoiseTexture(device);
    this.createProceduralTexture(device);

    // Setup HDR/Bloom/ToneMap resources
    this.hdrResources.setup();
    this.bloomResources.setup();
    this.toneMapResources.setup();
  }

  private createBufferTexture(
    device: GPUDevice,
    width: number,
    height: number,
    name: string
  ) {
    console.log(`🟠 createBufferTexture(${name})`);
    const texture = device.createTexture({
      label: `bufferTexture_${name}`,
      size: [width, height],
      format: "rgba16float",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.COPY_SRC,
    });

    const view = texture.createView();

    switch (name) {
      case "bufferA":
        this.bufferATexture = texture;
        this.bufferAView = view;
        break;
      case "previousFrame":
        this.previousFrameTexture = texture;
        this.previousFrameView = view;
        break;
    }
  }

  private createNoiseTexture(device: GPUDevice) {
    console.log(`🟠 createNoiseTexture() using compute shader`);
    const size = 256;

    // Create temporary staging buffer for conversion
    const stagingBuffer = device.createBuffer({
      label: "noiseStagingBuffer",
      size: size * size * 4, // RGBA8 = 4 bytes per pixel
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });

    // Generate noise data using compute shader (outputs to f32 storage buffer)
    this.textureCompute.generateNoiseTexture();

    // Create texture to hold the result (keep as rgba8unorm for filtering support)
    this.noiseTexture = device.createTexture({
      label: "noiseTexture",
      size: [size, size],
      format: "rgba8unorm",
      mipLevelCount: 1, // Single level to avoid undefined behavior
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Use a compute shader or render pass to convert from f32 to unorm
    // For now, let's use a simple render pass approach
    const conversionShader = device.createShaderModule({
      code: `
        @group(0) @binding(0) var<storage, read> inputData: array<vec4<f32>>;

        @vertex
        fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> @builtin(position) vec4<f32> {
          var pos = array<vec2<f32>, 3>(
            vec2<f32>(-1.0, -1.0),
            vec2<f32>(-1.0,  3.0),
            vec2<f32>( 3.0, -1.0)
          );
          return vec4<f32>(pos[vertexIndex], 0.0, 1.0);
        }

        @fragment
        fn fragmentMain(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
          let x = u32(pos.x);
          let y = u32(pos.y);
          let index = y * 256u + x;
          return inputData[index];
        }
      `,
    });

    const conversionPipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module: conversionShader, entryPoint: "vertexMain" },
      fragment: {
        module: conversionShader,
        entryPoint: "fragmentMain",
        targets: [{ format: "rgba8unorm" }],
      },
      primitive: { topology: "triangle-list" },
    });

    const bindGroup = device.createBindGroup({
      layout: conversionPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.textureCompute.getNoiseStorageBuffer() },
        },
      ],
    });

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.noiseTexture.createView(),
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
        },
      ],
    });

    passEncoder.setPipeline(conversionPipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.draw(3, 1, 0, 0);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);

    // Clean up staging buffer
    stagingBuffer.destroy();

    this.noiseView = this.noiseTexture.createView({ label: "noiseView" });
  }

  private createProceduralTexture(device: GPUDevice) {
    console.log(`🟠 createProceduralTexture() using compute shader`);
    const size = 512;

    // Generate procedural data using compute shader with temperature parameters
    const bh = this.simulator.blackHole;
    this.textureCompute.generateProceduralTexture(
      bh.discTemperature,
      bh.discTemperatureRadiusFactor,
      bh.discMinColorTemperature,
      bh.discMaxColorTemperature
    );

    // Create texture with mipmaps (keep as rgba8unorm for filtering support)
    const mipLevelCount = Math.floor(Math.log2(size)) + 1;
    this.proceduralTexture = device.createTexture({
      label: "proceduralTexture",
      size: [size, size],
      format: "rgba8unorm",
      mipLevelCount: mipLevelCount,
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Use a render pass to convert from f32 storage to rgba8unorm texture
    const conversionShader = device.createShaderModule({
      code: `
        @group(0) @binding(0) var<storage, read> inputData: array<vec4<f32>>;

        @vertex
        fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> @builtin(position) vec4<f32> {
          var pos = array<vec2<f32>, 3>(
            vec2<f32>(-1.0, -1.0),
            vec2<f32>(-1.0,  3.0),
            vec2<f32>( 3.0, -1.0)
          );
          return vec4<f32>(pos[vertexIndex], 0.0, 1.0);
        }

        @fragment
        fn fragmentMain(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
          let x = u32(pos.x);
          let y = u32(pos.y);
          let index = y * 512u + x;
          return inputData[index];
        }
      `,
    });

    const conversionPipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module: conversionShader, entryPoint: "vertexMain" },
      fragment: {
        module: conversionShader,
        entryPoint: "fragmentMain",
        targets: [{ format: "rgba8unorm" }],
      },
      primitive: { topology: "triangle-list" },
    });

    const bindGroup = device.createBindGroup({
      layout: conversionPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.textureCompute.getProceduralStorageBuffer(),
          },
        },
      ],
    });

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.proceduralTexture.createView({
            baseMipLevel: 0,
            mipLevelCount: 1,
          }),
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
        },
      ],
    });

    passEncoder.setPipeline(conversionPipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.draw(3, 1, 0, 0);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);

    // Generate mipmaps with the correct format
    this.generateMipmaps(
      device,
      this.proceduralTexture,
      size,
      size,
      mipLevelCount,
      "rgba8unorm"
    );

    this.proceduralView = this.proceduralTexture.createView({
      label: "proceduralView",
    });
  }

  getUniformBuffer(): GPUBuffer {
    return this.uniformBuffer!;
  }

  getResolutionBuffer(): GPUBuffer {
    return this.resolutionBuffer!;
  }

  getPreviousFrameView(): GPUTextureView {
    return this.previousFrameView!;
  }

  getBufferAView(): GPUTextureView {
    return this.bufferAView!;
  }

  getSampler(): GPUSampler {
    return this.sampler!;
  }

  getRepeatSampler(): GPUSampler {
    return this.repeatSampler!;
  }

  getNoiseView(): GPUTextureView {
    return this.noiseView!;
  }

  getProceduralView(): GPUTextureView {
    return this.proceduralView!;
  }

  getBufferATexture(): GPUTexture {
    return this.bufferATexture!;
  }

  getPreviousFrameTexture(): GPUTexture {
    return this.previousFrameTexture!;
  }

  getBufferWidth(): number {
    return this.bufferWidth;
  }

  getBufferHeight(): number {
    return this.bufferHeight;
  }

  performanceProfiler(): PerformanceProfiler {
    return this.simulator.performanceProfiler;
  }

  regenerateProceduralTexture() {
    console.log(
      `🟠 regenerateProceduralTexture() with temperature ${this.simulator.blackHole.discTemperature}`
    );
    const device = this.simulator.device;
    const size = 512;

    // Generate procedural data using compute shader with updated temperature parameters
    const bh = this.simulator.blackHole;
    this.textureCompute.generateProceduralTexture(
      bh.discTemperature,
      bh.discTemperatureRadiusFactor,
      bh.discMinColorTemperature,
      bh.discMaxColorTemperature
    );

    // Use a render pass to convert from f32 storage to rgba8unorm texture
    const conversionShader = device.createShaderModule({
      code: `
        @group(0) @binding(0) var<storage, read> inputData: array<vec4<f32>>;

        @vertex
        fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> @builtin(position) vec4<f32> {
          var pos = array<vec2<f32>, 3>(
            vec2<f32>(-1.0, -1.0),
            vec2<f32>(-1.0,  3.0),
            vec2<f32>( 3.0, -1.0)
          );
          return vec4<f32>(pos[vertexIndex], 0.0, 1.0);
        }

        @fragment
        fn fragmentMain(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
          let x = u32(pos.x);
          let y = u32(pos.y);
          let index = y * 512u + x;
          return inputData[index];
        }
      `,
    });

    const conversionPipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module: conversionShader, entryPoint: "vertexMain" },
      fragment: {
        module: conversionShader,
        entryPoint: "fragmentMain",
        targets: [{ format: "rgba8unorm" }],
      },
      primitive: { topology: "triangle-list" },
    });

    const bindGroup = device.createBindGroup({
      layout: conversionPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.textureCompute.getProceduralStorageBuffer(),
          },
        },
      ],
    });

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.proceduralTexture!.createView({
            baseMipLevel: 0,
            mipLevelCount: 1,
          }),
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
        },
      ],
    });

    passEncoder.setPipeline(conversionPipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.draw(3, 1, 0, 0);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);

    // Regenerate mipmaps
    const mipLevelCount = Math.floor(Math.log2(size)) + 1;
    this.generateMipmaps(
      device,
      this.proceduralTexture!,
      size,
      size,
      mipLevelCount,
      "rgba8unorm"
    );
  }

  private generateMipmaps(
    device: GPUDevice,
    texture: GPUTexture,
    width: number,
    height: number,
    mipLevelCount: number,
    format: GPUTextureFormat = "rgba8unorm"
  ) {
    const sampler = device.createSampler({ minFilter: "linear" });

    const mipmapShaderModule = device.createShaderModule({
      code: `
        @group(0) @binding(0) var imgSampler : sampler;
        @group(0) @binding(1) var img : texture_2d<f32>;

        @vertex
        fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> @builtin(position) vec4<f32> {
          var pos = array<vec2<f32>, 3>(
            vec2<f32>(-1.0, -1.0),
            vec2<f32>(-1.0,  3.0),
            vec2<f32>( 3.0, -1.0)
          );
          return vec4<f32>(pos[vertexIndex], 0.0, 1.0);
        }

        @fragment
        fn fragmentMain(@builtin(position) coord : vec4<f32>) -> @location(0) vec4<f32> {
          return textureSample(img, imgSampler, coord.xy / vec2<f32>(textureDimensions(img)));
        }
      `,
    });

    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module: mipmapShaderModule, entryPoint: "vertexMain" },
      fragment: {
        module: mipmapShaderModule,
        entryPoint: "fragmentMain",
        targets: [{ format: format }],
      },
      primitive: { topology: "triangle-list" },
    });

    const commandEncoder = device.createCommandEncoder();

    for (let i = 1; i < mipLevelCount; i++) {
      const srcView = texture.createView({
        baseMipLevel: i - 1,
        mipLevelCount: 1,
      });
      const dstView = texture.createView({
        baseMipLevel: i,
        mipLevelCount: 1,
      });

      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: srcView },
        ],
      });

      const passEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: dstView,
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
          },
        ],
      });

      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.draw(3, 1, 0, 0);
      passEncoder.end();
    }

    device.queue.submit([commandEncoder.finish()]);
  }

  dispose() {
    // Buffers
    if (this.uniformBuffer) {
      this.uniformBuffer.destroy();
      this.uniformBuffer = null;
    }
    if (this.resolutionBuffer) {
      this.resolutionBuffer.destroy();
      this.resolutionBuffer = null;
    }

    // Textures
    if (this.bufferATexture) {
      this.bufferATexture.destroy();
      this.bufferATexture = null;
      this.bufferAView = null;
    }
    if (this.previousFrameTexture) {
      this.previousFrameTexture.destroy();
      this.previousFrameTexture = null;
      this.previousFrameView = null;
    }
    if (this.noiseTexture) {
      this.noiseTexture.destroy();
      this.noiseTexture = null;
      this.noiseView = null;
    }
    if (this.proceduralTexture) {
      this.proceduralTexture.destroy();
      this.proceduralTexture = null;
      this.proceduralView = null;
    }

    // Samplers (no destroy method, just drop references)
    this.sampler = null;
    this.repeatSampler = null;

    // Destroy HDR/Bloom/ToneMap resources
    this.hdrResources.destroy();
    this.bloomResources.destroy();
    this.toneMapResources.destroy();
    this.colorizeResources.destroy();
    this.textureCompute.destroy();
    this.blackholeCompute.destroy();
  }
}

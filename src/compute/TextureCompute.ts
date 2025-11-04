import { BlackholeSimulator } from "../BlackholeSimulator";
import noiseCompWGSL from "../shaders/compute/noise.comp.wgsl";
import proceduralCompWGSL from "../shaders/compute/procedural.comp.wgsl";

export class TextureCompute {
  private readonly device: GPUDevice;
  private readonly simulator: () => BlackholeSimulator;

  // Noise texture compute resources
  private noiseComputePipeline: GPUComputePipeline | null = null;
  private noiseComputeBindGroup: GPUBindGroup | null = null;
  private noiseComputeBindGroupLayout: GPUBindGroupLayout | null = null;
  private noiseStorageBuffer: GPUBuffer | null = null;

  // Procedural texture compute resources
  private proceduralComputePipeline: GPUComputePipeline | null = null;
  private proceduralComputeBindGroup: GPUBindGroup | null = null;
  private proceduralComputeBindGroupLayout: GPUBindGroupLayout | null = null;
  private proceduralStorageBuffer: GPUBuffer | null = null;
  private proceduralParamsBuffer: GPUBuffer | null = null;

  constructor(simulator: BlackholeSimulator) {
    this.device = simulator.device;
    this.simulator = () => simulator;
  }

  setup() {
    console.log("🔴 Setting up TextureCompute");
    // Resources are created lazily when first accessed
  }

  ////////////////////////////////////////////////////////////

  getNoiseStorageBuffer = () =>
    this.noiseStorageBuffer ?? this.createNoiseStorageBuffer();

  private createNoiseStorageBuffer(): GPUBuffer {
    console.log("🔴 Creating noise storage buffer");
    this.noiseStorageBuffer?.destroy();
    const size = 256 * 256 * 4 * 4; // 256x256 RGBA f32
    this.noiseStorageBuffer = this.device.createBuffer({
      label: "noiseStorageBuffer",
      size: size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    return this.noiseStorageBuffer;
  }

  getProceduralStorageBuffer = () =>
    this.proceduralStorageBuffer ?? this.createProceduralStorageBuffer();

  private createProceduralStorageBuffer(): GPUBuffer {
    console.log("🔴 Creating procedural storage buffer");
    this.proceduralStorageBuffer?.destroy();
    const size = 512 * 512 * 4 * 4; // 512x512 RGBA f32
    this.proceduralStorageBuffer = this.device.createBuffer({
      label: "proceduralStorageBuffer",
      size: size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    return this.proceduralStorageBuffer;
  }

  getProceduralParamsBuffer = () =>
    this.proceduralParamsBuffer ?? this.createProceduralParamsBuffer();

  private createProceduralParamsBuffer(): GPUBuffer {
    console.log("🔴 Creating procedural params buffer");
    this.proceduralParamsBuffer?.destroy();
    const size = 16; // 4 floats (baseTemperature, radiusFactor, minColorTemp, maxColorTemp)
    this.proceduralParamsBuffer = this.device.createBuffer({
      label: "proceduralParamsBuffer",
      size: size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    return this.proceduralParamsBuffer;
  }

  ////////////////////////////////////////////////////////////

  getNoiseComputePipeline = () =>
    this.noiseComputePipeline ?? this.createNoiseComputePipeline();

  private createNoiseComputePipeline(): GPUComputePipeline {
    console.log("🔴 Creating noise compute pipeline");
    const pipelineLayout = this.device.createPipelineLayout({
      label: "noiseComputePipelineLayout",
      bindGroupLayouts: [this.getNoiseComputeBindGroupLayout()],
    });
    this.noiseComputePipeline = this.device.createComputePipeline({
      label: "noiseComputePipeline",
      layout: pipelineLayout,
      compute: {
        module: this.device.createShaderModule({ code: noiseCompWGSL }),
        entryPoint: "main",
      },
    });
    return this.noiseComputePipeline;
  }

  getProceduralComputePipeline = () =>
    this.proceduralComputePipeline ?? this.createProceduralComputePipeline();

  private createProceduralComputePipeline(): GPUComputePipeline {
    console.log("🔴 Creating procedural compute pipeline");
    const pipelineLayout = this.device.createPipelineLayout({
      label: "proceduralComputePipelineLayout",
      bindGroupLayouts: [this.getProceduralComputeBindGroupLayout()],
    });
    this.proceduralComputePipeline = this.device.createComputePipeline({
      label: "proceduralComputePipeline",
      layout: pipelineLayout,
      compute: {
        module: this.device.createShaderModule({ code: proceduralCompWGSL }),
        entryPoint: "main",
      },
    });
    return this.proceduralComputePipeline;
  }

  ////////////////////////////////////////////////////////////

  getNoiseComputeBindGroupLayout = () =>
    this.noiseComputeBindGroupLayout ??
    this.createNoiseComputeBindGroupLayout();

  private createNoiseComputeBindGroupLayout(): GPUBindGroupLayout {
    console.log("🔴 Creating noise compute bind group layout");
    this.noiseComputeBindGroupLayout = this.device.createBindGroupLayout({
      label: "noiseComputeBindGroupLayout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
      ],
    });
    return this.noiseComputeBindGroupLayout;
  }

  getProceduralComputeBindGroupLayout = () =>
    this.proceduralComputeBindGroupLayout ??
    this.createProceduralComputeBindGroupLayout();

  private createProceduralComputeBindGroupLayout(): GPUBindGroupLayout {
    console.log("🔴 Creating procedural compute bind group layout");
    this.proceduralComputeBindGroupLayout = this.device.createBindGroupLayout({
      label: "proceduralComputeBindGroupLayout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        },
      ],
    });
    return this.proceduralComputeBindGroupLayout;
  }

  ////////////////////////////////////////////////////////////

  getNoiseComputeBindGroup = () =>
    this.noiseComputeBindGroup ?? this.createNoiseComputeBindGroup();

  private createNoiseComputeBindGroup(): GPUBindGroup {
    console.log("🔴 Creating noise compute bind group");
    // Ensure storage buffer exists first
    const buffer = this.getNoiseStorageBuffer();
    this.noiseComputeBindGroup = this.device.createBindGroup({
      label: "noiseComputeBindGroup",
      layout: this.getNoiseComputePipeline().getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: buffer } }],
    });
    return this.noiseComputeBindGroup;
  }

  getProceduralComputeBindGroup = () =>
    this.proceduralComputeBindGroup ?? this.createProceduralComputeBindGroup();

  private createProceduralComputeBindGroup(): GPUBindGroup {
    console.log("🔴 Creating procedural compute bind group");
    // Ensure buffers exist first
    const buffer = this.getProceduralStorageBuffer();
    const paramsBuffer = this.getProceduralParamsBuffer();
    this.proceduralComputeBindGroup = this.device.createBindGroup({
      label: "proceduralComputeBindGroup",
      layout: this.getProceduralComputePipeline().getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: buffer } },
        { binding: 1, resource: { buffer: paramsBuffer } },
      ],
    });
    return this.proceduralComputeBindGroup;
  }

  ////////////////////////////////////////////////////////////

  generateNoiseTexture(commandEncoder?: GPUCommandEncoder) {
    // If a command encoder is provided, use it for batching; otherwise create our own
    const shouldSubmit = !commandEncoder;
    const encoder = commandEncoder || this.device.createCommandEncoder();

    const pass = encoder.beginComputePass();
    pass.setPipeline(this.getNoiseComputePipeline());
    pass.setBindGroup(0, this.getNoiseComputeBindGroup());

    // 256x256 texture with 16x16 workgroups = 16x16 = 256 workgroups
    pass.dispatchWorkgroups(16, 16);
    pass.end();

    // Only submit if we created our own encoder
    if (shouldSubmit) this.device.queue.submit([encoder.finish()]);
  }

  generateProceduralTexture(
    baseTemperature: number,
    temperatureRadiusFactor: number,
    minColorTemperature: number,
    maxColorTemperature: number,
    commandEncoder?: GPUCommandEncoder
  ) {
    // Update the temperature uniforms
    const paramsData = new Float32Array([
      baseTemperature,
      temperatureRadiusFactor,
      minColorTemperature,
      maxColorTemperature,
    ]);
    this.device.queue.writeBuffer(
      this.getProceduralParamsBuffer(),
      0,
      paramsData
    );

    // If a command encoder is provided, use it for batching; otherwise create our own
    const shouldSubmit = !commandEncoder;
    const encoder = commandEncoder || this.device.createCommandEncoder();

    const pass = encoder.beginComputePass();
    pass.setPipeline(this.getProceduralComputePipeline());
    pass.setBindGroup(0, this.getProceduralComputeBindGroup());

    // 512x512 texture with 16x16 workgroups = 32x32 = 1024 workgroups
    pass.dispatchWorkgroups(32, 32);
    pass.end();

    // Only submit if we created our own encoder
    if (shouldSubmit) this.device.queue.submit([encoder.finish()]);
  }

  ////////////////////////////////////////////////////////////

  destroy() {
    console.log("🔴 Destroying TextureCompute resources");

    // Noise resources
    this.noiseStorageBuffer?.destroy();
    this.noiseComputePipeline = null;
    this.noiseComputeBindGroup = null;
    this.noiseComputeBindGroupLayout = null;
    this.noiseStorageBuffer = null;

    // Procedural resources
    this.proceduralStorageBuffer?.destroy();
    this.proceduralParamsBuffer?.destroy();
    this.proceduralComputePipeline = null;
    this.proceduralComputeBindGroup = null;
    this.proceduralComputeBindGroupLayout = null;
    this.proceduralStorageBuffer = null;
    this.proceduralParamsBuffer = null;
  }
}

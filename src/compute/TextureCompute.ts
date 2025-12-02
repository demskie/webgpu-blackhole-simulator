import { BlackholeSimulator } from "../BlackholeSimulator";
import discSurfaceNoiseWGSL from "../shaders/compute/disc-surface-noise.comp.wgsl";

export class TextureCompute {
  private readonly device: GPUDevice;
  private readonly simulator: () => BlackholeSimulator;

  // Procedural texture compute resources
  private proceduralComputePipeline: GPUComputePipeline | null = null;
  private proceduralComputeBindGroup: GPUBindGroup | null = null;
  private proceduralComputeBindGroupLayout: GPUBindGroupLayout | null = null;
  private proceduralStorageBuffer: GPUBuffer | null = null;

  constructor(simulator: BlackholeSimulator) {
    this.device = simulator.device;
    this.simulator = () => simulator;
  }

  setup() {
    console.log("🔴 Setting up TextureCompute");
    // Resources are created lazily when first accessed
  }

  ////////////////////////////////////////////////////////////

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

  ////////////////////////////////////////////////////////////

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
        module: this.device.createShaderModule({ code: discSurfaceNoiseWGSL }),
        entryPoint: "main",
      },
    });
    return this.proceduralComputePipeline;
  }

  ////////////////////////////////////////////////////////////

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
      ],
    });
    return this.proceduralComputeBindGroupLayout;
  }

  ////////////////////////////////////////////////////////////

  getProceduralComputeBindGroup = () =>
    this.proceduralComputeBindGroup ?? this.createProceduralComputeBindGroup();

  private createProceduralComputeBindGroup(): GPUBindGroup {
    console.log("🔴 Creating procedural compute bind group");
    // Ensure buffer exists first
    const buffer = this.getProceduralStorageBuffer();
    this.proceduralComputeBindGroup = this.device.createBindGroup({
      label: "proceduralComputeBindGroup",
      layout: this.getProceduralComputePipeline().getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: buffer } }],
    });
    return this.proceduralComputeBindGroup;
  }

  ////////////////////////////////////////////////////////////

  generateProceduralTexture(commandEncoder?: GPUCommandEncoder) {
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

    // Procedural resources
    this.proceduralStorageBuffer?.destroy();
    this.proceduralComputePipeline = null;
    this.proceduralComputeBindGroup = null;
    this.proceduralComputeBindGroupLayout = null;
    this.proceduralStorageBuffer = null;
  }
}

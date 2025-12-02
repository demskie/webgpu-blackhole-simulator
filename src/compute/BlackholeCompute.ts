import { BlackholeSimulator } from "../BlackholeSimulator";
import blackholeCompWGSL from "../shaders/compute/blackhole.comp.wgsl";
import { NoisePrecompute } from "./NoisePrecompute";

export class BlackholeCompute {
  private readonly device: GPUDevice;
  private readonly simulator: () => BlackholeSimulator;

  private noisePrecompute: NoisePrecompute | null = null;
  private noise3DSampler: GPUSampler | null = null;

  private computePipeline: GPUComputePipeline | null = null;
  private computeBindGroup: GPUBindGroup | null = null;
  private computeBindGroupAlt: GPUBindGroup | null = null;
  private computeBindGroupLayout: GPUBindGroupLayout | null = null;

  constructor(simulator: BlackholeSimulator) {
    this.device = simulator.device;
    this.simulator = () => simulator;
  }

  setup() {
    // Initialize noise precompute
    this.noisePrecompute = new NoisePrecompute(this.simulator());
    this.noisePrecompute.setup();

    // Create 3D texture sampler
    this.noise3DSampler = this.device.createSampler({
      label: "noise3DSampler",
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "repeat", // Wrap angular dimension for seamless rotation
      addressModeW: "clamp-to-edge",
    });
  }

  destroy() {
    this.noisePrecompute?.destroy();
    this.noisePrecompute = null;
    this.noise3DSampler = null;
    this.computePipeline = null;
    this.computeBindGroup = null;
    this.computeBindGroupAlt = null;
    this.computeBindGroupLayout = null;
  }

  /**
   * Regenerates the noise textures with current parameters.
   * Call this when noise octave parameters change.
   */
  regenerateNoiseTextures() {
    if (this.noisePrecompute) {
      this.noisePrecompute.regenerate();
      // Invalidate bind groups so they get recreated with new texture views
      this.computeBindGroup = null;
      this.computeBindGroupAlt = null;
    }
  }

  private getComputeBindGroupLayout(): GPUBindGroupLayout {
    if (this.computeBindGroupLayout) return this.computeBindGroupLayout;
    this.computeBindGroupLayout = this.device.createBindGroupLayout({
      label: "blackholeComputeBindGroupLayout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, sampler: {} },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          texture: { sampleType: "float" },
        },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, sampler: {} },
        {
          binding: 5,
          visibility: GPUShaderStage.COMPUTE,
          texture: { sampleType: "float" },
        },
        {
          binding: 6,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: { access: "write-only", format: "rgba16float" },
        },
        // 3D noise textures and sampler
        { binding: 7, visibility: GPUShaderStage.COMPUTE, sampler: {} },
        {
          binding: 8,
          visibility: GPUShaderStage.COMPUTE,
          texture: { sampleType: "float", viewDimension: "3d" },
        },
        {
          binding: 9,
          visibility: GPUShaderStage.COMPUTE,
          texture: { sampleType: "float", viewDimension: "3d" },
        },
      ],
    });
    return this.computeBindGroupLayout;
  }

  private getComputePipeline(): GPUComputePipeline {
    if (this.computePipeline) return this.computePipeline;
    const pipelineLayout = this.device.createPipelineLayout({
      label: "blackholeComputePipelineLayout",
      bindGroupLayouts: [this.getComputeBindGroupLayout()],
    });
    this.computePipeline = this.device.createComputePipeline({
      label: "blackholeComputePipeline",
      layout: pipelineLayout,
      compute: {
        module: this.device.createShaderModule({ code: blackholeCompWGSL }),
        entryPoint: "main",
      },
    });
    return this.computePipeline;
  }

  private createComputeBindGroup(useBufferAAsCurrent: boolean): GPUBindGroup {
    const resources = this.simulator().resources;
    // Previous frame is the opposite of current
    const previousView = !useBufferAAsCurrent
      ? resources.getBufferAView()
      : resources.getPreviousFrameView();
    // Current frame is where we write to
    const currentView = useBufferAAsCurrent
      ? resources.getBufferAView()
      : resources.getPreviousFrameView();
    const bindGroup = this.device.createBindGroup({
      label: useBufferAAsCurrent
        ? "blackholeComputeBindGroup"
        : "blackholeComputeBindGroupAlt",
      layout: this.getComputePipeline().getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: resources.getUniformBuffer() } },
        { binding: 1, resource: { buffer: resources.getResolutionBuffer() } },
        { binding: 2, resource: resources.getRepeatSampler() }, // procedural sampler (repeat)
        { binding: 3, resource: resources.getProceduralView() },
        { binding: 4, resource: resources.getSampler() }, // clamp sampler for previous
        { binding: 5, resource: previousView },
        { binding: 6, resource: currentView }, // Write directly to ping-pong texture
        // 3D noise textures
        { binding: 7, resource: this.noise3DSampler! },
        {
          binding: 8,
          resource:
            this.noisePrecompute!.getNoiseTextures().noise1Texture.createView(),
        },
        {
          binding: 9,
          resource:
            this.noisePrecompute!.getNoiseTextures().noise2Texture.createView(),
        },
      ],
    });
    return bindGroup;
  }

  private getBindGroup(useBufferAAsCurrent: boolean): GPUBindGroup {
    if (useBufferAAsCurrent) {
      if (!this.computeBindGroup)
        this.computeBindGroup = this.createComputeBindGroup(true);
      return this.computeBindGroup!;
    }
    if (!this.computeBindGroupAlt)
      this.computeBindGroupAlt = this.createComputeBindGroup(false);
    return this.computeBindGroupAlt!;
  }

  dispatch(commandEncoder: GPUCommandEncoder, useBufferAAsCurrent: boolean) {
    // Get timestamp writes for compute pass (for GPU timing)
    const timestampWrites = this.simulator()
      .resources.performanceProfiler()
      .getComputePassTimestampWrites();

    const pass = commandEncoder.beginComputePass({
      timestampWrites: timestampWrites
        ? {
            querySet: timestampWrites.querySet,
            beginningOfPassWriteIndex: timestampWrites.beginIndex,
            endOfPassWriteIndex: timestampWrites.endIndex,
          }
        : undefined,
    });

    pass.setPipeline(this.getComputePipeline());
    pass.setBindGroup(0, this.getBindGroup(useBufferAAsCurrent));

    const width = this.simulator().resources.getBufferWidth();
    const height = this.simulator().resources.getBufferHeight();
    const wgX = Math.ceil(width / 16);
    const wgY = Math.ceil(height / 16);
    pass.dispatchWorkgroups(wgX, wgY);
    pass.end();
  }
}

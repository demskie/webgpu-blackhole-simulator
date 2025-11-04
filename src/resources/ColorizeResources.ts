import { BlackholeSimulator } from "../BlackholeSimulator";
import colorizeFragWGSL from "../shaders/postprocessing/colorize.frag.wgsl";
import fullscreenVertWGSL from "../shaders/fullscreen.vert.wgsl";

export class ColorizeResources {
  private readonly device: GPUDevice;
  private readonly simulator: () => BlackholeSimulator;
  private readonly presentationFormat: GPUTextureFormat;

  private colorizeBindGroupLayout: GPUBindGroupLayout | null = null;
  private colorizePipelineLayout: GPUPipelineLayout | null = null;
  private colorizePipeline: GPURenderPipeline | null = null;
  private colorizeParamsBuffer: GPUBuffer | null = null;
  private colorizeBindGroup: GPUBindGroup | null = null;

  constructor(simulator: BlackholeSimulator) {
    this.device = simulator.device;
    this.simulator = () => simulator;
    this.presentationFormat = simulator.presentationFormat;
  }

  destroy() {
    this.colorizeBindGroupLayout = null;
    this.colorizePipelineLayout = null;
    this.colorizePipeline = null;
    this.colorizeParamsBuffer?.destroy();
    this.colorizeParamsBuffer = null;
    this.colorizeBindGroup = null;
  }

  getColorizeParamsBuffer(): GPUBuffer {
    if (this.colorizeParamsBuffer) return this.colorizeParamsBuffer;

    // Create buffer for colorization parameters
    // Size: 16 vec3s (4 colors) + 4 floats + padding = 16*16 + 4*4 = 272 bytes
    // Round up to 288 for alignment
    this.colorizeParamsBuffer = this.device.createBuffer({
      label: "colorizeParamsBuffer",
      size: 288,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    return this.colorizeParamsBuffer;
  }

  updateColorizeParams() {
    const buffer = this.getColorizeParamsBuffer();
    const blackhole = this.simulator().blackHole;

    // Create parameter array with proper padding
    const params = new Float32Array(72); // 288 bytes / 4 bytes per float = 72 floats
    let offset = 0;

    // Center color + padding
    params[offset++] = blackhole.centerColor[0];
    params[offset++] = blackhole.centerColor[1];
    params[offset++] = blackhole.centerColor[2];
    params[offset++] = 0; // padding

    // Disc inner color + padding
    params[offset++] = blackhole.discInnerColor[0];
    params[offset++] = blackhole.discInnerColor[1];
    params[offset++] = blackhole.discInnerColor[2];
    params[offset++] = 0; // padding

    // Disc outer color + padding
    params[offset++] = blackhole.discOuterColor[0];
    params[offset++] = blackhole.discOuterColor[1];
    params[offset++] = blackhole.discOuterColor[2];
    params[offset++] = 0; // padding

    // Background tint + padding
    params[offset++] = blackhole.backgroundTint[0];
    params[offset++] = blackhole.backgroundTint[1];
    params[offset++] = blackhole.backgroundTint[2];
    params[offset++] = 0; // padding

    // Transition controls
    params[offset++] = blackhole.whitePoint;
    params[offset++] = blackhole.blackPoint;
    params[offset++] = blackhole.transparencyStart;
    params[offset++] = blackhole.transparencyEnd;
    
    // Color intensity
    params[offset++] = blackhole.colorIntensity;

    this.device.queue.writeBuffer(buffer, 0, params);
  }

  private getColorizeBindGroupLayout(): GPUBindGroupLayout {
    if (this.colorizeBindGroupLayout) return this.colorizeBindGroupLayout;

    this.colorizeBindGroupLayout = this.device.createBindGroupLayout({
      label: "colorizeBindGroupLayout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });

    return this.colorizeBindGroupLayout;
  }

  private getColorizePipelineLayout(): GPUPipelineLayout {
    if (this.colorizePipelineLayout) return this.colorizePipelineLayout;

    this.colorizePipelineLayout = this.device.createPipelineLayout({
      label: "colorizePipelineLayout",
      bindGroupLayouts: [this.getColorizeBindGroupLayout()],
    });

    return this.colorizePipelineLayout;
  }

  getColorizePipeline(): GPURenderPipeline {
    if (this.colorizePipeline) return this.colorizePipeline;

    this.colorizePipeline = this.device.createRenderPipeline({
      label: "colorizePipeline",
      layout: this.getColorizePipelineLayout(),
      vertex: {
        module: this.device.createShaderModule({ code: fullscreenVertWGSL }),
        entryPoint: "main",
      },
      fragment: {
        module: this.device.createShaderModule({ code: colorizeFragWGSL }),
        entryPoint: "main",
        targets: [{ format: this.presentationFormat }], // Output to canvas format
      },
      primitive: { topology: "triangle-list" },
    });

    return this.colorizePipeline;
  }

  getColorizeBindGroup(
    inputTexture: GPUTextureView,
    sampler: GPUSampler
  ): GPUBindGroup {
    // Always recreate bind group when input texture changes
    this.colorizeBindGroup = this.device.createBindGroup({
      label: "colorizeBindGroup",
      layout: this.getColorizeBindGroupLayout(),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: inputTexture },
        { binding: 2, resource: { buffer: this.getColorizeParamsBuffer() } },
      ],
    });

    return this.colorizeBindGroup;
  }
}

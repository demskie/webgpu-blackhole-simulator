import { Blackhole } from "../entities/Blackhole";
import { BlackholeSimulator } from "../BlackholeSimulator";
import { ResourceManager } from "../managers/ResourceManager";

import tonemapFragWGSL from "../shaders/postprocessing/tonemap.frag.wgsl";
import fullscreenVertWGSL from "../shaders/fullscreen.vert.wgsl";

export class ToneMapResources {
  device: GPUDevice;
  canvas: HTMLCanvasElement;
  presentationFormat: GPUTextureFormat;
  blackHole: () => Blackhole;
  resources: () => ResourceManager;

  private toneMapPipeline: GPURenderPipeline | null = null;
  private toneParamBuffer: GPUBuffer | null = null;
  private toneMapSampler: GPUSampler | null = null;
  private toneMapBindGroup: GPUBindGroup | null = null;
  private toneMapBindGroupAlt: GPUBindGroup | null = null;

  private readonly cachedToneParams = new Float32Array(9);
  private readonly lastToneParams = new Float32Array(9);
  private toneParamsInitialized = false;

  constructor(simulator: BlackholeSimulator) {
    this.device = simulator.device;
    this.canvas = simulator.canvas;
    this.presentationFormat = simulator.presentationFormat;
    this.blackHole = () => simulator.blackHole;
    this.resources = () => simulator.resources;
  }

  setup() {
    this.updateToneParamBuffer();
  }

  markBloomTexturesDirty() {
    this.toneMapBindGroup = null;
    this.toneMapBindGroupAlt = null;
  }

  ////////////////////////////////////////////////////////////

  getToneMapPipeline = () =>
    this.toneMapPipeline ?? this.createToneMapPipeline();

  private createToneMapPipeline(): GPURenderPipeline {
    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
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
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
      ],
    });
    this.toneMapPipeline = this.device.createRenderPipeline({
      label: "toneMapPipeline",
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module: this.device.createShaderModule({ code: fullscreenVertWGSL }),
        entryPoint: "main",
      },
      fragment: {
        module: this.device.createShaderModule({ code: tonemapFragWGSL }),
        entryPoint: "main",
        targets: [{ format: "rgba16float" }], // Always output to HDR format
      },
      primitive: { topology: "triangle-list" },
    });
    return this.toneMapPipeline;
  }

  ////////////////////////////////////////////////////////////

  getToneParamBuffer = () =>
    this.toneParamBuffer ?? this.createToneParamBuffer();

  private createToneParamBuffer(): GPUBuffer {
    this.toneParamBuffer = this.device.createBuffer({
      label: "toneParamBuffer",
      size: 36, // 9 floats
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.toneParamsInitialized = false;
    this.updateToneParamBuffer();
    return this.toneParamBuffer;
  }

  updateToneParamBuffer(): GPUBuffer {
    this.toneParamBuffer = this.getToneParamBuffer();
    this.populateToneParams(this.cachedToneParams);
    if (!this.toneParamsInitialized || this.toneParamsChanged()) {
      this.device.queue.writeBuffer(
        this.toneParamBuffer,
        0,
        this.cachedToneParams
      );
      this.lastToneParams.set(this.cachedToneParams);
      this.toneParamsInitialized = true;
    }
    return this.toneParamBuffer;
  }

  ////////////////////////////////////////////////////////////

  getToneMapSampler = () => this.toneMapSampler ?? this.createToneMapSampler();

  private createToneMapSampler(): GPUSampler {
    this.toneMapSampler = this.device.createSampler({
      label: "toneMapSampler",
      magFilter: "linear",
      minFilter: "linear",
    });
    return this.toneMapSampler;
  }

  ////////////////////////////////////////////////////////////

  getToneMapBindGroup = (
    width: number,
    height: number,
    useBufferA: boolean
  ) => {
    if (
      this.lastToneMapBindGroupDims.width !== width ||
      this.lastToneMapBindGroupDims.height !== height
    ) {
      this.toneMapBindGroup = null;
      this.toneMapBindGroupAlt = null;
      this.lastToneMapBindGroupDims = { width, height };
    }
    return useBufferA
      ? this.toneMapBindGroup ??
          this.createToneMapBindGroup(width, height, true)
      : this.toneMapBindGroupAlt ??
          this.createToneMapBindGroup(width, height, false);
  };

  private createToneMapBindGroup(
    width: number,
    height: number,
    useBufferA: boolean
  ): GPUBindGroup {
    const bindGroup = this.device.createBindGroup({
      label: `toneMapBindGroup (bufferA=${useBufferA})`,
      layout: this.getToneMapPipeline().getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.getToneMapSampler() },
        {
          binding: 1,
          resource: useBufferA
            ? this.resources().getBufferAView()
            : this.resources().getPreviousFrameView(),
        },
        { binding: 2, resource: { buffer: this.getToneParamBuffer() } },
        {
          binding: 3,
          resource: this.resources().bloomResources.getBloomTextures(
            width,
            height
          ).bloomTextureView1,
        },
      ],
    });
    if (useBufferA) {
      this.toneMapBindGroup = bindGroup;
    } else {
      this.toneMapBindGroupAlt = bindGroup;
    }
    return bindGroup;
  }

  private lastToneMapBindGroupDims = { width: -1, height: -1 };

  ////////////////////////////////////////////////////////////

  private populateToneParams(target: Float32Array) {
    target[0] = this.blackHole().exposure;
    target[1] = this.blackHole().saturation;
    target[2] = this.blackHole().bloomIntensity;
    target[3] = this.blackHole().shadowLift;
    target[4] = this.blackHole().minLiftThreshold;
    target[5] = this.blackHole().toneMapToe;
    target[6] = this.blackHole().toneMapHighlights;
    target[7] = this.blackHole().toneMapMidtones;
    target[8] = this.blackHole().toneMapShoulder;
  }

  private toneParamsChanged(): boolean {
    if (!this.toneParamsInitialized) return true;
    for (let i = 0; i < this.cachedToneParams.length; i++) {
      if (this.cachedToneParams[i] !== this.lastToneParams[i]) return true;
    }
    return false;
  }

  ////////////////////////////////////////////////////////////

  destroy() {
    console.log("🔴 Destroying tone map resources");
    this.toneParamBuffer?.destroy();
    this.toneParamBuffer = null;
    this.toneMapPipeline = null;
    this.toneMapBindGroup = null;
    this.toneMapSampler = null;
  }
}

import { ResourceManager } from "./managers/ResourceManager";
import { RenderingManager } from "./managers/RenderingManager";
import { FPSManager } from "./managers/FPSManager";
import { UIManager } from "./managers/UIManager";
import { CameraManager } from "./managers/CameraManager";
import { Blackhole } from "./entities/Blackhole";
import { PerformanceProfiler } from "./profilers/PerformanceProfiler";
import { MemoryProfiler } from "./profilers/MemoryProfiler";

export class BlackholeSimulator {
  readonly canvas: HTMLCanvasElement;
  readonly device: GPUDevice;
  readonly context: GPUCanvasContext;
  readonly presentationFormat: GPUTextureFormat;

  readonly blackHole: Blackhole;
  readonly camera: CameraManager;
  readonly resources: ResourceManager;
  readonly renderer: RenderingManager;
  readonly fps: FPSManager;
  readonly ui: UIManager;
  readonly performanceProfiler: PerformanceProfiler;
  readonly memoryProfiler: MemoryProfiler;

  private startTime: number = 0;
  private lastUpdateTime: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    device: GPUDevice,
    context: GPUCanvasContext,
    presentationFormat: GPUTextureFormat
  ) {
    this.canvas = canvas;
    this.device = device;
    this.context = context;
    this.presentationFormat = presentationFormat;

    // Initialize black hole with default parameters and callbacks
    this.blackHole = new Blackhole(
      {
        // Camera starts centered (pan = 0.0)
        cameraPanX: 0.0,
        cameraPanY: 0.0,
      },
      {
        onParametersChanged: () => this.updateUniformData(),
        onToneParametersChanged: () => this.updateToneParameters(),
        onBloomParametersChanged: () => this.updateBloomParameters(),
        onTemperatureChanged: () => this.updateProceduralTexture(),
        onNoiseParametersChanged: () => this.regenerateNoiseTextures(),
      }
    );

    // Initialize managers
    this.camera = new CameraManager(this);
    this.resources = new ResourceManager(this);
    this.resources.setup();
    this.fps = new FPSManager(this);

    // Initialize performance profiler with advanced options enabled/disabled
    this.performanceProfiler = new PerformanceProfiler(this);
    if (PerformanceProfiler.getAdvancedOptionsEnabled()) {
      this.performanceProfiler.create();
    }

    this.memoryProfiler = new MemoryProfiler(this);
    this.renderer = new RenderingManager(this);
    this.renderer.setup(); // Setup pipelines after resources are ready
    this.ui = new UIManager(this);

    this.startTime = performance.now();
    this.updateUniformData();
    window.requestAnimationFrame(() => this.mainLoop());
  }

  static async start(canvasId: string): Promise<BlackholeSimulator> {
    if (!!!navigator.gpu)
      throw new Error(
        "WebGPU not supported on this browser. The latest version of Chrome is recommended."
      );

    const adapter = await navigator.gpu.requestAdapter();
    if (!!!adapter) throw new Error("No appropriate GPUAdapter found.");

    let device: GPUDevice;
    try {
      device = await adapter.requestDevice({
        requiredFeatures: ["timestamp-query"],
      });
    } catch {
      console.warn(
        "timestamp-query feature not supported, GPU timing will be unavailable"
      );
      device = await adapter.requestDevice();
    }
    if (!!!device) throw new Error("Failed to get GPUDevice.");

    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!!!canvas)
      throw Error(`Failed to get canvas object with id "${canvasId}"`);

    const context = canvas.getContext("webgpu");
    if (!!!context) throw new Error("Failed to get GPUCanvasContext.");

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device: device,
      format: presentationFormat,
      alphaMode: "opaque",
      presentMode: "immediate",
    } as any);

    return new BlackholeSimulator(canvas, device, context, presentationFormat);
  }

  private updateUniformData() {
    this.renderer.updateUniforms();
  }

  private updateToneParameters() {
    this.resources.toneMapResources.updateToneParamBuffer();
  }

  private updateBloomParameters() {
    this.resources.bloomResources.updateBloomParamsBuffer();
  }

  private updateProceduralTexture() {
    this.resources.regenerateProceduralTexture();
  }

  private regenerateNoiseTextures() {
    this.resources.blackholeCompute.regenerateNoiseTextures();
  }

  private update(currentTime: number) {
    // Calculate delta time in seconds for frame-rate independent animation
    const deltaTime = this.lastUpdateTime > 0 
      ? (currentTime - this.lastUpdateTime) / 1000.0 
      : 0.016; // Default to ~60fps for first frame
    this.lastUpdateTime = currentTime;
    
    // Use delta time accumulation for frame-rate independent animation
    this.blackHole.advanceTime(deltaTime * this.blackHole.animationSpeed);
    this.updateUniformData();
  }

  private render() {
    this.renderer.render(this.blackHole);
    // Read timing results if ready
    if (this.performanceProfiler.shouldReadTimingResults(true)) {
      this.performanceProfiler.readTimingResults();
    }
  }

  mainLoop() {
    this.performanceProfiler.startCpuFrameTiming();
    const currentTime = performance.now();
    const { shouldRender } = this.fps.shouldRenderFrame(
      currentTime,
      this.blackHole.maxFrameRate
    );
    if (shouldRender) {
      this.fps.updateFps(currentTime);
      this.update(currentTime);
      this.render();
      this.performanceProfiler.endCpuFrameTiming();
    }
    
    // Use setTimeout for unlocked framerate to bypass vsync/browser caps
    if (this.blackHole.maxFrameRate >= 120) {
      setTimeout(() => this.mainLoop(), 0);
    } else {
      window.requestAnimationFrame(() => this.mainLoop());
    }
  }

  getDevice(): GPUDevice {
    return this.device;
  }

  resize(width: number, height: number) {
    console.log(`🟠 BlackholeSimulator.resize called with ${width}x${height}`);
    this.canvas.width = width;
    this.canvas.height = height;
    this.resources.setup();
    this.renderer.setup(); // Recreate bind groups with new textures
    this.camera.adjustCamera();
    this.updateUniformData();
  }
}

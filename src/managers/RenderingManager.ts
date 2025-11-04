import { BlackholeSimulator } from "../BlackholeSimulator";
import { Blackhole } from "../entities/Blackhole";
import fullscreenVertWGSL from "../shaders/fullscreen.vert.wgsl";
import passthroughFragWGSL from "../shaders/postprocessing/passthrough.frag.wgsl";

export class RenderingManager {
  private simulator: BlackholeSimulator;

  // Ping-pong state: true => render into bufferA (sample previousFrame), false => render into previousFrame (sample bufferA)
  private useBufferAAsCurrent: boolean = true;
  private hasHistory: boolean = false;

  // Camera motion tracking for temporal AA
  private lastCameraPanX: number = 0;
  private lastCameraPanY: number = 0;
  private cameraMoving: boolean = false;

  // Scratch arrays to avoid per-frame allocations
  private uniformScratch: Float32Array = new Float32Array(40);
  private resolutionScratch: Float32Array = new Float32Array(2);

  // Frame counter for performance profiling
  private frameCount = 0;
  
  // Pass-through pipeline for grayscale output
  private passthroughPipeline: GPURenderPipeline | null = null;

  constructor(simulator: BlackholeSimulator) {
    this.simulator = simulator;
  }

  // Returns the number of frames rendered
  getFrameCount(): number {
    return this.frameCount;
  }

  setup() {
    console.log(`🟠 RenderingManager.setup()`);
    // Reset history when resources are recreated
    this.useBufferAAsCurrent = true;
    this.hasHistory = false;
  }

  updateUniforms() {
    const device = this.simulator.device;
    const resources = this.simulator.resources;

    // Update uniform buffer with black hole parameters
    const bh = this.simulator.blackHole;

    // Detect camera movement
    const threshold = 0.001;
    const deltaX = Math.abs(bh.cameraPanX - this.lastCameraPanX);
    const deltaY = Math.abs(bh.cameraPanY - this.lastCameraPanY);

    if (deltaX > threshold || deltaY > threshold) {
      // Camera is moving - disable temporal AA immediately
      this.cameraMoving = true;
      this.hasHistory = false; // Clear history on movement
    } else {
      // Camera is still - enable temporal AA immediately
      this.cameraMoving = false;
    }

    this.lastCameraPanX = bh.cameraPanX;
    this.lastCameraPanY = bh.cameraPanY;

    // Keep order aligned with WGSL struct Uniforms
    this.uniformScratch[0] = bh.time;
    this.uniformScratch[1] = bh.iterations;
    this.uniformScratch[2] = bh.warpAmount;
    this.uniformScratch[3] = bh.discRadius;
    this.uniformScratch[4] = bh.discWidth;
    this.uniformScratch[5] = bh.discThickness;
    this.uniformScratch[6] = bh.discSpeed;
    this.uniformScratch[7] = bh.discBrightness;
    this.uniformScratch[8] = bh.discTemperature;
    this.uniformScratch[9] = bh.discInnerFalloff;
    this.uniformScratch[10] = bh.discOuterFalloff;
    this.uniformScratch[11] = bh.discTexturePower;
    this.uniformScratch[12] = bh.discMinCoverage;
    this.uniformScratch[13] = bh.discOuterTransparency;
    this.uniformScratch[14] = bh.hazeIntensity;
    // Disable temporal AA when camera is moving to prevent ghosting
    this.uniformScratch[15] =
      this.hasHistory && !this.cameraMoving ? bh.getTemporalBlendWeight() : 0.0;
    this.uniformScratch[16] = bh.cameraRotationX;
    this.uniformScratch[17] = bh.cameraRotationY;
    this.uniformScratch[18] = bh.brightnessFactor;
    this.uniformScratch[19] = bh.cameraPanX;
    this.uniformScratch[20] = bh.cameraPanY;
    // Convert degrees to radians for shader
    const DEG_TO_RAD = Math.PI / 180;
    this.uniformScratch[21] = bh.blackHoleRotationX * DEG_TO_RAD;
    this.uniformScratch[22] = bh.blackHoleRotationY * DEG_TO_RAD;
    this.uniformScratch[23] = bh.blackHoleRotationZ * DEG_TO_RAD;
    this.uniformScratch[24] = bh.stepMinScale;
    this.uniformScratch[25] = bh.stepMaxScale;
    this.uniformScratch[26] = bh.stepNearFactor;
    this.uniformScratch[27] = bh.stepFarFactor;
    // Palette colors + color intensity
    this.uniformScratch[28] = bh.centerColor[0];
    this.uniformScratch[29] = bh.centerColor[1];
    this.uniformScratch[30] = bh.centerColor[2];
    this.uniformScratch[31] = bh.discInnerColor[0];
    this.uniformScratch[32] = bh.discInnerColor[1];
    this.uniformScratch[33] = bh.discInnerColor[2];
    this.uniformScratch[34] = bh.discOuterColor[0];
    this.uniformScratch[35] = bh.discOuterColor[1];
    this.uniformScratch[36] = bh.discOuterColor[2];
    this.uniformScratch[37] = bh.colorIntensity;
    this.uniformScratch[38] = bh.colorOuterToInnerPoint;
    this.uniformScratch[39] = bh.colorInnerToCenterPoint;
    device.queue.writeBuffer(
      resources.getUniformBuffer(),
      0,
      this.uniformScratch.buffer,
      0,
      this.uniformScratch.byteLength
    );

    // Update resolution buffer
    // Use canvas dimensions (not scaled buffer dimensions) for camera rotation normalization
    this.resolutionScratch[0] = this.simulator.canvas.width;
    this.resolutionScratch[1] = this.simulator.canvas.height;
    device.queue.writeBuffer(
      resources.getResolutionBuffer(),
      0,
      this.resolutionScratch.buffer,
      0,
      this.resolutionScratch.byteLength
    );
  }

  render(blackHole: Blackhole) {
    const device = this.simulator.device;
    const context = this.simulator.context;
    const resources = this.simulator.resources;
    const canvas = this.simulator.canvas;

    const encoder = device.createCommandEncoder({ label: "Blackhole Render" });

    // Step 1: Compute raymarch directly into ping-pong texture (no blit needed!)
    resources.blackholeCompute.dispatch(encoder, this.useBufferAAsCurrent);

    // Step 2: Apply post-processing (bloom + tonemap) directly from compute output
    this.applyPostProcessing(encoder, context.getCurrentTexture().createView());

    // Resolve GPU timing queries if available
    this.resolveTimingQueries(
      encoder,
      this.simulator.performanceProfiler.isReadingResults()
    );

    device.queue.submit([encoder.finish()]);

    // Flip ping-pong for next frame
    this.useBufferAAsCurrent = !this.useBufferAAsCurrent;
    this.hasHistory = true;
    this.frameCount++;
  }

  // Apply post-processing effects including bloom, tone mapping, and colorization.
  // Pipeline order: grayscale → bloom extraction → tone mapping → colorization (optional).
  // Colorization happens AFTER tone mapping to work with properly compressed values.
  private applyPostProcessing(
    commandEncoder: GPUCommandEncoder,
    canvasTextureView: GPUTextureView
  ) {
    const canvas = this.simulator.canvas;
    const resources = this.simulator.resources;

    // Always use grayscale for bloom and initial tone mapping
    const grayscaleView = this.useBufferAAsCurrent
      ? resources.getBufferAView()
      : resources.getPreviousFrameView();

    // Bloom extraction pass - isolate bright areas above threshold from colorized output.
    const bloomTextures = resources.bloomResources.getBloomTextures(
      canvas.width,
      canvas.height
    );
    const bloomExtractPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: bloomTextures.bloomTextureView1,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    bloomExtractPass.setPipeline(
      resources.bloomResources.getBloomExtractPipeline()
    );
    
    // Create a custom bind group for bloom extraction using grayscale
    const bloomExtractBindGroup = this.simulator.device.createBindGroup({
      label: "bloom extract bind group",
      layout: resources.bloomResources.getBloomExtractPipeline().getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: resources.toneMapResources.getToneMapSampler(),
        },
        {
          binding: 1,
          resource: grayscaleView, // Always use grayscale for bloom
        },
        {
          binding: 2,
          resource: { buffer: resources.bloomResources.getBloomParamsBuffer() },
        },
      ],
    });
    
    bloomExtractPass.setBindGroup(0, bloomExtractBindGroup);
    bloomExtractPass.draw(3, 1, 0, 0);
    bloomExtractPass.end();

    // Horizontal blur pass - blur extracted bright areas horizontally.
    const blurHPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: bloomTextures.bloomTextureView2,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    blurHPass.setPipeline(resources.bloomResources.getBloomBlurPipeline());
    blurHPass.setBindGroup(
      0,
      resources.bloomResources.getBloomBlurBindGroups(
        canvas.width,
        canvas.height
      ).bloomBlurHBindGroup
    );
    blurHPass.draw(3, 1, 0, 0);
    blurHPass.end();

    // Vertical blur pass - complete the separable blur.
    const blurVPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: bloomTextures.bloomTextureView1,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    blurVPass.setPipeline(resources.bloomResources.getBloomBlurPipeline());
    blurVPass.setBindGroup(
      0,
      resources.bloomResources.getBloomBlurBindGroups(
        canvas.width,
        canvas.height
      ).bloomBlurVBindGroup
    );
    blurVPass.draw(3, 1, 0, 0);
    blurVPass.end();

    // Always tone map to HDR texture first
    const toneMappedTexture = resources.hdrResources.getHDRTexture(
      canvas.width,
      canvas.height
    );
    const toneMappedView = resources.hdrResources.getHDRTextureView(
      canvas.width,
      canvas.height
    );

    // Tone mapping pass - combine HDR + bloom and tonemap to HDR texture
    const toneMapPassDesc: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: toneMappedView,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      timestampWrites: this.isAdvancedOptionsEnabled() && !this.simulator.blackHole.enableColorization
        ? this.simulator.performanceProfiler.getToneMappingTimestampWrites()
        : undefined,
    };

    const toneMapPass = commandEncoder.beginRenderPass(toneMapPassDesc);
    toneMapPass.setPipeline(resources.toneMapResources.getToneMapPipeline());
    
    // Create bind group for tone mapping using grayscale
    const toneMapBindGroup = this.simulator.device.createBindGroup({
      label: "tone map bind group",
      layout: resources.toneMapResources.getToneMapPipeline().getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: resources.toneMapResources.getToneMapSampler(),
        },
        {
          binding: 1,
          resource: grayscaleView, // Always use grayscale for tone mapping
        },
        {
          binding: 2,
          resource: { buffer: resources.toneMapResources.getToneParamBuffer() },
        },
        {
          binding: 3,
          resource: resources.bloomResources.getBloomTextures(canvas.width, canvas.height).bloomTextureView1,
        },
      ],
    });
    
    toneMapPass.setBindGroup(0, toneMapBindGroup);
    toneMapPass.draw(3, 1, 0, 0);
    toneMapPass.end();

    // Final pass to canvas - pass-through tone-mapped color
    const passthroughPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: canvasTextureView,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      timestampWrites: this.isAdvancedOptionsEnabled()
        ? this.simulator.performanceProfiler.getToneMappingTimestampWrites()
        : undefined,
    });

    // Get or create pass-through pipeline
    const passthroughPipeline = this.getPassthroughPipeline();
    const passthroughBindGroup = this.simulator.device.createBindGroup({
      label: "passthrough bind group",
      layout: passthroughPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: resources.getSampler() },
        { binding: 1, resource: toneMappedView },
      ],
    });

    passthroughPass.setPipeline(passthroughPipeline);
    passthroughPass.setBindGroup(0, passthroughBindGroup);
    passthroughPass.draw(3, 1, 0, 0);
    passthroughPass.end();
  }

  // Resolve GPU timing queries to measure performance. Only resolves if timing
  // is available and results aren't currently being read to avoid conflicts.
  private resolveTimingQueries(
    commandEncoder: GPUCommandEncoder,
    isReadingTimingResults: boolean
  ) {
    // Skip GPU timing resolves if advanced options are disabled
    if (!!!this.isAdvancedOptionsEnabled()) return;
    const p = this.simulator.performanceProfiler;
    if (!!p.querySet && !!p.queryBuffer && !isReadingTimingResults) {
      commandEncoder.resolveQuerySet(p.querySet!, 0, 3, p.queryBuffer!, 0);
      if (!!p.resultBuffer) {
        commandEncoder.copyBufferToBuffer(
          p.queryBuffer!,
          0,
          p.resultBuffer!,
          0,
          3 * 8 // 3 timestamps * 8 bytes each
        );
      }
    }
  }

  private isAdvancedOptionsEnabled(): boolean {
    try {
      const val = localStorage.getItem("showAdvancedOptions");
      return val === null ? true : val === "true";
    } catch {
      return true;
    }
  }

  private getPassthroughPipeline(): GPURenderPipeline {
    if (this.passthroughPipeline) return this.passthroughPipeline;
    
    const bindGroupLayout = this.simulator.device.createBindGroupLayout({
      label: "passthrough bind group layout",
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
      ],
    });
    
    this.passthroughPipeline = this.simulator.device.createRenderPipeline({
      label: "passthrough pipeline",
      layout: this.simulator.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module: this.simulator.device.createShaderModule({ code: fullscreenVertWGSL }),
        entryPoint: "main",
      },
      fragment: {
        module: this.simulator.device.createShaderModule({ code: passthroughFragWGSL }),
        entryPoint: "main",
        targets: [{ format: this.simulator.presentationFormat }],
      },
      primitive: { topology: "triangle-list" },
    });
    
    return this.passthroughPipeline;
  }
}

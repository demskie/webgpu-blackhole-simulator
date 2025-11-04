import { BlackholeSimulator } from "../BlackholeSimulator";
import { ResourceManager } from "../managers/ResourceManager";

export interface VRAMUsage {
  total: number;
  textures: number;
  buffers: number;
}

export class MemoryProfiler {
  device: GPUDevice;
  canvas: HTMLCanvasElement;
  resources: () => ResourceManager;

  constructor(simulator: BlackholeSimulator) {
    this.device = simulator.device;
    this.canvas = simulator.canvas;
    this.resources = () => {
      if (!!!simulator.resources)
        throw new Error(
          "ResourceManager must be initialized before MemoryProfiler"
        );
      return simulator.resources;
    };
  }

  // Calculate current VRAM usage by summing texture and buffer sizes.
  getVRAMUsage(): VRAMUsage {
    let textureMemory = 0;
    let bufferMemory = 0;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const bytesPerPixel = 8; // rgba16float = 4 channels * 2 bytes each

    // HDR texture
    if (this.resources().hdrResources.getHDRTexture(width, height)) {
      textureMemory += width * height * bytesPerPixel;
    }

    // Bloom textures (half resolution)
    const bloomWidth = Math.floor(width / 2);
    const bloomHeight = Math.floor(height / 2);
    textureMemory += 2 * bloomWidth * bloomHeight * bytesPerPixel;

    // Buffer textures (bufferA, previousFrame)
    textureMemory += 2 * width * height * bytesPerPixel;

    // Noise texture (256x256 rgba8unorm = 4 bytes per pixel)
    textureMemory += 256 * 256 * 4;

    // Procedural texture (1024x1024 rgba8unorm = 4 bytes per pixel)
    textureMemory += 1024 * 1024 * 4;

    // Uniform buffers
    bufferMemory += 23 * 4; // Main uniform buffer
    bufferMemory += 8; // Resolution buffer

    // Tone mapping parameters buffer
    if (this.resources().toneMapResources.getToneParamBuffer()) {
      bufferMemory += 36;
    }

    // Bloom parameters buffers
    if (this.resources().bloomResources.getBloomParamsBuffer()) {
      bufferMemory += 16;
    }
    if (this.resources().bloomResources.getBloomBlurHParamsBuffer()) {
      bufferMemory += 16;
    }
    if (this.resources().bloomResources.getBloomBlurVParamsBuffer()) {
      bufferMemory += 16;
    }

    // GPU timing buffers
    if (this.resources().performanceProfiler().queryBuffer) bufferMemory += 24; // 3 queries * 8 bytes
    if (this.resources().performanceProfiler().resultBuffer) bufferMemory += 24;

    return {
      textures: textureMemory,
      buffers: bufferMemory,
      total: textureMemory + bufferMemory,
    };
  }
}

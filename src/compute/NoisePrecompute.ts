import { BlackholeSimulator } from "../BlackholeSimulator";
import noisePrecomputeWGSL from "../shaders/compute/noise-precompute.comp.wgsl";

export interface NoiseTextures {
  noise1Texture: GPUTexture;
  noise2Texture: GPUTexture;
}

export class NoisePrecompute {
  private readonly device: GPUDevice;
  private readonly simulator: () => BlackholeSimulator;

  // Texture dimensions
  private readonly TEXTURE_WIDTH = 256;
  private readonly TEXTURE_HEIGHT = 256;
  private readonly TEXTURE_DEPTH = 64;

  // 3D noise textures
  private noise1Texture: GPUTexture | null = null;
  private noise2Texture: GPUTexture | null = null;

  // Compute pipeline for generating noise
  private computePipeline: GPUComputePipeline | null = null;
  private bindGroupLayout: GPUBindGroupLayout | null = null;
  private bindGroup1: GPUBindGroup | null = null;
  private bindGroup2: GPUBindGroup | null = null;

  // Source noise texture (2D)
  private sourceNoiseTexture: GPUTexture | null = null;
  private sourceNoiseSampler: GPUSampler | null = null;

  constructor(simulator: BlackholeSimulator) {
    this.device = simulator.device;
    this.simulator = () => simulator;
  }

  setup() {
    console.log("🔴 Setting up NoisePrecompute");
    this.createSourceNoiseTexture();
    this.createNoise3DTextures();
    this.createComputePipeline();
    this.generateNoiseTextures();
  }

  private createSourceNoiseTexture() {
    console.log("🔴 Creating source noise texture");
    // Create a 2D noise texture as input (similar to the original noise texture)
    const size = 256;
    const data = new Uint8Array(size * size * 4);
    
    for (let i = 0; i < size * size; i++) {
      data[i * 4 + 0] = Math.floor(Math.random() * 256);
      data[i * 4 + 1] = Math.floor(Math.random() * 256);
      data[i * 4 + 2] = Math.floor(Math.random() * 256);
      data[i * 4 + 3] = 255;
    }

    this.sourceNoiseTexture = this.device.createTexture({
      label: "sourceNoiseTexture",
      size: [size, size, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    this.device.queue.writeTexture(
      { texture: this.sourceNoiseTexture },
      data,
      { bytesPerRow: size * 4 },
      [size, size, 1]
    );

    this.sourceNoiseSampler = this.device.createSampler({
      label: "sourceNoiseSampler",
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "repeat",
    });
  }

  private createNoise3DTextures() {
    console.log("🔴 Creating 3D noise textures");
    
    const textureDesc: GPUTextureDescriptor = {
      size: [this.TEXTURE_WIDTH, this.TEXTURE_HEIGHT, this.TEXTURE_DEPTH],
      format: "rgba16float",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      dimension: "3d",
    };

    this.noise1Texture = this.device.createTexture({
      ...textureDesc,
      label: "noise1Texture3D",
    });

    this.noise2Texture = this.device.createTexture({
      ...textureDesc,
      label: "noise2Texture3D",
    });
  }

  private getBindGroupLayout(): GPUBindGroupLayout {
    if (!this.bindGroupLayout) {
      this.bindGroupLayout = this.device.createBindGroupLayout({
        label: "noisePrecomputeBindGroupLayout",
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            sampler: {},
          },
          {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            texture: {
              sampleType: "float",
              viewDimension: "2d",
            },
          },
          {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            storageTexture: {
              access: "write-only",
              format: "rgba16float",
              viewDimension: "3d",
            },
          },
        ],
      });
    }
    return this.bindGroupLayout;
  }

  private createComputePipeline() {
    console.log("🔴 Creating noise precompute pipeline");
    
    const pipelineLayout = this.device.createPipelineLayout({
      label: "noisePrecomputePipelineLayout",
      bindGroupLayouts: [this.getBindGroupLayout()],
    });

    this.computePipeline = this.device.createComputePipeline({
      label: "noisePrecomputePipeline",
      layout: pipelineLayout,
      compute: {
        module: this.device.createShaderModule({ code: noisePrecomputeWGSL }),
        entryPoint: "main",
        constants: {
          NOISE_TYPE: 0, // Will be overridden for each noise type
        },
      },
    });
  }

  private createBindGroups() {
    if (!this.sourceNoiseTexture || !this.sourceNoiseSampler || !this.noise1Texture || !this.noise2Texture) {
      throw new Error("Textures not initialized");
    }

    // Bind group for noise1
    this.bindGroup1 = this.device.createBindGroup({
      label: "noise1PrecomputeBindGroup",
      layout: this.getBindGroupLayout(),
      entries: [
        {
          binding: 0,
          resource: this.sourceNoiseSampler,
        },
        {
          binding: 1,
          resource: this.sourceNoiseTexture.createView(),
        },
        {
          binding: 2,
          resource: this.noise1Texture.createView(),
        },
      ],
    });

    // Bind group for noise2
    this.bindGroup2 = this.device.createBindGroup({
      label: "noise2PrecomputeBindGroup",
      layout: this.getBindGroupLayout(),
      entries: [
        {
          binding: 0,
          resource: this.sourceNoiseSampler,
        },
        {
          binding: 1,
          resource: this.sourceNoiseTexture.createView(),
        },
        {
          binding: 2,
          resource: this.noise2Texture.createView(),
        },
      ],
    });
  }

  private generateNoiseTextures() {
    console.log("🔴 Generating precomputed noise textures");
    
    if (!this.computePipeline) {
      throw new Error("Compute pipeline not created");
    }

    this.createBindGroups();

    // Need to create two versions of the compute pipeline with different constants
    const pipelineLayout = this.device.createPipelineLayout({
      label: "noisePrecomputePipelineLayout",
      bindGroupLayouts: [this.getBindGroupLayout()],
    });
    
    const pipeline1 = this.device.createComputePipeline({
      label: "noisePrecomputePipeline1",
      layout: pipelineLayout,
      compute: {
        module: this.device.createShaderModule({ code: noisePrecomputeWGSL }),
        entryPoint: "main",
        constants: {
          NOISE_TYPE: 1, // For noise1 (4 octaves)
        },
      },
    });

    const pipeline2 = this.device.createComputePipeline({
      label: "noisePrecomputePipeline2",
      layout: pipelineLayout,
      compute: {
        module: this.device.createShaderModule({ code: noisePrecomputeWGSL }),
        entryPoint: "main",
        constants: {
          NOISE_TYPE: 2, // For noise2 (6 octaves)
        },
      },
    });

    const commandEncoder = this.device.createCommandEncoder();

    // Generate noise1 texture
    {
      const pass = commandEncoder.beginComputePass();
      pass.setPipeline(pipeline1);
      pass.setBindGroup(0, this.bindGroup1!);
      const workgroupsX = Math.ceil(this.TEXTURE_WIDTH / 8);
      const workgroupsY = Math.ceil(this.TEXTURE_HEIGHT / 8);
      const workgroupsZ = Math.ceil(this.TEXTURE_DEPTH / 4);
      pass.dispatchWorkgroups(workgroupsX, workgroupsY, workgroupsZ);
      pass.end();
    }

    // Generate noise2 texture
    {
      const pass = commandEncoder.beginComputePass();
      pass.setPipeline(pipeline2);
      pass.setBindGroup(0, this.bindGroup2!);
      const workgroupsX = Math.ceil(this.TEXTURE_WIDTH / 8);
      const workgroupsY = Math.ceil(this.TEXTURE_HEIGHT / 8);
      const workgroupsZ = Math.ceil(this.TEXTURE_DEPTH / 4);
      pass.dispatchWorkgroups(workgroupsX, workgroupsY, workgroupsZ);
      pass.end();
    }

    this.device.queue.submit([commandEncoder.finish()]);
  }

  getNoiseTextures(): NoiseTextures {
    if (!this.noise1Texture || !this.noise2Texture) {
      throw new Error("Noise textures not initialized");
    }
    return {
      noise1Texture: this.noise1Texture,
      noise2Texture: this.noise2Texture,
    };
  }

  destroy() {
    console.log("🔴 Destroying NoisePrecompute");
    this.sourceNoiseTexture?.destroy();
    this.noise1Texture?.destroy();
    this.noise2Texture?.destroy();
    this.bindGroup1 = null;
    this.bindGroup2 = null;
    this.computePipeline = null;
    this.bindGroupLayout = null;
    this.sourceNoiseSampler = null;
  }
}

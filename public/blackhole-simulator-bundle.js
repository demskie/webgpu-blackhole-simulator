var BlackholeSimulator;
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/BlackholeSimulator.ts":
/*!***********************************!*\
  !*** ./src/BlackholeSimulator.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BlackholeSimulator: () => (/* binding */ BlackholeSimulator)
/* harmony export */ });
/* harmony import */ var _managers_ResourceManager__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./managers/ResourceManager */ "./src/managers/ResourceManager.ts");
/* harmony import */ var _managers_RenderingManager__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./managers/RenderingManager */ "./src/managers/RenderingManager.ts");
/* harmony import */ var _managers_FPSManager__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./managers/FPSManager */ "./src/managers/FPSManager.ts");
/* harmony import */ var _managers_UIManager__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./managers/UIManager */ "./src/managers/UIManager.ts");
/* harmony import */ var _managers_CameraManager__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./managers/CameraManager */ "./src/managers/CameraManager.ts");
/* harmony import */ var _entities_Blackhole__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./entities/Blackhole */ "./src/entities/Blackhole.ts");
/* harmony import */ var _profilers_PerformanceProfiler__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./profilers/PerformanceProfiler */ "./src/profilers/PerformanceProfiler.ts");
/* harmony import */ var _profilers_MemoryProfiler__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./profilers/MemoryProfiler */ "./src/profilers/MemoryProfiler.ts");








class BlackholeSimulator {
    canvas;
    device;
    context;
    presentationFormat;
    blackHole;
    camera;
    resources;
    renderer;
    fps;
    ui;
    performanceProfiler;
    memoryProfiler;
    startTime = 0;
    constructor(canvas, device, context, presentationFormat) {
        this.canvas = canvas;
        this.device = device;
        this.context = context;
        this.presentationFormat = presentationFormat;
        // Initialize black hole with default parameters and callbacks
        this.blackHole = new _entities_Blackhole__WEBPACK_IMPORTED_MODULE_5__.Blackhole({
            // Camera starts centered (pan = 0.0)
            cameraPanX: 0.0,
            cameraPanY: 0.0,
        }, {
            onParametersChanged: () => this.updateUniformData(),
            onToneParametersChanged: () => this.updateToneParameters(),
            onBloomParametersChanged: () => this.updateBloomParameters(),
            onTemperatureChanged: () => this.updateProceduralTexture(),
        });
        // Initialize managers
        this.camera = new _managers_CameraManager__WEBPACK_IMPORTED_MODULE_4__.CameraManager(this);
        this.resources = new _managers_ResourceManager__WEBPACK_IMPORTED_MODULE_0__.ResourceManager(this);
        this.resources.setup();
        this.fps = new _managers_FPSManager__WEBPACK_IMPORTED_MODULE_2__.FPSManager(this);
        // Initialize performance profiler with advanced options enabled/disabled
        this.performanceProfiler = new _profilers_PerformanceProfiler__WEBPACK_IMPORTED_MODULE_6__.PerformanceProfiler(this);
        if (_profilers_PerformanceProfiler__WEBPACK_IMPORTED_MODULE_6__.PerformanceProfiler.getAdvancedOptionsEnabled()) {
            this.performanceProfiler.create();
        }
        this.memoryProfiler = new _profilers_MemoryProfiler__WEBPACK_IMPORTED_MODULE_7__.MemoryProfiler(this);
        this.renderer = new _managers_RenderingManager__WEBPACK_IMPORTED_MODULE_1__.RenderingManager(this);
        this.renderer.setup(); // Setup pipelines after resources are ready
        this.ui = new _managers_UIManager__WEBPACK_IMPORTED_MODULE_3__.UIManager(this);
        this.startTime = performance.now();
        this.updateUniformData();
        window.requestAnimationFrame(() => this.mainLoop());
    }
    static async start(canvasId) {
        if (!!!navigator.gpu)
            throw new Error("WebGPU not supported on this browser. The latest version of Chrome is recommended.");
        const adapter = await navigator.gpu.requestAdapter();
        if (!!!adapter)
            throw new Error("No appropriate GPUAdapter found.");
        let device;
        try {
            device = await adapter.requestDevice({
                requiredFeatures: ["timestamp-query"],
            });
        }
        catch {
            console.warn("timestamp-query feature not supported, GPU timing will be unavailable");
            device = await adapter.requestDevice();
        }
        if (!!!device)
            throw new Error("Failed to get GPUDevice.");
        const canvas = document.getElementById(canvasId);
        if (!!!canvas)
            throw Error(`Failed to get canvas object with id "${canvasId}"`);
        const context = canvas.getContext("webgpu");
        if (!!!context)
            throw new Error("Failed to get GPUCanvasContext.");
        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
            device: device,
            format: presentationFormat,
            alphaMode: "opaque",
        });
        return new BlackholeSimulator(canvas, device, context, presentationFormat);
    }
    updateUniformData() {
        this.renderer.updateUniforms();
    }
    updateToneParameters() {
        this.resources.toneMapResources.updateToneParamBuffer();
    }
    updateBloomParameters() {
        this.resources.bloomResources.updateBloomParamsBuffer();
    }
    updateProceduralTexture() {
        this.resources.regenerateProceduralTexture();
    }
    update(currentTime) {
        // Use elapsed time in seconds (matching WebGL2 version)
        const elapsedSeconds = (currentTime - this.startTime) / 1000.0;
        // Apply animation speed multiplier
        this.blackHole.setTime(elapsedSeconds * this.blackHole.animationSpeed);
        this.updateUniformData();
    }
    render() {
        this.renderer.render(this.blackHole);
        // Read timing results if ready
        if (this.performanceProfiler.shouldReadTimingResults(true)) {
            this.performanceProfiler.readTimingResults();
        }
    }
    mainLoop() {
        this.performanceProfiler.startCpuFrameTiming();
        const currentTime = performance.now();
        const { shouldRender } = this.fps.shouldRenderFrame(currentTime, this.blackHole.maxFrameRate);
        if (shouldRender) {
            this.fps.updateFps(currentTime);
            this.update(currentTime);
            this.render();
            this.performanceProfiler.endCpuFrameTiming();
        }
        window.requestAnimationFrame(() => this.mainLoop());
    }
    getDevice() {
        return this.device;
    }
    resize(width, height) {
        console.log(`🟠 BlackholeSimulator.resize called with ${width}x${height}`);
        this.canvas.width = width;
        this.canvas.height = height;
        this.resources.setup();
        this.renderer.setup(); // Recreate bind groups with new textures
        this.camera.adjustCamera();
        this.updateUniformData();
    }
}


/***/ }),

/***/ "./src/compute/BlackholeCompute.ts":
/*!*****************************************!*\
  !*** ./src/compute/BlackholeCompute.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BlackholeCompute: () => (/* binding */ BlackholeCompute)
/* harmony export */ });
/* harmony import */ var _shaders_compute_blackhole_comp_wgsl__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../shaders/compute/blackhole.comp.wgsl */ "./src/shaders/compute/blackhole.comp.wgsl");
/* harmony import */ var _NoisePrecompute__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./NoisePrecompute */ "./src/compute/NoisePrecompute.ts");


class BlackholeCompute {
    device;
    simulator;
    noisePrecompute = null;
    noise3DSampler = null;
    computePipeline = null;
    computeBindGroup = null;
    computeBindGroupAlt = null;
    computeBindGroupLayout = null;
    constructor(simulator) {
        this.device = simulator.device;
        this.simulator = () => simulator;
    }
    setup() {
        // Initialize noise precompute
        this.noisePrecompute = new _NoisePrecompute__WEBPACK_IMPORTED_MODULE_1__.NoisePrecompute(this.simulator());
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
    getComputeBindGroupLayout() {
        if (this.computeBindGroupLayout)
            return this.computeBindGroupLayout;
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
                { binding: 6, visibility: GPUShaderStage.COMPUTE, sampler: {} },
                {
                    binding: 7,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: { sampleType: "float" },
                },
                {
                    binding: 8,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: { access: "write-only", format: "rgba16float" },
                },
                // 3D noise textures and sampler
                { binding: 9, visibility: GPUShaderStage.COMPUTE, sampler: {} },
                {
                    binding: 10,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: { sampleType: "float", viewDimension: "3d" },
                },
                {
                    binding: 11,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: { sampleType: "float", viewDimension: "3d" },
                },
            ],
        });
        return this.computeBindGroupLayout;
    }
    getComputePipeline() {
        if (this.computePipeline)
            return this.computePipeline;
        const pipelineLayout = this.device.createPipelineLayout({
            label: "blackholeComputePipelineLayout",
            bindGroupLayouts: [this.getComputeBindGroupLayout()],
        });
        this.computePipeline = this.device.createComputePipeline({
            label: "blackholeComputePipeline",
            layout: pipelineLayout,
            compute: {
                module: this.device.createShaderModule({ code: _shaders_compute_blackhole_comp_wgsl__WEBPACK_IMPORTED_MODULE_0__["default"] }),
                entryPoint: "main",
            },
        });
        return this.computePipeline;
    }
    createComputeBindGroup(useBufferAAsCurrent) {
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
                { binding: 2, resource: resources.getRepeatSampler() }, // noise sampler (repeat)
                { binding: 3, resource: resources.getNoiseView() },
                { binding: 4, resource: resources.getRepeatSampler() }, // procedural sampler (repeat)
                { binding: 5, resource: resources.getProceduralView() },
                { binding: 6, resource: resources.getSampler() }, // clamp sampler for previous
                { binding: 7, resource: previousView },
                { binding: 8, resource: currentView }, // Write directly to ping-pong texture
                // 3D noise textures
                { binding: 9, resource: this.noise3DSampler },
                {
                    binding: 10,
                    resource: this.noisePrecompute.getNoiseTextures().noise1Texture.createView(),
                },
                {
                    binding: 11,
                    resource: this.noisePrecompute.getNoiseTextures().noise2Texture.createView(),
                },
            ],
        });
        return bindGroup;
    }
    getBindGroup(useBufferAAsCurrent) {
        if (useBufferAAsCurrent) {
            if (!this.computeBindGroup)
                this.computeBindGroup = this.createComputeBindGroup(true);
            return this.computeBindGroup;
        }
        if (!this.computeBindGroupAlt)
            this.computeBindGroupAlt = this.createComputeBindGroup(false);
        return this.computeBindGroupAlt;
    }
    dispatch(commandEncoder, useBufferAAsCurrent) {
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


/***/ }),

/***/ "./src/compute/NoisePrecompute.ts":
/*!****************************************!*\
  !*** ./src/compute/NoisePrecompute.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NoisePrecompute: () => (/* binding */ NoisePrecompute)
/* harmony export */ });
/* harmony import */ var _shaders_compute_noise_precompute_comp_wgsl__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../shaders/compute/noise-precompute.comp.wgsl */ "./src/shaders/compute/noise-precompute.comp.wgsl");

class NoisePrecompute {
    device;
    simulator;
    // Texture dimensions
    TEXTURE_WIDTH = 256;
    TEXTURE_HEIGHT = 256;
    TEXTURE_DEPTH = 64;
    // 3D noise textures
    noise1Texture = null;
    noise2Texture = null;
    // Compute pipeline for generating noise
    computePipeline = null;
    bindGroupLayout = null;
    bindGroup1 = null;
    bindGroup2 = null;
    // Source noise texture (2D)
    sourceNoiseTexture = null;
    sourceNoiseSampler = null;
    constructor(simulator) {
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
    createSourceNoiseTexture() {
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
        this.device.queue.writeTexture({ texture: this.sourceNoiseTexture }, data, { bytesPerRow: size * 4 }, [size, size, 1]);
        this.sourceNoiseSampler = this.device.createSampler({
            label: "sourceNoiseSampler",
            magFilter: "linear",
            minFilter: "linear",
            addressModeU: "repeat",
            addressModeV: "repeat",
        });
    }
    createNoise3DTextures() {
        console.log("🔴 Creating 3D noise textures");
        const textureDesc = {
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
    getBindGroupLayout() {
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
    createComputePipeline() {
        console.log("🔴 Creating noise precompute pipeline");
        const pipelineLayout = this.device.createPipelineLayout({
            label: "noisePrecomputePipelineLayout",
            bindGroupLayouts: [this.getBindGroupLayout()],
        });
        this.computePipeline = this.device.createComputePipeline({
            label: "noisePrecomputePipeline",
            layout: pipelineLayout,
            compute: {
                module: this.device.createShaderModule({ code: _shaders_compute_noise_precompute_comp_wgsl__WEBPACK_IMPORTED_MODULE_0__["default"] }),
                entryPoint: "main",
                constants: {
                    NOISE_TYPE: 0, // Will be overridden for each noise type
                },
            },
        });
    }
    createBindGroups() {
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
    generateNoiseTextures() {
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
                module: this.device.createShaderModule({ code: _shaders_compute_noise_precompute_comp_wgsl__WEBPACK_IMPORTED_MODULE_0__["default"] }),
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
                module: this.device.createShaderModule({ code: _shaders_compute_noise_precompute_comp_wgsl__WEBPACK_IMPORTED_MODULE_0__["default"] }),
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
            pass.setBindGroup(0, this.bindGroup1);
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
            pass.setBindGroup(0, this.bindGroup2);
            const workgroupsX = Math.ceil(this.TEXTURE_WIDTH / 8);
            const workgroupsY = Math.ceil(this.TEXTURE_HEIGHT / 8);
            const workgroupsZ = Math.ceil(this.TEXTURE_DEPTH / 4);
            pass.dispatchWorkgroups(workgroupsX, workgroupsY, workgroupsZ);
            pass.end();
        }
        this.device.queue.submit([commandEncoder.finish()]);
    }
    getNoiseTextures() {
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


/***/ }),

/***/ "./src/compute/TextureCompute.ts":
/*!***************************************!*\
  !*** ./src/compute/TextureCompute.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TextureCompute: () => (/* binding */ TextureCompute)
/* harmony export */ });
/* harmony import */ var _shaders_compute_noise_comp_wgsl__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../shaders/compute/noise.comp.wgsl */ "./src/shaders/compute/noise.comp.wgsl");
/* harmony import */ var _shaders_compute_procedural_comp_wgsl__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../shaders/compute/procedural.comp.wgsl */ "./src/shaders/compute/procedural.comp.wgsl");


class TextureCompute {
    device;
    simulator;
    // Noise texture compute resources
    noiseComputePipeline = null;
    noiseComputeBindGroup = null;
    noiseComputeBindGroupLayout = null;
    noiseStorageBuffer = null;
    // Procedural texture compute resources
    proceduralComputePipeline = null;
    proceduralComputeBindGroup = null;
    proceduralComputeBindGroupLayout = null;
    proceduralStorageBuffer = null;
    proceduralParamsBuffer = null;
    constructor(simulator) {
        this.device = simulator.device;
        this.simulator = () => simulator;
    }
    setup() {
        console.log("🔴 Setting up TextureCompute");
        // Resources are created lazily when first accessed
    }
    ////////////////////////////////////////////////////////////
    getNoiseStorageBuffer = () => this.noiseStorageBuffer ?? this.createNoiseStorageBuffer();
    createNoiseStorageBuffer() {
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
    getProceduralStorageBuffer = () => this.proceduralStorageBuffer ?? this.createProceduralStorageBuffer();
    createProceduralStorageBuffer() {
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
    getProceduralParamsBuffer = () => this.proceduralParamsBuffer ?? this.createProceduralParamsBuffer();
    createProceduralParamsBuffer() {
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
    getNoiseComputePipeline = () => this.noiseComputePipeline ?? this.createNoiseComputePipeline();
    createNoiseComputePipeline() {
        console.log("🔴 Creating noise compute pipeline");
        const pipelineLayout = this.device.createPipelineLayout({
            label: "noiseComputePipelineLayout",
            bindGroupLayouts: [this.getNoiseComputeBindGroupLayout()],
        });
        this.noiseComputePipeline = this.device.createComputePipeline({
            label: "noiseComputePipeline",
            layout: pipelineLayout,
            compute: {
                module: this.device.createShaderModule({ code: _shaders_compute_noise_comp_wgsl__WEBPACK_IMPORTED_MODULE_0__["default"] }),
                entryPoint: "main",
            },
        });
        return this.noiseComputePipeline;
    }
    getProceduralComputePipeline = () => this.proceduralComputePipeline ?? this.createProceduralComputePipeline();
    createProceduralComputePipeline() {
        console.log("🔴 Creating procedural compute pipeline");
        const pipelineLayout = this.device.createPipelineLayout({
            label: "proceduralComputePipelineLayout",
            bindGroupLayouts: [this.getProceduralComputeBindGroupLayout()],
        });
        this.proceduralComputePipeline = this.device.createComputePipeline({
            label: "proceduralComputePipeline",
            layout: pipelineLayout,
            compute: {
                module: this.device.createShaderModule({ code: _shaders_compute_procedural_comp_wgsl__WEBPACK_IMPORTED_MODULE_1__["default"] }),
                entryPoint: "main",
            },
        });
        return this.proceduralComputePipeline;
    }
    ////////////////////////////////////////////////////////////
    getNoiseComputeBindGroupLayout = () => this.noiseComputeBindGroupLayout ??
        this.createNoiseComputeBindGroupLayout();
    createNoiseComputeBindGroupLayout() {
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
    getProceduralComputeBindGroupLayout = () => this.proceduralComputeBindGroupLayout ??
        this.createProceduralComputeBindGroupLayout();
    createProceduralComputeBindGroupLayout() {
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
    getNoiseComputeBindGroup = () => this.noiseComputeBindGroup ?? this.createNoiseComputeBindGroup();
    createNoiseComputeBindGroup() {
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
    getProceduralComputeBindGroup = () => this.proceduralComputeBindGroup ?? this.createProceduralComputeBindGroup();
    createProceduralComputeBindGroup() {
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
    generateNoiseTexture(commandEncoder) {
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
        if (shouldSubmit)
            this.device.queue.submit([encoder.finish()]);
    }
    generateProceduralTexture(baseTemperature, temperatureRadiusFactor, minColorTemperature, maxColorTemperature, commandEncoder) {
        // Update the temperature uniforms
        const paramsData = new Float32Array([
            baseTemperature,
            temperatureRadiusFactor,
            minColorTemperature,
            maxColorTemperature,
        ]);
        this.device.queue.writeBuffer(this.getProceduralParamsBuffer(), 0, paramsData);
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
        if (shouldSubmit)
            this.device.queue.submit([encoder.finish()]);
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


/***/ }),

/***/ "./src/entities/Blackhole.ts":
/*!***********************************!*\
  !*** ./src/entities/Blackhole.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Blackhole: () => (/* binding */ Blackhole)
/* harmony export */ });
class Blackhole {
    // Core parameters
    time = 0;
    maxFrameRate = 0;
    animationSpeed = 0;
    // Camera parameters
    cameraRotationX = 0;
    cameraRotationY = 0;
    cameraPanX = 0;
    cameraPanY = 0;
    // Black hole rotation (degrees)
    blackHoleRotationX = 0;
    blackHoleRotationY = 0;
    blackHoleRotationZ = 0;
    // Raymarching parameters
    iterations = 0;
    enableTemporalAA = false;
    temporalAAFrames = 0;
    warpAmount = 0;
    brightnessFactor = 0;
    // Accretion disc parameters
    discRadius = 0;
    discWidth = 0;
    discThickness = 0;
    discSpeed = 0;
    discBrightness = 0;
    discTemperature = 0;
    discTemperatureRadiusFactor = 0;
    discMinColorTemperature = 0;
    discMaxColorTemperature = 0;
    discInnerFalloff = 0;
    discOuterFalloff = 0;
    discTexturePower = 0;
    discMinCoverage = 0;
    discOuterTransparency = 0;
    hazeIntensity = 0;
    temporalMouseThreshold = 0;
    // Adaptive step scaling parameters
    stepMinScale = 0;
    stepMaxScale = 0;
    stepNearFactor = 0;
    stepFarFactor = 0;
    // HDR and Bloom parameters
    exposure = 0;
    saturation = 0;
    bloomIntensity = 0;
    bloomThreshold = 0;
    shadowLift = 0;
    minLiftThreshold = 0;
    toneMapToe = 0;
    toneMapHighlights = 0;
    toneMapMidtones = 0;
    toneMapShoulder = 0;
    // Color control parameters
    enableColorization = true; // Toggle colorization pass
    centerColor = [1, 1, 1];
    discInnerColor = [1, 0.9, 0.7];
    discOuterColor = [1, 0.6, 0.3];
    backgroundTint = [0, 0, 0];
    whitePoint = 0.8;
    blackPoint = 0.02;
    transparencyStart = 1.5;
    transparencyEnd = 2.0;
    colorIntensity = 1.0; // Overall color intensity multiplier
    callbacks;
    constructor(props = {}, callbacks = {}) {
        Object.assign(this, DEFAULT_BLACKHOLE_VALUES, props);
        this.callbacks = callbacks;
    }
    advanceTime(deltaTime) {
        const timeScale = 0.06;
        this.time += deltaTime * timeScale;
    }
    setTime(timeInSeconds) {
        this.time = timeInSeconds;
    }
    setCameraRotationX(val) {
        this.cameraRotationX = val;
        this.callbacks.onParametersChanged?.();
    }
    setCameraRotationY(val) {
        this.cameraRotationY = val;
        this.callbacks.onParametersChanged?.();
    }
    setCameraPanX(val) {
        this.cameraPanX = val;
        this.callbacks.onParametersChanged?.();
    }
    setCameraPanY(val) {
        this.cameraPanY = val;
        this.callbacks.onParametersChanged?.();
    }
    setBlackHoleRotationX(val) {
        this.blackHoleRotationX = val; // val is in degrees
        this.callbacks.onParametersChanged?.();
    }
    setBlackHoleRotationY(val) {
        this.blackHoleRotationY = val; // val is in degrees
        this.callbacks.onParametersChanged?.();
    }
    setBlackHoleRotationZ(val) {
        this.blackHoleRotationZ = val; // val is in degrees
        this.callbacks.onParametersChanged?.();
    }
    setIterations(val) {
        this.iterations = val;
        this.callbacks.onParametersChanged?.();
    }
    setWarpAmount(val) {
        this.warpAmount = val;
        this.callbacks.onParametersChanged?.();
    }
    setBrightnessFactor(val) {
        this.brightnessFactor = val;
        this.callbacks.onParametersChanged?.();
    }
    setDiscRadius(val) {
        this.discRadius = val;
        this.callbacks.onParametersChanged?.();
    }
    setDiscWidth(val) {
        this.discWidth = val;
        this.callbacks.onParametersChanged?.();
    }
    setDiscSpeed(val) {
        this.discSpeed = val;
        this.callbacks.onParametersChanged?.();
    }
    setDiscBrightness(val) {
        this.discBrightness = val;
        this.callbacks.onParametersChanged?.();
    }
    setDiscTemperature(val) {
        this.discTemperature = val;
        this.callbacks.onParametersChanged?.();
        this.callbacks.onTemperatureChanged?.();
    }
    setDiscTemperatureRadiusFactor(val) {
        this.discTemperatureRadiusFactor = val;
        this.callbacks.onTemperatureChanged?.();
    }
    setDiscMinColorTemperature(val) {
        this.discMinColorTemperature = val;
        this.callbacks.onTemperatureChanged?.();
    }
    setDiscMaxColorTemperature(val) {
        this.discMaxColorTemperature = val;
        this.callbacks.onTemperatureChanged?.();
    }
    setDiscInnerFalloff(val) {
        this.discInnerFalloff = val;
        this.callbacks.onParametersChanged?.();
    }
    setDiscOuterFalloff(val) {
        this.discOuterFalloff = val;
        this.callbacks.onParametersChanged?.();
    }
    setDiscTexturePower(val) {
        this.discTexturePower = val;
        this.callbacks.onParametersChanged?.();
    }
    setDiscMinCoverage(val) {
        this.discMinCoverage = val;
        this.callbacks.onParametersChanged?.();
    }
    setDiscOuterTransparency(val) {
        this.discOuterTransparency = val;
        this.callbacks.onParametersChanged?.();
    }
    setStepMinScale(val) {
        this.stepMinScale = val;
        this.callbacks.onParametersChanged?.();
    }
    setStepMaxScale(val) {
        this.stepMaxScale = val;
        this.callbacks.onParametersChanged?.();
    }
    setStepNearFactor(val) {
        this.stepNearFactor = val;
        this.callbacks.onParametersChanged?.();
    }
    setStepFarFactor(val) {
        this.stepFarFactor = val;
        this.callbacks.onParametersChanged?.();
    }
    setMaxFrameRate(val) {
        this.maxFrameRate = Math.max(1, Math.min(120, val));
    }
    setAnimationSpeed(val) {
        this.animationSpeed = Math.max(0.0, Math.min(5.0, val));
    }
    setTemporalAAFrames(val) {
        this.temporalAAFrames = Math.max(1, Math.min(100, val));
        this.callbacks.onParametersChanged?.();
    }
    // Calculate temporal blend weight based on number of frames
    getTemporalBlendWeight() {
        // Convert frame count to blend weight: w = (frames - 1) / frames
        // This gives: 1 frame = 0.0, 2 frames = 0.5, 10 frames = 0.9, 100 frames = 0.99
        return this.temporalAAFrames > 1
            ? (this.temporalAAFrames - 1) / this.temporalAAFrames
            : 0.0;
    }
    setExposure(val) {
        this.exposure = val;
        this.callbacks.onToneParametersChanged?.();
    }
    setSaturation(val) {
        this.saturation = val;
        this.callbacks.onToneParametersChanged?.();
    }
    setBloomIntensity(val) {
        this.bloomIntensity = val;
        this.callbacks.onToneParametersChanged?.();
    }
    setBloomThreshold(val) {
        this.bloomThreshold = val;
        this.callbacks.onBloomParametersChanged?.();
    }
    setShadowLift(val) {
        this.shadowLift = val;
        this.callbacks.onToneParametersChanged?.();
    }
    setToneMapToe(val) {
        this.toneMapToe = val;
        this.callbacks.onToneParametersChanged?.();
    }
    setToneMapHighlights(val) {
        this.toneMapHighlights = val;
        this.callbacks.onToneParametersChanged?.();
    }
    setToneMapMidtones(val) {
        this.toneMapMidtones = val;
        this.callbacks.onToneParametersChanged?.();
    }
    setToneMapShoulder(val) {
        this.toneMapShoulder = val;
        this.callbacks.onToneParametersChanged?.();
    }
    // Color control setters
    setEnableColorization(val) {
        this.enableColorization = val;
        this.callbacks.onParametersChanged?.();
    }
    setCenterColor(r, g, b) {
        this.centerColor = [r, g, b];
        this.callbacks.onParametersChanged?.();
    }
    setDiscInnerColor(r, g, b) {
        this.discInnerColor = [r, g, b];
        this.callbacks.onParametersChanged?.();
    }
    setDiscOuterColor(r, g, b) {
        this.discOuterColor = [r, g, b];
        this.callbacks.onParametersChanged?.();
    }
    setBackgroundTint(r, g, b) {
        this.backgroundTint = [r, g, b];
        this.callbacks.onParametersChanged?.();
    }
    setWhitePoint(val) {
        this.whitePoint = val;
        this.callbacks.onParametersChanged?.();
    }
    setBlackPoint(val) {
        this.blackPoint = val;
        this.callbacks.onParametersChanged?.();
    }
    setTransparencyStart(val) {
        this.transparencyStart = val;
        this.callbacks.onParametersChanged?.();
    }
    setTransparencyEnd(val) {
        this.transparencyEnd = val;
        this.callbacks.onParametersChanged?.();
    }
    setColorIntensity(val) {
        this.colorIntensity = val;
        this.callbacks.onParametersChanged?.();
    }
    toGpuArray() {
        // Convert degrees to radians for shader
        const DEG_TO_RAD = Math.PI / 180;
        return new Float32Array([
            this.time,
            this.iterations,
            this.warpAmount,
            this.discRadius,
            this.discWidth,
            this.discThickness,
            this.discSpeed,
            this.discBrightness,
            this.discTemperature,
            this.discInnerFalloff,
            this.discOuterFalloff,
            this.discTexturePower,
            this.discMinCoverage,
            this.hazeIntensity,
            this.getTemporalBlendWeight(),
            this.cameraRotationX,
            this.cameraRotationY,
            this.brightnessFactor,
            this.cameraPanX,
            this.cameraPanY,
            this.blackHoleRotationX * DEG_TO_RAD,
            this.blackHoleRotationY * DEG_TO_RAD,
            this.blackHoleRotationZ * DEG_TO_RAD,
            this.stepMinScale,
            this.stepMaxScale,
            this.stepNearFactor,
            this.stepFarFactor,
        ]);
    }
}
const DEFAULT_BLACKHOLE_VALUES = {
    // Core parameters
    time: 0,
    maxFrameRate: 30,
    animationSpeed: 0.3,
    // Camera parameters (rotation angles for RotateCamera function)
    cameraRotationX: 0.5,
    cameraRotationY: 0.5,
    cameraPanX: 0.0, // Pan offset in normalized screen space
    cameraPanY: 0.0,
    // Black hole rotation in degrees
    blackHoleRotationX: -11.0,
    blackHoleRotationY: 12.0,
    blackHoleRotationZ: 20.0,
    // Raymarching parameters
    iterations: 16,
    enableTemporalAA: true,
    temporalAAFrames: 6, // Number of frames to blend for temporal AA
    warpAmount: 5.0,
    brightnessFactor: 11.0, // Back to original since we're preserving intensity better
    // Accretion disc parameters
    discRadius: 3.0,
    discWidth: 5.3,
    discThickness: 0.1,
    discSpeed: 0.06,
    discBrightness: 2.0, // Adjusted for post-tone-mapping colorization
    discTemperature: 6000, // Base temperature in Kelvin
    discTemperatureRadiusFactor: 10000.0, // Temperature increase per unit radius
    discMinColorTemperature: 1000.0, // Min temperature for color mapping
    discMaxColorTemperature: 40000.0, // Max temperature for color mapping
    discInnerFalloff: 4.0,
    discOuterFalloff: 0.9,
    discTexturePower: 2.0, // Power applied to procedural texture (higher = darker edges)
    discMinCoverage: 0.15, // Min coverage to prevent outer edges going black
    discOuterTransparency: 0.0, // 0 = fully transparent outer edge, 1 = opaque
    hazeIntensity: 2.9,
    temporalMouseThreshold: 1.0,
    // Adaptive step scaling parameters
    stepMinScale: 0.35, // Min step scale (near black hole)
    stepMaxScale: 1.85, // Max step scale (far from black hole)
    stepNearFactor: 0.6, // Factor for near radius calculation
    stepFarFactor: 1.2, // Factor for far radius calculation
    // HDR and Bloom parameters
    exposure: 2.5, // Balanced for natural intensity preservation
    saturation: 1.0,
    bloomIntensity: 1.0,
    bloomThreshold: 0.0,
    shadowLift: 0.0,
    minLiftThreshold: 0.0,
    toneMapToe: 0.0,
    toneMapHighlights: 1.0,
    toneMapMidtones: 1.0,
    toneMapShoulder: 1.0,
    // Color control parameters (default to classic yellow-white-orange scheme)
    enableColorization: true, // Enable colorization by default
    centerColor: [1.0, 1.0, 0.8], // Bright yellow-white
    discInnerColor: [1.0, 0.9, 0.5], // Yellow
    discOuterColor: [1.0, 0.5, 0.2], // Orange
    backgroundTint: [0.0, 0.0, 0.0], // Black space
    whitePoint: 0.8, // Adjusted for better range
    blackPoint: 0.02, // Lower threshold for better black preservation
    transparencyStart: 2.0, // Start fading at 2x radius
    transparencyEnd: 3.0, // Fully transparent at 3x radius
    colorIntensity: 1.0, // Start at 1.0 since we're not manipulating as much
};


/***/ }),

/***/ "./src/managers/CameraManager.ts":
/*!***************************************!*\
  !*** ./src/managers/CameraManager.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CameraManager: () => (/* binding */ CameraManager)
/* harmony export */ });
class CameraManager {
    simulator;
    constructor(simulator) {
        this.simulator = simulator;
    }
    adjustCamera() {
        // Camera adjustment logic if needed
        // Currently the camera is controlled via mouse interaction in the UI
    }
}


/***/ }),

/***/ "./src/managers/FPSManager.ts":
/*!************************************!*\
  !*** ./src/managers/FPSManager.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FPSManager: () => (/* binding */ FPSManager)
/* harmony export */ });
const FPS_UPDATE_INTERVAL = 1_000; // Update FPS every second
class FPSManager {
    // FPS tracking variables for calculating frames per second over intervals.
    lastFrameTime = performance.now();
    frameCount = 0;
    fps = 0;
    // Frame rate limiting variables to control rendering frequency.
    lastRenderTime = 0;
    targetFrameTime = 1000 / 60; // Default to 60 FPS
    // Constructor initializes the profiler with required WebGPU objects and resources.
    constructor(simulator) { }
    // Updates the FPS calculation based on the current time, accumulating frames over intervals.
    updateFps(currentTime) {
        this.frameCount++;
        if (currentTime - this.lastFrameTime >= FPS_UPDATE_INTERVAL) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFrameTime));
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
        }
    }
    // Returns the current calculated FPS value.
    getFps() {
        return this.fps;
    }
    // Determines if a new frame should be rendered based on the target frame rate,
    // handling unlocked mode and delta time capping to prevent animation issues.
    shouldRenderFrame(currentTime, maxFrameRate) {
        let deltaTime = currentTime - this.lastRenderTime;
        // Handle first frame by initializing lastRenderTime
        if (this.lastRenderTime === 0) {
            this.lastRenderTime = currentTime;
            deltaTime = 16.67; // Default to 60 FPS for first frame (1000ms / 60fps)
        }
        // Always clamp delta to >= 0 to avoid negative values from clock skew
        deltaTime = Math.max(0, deltaTime);
        // Check if frame rate limiting is disabled (unlocked at 120 FPS)
        const isUnlocked = maxFrameRate >= 120;
        // Update target frame time based on maxFrameRate setting (only if not unlocked)
        if (!isUnlocked) {
            this.targetFrameTime = 1000 / Math.max(1, Math.min(119, maxFrameRate));
        }
        // Cap deltaTime to prevent large jumps, but allow it to be at least 2x the target frame time
        // This prevents animation freezing at low frame rates while still capping excessive jumps
        const maxDeltaTime = isUnlocked
            ? 100
            : Math.max(100, this.targetFrameTime * 2);
        deltaTime = Math.min(deltaTime, maxDeltaTime);
        // Only render if enough time has passed (or if unlocked)
        const shouldRender = isUnlocked || deltaTime >= this.targetFrameTime;
        if (shouldRender) {
            this.lastRenderTime = currentTime;
        }
        return { shouldRender, deltaTime };
    }
}


/***/ }),

/***/ "./src/managers/RenderingManager.ts":
/*!******************************************!*\
  !*** ./src/managers/RenderingManager.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RenderingManager: () => (/* binding */ RenderingManager)
/* harmony export */ });
/* harmony import */ var _shaders_fullscreen_vert_wgsl__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../shaders/fullscreen.vert.wgsl */ "./src/shaders/fullscreen.vert.wgsl");
/* harmony import */ var _shaders_postprocessing_passthrough_frag_wgsl__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../shaders/postprocessing/passthrough.frag.wgsl */ "./src/shaders/postprocessing/passthrough.frag.wgsl");


class RenderingManager {
    simulator;
    // Ping-pong state: true => render into bufferA (sample previousFrame), false => render into previousFrame (sample bufferA)
    useBufferAAsCurrent = true;
    hasHistory = false;
    // Camera motion tracking for temporal AA
    lastCameraPanX = 0;
    lastCameraPanY = 0;
    cameraMoving = false;
    // Scratch arrays to avoid per-frame allocations
    uniformScratch = new Float32Array(28);
    resolutionScratch = new Float32Array(2);
    // Frame counter for performance profiling
    frameCount = 0;
    // Pass-through pipeline for grayscale output
    passthroughPipeline = null;
    constructor(simulator) {
        this.simulator = simulator;
    }
    // Returns the number of frames rendered
    getFrameCount() {
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
        }
        else {
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
        device.queue.writeBuffer(resources.getUniformBuffer(), 0, this.uniformScratch.buffer, 0, this.uniformScratch.byteLength);
        // Update resolution buffer
        // Use canvas dimensions (not scaled buffer dimensions) for camera rotation normalization
        this.resolutionScratch[0] = this.simulator.canvas.width;
        this.resolutionScratch[1] = this.simulator.canvas.height;
        device.queue.writeBuffer(resources.getResolutionBuffer(), 0, this.resolutionScratch.buffer, 0, this.resolutionScratch.byteLength);
    }
    render(blackHole) {
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
        this.resolveTimingQueries(encoder, this.simulator.performanceProfiler.isReadingResults());
        device.queue.submit([encoder.finish()]);
        // Flip ping-pong for next frame
        this.useBufferAAsCurrent = !this.useBufferAAsCurrent;
        this.hasHistory = true;
        this.frameCount++;
    }
    // Apply post-processing effects including bloom, tone mapping, and colorization.
    // Pipeline order: grayscale → bloom extraction → tone mapping → colorization (optional).
    // Colorization happens AFTER tone mapping to work with properly compressed values.
    applyPostProcessing(commandEncoder, canvasTextureView) {
        const canvas = this.simulator.canvas;
        const resources = this.simulator.resources;
        // Always use grayscale for bloom and initial tone mapping
        const grayscaleView = this.useBufferAAsCurrent
            ? resources.getBufferAView()
            : resources.getPreviousFrameView();
        // Bloom extraction pass - isolate bright areas above threshold from colorized output.
        const bloomTextures = resources.bloomResources.getBloomTextures(canvas.width, canvas.height);
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
        bloomExtractPass.setPipeline(resources.bloomResources.getBloomExtractPipeline());
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
        blurHPass.setBindGroup(0, resources.bloomResources.getBloomBlurBindGroups(canvas.width, canvas.height).bloomBlurHBindGroup);
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
        blurVPass.setBindGroup(0, resources.bloomResources.getBloomBlurBindGroups(canvas.width, canvas.height).bloomBlurVBindGroup);
        blurVPass.draw(3, 1, 0, 0);
        blurVPass.end();
        // Always tone map to HDR texture first
        const toneMappedTexture = resources.hdrResources.getHDRTexture(canvas.width, canvas.height);
        const toneMappedView = resources.hdrResources.getHDRTextureView(canvas.width, canvas.height);
        // Tone mapping pass - combine HDR + bloom and tonemap to HDR texture
        const toneMapPassDesc = {
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
        // Final pass to canvas - either colorization or pass-through
        if (this.simulator.blackHole.enableColorization) {
            // Apply colorization as final pass
            resources.colorizeResources.updateColorizeParams();
            const colorizePass = commandEncoder.beginRenderPass({
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
            colorizePass.setPipeline(resources.colorizeResources.getColorizePipeline());
            colorizePass.setBindGroup(0, resources.colorizeResources.getColorizeBindGroup(toneMappedView, resources.getSampler()));
            colorizePass.draw(3, 1, 0, 0);
            colorizePass.end();
        }
        else {
            // Pass-through grayscale to canvas
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
    }
    // Resolve GPU timing queries to measure performance. Only resolves if timing
    // is available and results aren't currently being read to avoid conflicts.
    resolveTimingQueries(commandEncoder, isReadingTimingResults) {
        // Skip GPU timing resolves if advanced options are disabled
        if (!!!this.isAdvancedOptionsEnabled())
            return;
        const p = this.simulator.performanceProfiler;
        if (!!p.querySet && !!p.queryBuffer && !isReadingTimingResults) {
            commandEncoder.resolveQuerySet(p.querySet, 0, 3, p.queryBuffer, 0);
            if (!!p.resultBuffer) {
                commandEncoder.copyBufferToBuffer(p.queryBuffer, 0, p.resultBuffer, 0, 3 * 8 // 3 timestamps * 8 bytes each
                );
            }
        }
    }
    isAdvancedOptionsEnabled() {
        try {
            const val = localStorage.getItem("showAdvancedOptions");
            return val === null ? true : val === "true";
        }
        catch {
            return true;
        }
    }
    getPassthroughPipeline() {
        if (this.passthroughPipeline)
            return this.passthroughPipeline;
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
                module: this.simulator.device.createShaderModule({ code: _shaders_fullscreen_vert_wgsl__WEBPACK_IMPORTED_MODULE_0__["default"] }),
                entryPoint: "main",
            },
            fragment: {
                module: this.simulator.device.createShaderModule({ code: _shaders_postprocessing_passthrough_frag_wgsl__WEBPACK_IMPORTED_MODULE_1__["default"] }),
                entryPoint: "main",
                targets: [{ format: this.simulator.presentationFormat }],
            },
            primitive: { topology: "triangle-list" },
        });
        return this.passthroughPipeline;
    }
}


/***/ }),

/***/ "./src/managers/ResourceManager.ts":
/*!*****************************************!*\
  !*** ./src/managers/ResourceManager.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ResourceManager: () => (/* binding */ ResourceManager)
/* harmony export */ });
/* harmony import */ var _resources_HDRResources__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../resources/HDRResources */ "./src/resources/HDRResources.ts");
/* harmony import */ var _resources_BloomResources__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../resources/BloomResources */ "./src/resources/BloomResources.ts");
/* harmony import */ var _resources_ToneMapResources__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../resources/ToneMapResources */ "./src/resources/ToneMapResources.ts");
/* harmony import */ var _resources_ColorizeResources__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../resources/ColorizeResources */ "./src/resources/ColorizeResources.ts");
/* harmony import */ var _compute_TextureCompute__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../compute/TextureCompute */ "./src/compute/TextureCompute.ts");
/* harmony import */ var _compute_BlackholeCompute__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../compute/BlackholeCompute */ "./src/compute/BlackholeCompute.ts");






class ResourceManager {
    simulator;
    hdrResources;
    bloomResources;
    toneMapResources;
    colorizeResources;
    textureCompute;
    blackholeCompute;
    // Existing resources
    uniformBuffer = null;
    resolutionBuffer = null;
    previousFrameTexture = null;
    previousFrameView = null;
    bufferATexture = null;
    bufferAView = null;
    sampler = null;
    repeatSampler = null;
    noiseTexture = null;
    noiseView = null;
    proceduralTexture = null;
    proceduralView = null;
    bufferWidth = 0;
    bufferHeight = 0;
    constructor(simulator) {
        this.simulator = simulator;
        // Initialize HDR/Bloom/ToneMap resources
        this.hdrResources = new _resources_HDRResources__WEBPACK_IMPORTED_MODULE_0__.HDRResources(simulator);
        this.bloomResources = new _resources_BloomResources__WEBPACK_IMPORTED_MODULE_1__.BloomResources(simulator);
        this.toneMapResources = new _resources_ToneMapResources__WEBPACK_IMPORTED_MODULE_2__.ToneMapResources(simulator);
        this.colorizeResources = new _resources_ColorizeResources__WEBPACK_IMPORTED_MODULE_3__.ColorizeResources(simulator);
        this.textureCompute = new _compute_TextureCompute__WEBPACK_IMPORTED_MODULE_4__.TextureCompute(simulator);
        this.blackholeCompute = new _compute_BlackholeCompute__WEBPACK_IMPORTED_MODULE_5__.BlackholeCompute(simulator);
    }
    setup() {
        console.log(`🟠 ResourceManager.setup()`);
        this.dispose();
        const device = this.simulator.device;
        const scale = 1.0; // Always use full resolution
        const width = Math.max(1, Math.floor(this.simulator.canvas.width * scale));
        const height = Math.max(1, Math.floor(this.simulator.canvas.height * scale));
        this.bufferWidth = width;
        this.bufferHeight = height;
        // Create uniform buffer for black hole parameters
        this.uniformBuffer = device.createBuffer({
            label: "uniformBuffer",
            size: 28 * 4, // 28 floats (including discOuterTransparency)
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
    createBufferTexture(device, width, height, name) {
        console.log(`🟠 createBufferTexture(${name})`);
        const texture = device.createTexture({
            label: `bufferTexture_${name}`,
            size: [width, height],
            format: "rgba16float",
            usage: GPUTextureUsage.TEXTURE_BINDING |
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
    createNoiseTexture(device) {
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
            usage: GPUTextureUsage.TEXTURE_BINDING |
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
    createProceduralTexture(device) {
        console.log(`🟠 createProceduralTexture() using compute shader`);
        const size = 512;
        // Generate procedural data using compute shader with temperature parameters
        const bh = this.simulator.blackHole;
        this.textureCompute.generateProceduralTexture(bh.discTemperature, bh.discTemperatureRadiusFactor, bh.discMinColorTemperature, bh.discMaxColorTemperature);
        // Create texture with mipmaps (keep as rgba8unorm for filtering support)
        const mipLevelCount = Math.floor(Math.log2(size)) + 1;
        this.proceduralTexture = device.createTexture({
            label: "proceduralTexture",
            size: [size, size],
            format: "rgba8unorm",
            mipLevelCount: mipLevelCount,
            usage: GPUTextureUsage.TEXTURE_BINDING |
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
        this.generateMipmaps(device, this.proceduralTexture, size, size, mipLevelCount, "rgba8unorm");
        this.proceduralView = this.proceduralTexture.createView({
            label: "proceduralView",
        });
    }
    getUniformBuffer() {
        return this.uniformBuffer;
    }
    getResolutionBuffer() {
        return this.resolutionBuffer;
    }
    getPreviousFrameView() {
        return this.previousFrameView;
    }
    getBufferAView() {
        return this.bufferAView;
    }
    getSampler() {
        return this.sampler;
    }
    getRepeatSampler() {
        return this.repeatSampler;
    }
    getNoiseView() {
        return this.noiseView;
    }
    getProceduralView() {
        return this.proceduralView;
    }
    getBufferATexture() {
        return this.bufferATexture;
    }
    getPreviousFrameTexture() {
        return this.previousFrameTexture;
    }
    getBufferWidth() {
        return this.bufferWidth;
    }
    getBufferHeight() {
        return this.bufferHeight;
    }
    performanceProfiler() {
        return this.simulator.performanceProfiler;
    }
    regenerateProceduralTexture() {
        console.log(`🟠 regenerateProceduralTexture() with temperature ${this.simulator.blackHole.discTemperature}`);
        const device = this.simulator.device;
        const size = 512;
        // Generate procedural data using compute shader with updated temperature parameters
        const bh = this.simulator.blackHole;
        this.textureCompute.generateProceduralTexture(bh.discTemperature, bh.discTemperatureRadiusFactor, bh.discMinColorTemperature, bh.discMaxColorTemperature);
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
        // Regenerate mipmaps
        const mipLevelCount = Math.floor(Math.log2(size)) + 1;
        this.generateMipmaps(device, this.proceduralTexture, size, size, mipLevelCount, "rgba8unorm");
    }
    generateMipmaps(device, texture, width, height, mipLevelCount, format = "rgba8unorm") {
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


/***/ }),

/***/ "./src/managers/UIManager.ts":
/*!***********************************!*\
  !*** ./src/managers/UIManager.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   UIManager: () => (/* binding */ UIManager)
/* harmony export */ });
class UIManager {
    simulator;
    mouse = { x: 0, y: 0, z: 0, w: 0 };
    mouseDown = false;
    dragStartX = 0;
    dragStartY = 0;
    dragStartPanX = 0;
    dragStartPanY = 0;
    constructor(simulator) {
        this.simulator = simulator;
        this.setupMouseControls();
        this.setupResponsiveCanvas();
        this.updateHTML();
        this.setupPerformanceDisplay();
    }
    setupMouseControls() {
        const canvas = this.simulator.canvas;
        canvas.addEventListener("mousedown", (e) => {
            this.mouseDown = true;
            const rect = canvas.getBoundingClientRect();
            this.dragStartX = e.clientX - rect.left;
            this.dragStartY = e.clientY - rect.top;
            // Store initial camera pan when drag starts
            this.dragStartPanX = this.simulator.blackHole.cameraPanX;
            this.dragStartPanY = this.simulator.blackHole.cameraPanY;
            this.mouse.z = 999999;
            this.mouse.w = 999999;
        });
        canvas.addEventListener("mousemove", (e) => {
            if (this.mouseDown) {
                const rect = canvas.getBoundingClientRect();
                const currentX = e.clientX - rect.left;
                const currentY = e.clientY - rect.top;
                // Calculate normalized screen-space delta (1.0 = 1 screen width)
                const deltaX = (currentX - this.dragStartX) / rect.width;
                const deltaY = (currentY - this.dragStartY) / rect.height;
                // Apply delta to initial pan values
                const newPanX = this.dragStartPanX + deltaX;
                const newPanY = this.dragStartPanY - deltaY; // Invert Y for natural drag
                this.mouse.z = 999999;
                this.mouse.w = 999999;
                this.simulator.blackHole.setCameraPanX(newPanX);
                this.simulator.blackHole.setCameraPanY(newPanY);
            }
        });
        canvas.addEventListener("mouseup", () => {
            this.mouseDown = false;
            this.mouse.z = 0;
            this.mouse.w = 0;
        });
    }
    setupResponsiveCanvas() {
        const canvas = this.simulator.canvas;
        let currentSize = 0;
        let resizeAnimationId = null;
        const resizeCanvas = () => {
            const canvasContainer = canvas.parentElement;
            if (!canvasContainer)
                return;
            const containerSize = Math.min(canvasContainer.clientWidth, canvasContainer.clientHeight);
            const size = Math.floor(containerSize);
            if (Math.abs(size - currentSize) <= 1) {
                return;
            }
            currentSize = size;
            canvas.style.width = size + "px";
            canvas.style.height = size + "px";
            const devicePixelRatio = window.devicePixelRatio || 1;
            const bufferWidth = Math.max(1, Math.floor(size * devicePixelRatio));
            const bufferHeight = Math.max(1, Math.floor(size * devicePixelRatio));
            if (this.simulator &&
                typeof this.simulator.resize === "function" &&
                size > 0) {
                this.simulator.resize(bufferWidth, bufferHeight);
            }
        };
        const debouncedResize = () => {
            if (resizeAnimationId) {
                cancelAnimationFrame(resizeAnimationId);
            }
            resizeAnimationId = requestAnimationFrame(resizeCanvas);
        };
        requestAnimationFrame(resizeCanvas);
        window.addEventListener("resize", debouncedResize);
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(debouncedResize);
            const container = canvas.parentElement;
            if (container) {
                resizeObserver.observe(container);
            }
        }
    }
    updateHTML() {
        // Initialize sliders if they exist
        this.initializeSlider("slIterations", "labelIterations", "iterations");
        this.initializeSlider("slWarpAmount", "labelWarpAmount", "warpAmount");
        this.initializeSlider("slBrightnessFactor", "labelBrightnessFactor", "brightnessFactor");
        // Adaptive step scaling sliders
        this.initializeSlider("slStepMinScale", "labelStepMinScale", "stepMinScale");
        this.initializeSlider("slStepMaxScale", "labelStepMaxScale", "stepMaxScale");
        this.initializeSlider("slStepNearFactor", "labelStepNearFactor", "stepNearFactor");
        this.initializeSlider("slStepFarFactor", "labelStepFarFactor", "stepFarFactor");
        // Black Hole Rotation sliders (degrees)
        this.initializeRotationSlider("slBlackholeRotationX", "labelBlackholeRotationX", "blackHoleRotationX");
        this.initializeRotationSlider("slBlackholeRotationY", "labelBlackholeRotationY", "blackHoleRotationY");
        this.initializeRotationSlider("slBlackholeRotationZ", "labelBlackholeRotationZ", "blackHoleRotationZ");
        this.initializeSlider("slDiscRadius", "labelDiscRadius", "discRadius");
        this.initializeSlider("slDiscWidth", "labelDiscWidth", "discWidth");
        this.initializeSlider("slDiscSpeed", "labelDiscSpeed", "discSpeed");
        this.initializeSlider("slDiscBrightness", "labelDiscBrightness", "discBrightness");
        // Color controls
        this.initializeColorToggle();
        this.initializeColorPresets();
        this.initializeColorPicker("centerColor");
        this.initializeColorPicker("discInnerColor");
        this.initializeColorPicker("discOuterColor");
        this.initializeColorPicker("backgroundTint");
        // Transition controls
        this.initializeSlider("slColorIntensity", "labelColorIntensity", "colorIntensity");
        this.initializeSlider("slWhitePoint", "labelWhitePoint", "whitePoint");
        this.initializeSlider("slBlackPoint", "labelBlackPoint", "blackPoint");
        this.initializeSlider("slTransparencyStart", "labelTransparencyStart", "transparencyStart");
        this.initializeSlider("slTransparencyEnd", "labelTransparencyEnd", "transparencyEnd");
        this.initializeSlider("slDiscInnerFalloff", "labelDiscInnerFalloff", "discInnerFalloff");
        this.initializeSlider("slDiscOuterFalloff", "labelDiscOuterFalloff", "discOuterFalloff");
        this.initializeSlider("slDiscTexturePower", "labelDiscTexturePower", "discTexturePower");
        this.initializeSlider("slDiscMinCoverage", "labelDiscMinCoverage", "discMinCoverage");
        this.initializeSlider("slDiscOuterTransparency", "labelDiscOuterTransparency", "discOuterTransparency");
        this.initializeSlider("slMaxFrameRate", "labelMaxFrameRate", "maxFrameRate");
        this.initializeSlider("slAnimationSpeed", "labelAnimationSpeed", "animationSpeed");
        this.initializeSlider("slTemporalAAFrames", "labelTemporalAAFrames", "temporalAAFrames");
        // HDR & Bloom sliders
        this.initializeSlider("slExposure", "labelExposure", "exposure");
        this.initializeSlider("slSaturation", "labelSaturation", "saturation");
        this.initializeSlider("slBloomIntensity", "labelBloomIntensity", "bloomIntensity");
        this.initializeSlider("slBloomThreshold", "labelBloomThreshold", "bloomThreshold");
        this.initializeSlider("slShadowLift", "labelShadowLift", "shadowLift");
        // Tone mapping sliders
        this.initializeSlider("slToneMapToe", "labelToneMapToe", "toneMapToe");
        this.initializeSlider("slToneMapHighlights", "labelToneMapHighlights", "toneMapHighlights");
        this.initializeSlider("slToneMapMidtones", "labelToneMapMidtones", "toneMapMidtones");
        this.initializeSlider("slToneMapShoulder", "labelToneMapShoulder", "toneMapShoulder");
    }
    initializeSlider(id, labelId, prop) {
        const slider = document.getElementById(id);
        if (!slider)
            return;
        const label = document.getElementById(labelId);
        if (!label)
            return;
        slider.value = this.simulator.blackHole[prop];
        label.innerHTML = slider.value;
        slider.oninput = () => {
            label.innerHTML = slider.value;
            const methodName = `set${prop.charAt(0).toUpperCase()}${prop.slice(1)}`;
            const method = this.simulator.blackHole[methodName];
            if (typeof method === "function") {
                method.call(this.simulator.blackHole, parseFloat(slider.value));
            }
        };
    }
    initializeRotationSlider(id, labelId, prop) {
        const slider = document.getElementById(id);
        if (!slider)
            return;
        const label = document.getElementById(labelId);
        if (!label)
            return;
        // Get the current value in degrees
        const degrees = Math.round(this.simulator.blackHole[prop]);
        slider.value = degrees.toString();
        label.innerHTML = degrees.toString();
        slider.oninput = () => {
            const degrees = parseFloat(slider.value);
            label.innerHTML = Math.round(degrees).toString();
            const methodName = `set${prop.charAt(0).toUpperCase()}${prop.slice(1)}`;
            const method = this.simulator.blackHole[methodName];
            if (typeof method === "function") {
                method.call(this.simulator.blackHole, degrees);
            }
        };
    }
    initializeColorToggle() {
        const checkbox = document.getElementById("cbEnableColorization");
        if (!checkbox)
            return;
        // Set initial state
        checkbox.checked = this.simulator.blackHole.enableColorization;
        // Handle checkbox changes
        checkbox.addEventListener("change", (e) => {
            const target = e.target;
            this.simulator.blackHole.setEnableColorization(target.checked);
            // Enable/disable color controls based on checkbox state
            const colorControls = [
                "colorPreset",
                "centerColor",
                "discInnerColor",
                "discOuterColor",
                "backgroundTint",
                "resetCenterColor",
                "resetDiscInnerColor",
                "resetDiscOuterColor",
                "resetBackgroundTint",
                "slColorIntensity",
                "slWhitePoint",
                "slBlackPoint"
            ];
            colorControls.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.disabled = !target.checked;
                    element.style.opacity = target.checked ? "1" : "0.5";
                }
            });
        });
    }
    initializeColorPresets() {
        const presetSelect = document.getElementById("colorPreset");
        if (!presetSelect)
            return;
        // Define color presets
        const presets = {
            classic: {
                centerColor: [1.0, 1.0, 0.8],
                discInnerColor: [1.0, 0.9, 0.5],
                discOuterColor: [1.0, 0.5, 0.2],
                backgroundTint: [0.0, 0.0, 0.0],
            },
            cosmic: {
                centerColor: [0.8, 0.9, 1.0],
                discInnerColor: [0.3, 0.6, 1.0],
                discOuterColor: [0.1, 0.3, 0.8],
                backgroundTint: [0.0, 0.0, 0.1],
            },
            toxic: {
                centerColor: [0.9, 1.0, 0.9],
                discInnerColor: [0.3, 1.0, 0.3],
                discOuterColor: [0.1, 0.6, 0.1],
                backgroundTint: [0.0, 0.05, 0.0],
            },
            inferno: {
                centerColor: [1.0, 0.9, 0.8],
                discInnerColor: [1.0, 0.3, 0.1],
                discOuterColor: [0.8, 0.1, 0.0],
                backgroundTint: [0.05, 0.0, 0.0],
            },
            purple: {
                centerColor: [0.95, 0.85, 1.0],
                discInnerColor: [0.8, 0.3, 0.9],
                discOuterColor: [0.5, 0.1, 0.7],
                backgroundTint: [0.05, 0.0, 0.1],
            },
            ice: {
                centerColor: [0.95, 0.98, 1.0],
                discInnerColor: [0.7, 0.9, 1.0],
                discOuterColor: [0.3, 0.6, 0.9],
                backgroundTint: [0.0, 0.02, 0.05],
            },
        };
        // Handle preset selection
        presetSelect.addEventListener("change", (e) => {
            const target = e.target;
            const presetName = target.value;
            if (presetName === "custom") {
                // Don't change colors for custom preset
                return;
            }
            const preset = presets[presetName];
            if (preset) {
                // Apply all colors from the preset
                this.simulator.blackHole.setCenterColor(...preset.centerColor);
                this.simulator.blackHole.setDiscInnerColor(...preset.discInnerColor);
                this.simulator.blackHole.setDiscOuterColor(...preset.discOuterColor);
                this.simulator.blackHole.setBackgroundTint(...preset.backgroundTint);
                // Update color pickers to match
                const rgbToHex = (rgb) => {
                    const toHex = (val) => {
                        const hex = Math.round(val * 255).toString(16);
                        return hex.length === 1 ? '0' + hex : hex;
                    };
                    return '#' + toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]);
                };
                const centerPicker = document.getElementById("centerColor");
                const innerPicker = document.getElementById("discInnerColor");
                const outerPicker = document.getElementById("discOuterColor");
                const bgPicker = document.getElementById("backgroundTint");
                if (centerPicker)
                    centerPicker.value = rgbToHex(preset.centerColor);
                if (innerPicker)
                    innerPicker.value = rgbToHex(preset.discInnerColor);
                if (outerPicker)
                    outerPicker.value = rgbToHex(preset.discOuterColor);
                if (bgPicker)
                    bgPicker.value = rgbToHex(preset.backgroundTint);
            }
        });
        // When any color picker changes, set preset to "custom"
        const colorPickers = ["centerColor", "discInnerColor", "discOuterColor", "backgroundTint"];
        colorPickers.forEach(id => {
            const picker = document.getElementById(id);
            if (picker) {
                picker.addEventListener("input", () => {
                    presetSelect.value = "custom";
                });
            }
        });
    }
    initializeColorPicker(id) {
        const colorPicker = document.getElementById(id);
        const resetButton = document.getElementById(`reset${id.charAt(0).toUpperCase() + id.slice(1)}`);
        if (!colorPicker)
            return;
        // Get the property name from the ID
        const propertyName = id;
        // Convert RGB array to hex color
        const rgbToHex = (rgb) => {
            const toHex = (val) => {
                const hex = Math.round(val * 255).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };
            return '#' + toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]);
        };
        // Set initial value
        const initialValue = this.simulator.blackHole[propertyName];
        colorPicker.value = rgbToHex(initialValue);
        // Handle color changes
        colorPicker.addEventListener('input', (e) => {
            const target = e.target;
            const hex = target.value;
            // Convert hex to RGB (0-1 range)
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            // Update the blackhole property
            const setterName = `set${id.charAt(0).toUpperCase() + id.slice(1)}`;
            const setter = this.simulator.blackHole[setterName];
            setter.call(this.simulator.blackHole, r, g, b);
        });
        // Handle reset button
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                const defaultValues = {
                    centerColor: [1.0, 1.0, 0.8],
                    discInnerColor: [1.0, 0.9, 0.5],
                    discOuterColor: [1.0, 0.5, 0.2],
                    backgroundTint: [0.0, 0.0, 0.0],
                };
                const defaultValue = defaultValues[id];
                if (defaultValue) {
                    colorPicker.value = rgbToHex(defaultValue);
                    const setterName = `set${id.charAt(0).toUpperCase() + id.slice(1)}`;
                    const setter = this.simulator.blackHole[setterName];
                    setter.call(this.simulator.blackHole, defaultValue[0], defaultValue[1], defaultValue[2]);
                }
            });
        }
    }
    setupPerformanceDisplay() {
        // Setup FPS display
        const updatePerformanceDisplay = () => {
            const fpsText = document.getElementById("fpsText");
            if (!!this.simulator && fpsText) {
                const fps = this.simulator.fps.getFps();
                fpsText.textContent = `FPS: ${fps}`;
            }
            const timingDisplay = document.getElementById("timingDisplay");
            if (!!this.simulator && timingDisplay) {
                const vramUsage = this.simulator.memoryProfiler.getVRAMUsage();
                const cpuTime = this.simulator.performanceProfiler.getCpuFrameTime();
                const gpuTimes = this.simulator.performanceProfiler.getGpuTimes();
                const hasGpuTiming = this.simulator.performanceProfiler.hasGpuTiming();
                const vramElement = timingDisplay.querySelector(".vram-time");
                const cpuElement = timingDisplay.querySelector(".cpu-time");
                const gpuElement = timingDisplay.querySelector(".gpu-time");
                const mainElement = timingDisplay.querySelector(".main-time");
                const postElement = timingDisplay.querySelector(".post-time");
                // Display VRAM usage in MB
                if (vramElement) {
                    const vramMB = (vramUsage.total / (1024 * 1024)).toFixed(0);
                    vramElement.textContent = `VRAM: ${vramMB} MB`;
                    vramElement.title = `Textures: ${(vramUsage.textures /
                        (1024 * 1024)).toFixed(0)} MB, Buffers: ${(vramUsage.buffers /
                        (1024 * 1024)).toFixed(1)} MB`;
                }
                if (cpuElement)
                    cpuElement.textContent = `CPU: ${cpuTime.toFixed(1)} ms`;
                if (hasGpuTiming) {
                    if (gpuElement) {
                        // Calculate GPU utilization percentage based on actual frame rate
                        const targetFrameTime = 1000 / this.simulator.blackHole.maxFrameRate;
                        const gpuUtilization = this.simulator.blackHole.maxFrameRate >= 120
                            ? 100 // Unlocked mode - show raw timing
                            : Math.min(100, (gpuTimes.frame / targetFrameTime) * 100);
                        // Show both GPU time and utilization when frame rate is limited
                        const gpuText = this.simulator.blackHole.maxFrameRate >= 120
                            ? `GPU: ${gpuTimes.frame.toFixed(1)} ms`
                            : `GPU: ${gpuTimes.frame.toFixed(1)} ms (${gpuUtilization.toFixed(0)}%)`;
                        gpuElement.textContent = gpuText;
                        // Add tooltip explaining GPU timing behavior with frame rate limiting
                        gpuElement.title = this.simulator.blackHole.maxFrameRate >= 120
                            ? "GPU frame time (unlocked frame rate)"
                            : "GPU timing varies with frame rate limiting due to power state changes. Set to 120 FPS for accurate timing.";
                    }
                    if (mainElement)
                        mainElement.textContent = `Main: ${gpuTimes.main.toFixed(1)} ms`;
                    if (postElement)
                        postElement.textContent = `Post: ${gpuTimes.post.toFixed(1)} ms`;
                }
                else {
                    if (gpuElement)
                        gpuElement.textContent = `GPU: N/A`;
                    if (mainElement)
                        mainElement.textContent = `Main: N/A`;
                    if (postElement)
                        postElement.textContent = `Post: N/A`;
                }
            }
        };
        setInterval(updatePerformanceDisplay, 100);
    }
}


/***/ }),

/***/ "./src/profilers/MemoryProfiler.ts":
/*!*****************************************!*\
  !*** ./src/profilers/MemoryProfiler.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MemoryProfiler: () => (/* binding */ MemoryProfiler)
/* harmony export */ });
class MemoryProfiler {
    device;
    canvas;
    resources;
    constructor(simulator) {
        this.device = simulator.device;
        this.canvas = simulator.canvas;
        this.resources = () => {
            if (!!!simulator.resources)
                throw new Error("ResourceManager must be initialized before MemoryProfiler");
            return simulator.resources;
        };
    }
    // Calculate current VRAM usage by summing texture and buffer sizes.
    getVRAMUsage() {
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
        if (this.resources().performanceProfiler().queryBuffer)
            bufferMemory += 24; // 3 queries * 8 bytes
        if (this.resources().performanceProfiler().resultBuffer)
            bufferMemory += 24;
        return {
            textures: textureMemory,
            buffers: bufferMemory,
            total: textureMemory + bufferMemory,
        };
    }
}


/***/ }),

/***/ "./src/profilers/PerformanceProfiler.ts":
/*!**********************************************!*\
  !*** ./src/profilers/PerformanceProfiler.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PerformanceProfiler: () => (/* binding */ PerformanceProfiler)
/* harmony export */ });
// The number of frames to skip before writing a timestamp to the GPU.
const GPU_TIMING_RESOLUTION = 59;
// This allows measuring the duration of GPU operations for performance analysis.
class PerformanceProfiler {
    device;
    renderingManager;
    resources;
    // Query set for GPU timestamp queries to measure performance.
    querySet = null;
    // Buffer to resolve query results into.
    queryBuffer = null;
    // Buffer to copy query results for CPU reading.
    resultBuffer = null;
    // GPU timing storage for frame, main render, and post-processing durations.
    gpuTimes = {
        frame: 0,
        main: 0,
        post: 0,
    };
    // CPU frame time tracking.
    cpuFrameTime = 0;
    lastCpuFrameStart = 0;
    // Flags for managing asynchronous GPU timing reads.
    isReadingTimingResults = false;
    constructor(simulator) {
        this.device = simulator.device;
        this.renderingManager = () => {
            if (!!!simulator.renderer)
                throw new Error("RenderingManager must be initialized before PerformanceProfiler");
            return simulator.renderer;
        };
        this.resources = () => {
            if (!!!simulator.resources)
                throw new Error("ResourceManager must be initialized before PerformanceProfiler");
            return simulator.resources;
        };
    }
    // Create resources for GPU timing using timestamp queries.
    create() {
        if (!!!this.device)
            return console.error("Device not ready for timing resources creation.");
        if (!!!this.device.features.has("timestamp-query")) {
            console.log("GPU timing not available (timestamp-query not supported)");
            return;
        }
        console.log("🔴 Creating Performance Profiler");
        try {
            // Create query set for 3 timestamps: frame start, main end, frame end.
            this.querySet = this.device.createQuerySet({
                type: "timestamp",
                count: 3,
            });
            // Create buffer to hold resolved query results.
            this.queryBuffer = this.device.createBuffer({
                size: 3 * 8, // 3 * u64 (8 bytes each)
                usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
            });
            // Create mappable buffer for CPU reading of results.
            this.resultBuffer = this.device.createBuffer({
                size: 3 * 8,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            });
        }
        catch (error) {
            console.warn("Failed to create timing resources:", error);
            this.querySet = null;
            this.queryBuffer = null;
            this.resultBuffer = null;
        }
    }
    // Reads the advanced options toggle from localStorage (defaults to true)
    static getAdvancedOptionsEnabled() {
        try {
            const val = localStorage.getItem("showAdvancedOptions");
            return val === null ? true : val === "true";
        }
        catch {
            return true;
        }
    }
    isActiveFrame() {
        return (this.renderingManager().getFrameCount() % GPU_TIMING_RESOLUTION === 0);
    }
    // Get the timestamp writes for compute pass (manual queries since compute passes don't support timestampWrites)
    getComputePassTimestampWrites() {
        if (!!!this.querySet)
            return undefined;
        return this.isActiveFrame()
            ? {
                querySet: this.querySet,
                beginIndex: 0, // Start of compute/main rendering
                endIndex: 1, // End of compute/main rendering
            }
            : undefined;
    }
    // Get the timestamp writes for the tone mapping pass.
    getToneMappingTimestampWrites() {
        if (!!!this.querySet)
            return undefined;
        return this.isActiveFrame()
            ? {
                querySet: this.querySet,
                beginningOfPassWriteIndex: 1, // Start of tone mapping
                endOfPassWriteIndex: 2, // End of tone mapping
            }
            : undefined;
    }
    // Marks the start of CPU frame timing measurement.
    startCpuFrameTiming() {
        this.lastCpuFrameStart = performance.now();
    }
    // Calculates and stores the CPU frame time after rendering completes.
    endCpuFrameTiming() {
        this.cpuFrameTime = performance.now() - this.lastCpuFrameStart;
    }
    // Returns the last measured CPU frame time in milliseconds.
    getCpuFrameTime() {
        return this.cpuFrameTime;
    }
    // Checks if GPU timing results should be read this frame, throttling to every 10th successful render.
    shouldReadTimingResults(renderSuccess) {
        if (renderSuccess) {
            return this.isActiveFrame() && !this.isReadingTimingResults;
        }
        return false;
    }
    // Asynchronously reads GPU timing results from the query buffer, converting to milliseconds.
    // Handles mapping, reading, and unmapping the buffer safely with error handling.
    async readTimingResults() {
        const resultBuffer = this.resources().performanceProfiler().resultBuffer;
        if (!!!resultBuffer || this.isReadingTimingResults)
            return null;
        this.isReadingTimingResults = true;
        try {
            await resultBuffer.mapAsync(GPUMapMode.READ);
            const arrayBuffer = resultBuffer.getMappedRange();
            const timingData = new BigUint64Array(arrayBuffer);
            const nsToMs = (ns) => Number(ns) / 1_000_000;
            if (timingData.length >= 3) {
                this.gpuTimes.main = nsToMs(timingData[1] - timingData[0]);
                this.gpuTimes.post = nsToMs(timingData[2] - timingData[1]);
                this.gpuTimes.frame = nsToMs(timingData[2] - timingData[0]);
            }
            resultBuffer.unmap();
            return { ...this.gpuTimes };
        }
        catch (error) {
            console.warn("GPU timing read failed:", error);
        }
        finally {
            this.isReadingTimingResults = false;
        }
        return null;
    }
    // Returns a copy of the current GPU timing measurements.
    getGpuTimes() {
        return { ...this.gpuTimes };
    }
    // Checks if GPU timing queries are available in the current setup.
    hasGpuTiming() {
        return this.resources().performanceProfiler().querySet !== null;
    }
    // Returns whether timing results are currently being read asynchronously.
    isReadingResults() {
        return this.isReadingTimingResults;
    }
    destroy() {
        console.log("🔴 Destroying Performance Profiler");
        this.querySet?.destroy();
        this.queryBuffer?.destroy();
        this.resultBuffer?.destroy();
        this.querySet = null;
        this.queryBuffer = null;
        this.resultBuffer = null;
    }
}


/***/ }),

/***/ "./src/resources/BloomResources.ts":
/*!*****************************************!*\
  !*** ./src/resources/BloomResources.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BloomResources: () => (/* binding */ BloomResources)
/* harmony export */ });
/* harmony import */ var _shaders_postprocessing_bloom_extract_frag_wgsl__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../shaders/postprocessing/bloom.extract.frag.wgsl */ "./src/shaders/postprocessing/bloom.extract.frag.wgsl");
/* harmony import */ var _shaders_postprocessing_bloom_blur_frag_wgsl__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../shaders/postprocessing/bloom.blur.frag.wgsl */ "./src/shaders/postprocessing/bloom.blur.frag.wgsl");
/* harmony import */ var _shaders_fullscreen_vert_wgsl__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../shaders/fullscreen.vert.wgsl */ "./src/shaders/fullscreen.vert.wgsl");



class BloomResources {
    device;
    canvas;
    blackHole;
    resources;
    // Pipelines
    bloomExtractPipeline = null;
    bloomBlurPipeline = null;
    // Textures and views (half resolution)
    bloomTexture1 = null;
    bloomTexture2 = null;
    bloomTextureView1 = null;
    bloomTextureView2 = null;
    // Uniform buffers
    bloomParamsBuffer = null; // threshold
    bloomBlurHParamsBuffer = null; // horizontal flag
    bloomBlurVParamsBuffer = null; // vertical flag
    // Bind groups
    bloomExtractBindGroup = null;
    bloomExtractBindGroupAlt = null;
    bloomBlurHBindGroup = null;
    bloomBlurVBindGroup = null;
    // track last dimensions for reuse optimization
    cachedBloomParams = new Float32Array(4);
    bloomParamsInitialized = false;
    lastBloomThreshold = Number.NaN;
    constructor(simulator) {
        this.device = simulator.device;
        this.canvas = simulator.canvas;
        this.blackHole = () => simulator.blackHole;
        this.resources = () => simulator.resources;
    }
    setup() { }
    ////////////////////////////////////////////////////////////
    getBloomExtractPipeline = () => this.bloomExtractPipeline ?? this.createBloomExtractPipeline();
    createBloomExtractPipeline() {
        console.log("🔴 Creating bloom extract pipeline");
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
            ],
        });
        this.bloomExtractPipeline = this.device.createRenderPipeline({
            label: `bloom extract pipeline`,
            layout: this.device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout],
            }),
            vertex: {
                module: this.device.createShaderModule({ code: _shaders_fullscreen_vert_wgsl__WEBPACK_IMPORTED_MODULE_2__["default"] }),
                entryPoint: "main",
            },
            fragment: {
                module: this.device.createShaderModule({ code: _shaders_postprocessing_bloom_extract_frag_wgsl__WEBPACK_IMPORTED_MODULE_0__["default"] }),
                entryPoint: "main",
                targets: [{ format: "rgba16float" }],
            },
            primitive: { topology: "triangle-list" },
        });
        return this.bloomExtractPipeline;
    }
    ////////////////////////////////////////////////////////////
    getBloomBlurPipeline = () => this.bloomBlurPipeline ?? this.createBloomBlurPipeline();
    createBloomBlurPipeline() {
        console.log("🔴 Creating bloom blur pipeline");
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
            ],
        });
        this.bloomBlurPipeline = this.device.createRenderPipeline({
            label: `bloom blur pipeline`,
            layout: this.device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout],
            }),
            vertex: {
                module: this.device.createShaderModule({ code: _shaders_fullscreen_vert_wgsl__WEBPACK_IMPORTED_MODULE_2__["default"] }),
                entryPoint: "main",
            },
            fragment: {
                module: this.device.createShaderModule({ code: _shaders_postprocessing_bloom_blur_frag_wgsl__WEBPACK_IMPORTED_MODULE_1__["default"] }),
                entryPoint: "main",
                targets: [{ format: "rgba16float" }],
            },
            primitive: { topology: "triangle-list" },
        });
        return this.bloomBlurPipeline;
    }
    ////////////////////////////////////////////////////////////
    getBloomTextures = (width, height) => Math.floor(width / 2) == this.lastBloomTexturesDims.width &&
        Math.floor(height / 2) == this.lastBloomTexturesDims.height &&
        !!this.bloomTexture1 &&
        !!this.bloomTexture2 &&
        !!this.bloomTextureView1 &&
        !!this.bloomTextureView2
        ? {
            bloomTexture1: this.bloomTexture1,
            bloomTexture2: this.bloomTexture2,
            bloomTextureView1: this.bloomTextureView1,
            bloomTextureView2: this.bloomTextureView2,
        }
        : this.createBloomTextures(Math.floor(width / 2), Math.floor(height / 2));
    createBloomTextures(width, height) {
        console.log(`🔴 Creating bloom textures ${width}x${height}`);
        this.bloomTexture1?.destroy();
        this.bloomTexture1 = this.device.createTexture({
            label: "bloom texture 1",
            size: { width, height },
            format: "rgba16float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });
        this.bloomTextureView1 = this.bloomTexture1.createView();
        this.bloomTexture2?.destroy();
        this.bloomTexture2 = this.device.createTexture({
            label: "bloom texture 2",
            size: { width, height },
            format: "rgba16float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });
        this.bloomTextureView2 = this.bloomTexture2.createView();
        this.bloomExtractBindGroup = null;
        this.bloomBlurHBindGroup = null;
        this.bloomBlurVBindGroup = null;
        try {
            this.resources().toneMapResources.markBloomTexturesDirty();
        }
        catch (error) {
            console.warn("Failed to notify tone map resources about bloom texture recreation", error);
        }
        this.lastBloomTexturesDims = { width, height };
        return {
            bloomTexture1: this.bloomTexture1,
            bloomTexture2: this.bloomTexture2,
            bloomTextureView1: this.bloomTextureView1,
            bloomTextureView2: this.bloomTextureView2,
        };
    }
    lastBloomTexturesDims = { width: -1, height: -1 };
    ////////////////////////////////////////////////////////////
    getBloomParamsBuffer = () => this.bloomParamsBuffer ?? this.createBloomParamsBuffer();
    createBloomParamsBuffer() {
        console.log("🔴 Creating bloom params buffer");
        this.bloomParamsBuffer?.destroy();
        this.bloomParamsBuffer = this.device.createBuffer({
            label: `bloom params buffer`,
            size: 16, // vec4<f32>
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.bloomParamsInitialized = false;
        this.lastBloomThreshold = Number.NaN;
        this.updateBloomParamsBuffer();
        return this.bloomParamsBuffer;
    }
    updateBloomParamsBuffer(bloomThreshold) {
        const threshold = bloomThreshold ?? this.blackHole().bloomThreshold;
        if (!this.bloomParamsInitialized || threshold !== this.lastBloomThreshold) {
            this.cachedBloomParams[0] = threshold;
            this.cachedBloomParams[1] = 0;
            this.cachedBloomParams[2] = 0;
            this.cachedBloomParams[3] = 0;
            this.device.queue.writeBuffer(this.getBloomParamsBuffer(), 0, this.cachedBloomParams);
            this.lastBloomThreshold = threshold;
            this.bloomParamsInitialized = true;
        }
    }
    ////////////////////////////////////////////////////////////
    getBloomBlurHParamsBuffer = () => this.bloomBlurHParamsBuffer ?? this.createBloomBlurHParamsBuffer();
    createBloomBlurHParamsBuffer() {
        console.log("🔴 Creating bloom blur h params buffer");
        this.bloomBlurHParamsBuffer?.destroy();
        this.bloomBlurHParamsBuffer = this.device.createBuffer({
            label: `bloom blur h params buffer`,
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.getBloomBlurHParamsBuffer(), 0, new Float32Array([1, 0, 0, 0]));
        return this.bloomBlurHParamsBuffer;
    }
    ////////////////////////////////////////////////////////////
    getBloomBlurVParamsBuffer = () => this.bloomBlurVParamsBuffer ?? this.createBloomBlurVParamsBuffer();
    createBloomBlurVParamsBuffer() {
        console.log("🔴 Creating bloom blur v params buffer");
        this.bloomBlurVParamsBuffer?.destroy();
        this.bloomBlurVParamsBuffer = this.device.createBuffer({
            label: "bloom blur v params buffer",
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.getBloomBlurVParamsBuffer(), 0, new Float32Array([0, 0, 0, 0]));
        return this.bloomBlurVParamsBuffer;
    }
    ////////////////////////////////////////////////////////////
    getBloomExtractBindGroup = (width, height, useBufferA) => {
        if (this.lastBloomExtractBindGroupDims.width !== width ||
            this.lastBloomExtractBindGroupDims.height !== height) {
            this.bloomExtractBindGroup = null;
            this.bloomExtractBindGroupAlt = null;
            this.lastBloomExtractBindGroupDims = { width, height };
        }
        return useBufferA
            ? this.bloomExtractBindGroup ??
                this.createBloomExtractBindGroup(width, height, true)
            : this.bloomExtractBindGroupAlt ??
                this.createBloomExtractBindGroup(width, height, false);
    };
    createBloomExtractBindGroup(width, height, useBufferA) {
        console.log(`🔴 Creating bloom extract bind group (bufferA=${useBufferA})`);
        const bindGroup = this.device.createBindGroup({
            label: `bloom extract bind group (bufferA=${useBufferA})`,
            layout: this.getBloomExtractPipeline().getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: this.resources().toneMapResources.getToneMapSampler(),
                },
                {
                    binding: 1,
                    resource: useBufferA
                        ? this.resources().getBufferAView()
                        : this.resources().getPreviousFrameView(),
                },
                { binding: 2, resource: { buffer: this.getBloomParamsBuffer() } },
            ],
        });
        if (useBufferA) {
            this.bloomExtractBindGroup = bindGroup;
        }
        else {
            this.bloomExtractBindGroupAlt = bindGroup;
        }
        return bindGroup;
    }
    lastBloomExtractBindGroupDims = { width: -1, height: -1 };
    ////////////////////////////////////////////////////////////
    getBloomBlurBindGroups = (width, height) => width == this.lastBloomBlurBindGroupsDims.width &&
        height == this.lastBloomBlurBindGroupsDims.height &&
        !!this.bloomBlurHBindGroup &&
        !!this.bloomBlurVBindGroup
        ? {
            bloomBlurHBindGroup: this.bloomBlurHBindGroup,
            bloomBlurVBindGroup: this.bloomBlurVBindGroup,
        }
        : this.createBloomBlurBindGroups(width, height);
    createBloomBlurBindGroups(width, height) {
        console.log("🔴 Creating bloom blur bind groups");
        this.bloomBlurHBindGroup = this.device.createBindGroup({
            label: "bloom blur h bind group",
            layout: this.getBloomBlurPipeline().getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: this.resources().toneMapResources.getToneMapSampler(),
                },
                {
                    binding: 1,
                    resource: this.getBloomTextures(width, height).bloomTextureView1,
                },
                {
                    binding: 2,
                    resource: { buffer: this.getBloomBlurHParamsBuffer() },
                },
            ],
        });
        this.bloomBlurVBindGroup = this.device.createBindGroup({
            label: "bloom blur v bind group",
            layout: this.getBloomBlurPipeline().getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: this.resources().toneMapResources.getToneMapSampler(),
                },
                {
                    binding: 1,
                    resource: this.getBloomTextures(width, height).bloomTextureView2,
                },
                {
                    binding: 2,
                    resource: { buffer: this.getBloomBlurVParamsBuffer() },
                },
            ],
        });
        this.lastBloomBlurBindGroupsDims = { width, height };
        return {
            bloomBlurHBindGroup: this.bloomBlurHBindGroup,
            bloomBlurVBindGroup: this.bloomBlurVBindGroup,
        };
    }
    lastBloomBlurBindGroupsDims = { width: -1, height: -1 };
    ////////////////////////////////////////////////////////////
    destroy() {
        console.log("🔴 Destroying bloom resources");
        this.bloomTexture1?.destroy();
        this.bloomTexture2?.destroy();
        this.bloomParamsBuffer?.destroy();
        this.bloomBlurHParamsBuffer?.destroy();
        this.bloomBlurVParamsBuffer?.destroy();
        this.bloomTexture1 = null;
        this.bloomTexture2 = null;
        this.bloomTextureView1 = null;
        this.bloomTextureView2 = null;
        this.bloomParamsBuffer = null;
        this.bloomBlurHParamsBuffer = null;
        this.bloomBlurVParamsBuffer = null;
        this.bloomExtractPipeline = null;
        this.bloomBlurPipeline = null;
        this.bloomExtractBindGroup = null;
        this.bloomBlurHBindGroup = null;
        this.bloomBlurVBindGroup = null;
    }
}


/***/ }),

/***/ "./src/resources/ColorizeResources.ts":
/*!********************************************!*\
  !*** ./src/resources/ColorizeResources.ts ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ColorizeResources: () => (/* binding */ ColorizeResources)
/* harmony export */ });
/* harmony import */ var _shaders_postprocessing_colorize_frag_wgsl__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../shaders/postprocessing/colorize.frag.wgsl */ "./src/shaders/postprocessing/colorize.frag.wgsl");
/* harmony import */ var _shaders_fullscreen_vert_wgsl__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../shaders/fullscreen.vert.wgsl */ "./src/shaders/fullscreen.vert.wgsl");


class ColorizeResources {
    device;
    simulator;
    presentationFormat;
    colorizeBindGroupLayout = null;
    colorizePipelineLayout = null;
    colorizePipeline = null;
    colorizeParamsBuffer = null;
    colorizeBindGroup = null;
    constructor(simulator) {
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
    getColorizeParamsBuffer() {
        if (this.colorizeParamsBuffer)
            return this.colorizeParamsBuffer;
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
    getColorizeBindGroupLayout() {
        if (this.colorizeBindGroupLayout)
            return this.colorizeBindGroupLayout;
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
    getColorizePipelineLayout() {
        if (this.colorizePipelineLayout)
            return this.colorizePipelineLayout;
        this.colorizePipelineLayout = this.device.createPipelineLayout({
            label: "colorizePipelineLayout",
            bindGroupLayouts: [this.getColorizeBindGroupLayout()],
        });
        return this.colorizePipelineLayout;
    }
    getColorizePipeline() {
        if (this.colorizePipeline)
            return this.colorizePipeline;
        this.colorizePipeline = this.device.createRenderPipeline({
            label: "colorizePipeline",
            layout: this.getColorizePipelineLayout(),
            vertex: {
                module: this.device.createShaderModule({ code: _shaders_fullscreen_vert_wgsl__WEBPACK_IMPORTED_MODULE_1__["default"] }),
                entryPoint: "main",
            },
            fragment: {
                module: this.device.createShaderModule({ code: _shaders_postprocessing_colorize_frag_wgsl__WEBPACK_IMPORTED_MODULE_0__["default"] }),
                entryPoint: "main",
                targets: [{ format: this.presentationFormat }], // Output to canvas format
            },
            primitive: { topology: "triangle-list" },
        });
        return this.colorizePipeline;
    }
    getColorizeBindGroup(inputTexture, sampler) {
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


/***/ }),

/***/ "./src/resources/HDRResources.ts":
/*!***************************************!*\
  !*** ./src/resources/HDRResources.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HDRResources: () => (/* binding */ HDRResources)
/* harmony export */ });
// Upsampling has been removed; keep HDR texture management only.
// Manages the HDR render target (texture and view)
class HDRResources {
    device;
    canvas;
    presentationFormat;
    resources;
    hdrTexture = null;
    hdrTextureView = null;
    // No upsample pipeline or bind groups
    constructor(simulator) {
        this.device = simulator.device;
        this.canvas = simulator.canvas;
        this.presentationFormat = simulator.presentationFormat;
        this.resources = () => simulator.resources;
    }
    setup() { }
    ////////////////////////////////////////////////////////////
    getHDRTexture = (width, height) => !!!this.hdrTexture ||
        this.lastHDRTextureDims.width !== width ||
        this.lastHDRTextureDims.height !== height
        ? this.createHDRTexture(width, height)
        : this.hdrTexture;
    createHDRTexture(width, height) {
        console.log(`🔴 Creating HDR texture ${width}x${height}`);
        this.hdrTexture?.destroy();
        this.hdrTexture = this.device.createTexture({
            label: "HDR texture",
            size: { width, height },
            sampleCount: 1,
            format: "rgba16float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.COPY_SRC,
        });
        this.lastHDRTextureDims = { width, height };
        return this.hdrTexture;
    }
    lastHDRTextureDims = { width: -1, height: -1 };
    ////////////////////////////////////////////////////////////
    getHDRTextureView = (width, height) => !!!this.hdrTextureView ||
        this.lastHDRTextureViewDims.width !== width ||
        this.lastHDRTextureViewDims.height !== height
        ? this.createHDRTextureView(width, height)
        : this.hdrTextureView;
    createHDRTextureView(width, height) {
        console.log(`🔴 Creating HDR texture view ${width}x${height}`);
        this.hdrTextureView = this.getHDRTexture(width, height).createView({
            label: "HDR texture view",
        });
        this.lastHDRTextureViewDims = { width, height };
        return this.hdrTextureView;
    }
    lastHDRTextureViewDims = { width: -1, height: -1 };
    ////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////
    // No upsample bind groups
    ////////////////////////////////////////////////////////////
    destroy() {
        console.log("🔴 Destroying HDR resources");
        this.hdrTexture?.destroy();
        this.hdrTexture = null;
        this.hdrTextureView = null;
    }
}


/***/ }),

/***/ "./src/resources/ToneMapResources.ts":
/*!*******************************************!*\
  !*** ./src/resources/ToneMapResources.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ToneMapResources: () => (/* binding */ ToneMapResources)
/* harmony export */ });
/* harmony import */ var _shaders_postprocessing_tonemap_frag_wgsl__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../shaders/postprocessing/tonemap.frag.wgsl */ "./src/shaders/postprocessing/tonemap.frag.wgsl");
/* harmony import */ var _shaders_fullscreen_vert_wgsl__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../shaders/fullscreen.vert.wgsl */ "./src/shaders/fullscreen.vert.wgsl");


class ToneMapResources {
    device;
    canvas;
    presentationFormat;
    blackHole;
    resources;
    toneMapPipeline = null;
    toneParamBuffer = null;
    toneMapSampler = null;
    toneMapBindGroup = null;
    toneMapBindGroupAlt = null;
    cachedToneParams = new Float32Array(9);
    lastToneParams = new Float32Array(9);
    toneParamsInitialized = false;
    constructor(simulator) {
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
    getToneMapPipeline = () => this.toneMapPipeline ?? this.createToneMapPipeline();
    createToneMapPipeline() {
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
                module: this.device.createShaderModule({ code: _shaders_fullscreen_vert_wgsl__WEBPACK_IMPORTED_MODULE_1__["default"] }),
                entryPoint: "main",
            },
            fragment: {
                module: this.device.createShaderModule({ code: _shaders_postprocessing_tonemap_frag_wgsl__WEBPACK_IMPORTED_MODULE_0__["default"] }),
                entryPoint: "main",
                targets: [{ format: "rgba16float" }], // Always output to HDR format
            },
            primitive: { topology: "triangle-list" },
        });
        return this.toneMapPipeline;
    }
    ////////////////////////////////////////////////////////////
    getToneParamBuffer = () => this.toneParamBuffer ?? this.createToneParamBuffer();
    createToneParamBuffer() {
        this.toneParamBuffer = this.device.createBuffer({
            label: "toneParamBuffer",
            size: 36, // 9 floats
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.toneParamsInitialized = false;
        this.updateToneParamBuffer();
        return this.toneParamBuffer;
    }
    updateToneParamBuffer() {
        this.toneParamBuffer = this.getToneParamBuffer();
        this.populateToneParams(this.cachedToneParams);
        if (!this.toneParamsInitialized || this.toneParamsChanged()) {
            this.device.queue.writeBuffer(this.toneParamBuffer, 0, this.cachedToneParams);
            this.lastToneParams.set(this.cachedToneParams);
            this.toneParamsInitialized = true;
        }
        return this.toneParamBuffer;
    }
    ////////////////////////////////////////////////////////////
    getToneMapSampler = () => this.toneMapSampler ?? this.createToneMapSampler();
    createToneMapSampler() {
        this.toneMapSampler = this.device.createSampler({
            label: "toneMapSampler",
            magFilter: "linear",
            minFilter: "linear",
        });
        return this.toneMapSampler;
    }
    ////////////////////////////////////////////////////////////
    getToneMapBindGroup = (width, height, useBufferA) => {
        if (this.lastToneMapBindGroupDims.width !== width ||
            this.lastToneMapBindGroupDims.height !== height) {
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
    createToneMapBindGroup(width, height, useBufferA) {
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
                    resource: this.resources().bloomResources.getBloomTextures(width, height).bloomTextureView1,
                },
            ],
        });
        if (useBufferA) {
            this.toneMapBindGroup = bindGroup;
        }
        else {
            this.toneMapBindGroupAlt = bindGroup;
        }
        return bindGroup;
    }
    lastToneMapBindGroupDims = { width: -1, height: -1 };
    ////////////////////////////////////////////////////////////
    populateToneParams(target) {
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
    toneParamsChanged() {
        if (!this.toneParamsInitialized)
            return true;
        for (let i = 0; i < this.cachedToneParams.length; i++) {
            if (this.cachedToneParams[i] !== this.lastToneParams[i])
                return true;
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


/***/ }),

/***/ "./src/shaders/compute/blackhole.comp.wgsl":
/*!*************************************************!*\
  !*** ./src/shaders/compute/blackhole.comp.wgsl ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ("// Black hole raymarching moved to compute. Outputs RGBA color per pixel directly to storage texture.\n\nstruct Uniforms {\n  time: f32,\n  iterations: f32,\n  warpAmount: f32,\n  discRadius: f32,\n  discWidth: f32,\n  discThickness: f32,\n  discSpeed: f32,\n  discBrightness: f32,\n  discTemperature: f32,\n  discInnerFalloff: f32,\n  discOuterFalloff: f32,\n  discTexturePower: f32,\n  discMinCoverage: f32,\n  discOuterTransparency: f32,\n  hazeIntensity: f32,\n  temporalBlendWeight: f32,\n  cameraRotationX: f32,\n  cameraRotationY: f32,\n  brightnessFactor: f32,\n  cameraPanX: f32,\n  cameraPanY: f32,\n  blackHoleRotationX: f32,\n  blackHoleRotationY: f32,\n  blackHoleRotationZ: f32,\n  stepMinScale: f32,\n  stepMaxScale: f32,\n  stepNearFactor: f32,\n  stepFarFactor: f32,\n}\n\nstruct Resolution {\n  width: f32,\n  height: f32,\n}\n\n@group(0) @binding(0) var<uniform> uniforms: Uniforms;\n@group(0) @binding(1) var<uniform> resolution: Resolution;\n@group(0) @binding(2) var noiseSampler: sampler;\n@group(0) @binding(3) var noiseTexture: texture_2d<f32>;\n@group(0) @binding(4) var proceduralSampler: sampler;\n@group(0) @binding(5) var proceduralTexture: texture_2d<f32>;\n@group(0) @binding(6) var previousFrameSampler: sampler;\n@group(0) @binding(7) var previousFrameTexture: texture_2d<f32>;\n@group(0) @binding(8) var outputTexture: texture_storage_2d<rgba16float, write>;\n// Precomputed 3D noise textures\n@group(0) @binding(9) var noise3DSampler: sampler;\n@group(0) @binding(10) var noise1Texture: texture_3d<f32>;\n@group(0) @binding(11) var noise2Texture: texture_3d<f32>;\n\nconst PI: f32 = 3.14159265;\n\n\nfn pcgHash(seed: u32) -> u32 {\n    let state = seed * 747796405u + 2891336453u;\n    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;\n    return (word >> 22u) ^ word;\n}\n\n// fn rand(seed: u32) -> i32 {\n//     return bitcast<i32>(pcgHash(seed));\n// }\n\n// fn randRange(seed: u32, min: i32, max: i32) -> i32 {\n//     return (rand(seed) % (max - min)) + min;\n// }\n\n// fn randNormalRange(seed: u32, min: i32, max: i32) -> i32 {\n//     let a = pcgHash(seed) / 3u;\n//     let b = pcgHash(seed + 1u) / 3u;\n//     let c = pcgHash(seed + 2u) / 3u;\n//     return (bitcast<i32>(a + b + c) % (max - min)) + min;\n// }\n\nfn saturate_f32(x: f32) -> f32 { return clamp(x, 0.0, 1.0); }\nfn saturate_vec3(x: vec3<f32>) -> vec3<f32> { return clamp(x, vec3<f32>(0.0), vec3<f32>(1.0)); }\n\nfn rand(coord: vec2<f32>) -> f32 {\n  return saturate_f32(fract(sin(dot(coord, vec2<f32>(12.9898, 78.223))) * 43758.5453));\n}\n\nfn noise(x: vec3<f32>) -> f32 {\n  let p = floor(x);\n  let f = fract(x);\n  let ff = f * f * (3.0 - 2.0 * f);\n  let uv = (p.xy + vec2<f32>(37.0, 17.0) * p.z) + ff.xy;\n  let rg = textureSampleLevel(noiseTexture, noiseSampler, (uv + 0.5) / 256.0, 0.0).yx;\n  return -1.0 + 2.0 * mix(rg.x, rg.y, ff.z);\n}\n\nfn pcurve(x: f32, a: f32, b: f32) -> f32 {\n  let k = pow(a + b, a + b) / (pow(a, a) * pow(b, b));\n  return k * pow(x, a) * pow(1.0 - x, b);\n}\n\nfn sdTorus(p: vec3<f32>, t: vec2<f32>) -> f32 {\n  let q = vec2<f32>(length(p.xz) - t.x, p.y);\n  return length(q) - t.y;\n}\n\nfn rotate(p: vec3<f32>, x: f32, y: f32, z: f32) -> vec3<f32> {\n  let matx = mat3x3<f32>(\n    1.0, 0.0, 0.0,\n    0.0, cos(x), sin(x),\n    0.0, -sin(x), cos(x)\n  );\n  let maty = mat3x3<f32>(\n    cos(y), 0.0, -sin(y),\n    0.0, 1.0, 0.0,\n    sin(y), 0.0, cos(y)\n  );\n  let matz = mat3x3<f32>(\n    cos(z), sin(z), 0.0,\n    -sin(z), cos(z), 0.0,\n    0.0, 0.0, 1.0\n  );\n  var result = maty * p;  // Yaw\n  result = matx * result; // Pitch\n  result = matz * result; // Roll\n  return result;\n}\n\nfn rotation_matrix(x: f32, y: f32, z: f32) -> mat3x3<f32> {\n  let cx = cos(x); let sx = sin(x);\n  let cy = cos(y); let sy = sin(y);\n  let cz = cos(z); let sz = sin(z);\n\n  let matx = mat3x3<f32>(\n    1.0, 0.0, 0.0,\n    0.0, cx,  sx,\n    0.0, -sx, cx\n  );\n  let maty = mat3x3<f32>(\n    cy,  0.0, -sy,\n    0.0, 1.0,  0.0,\n    sy,  0.0,  cy\n  );\n  let matz = mat3x3<f32>(\n    cz,  sz, 0.0,\n    -sz, cz, 0.0,\n    0.0, 0.0, 1.0\n  );\n  return matz * matx * maty;\n}\n\n// Returns intensity value for grayscale output (0.0 = black, 1.0 = white)\nfn calculateIntensity(radialGradient: f32, distFromCenter: f32, bloomFactor: f32) -> f32 {\n  // radialGradient is 1.0 at inner edge, 0.0 at outer edge\n  // Use it to create smooth intensity transitions\n  let baseIntensity = radialGradient * radialGradient; // Quadratic falloff\n  \n  // Add bloom contribution\n  let bloomContribution = saturate_f32(bloomFactor * bloomFactor * 0.5);\n  \n  // Combine intensities with artistic control\n  return saturate_f32(baseIntensity + bloomContribution);\n}\n\nfn haze(intensity: ptr<function, f32>, pos: vec3<f32>, alpha: f32, invIterations: f32) {\n  let t = vec2<f32>(1.0, 0.01);\n  let torusDist = length(sdTorus(pos + vec3<f32>(0.0, -0.05, 0.0), t));\n  var bloomDisc = 1.0 / (torusDist * torusDist + 0.001);\n  bloomDisc *= select(1.0, 0.0, length(pos) < 0.5);\n  *intensity += bloomDisc * (uniforms.hazeIntensity * invIterations) * (1.0 - alpha * 1.0);\n}\n\nfn gasDisc(intensity: ptr<function, f32>, alpha: ptr<function, f32>, pos: vec3<f32>, invIterations: f32) {\n  let discInner = uniforms.discRadius - uniforms.discWidth * 0.5;\n  let discOuter = uniforms.discRadius + uniforms.discWidth * 0.5;\n\n  let origin = vec3<f32>(0.0, 0.0, 0.0);\n  let discNormal = vec3<f32>(0.0, 1.0, 0.0);\n  var discThickness = uniforms.discThickness;\n\n  let distFromCenter = distance(pos, origin);\n  let distFromDisc = dot(discNormal, pos - origin);\n\n  // Early rejection: quick bounds test before expensive shaping/noise\n  let margin = uniforms.discThickness * 3.0; // Conservative margin for bloom/haze effects\n  if (distFromCenter < discInner - margin || distFromCenter > discOuter + margin) { return; }\n  if (abs(distFromDisc) > margin) { return; }\n\n  let radialGradient = 1.0 - saturate_f32((distFromCenter - discInner) / uniforms.discWidth * 0.5);\n  var coverage = pcurve(radialGradient, 4.0, 0.9);\n\n  discThickness *= radialGradient;\n  coverage *= saturate_f32(1.0 - abs(distFromDisc) / discThickness);\n\n  let rg_inv = 1.0 - radialGradient;\n  let dustGlow = 1.0 / (rg_inv * rg_inv * 290.0 + 0.002);\n  var dustIntensity = dustGlow * 8.2;\n\n  coverage = saturate_f32(coverage * 0.7);\n\n  let t = abs(distFromCenter - discInner) + 0.4;\n  let t2 = t * t;\n  let fade = (t2 * t2) * 0.04;\n  let bloomFactor = 1.0 / (distFromDisc * distFromDisc * 40.0 + fade + 0.00002);\n  var bloomIntensity = bloomFactor * sqrt(bloomFactor);\n\n  // Calculate final intensity based on radial position\n  let baseIntensity = calculateIntensity(radialGradient, distFromCenter, bloomFactor);\n  \n  // Mix dust and bloom intensities\n  dustIntensity = mix(dustIntensity, bloomIntensity * 150.0, saturate_f32(1.0 - coverage * 1.0));\n  coverage = saturate_f32(coverage + bloomFactor * bloomFactor * 0.1);\n\n  if (coverage < 0.01) { return; }\n\n  var radialCoords: vec3<f32>;\n  radialCoords.x = distFromCenter * 1.5 + 0.55;\n  radialCoords.y = atan2(-pos.x, -pos.z) * 1.5;\n  radialCoords.z = distFromDisc * 1.5;\n  radialCoords *= 0.95;\n\n  let speed = uniforms.discSpeed;\n\n  // Convert to texture coordinates for 3D lookup\n  // X: radial distance (0 to 8 mapped to 0-1)\n  // Y: angular position with time-based rotation (wrapped)\n  // Z: vertical distance (-2 to 2 mapped to 0-1)\n  var lookupCoords: vec3<f32>;\n  lookupCoords.x = radialCoords.x / 8.0;\n  lookupCoords.y = fract((radialCoords.y / 6.28318530718) + uniforms.time * speed * 0.5);\n  lookupCoords.z = (radialCoords.z / 4.0) + 0.5;\n\n  // Single texture lookup for precomputed multi-octave noise\n  let noise1 = textureSampleLevel(noise1Texture, noise3DSampler, lookupCoords, 0.0).r;\n  let noise2 = textureSampleLevel(noise2Texture, noise3DSampler, lookupCoords, 0.0).r;\n\n  dustIntensity *= noise1 * 0.998 + 0.002;\n  coverage *= max(noise2, uniforms.discMinCoverage);\n\n  radialCoords.y += uniforms.time * speed * 0.5;\n  let proceduralSample = textureSampleLevel(proceduralTexture, proceduralSampler, radialCoords.yx * vec2<f32>(0.15, 0.27), 0.0).r;\n  dustIntensity *= pow(proceduralSample, uniforms.discTexturePower) * uniforms.discBrightness;\n\n  coverage = saturate_f32(coverage * 1200.0 * invIterations);\n  dustIntensity = max(0.0, dustIntensity);\n  coverage *= pcurve(radialGradient, uniforms.discInnerFalloff, uniforms.discOuterFalloff);\n\n  // Apply outer edge transparency to eliminate black shadow\n  // radialGradient is 1.0 at inner edge, 0.0 at outer edge\n  // So we want to fade out when radialGradient approaches 0\n  let outerFade = mix(uniforms.discOuterTransparency, 1.0, radialGradient);\n  coverage *= outerFade;\n\n  // Accumulate intensity instead of color\n  *intensity = (1.0 - *alpha) * dustIntensity * coverage + *intensity;\n  *alpha = (1.0 - *alpha) * coverage + *alpha;\n}\n\nfn rotateCamera(eyevec: ptr<function, vec3<f32>>, eyepos: ptr<function, vec3<f32>>) {\n  let angle = vec3<f32>(0.0, 0.0, 0.0);\n  *eyevec = rotate(*eyevec, angle.x, angle.y, angle.z);\n  *eyepos = rotate(*eyepos, angle.x, angle.y, angle.z);\n}\n\nfn rotateBlackhole(pos: vec3<f32>) -> vec3<f32> {\n  return rotate(pos, -uniforms.blackHoleRotationX, -uniforms.blackHoleRotationY, -uniforms.blackHoleRotationZ);\n}\n\nfn warpSpace(eyevec: ptr<function, vec3<f32>>, raypos: vec3<f32>, invIterations: f32) {\n  let origin = vec3<f32>(0.0, 0.0, 0.0);\n  let singularityDist = distance(raypos, origin);\n  let warpFactor = 1.0 / (singularityDist * singularityDist + 0.000001);\n  let singularityVector = normalize(origin - raypos);\n  *eyevec = normalize(*eyevec + singularityVector * warpFactor * uniforms.warpAmount * invIterations);\n}\n\n@compute @workgroup_size(16, 16, 1)\nfn main(@builtin(global_invocation_id) gid: vec3<u32>) {\n  let width = u32(resolution.width);\n  let height = u32(resolution.height);\n  let x = gid.x;\n  let y = gid.y;\n  if (x >= width || y >= height) { return; }\n\n  // UV and indexing\n  let uv = (vec2<f32>(f32(x) + 0.5, f32(y) + 0.5)) / vec2<f32>(f32(width), f32(height));\n  let aspect = resolution.width / resolution.height;\n\n  var uveye = uv;\n  uveye.x += (rand(uv + sin(uniforms.time * 1.0)) / resolution.width) * 1.0;\n  uveye.y += (rand(uv + 1.0 + sin(uniforms.time * 1.0)) / resolution.height) * 1.0;\n\n  var ndc = (uveye * 2.0 - 1.0) * vec2<f32>(aspect, 1.0);\n  ndc.y = -ndc.y;\n  var eyevec = normalize(vec3<f32>(ndc, 6.0));\n  var eyepos = vec3<f32>(0.0, -0.0, -10.0);\n\n  eyepos.x += uniforms.cameraPanX * 3.0;\n  eyepos.y += uniforms.cameraPanY * 3.0;\n\n  let far = 15.0;\n  rotateCamera(&eyevec, &eyepos);\n\n  // Precompute values used in the loop\n  let invIterations = 1.0 / uniforms.iterations;\n  let baseStep = far * invIterations;\n  let rotBH = rotation_matrix(-uniforms.blackHoleRotationX, -uniforms.blackHoleRotationY, -uniforms.blackHoleRotationZ);\n\n  var intensity = 0.0;\n  let dither = rand(uv + sin(uniforms.time * 1.0)) * 2.0;\n\n  var alpha = 0.0;\n  var travelled = dither * baseStep;\n  var raypos = eyepos + eyevec * travelled;\n\n  let iterations = i32(uniforms.iterations);\n  for (var i = 0; i < iterations; i++) {\n    // Distance-based adaptive step scaling\n    let r = length(raypos);\n    let rNear = max(0.5, uniforms.discRadius - uniforms.discWidth * uniforms.stepNearFactor);\n    let rFar  = uniforms.discRadius + uniforms.discWidth * uniforms.stepFarFactor;\n    let t = smoothstep(rNear, rFar, r);\n    let stepScale = mix(uniforms.stepMinScale, uniforms.stepMaxScale, t);\n    let localStep = baseStep * stepScale;\n    let stepWeight = invIterations * stepScale; // equals localStep / far\n\n    warpSpace(&eyevec, raypos, stepWeight);\n    raypos += eyevec * localStep;\n    let rotatedPos = rotBH * raypos;\n    gasDisc(&intensity, &alpha, rotatedPos, stepWeight);\n    haze(&intensity, rotatedPos, alpha, stepWeight);\n\n    travelled += localStep;\n\n    // Early out when fully opaque or ray travelled beyond far plane\n    if (alpha > 0.999 || travelled >= far) { break; }\n  }\n\n  intensity *= 0.0001;\n  intensity *= uniforms.brightnessFactor;\n\n  // Convert intensity to grayscale color for output\n  let grayscale = vec3<f32>(intensity);\n\n  // Temporal accumulation (removed no-op pow operations)\n  let previous = textureSampleLevel(previousFrameTexture, previousFrameSampler, uv, 0.0).rgb;\n  let blendWeight = uniforms.temporalBlendWeight;\n  let finalColor = mix(grayscale, previous, blendWeight);\n\n  textureStore(outputTexture, vec2<u32>(x, y), vec4<f32>(finalColor, 1.0));\n}\n\n\n");

/***/ }),

/***/ "./src/shaders/compute/noise-precompute.comp.wgsl":
/*!********************************************************!*\
  !*** ./src/shaders/compute/noise-precompute.comp.wgsl ***!
  \********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ("// Compute shader to precompute multi-octave noise into 3D textures\n// X: radial distance (normalized), Y: angular position, Z: vertical distance from disc\n\n@group(0) @binding(0) var noiseSampler: sampler;\n@group(0) @binding(1) var noiseTexture: texture_2d<f32>;\n@group(0) @binding(2) var outputTexture: texture_storage_3d<rgba16float, write>;\n\noverride NOISE_TYPE: u32;  // 1 for noise1 (4 octaves), 2 for noise2 (6 octaves)\n\n// Simplified noise function that matches the original\nfn noise(x: vec3<f32>) -> f32 {\n  let p = floor(x);\n  let f = fract(x);\n  let ff = f * f * (3.0 - 2.0 * f);\n  let uv = (p.xy + vec2<f32>(37.0, 17.0) * p.z) + ff.xy;\n  let rg = textureSampleLevel(noiseTexture, noiseSampler, (uv + 0.5) / 256.0, 0.0).yx;\n  return -1.0 + 2.0 * mix(rg.x, rg.y, ff.z);\n}\n\n@compute @workgroup_size(8, 8, 4)\nfn main(@builtin(global_invocation_id) gid: vec3<u32>) {\n  let dims = textureDimensions(outputTexture);\n  if (gid.x >= dims.x || gid.y >= dims.y || gid.z >= dims.z) { return; }\n\n  // Convert to normalized coordinates\n  let coord = vec3<f32>(gid) / vec3<f32>(dims);\n  \n  // Map coordinates to physical space\n  // X: radial distance (0 to ~8 to cover disc inner/outer with margin)\n  // Y: angular position (0 to 2π)\n  // Z: vertical distance (-2 to 2 to cover disc thickness with margin)\n  var radialCoords: vec3<f32>;\n  radialCoords.x = coord.x * 8.0;  // Maps to distance range\n  radialCoords.y = coord.y * 6.28318530718;  // Maps to 0-2π\n  radialCoords.z = (coord.z - 0.5) * 4.0;  // Maps to -2 to 2\n  \n  // Scale the coordinates as done in original shader\n  radialCoords *= 0.95;\n  \n  var result = 1.0;\n  \n  if (NOISE_TYPE == 1u) {\n    // noise1: 4 octaves (scales 3, 6, 12, 24)\n    var rc = radialCoords;\n    result *= noise(rc * 3.0) * 0.5 + 0.5;\n    result *= noise(rc * 6.0) * 0.5 + 0.5;\n    result *= noise(rc * 12.0) * 0.5 + 0.5;\n    result *= noise(rc * 24.0) * 0.5 + 0.5;\n  } else if (NOISE_TYPE == 2u) {\n    // noise2: 6 octaves (scales 3, 6, 12, 24, 48, 92) with offset\n    result = 2.0;  // Start with 2.0 as in original\n    var rc = radialCoords + 30.0;  // Apply offset as in original\n    result *= noise(rc * 3.0) * 0.5 + 0.5;\n    result *= noise(rc * 6.0) * 0.5 + 0.5;\n    result *= noise(rc * 12.0) * 0.5 + 0.5;\n    result *= noise(rc * 24.0) * 0.5 + 0.5;\n    result *= noise(rc * 48.0) * 0.5 + 0.5;\n    result *= noise(rc * 92.0) * 0.5 + 0.5;\n  }\n  \n  // Store result in all channels (we only need one channel but RGBA is standard)\n  textureStore(outputTexture, gid, vec4<f32>(result, result, result, 1.0));\n}\n");

/***/ }),

/***/ "./src/shaders/compute/noise.comp.wgsl":
/*!*********************************************!*\
  !*** ./src/shaders/compute/noise.comp.wgsl ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ("// Noise texture generation compute shader\n// Generates 256x256 RGBA noise texture for use in fragment shaders\n\n// Improved integer hash -> [0,1)  (based on PCG hash)\nfn pcg_hash(input: u32) -> u32 {\n    var state = input * 747796405u + 2891336453u;\n    var word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;\n    return (word >> 22u) ^ word;\n}\n\n// Multi-dimensional hash for better distribution\nfn hash2(p: vec2<u32>) -> f32 {\n    // Combine two dimensions with different large primes\n    let n = p.x * 1597334677u + p.y * 3812015801u;\n    return f32(pcg_hash(n)) * (1.0 / 4294967295.0);\n}\n\nfn hash3(p: vec3<u32>) -> f32 {\n    // Combine three dimensions\n    let n = p.x * 1597334677u + p.y * 3812015801u + p.z * 2922600713u;\n    return f32(pcg_hash(n)) * (1.0 / 4294967295.0);\n}\n\nstruct NoiseTexture {\n    data: array<vec4<f32>>,\n};\n\n@group(0) @binding(0) var<storage, read_write> noiseTexture: NoiseTexture;\n\n@compute @workgroup_size(16, 16)\nfn main(@builtin(global_invocation_id) gid: vec3<u32>) {\n    let width = 256u;\n    let height = 256u;\n\n    if (gid.x >= width || gid.y >= height) {\n        return;\n    }\n\n    let index = gid.y * width + gid.x;\n\n    // Generate random RGBA values using the position as seed\n    let r = hash3(vec3<u32>(gid.x, gid.y, 0u));\n    let g = hash3(vec3<u32>(gid.x, gid.y, 1u));\n    let b = hash3(vec3<u32>(gid.x, gid.y, 2u));\n    let a = 1.0; // Always fully opaque\n\n    noiseTexture.data[index] = vec4<f32>(r, g, b, a);\n}\n");

/***/ }),

/***/ "./src/shaders/compute/procedural.comp.wgsl":
/*!**************************************************!*\
  !*** ./src/shaders/compute/procedural.comp.wgsl ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ("// Procedural texture generation compute shader\n// Generates 512x512 RGBA fractal noise texture using FBM\n\n// Improved integer hash -> [0,1)  (based on PCG hash)\nfn pcg_hash(input: u32) -> u32 {\n    var state = input * 747796405u + 2891336453u;\n    var word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;\n    return (word >> 22u) ^ word;\n}\n\n// Multi-dimensional hash for better distribution\nfn hash2(p: vec2<u32>) -> f32 {\n    // Combine two dimensions with different large primes\n    let n = p.x * 1597334677u + p.y * 3812015801u;\n    return f32(pcg_hash(n)) * (1.0 / 4294967295.0);\n}\n\nfn hash3(p: vec3<u32>) -> f32 {\n    // Combine three dimensions\n    let n = p.x * 1597334677u + p.y * 3812015801u + p.z * 2922600713u;\n    return f32(pcg_hash(n)) * (1.0 / 4294967295.0);\n}\n\n// Noise function using hash - matches CPU implementation\nfn noise(x: f32, y: f32) -> f32 {\n    // Use sin-based noise to match the original CPU implementation\n    let n = sin(x * 12.9898 + y * 78.233) * 43758.5453;\n    return fract(n);\n}\n\n// Fractal Brownian Motion (FBM)\nfn fbm(x: f32, y: f32) -> f32 {\n    var value = 0.0;\n    var amplitude = 0.5;\n    var frequency = 1.0;\n\n    for (var i = 0; i < 4; i++) {\n        value += amplitude * noise(x * frequency, y * frequency);\n        frequency *= 2.0;\n        amplitude *= 0.5;\n    }\n    return value;\n}\n\n// Cubic interpolation helper\nfn cubic(x: f32, a: f32, b: f32, c: f32, d: f32) -> f32 {\n    return a * pow(x, 3.0) + b * pow(x, 2.0) + c * x + d;\n}\n\n// DO NOT CHANGE - IT'S FINELY TUNED AND PURPOSEFULLY INACCURATE (from galaxy simulator)\nfn colorFromTemperature(kelvin: f32) -> vec3<f32> {\n    let k = clamp(kelvin, params.minColorTemperature, params.maxColorTemperature);\n    let percent = (k - params.minColorTemperature) / (params.maxColorTemperature - params.minColorTemperature);\n    var r = 0.0;\n    var g = 0.0;\n    var b = 0.0;\n    if (percent <= 0.615) {\n        r = 1.0;\n        g = cubic(percent, 0.1597, -1.575, 2.46, -0.01768);\n        b = cubic(percent, -4.729, 6.219, -0.4015, -0.0143);\n    } else {\n        r = cubic(percent, -3.19, 9.571, -10.14, 4.36);\n        g = cubic(percent, -1.483, 4.582, -5.094, 2.687);\n        b = 1.0;\n    }\n    return vec3<f32>(r, g, b);\n}\n\nstruct ProceduralTexture {\n    data: array<vec4<f32>>,\n};\n\nstruct ProceduralParams {\n    baseTemperature: f32,\n    temperatureRadiusFactor: f32,\n    minColorTemperature: f32,\n    maxColorTemperature: f32,\n};\n\n@group(0) @binding(0) var<storage, read_write> proceduralTexture: ProceduralTexture;\n@group(0) @binding(1) var<uniform> params: ProceduralParams;\n\n@compute @workgroup_size(16, 16)\nfn main(@builtin(global_invocation_id) gid: vec3<u32>) {\n    let width = 512u;\n    let height = 512u;\n\n    if (gid.x >= width || gid.y >= height) {\n        return;\n    }\n\n    let index = gid.y * width + gid.x;\n\n    // Normalize coordinates to [0, 1]\n    let fx = f32(gid.x) / f32(width);\n    let fy = f32(gid.y) / f32(height);\n\n    // Calculate radius from center (0.0 to ~0.707 for corners)\n    let centerX = fx - 0.5;\n    let centerY = fy - 0.5;\n    let radius = sqrt(centerX * centerX + centerY * centerY);\n\n    // Generate FBM noise\n    let val = fbm(fx * 4.0, fy * 4.0);\n\n    // Apply brightness scaling with a minimum floor to prevent pure black\n    let brightness = clamp(val * 0.6 + 0.2, 0.0, 1.0);\n\n    // Calculate temperature based on radius (like galaxy particles)\n    // Farther from center = hotter (matching accretion disc physics)\n    let temperature = params.baseTemperature + radius * params.temperatureRadiusFactor;\n\n    // Get temperature-based color\n    let tempColor = colorFromTemperature(temperature);\n\n    // Multiply temperature color by brightness to create the final texture\n    // Add small base to prevent complete darkness\n    let r = clamp(brightness * tempColor.r + 0.01, 0.0, 1.0);\n    let g = clamp(brightness * tempColor.g + 0.01, 0.0, 1.0);\n    let b = clamp(brightness * tempColor.b + 0.01, 0.0, 1.0);\n    let a = 1.0; // Always fully opaque\n\n    proceduralTexture.data[index] = vec4<f32>(r, g, b, a);\n}\n");

/***/ }),

/***/ "./src/shaders/fullscreen.vert.wgsl":
/*!******************************************!*\
  !*** ./src/shaders/fullscreen.vert.wgsl ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ("struct VertexOutput {\n  @builtin(position) position: vec4<f32>,\n  @location(0) uv: vec2<f32>,\n}\n\n@vertex\nfn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {\n  var output: VertexOutput;\n  \n  // Generate fullscreen triangle\n  let x = f32((vertexIndex << 1u) & 2u);\n  let y = f32(vertexIndex & 2u);\n  \n  output.position = vec4<f32>(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);\n  output.uv = vec2<f32>(x, 1.0 - y);  // Restore original UV mapping\n  \n  return output;\n}\n\n");

/***/ }),

/***/ "./src/shaders/postprocessing/bloom.blur.frag.wgsl":
/*!*********************************************************!*\
  !*** ./src/shaders/postprocessing/bloom.blur.frag.wgsl ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ("// High-quality bloom blur shader\n// Uses a larger kernel with smoother falloff to avoid artifacts\n\n@group(0) @binding(0) var samp: sampler;\n@group(0) @binding(1) var inputTex: texture_2d<f32>;\n\nstruct BlurParams {\n    horizontal: f32,  // 1.0 for horizontal pass, 0.0 for vertical\n    _padding1: f32,\n    _padding2: f32,\n    _padding3: f32,\n}\n@group(0) @binding(2) var<uniform> params: BlurParams;\n\nstruct FragmentInput {\n    @location(0) uv: vec2<f32>,\n}\n\nfn gaussian(x: f32, sigma: f32) -> f32 {\n    return exp(-(x * x) / (2.0 * sigma * sigma));\n}\n\n@fragment\nfn main(input: FragmentInput) -> @location(0) vec4<f32> {\n    let texDimensions = vec2<f32>(textureDimensions(inputTex, 0));\n    let texelSize = 1.0 / texDimensions;\n    \n    var blurDirection: vec2<f32>;\n    if (params.horizontal > 0.5) {\n        blurDirection = vec2<f32>(1.0, 0.0);\n    } else {\n        blurDirection = vec2<f32>(0.0, 1.0);\n    }\n    \n    let sigma = 4.0;  // Standard deviation for Gaussian\n    let kernelRadius = 12;  // Number of samples on each side\n    \n    var color = vec3<f32>(0.0);\n    var weightSum = 0.0;\n    \n    for (var i = -kernelRadius; i <= kernelRadius; i++) {\n        let weight = gaussian(f32(i), sigma);\n        let offset = blurDirection * texelSize * f32(i) * 1.5;  // 1.5x spacing for wider blur\n        \n        color += textureSample(inputTex, samp, input.uv + offset).rgb * weight;\n        weightSum += weight;\n    }\n    \n    color = color / weightSum;\n    \n    return vec4<f32>(color, 1.0);\n}\n\n");

/***/ }),

/***/ "./src/shaders/postprocessing/bloom.extract.frag.wgsl":
/*!************************************************************!*\
  !*** ./src/shaders/postprocessing/bloom.extract.frag.wgsl ***!
  \************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ("// Bloom extraction shader - extracts bright pixels for bloom effect\n\n@group(0) @binding(0) var samp: sampler;\n@group(0) @binding(1) var inputTex: texture_2d<f32>;\n\nstruct BloomParams {\n    threshold: f32,\n    _padding1: f32,\n    _padding2: f32,\n    _padding3: f32,\n}\n@group(0) @binding(2) var<uniform> params: BloomParams;\n\nstruct FragmentInput {\n    @location(0) uv: vec2<f32>,\n}\n\n// Soft thresholding function for smoother bloom\nfn softThreshold(color: vec3<f32>, threshold: f32) -> vec3<f32> {\n    let brightness = max(color.r, max(color.g, color.b));\n    \n    // Only extract values above threshold\n    if (brightness < threshold) {\n        return vec3<f32>(0.0);\n    }\n    \n    // Smooth falloff from threshold\n    let soft = smoothstep(threshold, threshold * 2.0, brightness);\n    \n    // Return the color scaled by the soft threshold\n    // Clamp to prevent extreme values\n    return min(color * soft, vec3<f32>(10.0));\n}\n\n@fragment\nfn main(input: FragmentInput) -> @location(0) vec4<f32> {\n    let color = textureSample(inputTex, samp, input.uv).rgb;\n    \n    // Clamp input to reasonable range to prevent overflow\n    let clampedColor = min(color, vec3<f32>(100.0));\n    \n    // Apply soft threshold\n    let bloom = softThreshold(clampedColor, params.threshold);\n    \n    // Subtle enhancement without overflow\n    let luminance = dot(bloom, vec3<f32>(0.2126, 0.7152, 0.0722));\n    let enhancement = 1.0 + min(luminance * 0.2, 1.0);\n    let enhancedBloom = bloom * enhancement;\n    \n    // Final clamp to prevent any overflow\n    return vec4<f32>(min(enhancedBloom, vec3<f32>(10.0)), 1.0);\n}\n\n");

/***/ }),

/***/ "./src/shaders/postprocessing/colorize.frag.wgsl":
/*!*******************************************************!*\
  !*** ./src/shaders/postprocessing/colorize.frag.wgsl ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ("// Colorization shader - converts grayscale intensity to custom colors\n\nstruct ColorizeParams {\n  // Core colors\n  centerColor: vec3<f32>,\n  _padding1: f32,\n  discInnerColor: vec3<f32>,\n  _padding2: f32,\n  discOuterColor: vec3<f32>,\n  _padding3: f32,\n  backgroundTint: vec3<f32>,\n  _padding4: f32,\n  \n  // Transition controls\n  whitePoint: f32, // Intensity where color becomes white (0.0-1.0)\n  blackPoint: f32, // Intensity where color becomes black (0.0-1.0)\n  transparencyStart: f32, // Radial position where transparency begins (0.0-1.0)\n  transparencyEnd: f32, // Radial position of full transparency (0.0-1.0)\n  colorIntensity: f32, // Overall intensity multiplier to prevent blown-out colors\n}\n\n@group(0) @binding(0) var samp: sampler;\n@group(0) @binding(1) var grayscaleTex: texture_2d<f32>;\n@group(0) @binding(2) var<uniform> params: ColorizeParams;\n\nstruct FragmentInput {\n  @location(0) uv: vec2<f32>,\n}\n\nfn smootherstep(edge0: f32, edge1: f32, x: f32) -> f32 {\n  let t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);\n  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);\n}\n\n@fragment\nfn main(input: FragmentInput) -> @location(0) vec4<f32> {\n  // Sample the tone-mapped grayscale - already in 0-1 range\n  let toneMappedGray = textureSample(grayscaleTex, samp, input.uv).rgb;\n  \n  // Use the luminance of the tone-mapped value\n  let intensity = dot(toneMappedGray, vec3<f32>(0.2126, 0.7152, 0.0722));\n  \n  // Apply intensity scaling for overall brightness control\n  let scaledIntensity = intensity * params.colorIntensity;\n  \n  // For color selection, use the intensity directly (already normalized by tone mapping)\n  let colorSelector = smootherstep(params.blackPoint, params.whitePoint, scaledIntensity);\n  \n  // Select color based on intensity zones\n  var tintColor: vec3<f32>;\n  \n  if (colorSelector > 0.85) {\n    // Very hot center - trend toward white\n    let t = smootherstep(0.85, 1.0, colorSelector);\n    tintColor = mix(params.centerColor, vec3<f32>(1.0), t);\n  } else if (colorSelector > 0.4) {\n    // Inner disc to center transition\n    let t = smootherstep(0.4, 0.85, colorSelector);\n    tintColor = mix(params.discInnerColor, params.centerColor, t);\n  } else if (colorSelector > 0.1) {\n    // Outer disc to inner disc transition\n    let t = smootherstep(0.1, 0.4, colorSelector);\n    tintColor = mix(params.discOuterColor, params.discInnerColor, t);\n  } else {\n    // Fade to black for very low intensities\n    let t = smootherstep(0.0, 0.1, colorSelector);\n    tintColor = params.discOuterColor * t;\n  }\n  \n  // Since we're working with tone-mapped values, we want to preserve\n  // the luminance while applying the color tint\n  var finalColor = tintColor * scaledIntensity;\n  \n  // Add subtle background tint only if there's some intensity\n  if (scaledIntensity > 0.001 && scaledIntensity < 0.05) {\n    let tintStrength = scaledIntensity / 0.05;\n    finalColor += params.backgroundTint * tintStrength * 0.02;\n  }\n  \n  return vec4<f32>(finalColor, 1.0);\n}\n");

/***/ }),

/***/ "./src/shaders/postprocessing/passthrough.frag.wgsl":
/*!**********************************************************!*\
  !*** ./src/shaders/postprocessing/passthrough.frag.wgsl ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ("// Simple pass-through shader to copy from HDR texture to canvas\n\n@group(0) @binding(0) var samp: sampler;\n@group(0) @binding(1) var inputTex: texture_2d<f32>;\n\nstruct FragmentInput {\n  @location(0) uv: vec2<f32>,\n}\n\n@fragment\nfn main(input: FragmentInput) -> @location(0) vec4<f32> {\n  // Simply pass through the color from the input texture\n  let color = textureSample(inputTex, samp, input.uv).rgb;\n  return vec4<f32>(color, 1.0);\n}\n");

/***/ }),

/***/ "./src/shaders/postprocessing/tonemap.frag.wgsl":
/*!******************************************************!*\
  !*** ./src/shaders/postprocessing/tonemap.frag.wgsl ***!
  \******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ("// Tone mapping and bloom combination shader\n\n@group(0) @binding(0) var samp : sampler;\n@group(0) @binding(1) var hdrTex : texture_2d<f32>;\n@group(0) @binding(3) var bloomTex : texture_2d<f32>;\n\nstruct ToneParams {\n    exposure: f32,\n    saturation: f32,\n    bloomIntensity: f32,\n    shadowLift: f32,\n    minLiftThreshold: f32,\n    toneMapToe: f32,\n    toneMapHighlights: f32,\n    toneMapMidtones: f32,\n    toneMapShoulder: f32,\n}\n@group(0) @binding(2) var<uniform> params: ToneParams;\n\n// Convert RGB to HSV\nfn rgb2hsv(c: vec3<f32>) -> vec3<f32> {\n    let K = vec4<f32>(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\n    let p = mix(vec4<f32>(c.bg, K.wz), vec4<f32>(c.gb, K.xy), step(c.b, c.g));\n    let q = mix(vec4<f32>(p.xyw, c.r), vec4<f32>(c.r, p.yzx), step(p.x, c.r));\n    let d = q.x - min(q.w, q.y);\n    let e = 1.0e-10;\n    return vec3<f32>(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\n\n// Convert HSV to RGB\nfn hsv2rgb(c: vec3<f32>) -> vec3<f32> {\n    let K = vec4<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\n    let p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\n    return c.z * mix(K.xxx, clamp(p - K.xxx, vec3<f32>(0.0), vec3<f32>(1.0)), c.y);\n}\n\n// Safe screen blend mode that prevents overflow\nfn screenBlend(base: vec3<f32>, blend: vec3<f32>) -> vec3<f32> {\n    // Clamp inputs to prevent extreme values\n    let safeBase = clamp(base, vec3<f32>(0.0), vec3<f32>(10.0));\n    let safeBlend = clamp(blend, vec3<f32>(0.0), vec3<f32>(1.0));\n    return 1.0 - (1.0 - safeBase) * (1.0 - safeBlend);\n}\n\n// Enhanced ACES tone mapping with user-controllable curve parameters\nfn acesToneMapping(color: vec3<f32>, toeAmount: f32, highlights: f32, midtones: f32, shoulder: f32) -> vec3<f32> {\n    // Standard ACES constants\n    let baseA = 2.51;\n    let baseB = 0.03;\n    let baseC = 2.43;\n    let baseD = 0.59;\n    let baseE = 0.14;\n    \n    // Adjust parameters based on user controls\n    // highlights controls the shoulder rolloff (a and c parameters)\n    let a = baseA * highlights;\n    let c = baseC * highlights;\n    \n    // midtones controls the overall curve shape (d parameter)\n    let d = baseD * midtones;\n    \n    // toeAmount controls shadow lifting (b and e parameters)\n    let adjustedB = baseB + toeAmount * 0.1;\n    let adjustedE = baseE - toeAmount * 0.05;\n    \n    // Apply modified ACES curve\n    let mapped = (color * (a * color + adjustedB)) / (color * (c * color + d) + adjustedE);\n    \n    // shoulder controls the highlight preservation boost\n    let boostStrength = 0.1 * shoulder;\n    let boost = 1.0 + boostStrength * smoothstep(vec3<f32>(0.8), vec3<f32>(1.0), mapped);\n    \n    return clamp(mapped * boost, vec3<f32>(0.0), vec3<f32>(1.0));\n}\n\nstruct FragmentInput {\n    @location(0) uv: vec2<f32>,\n}\n\n@fragment\nfn main(input: FragmentInput) -> @location(0) vec4<f32> {\n    var color = textureSample(hdrTex, samp, input.uv).rgb;\n    let bloom = textureSample(bloomTex, samp, input.uv).rgb;\n    \n    // Apply exposure first to preserve HDR range\n    color *= params.exposure;\n    \n    // Add bloom\n    color += bloom * params.bloomIntensity;\n    \n    // Ensure no negative values\n    color = max(color, vec3<f32>(0.0));\n    \n    // Prevent color channel overflow by keeping relative ratios\n    // This prevents red from overflowing into purple/white\n    let maxChannel = max(color.r, max(color.g, color.b));\n    if (maxChannel > 10.0) {\n        // Scale all channels proportionally to prevent color shift\n        color = color * (10.0 / maxChannel);\n    }\n    \n    // Apply tone mapping\n    var mappedColor = acesToneMapping(color, params.toneMapToe, params.toneMapHighlights, params.toneMapMidtones, params.toneMapShoulder);\n    \n    // Apply saturation adjustment AFTER tone mapping\n    // This prevents color shifts during HDR processing\n    if (params.saturation != 1.0) {\n        let luminance = dot(mappedColor, vec3<f32>(0.2126, 0.7152, 0.0722));\n        mappedColor = mix(vec3<f32>(luminance), mappedColor, params.saturation);\n    }\n    \n    // Apply shadow lift to brighten darker areas\n    if (params.shadowLift > 0.0) {\n        // Calculate how much to lift based on how dark the pixel is\n        let luminance = dot(mappedColor, vec3<f32>(0.2126, 0.7152, 0.0722));\n        \n        // Only lift pixels that are above a minimum threshold (not pure black)\n        // This prevents lifting the background space\n        if (luminance > params.minLiftThreshold) {\n            let liftAmount = params.shadowLift * (1.0 - luminance);\n            mappedColor = min(mappedColor + liftAmount, vec3<f32>(1.0));\n        }\n    }\n    \n    // Final safety clamp\n    mappedColor = clamp(mappedColor, vec3<f32>(0.0), vec3<f32>(1.0));\n    \n    return vec4<f32>(mappedColor, 1.0);\n}\n\n");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _BlackholeSimulator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./BlackholeSimulator */ "./src/BlackholeSimulator.ts");

async function main() {
    try {
        await _BlackholeSimulator__WEBPACK_IMPORTED_MODULE_0__.BlackholeSimulator.start("cvBlackhole");
    }
    catch (err) {
        displayError(err);
    }
}
function displayError(err) {
    const errorElement = document.createElement("pre");
    errorElement.style.color = "red";
    errorElement.style.backgroundColor = "#330000";
    errorElement.style.border = "2px solid red";
    errorElement.style.padding = "20px";
    errorElement.style.margin = "50px 20px 20px 20px";
    errorElement.style.fontSize = "14pt";
    errorElement.style.fontFamily = "monospace";
    errorElement.style.zIndex = "999";
    errorElement.style.position = "relative";
    errorElement.textContent = err.message
        ? `Error: ${err.message}`
        : "An unknown error occurred";
    const container = document.body;
    if (!!container) {
        container.insertBefore(errorElement, container.firstChild);
    }
    else {
        alert(err.message ? `Error: ${err.message}` : "An unknown error occurred");
    }
    console.error(err);
}
document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", main)
    : main();

})();

BlackholeSimulator = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=blackhole-simulator-bundle.js.map
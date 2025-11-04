export interface BlackholeCallbacks {
  onParametersChanged?: () => void;
  onToneParametersChanged?: () => void;
  onBloomParametersChanged?: () => void;
  onTemperatureChanged?: () => void;
}

export class Blackhole {
  // Core parameters
  time: number = 0;
  maxFrameRate: number = 0;
  animationSpeed: number = 0;

  // Camera parameters
  cameraRotationX: number = 0;
  cameraRotationY: number = 0;
  cameraPanX: number = 0;
  cameraPanY: number = 0;

  // Black hole rotation (degrees)
  blackHoleRotationX: number = 0;
  blackHoleRotationY: number = 0;
  blackHoleRotationZ: number = 0;

  // Raymarching parameters
  iterations: number = 0;
  enableTemporalAA: boolean = false;
  temporalAAFrames: number = 0;
  warpAmount: number = 0;
  brightnessFactor: number = 0;

  // Accretion disc parameters
  discRadius: number = 0;
  discWidth: number = 0;
  discThickness: number = 0;
  discSpeed: number = 0;
  discBrightness: number = 0;
  discTemperature: number = 0;
  discTemperatureRadiusFactor: number = 0;
  discMinColorTemperature: number = 0;
  discMaxColorTemperature: number = 0;
  discInnerFalloff: number = 0;
  discOuterFalloff: number = 0;
  discTexturePower: number = 0;
  discMinCoverage: number = 0;
  discOuterTransparency: number = 0;
  hazeIntensity: number = 0;
  temporalMouseThreshold: number = 0;

  // Adaptive step scaling parameters
  stepMinScale: number = 0;
  stepMaxScale: number = 0;
  stepNearFactor: number = 0;
  stepFarFactor: number = 0;

  // HDR and Bloom parameters
  exposure: number = 0;
  saturation: number = 0;
  bloomIntensity: number = 0;
  bloomThreshold: number = 0;
  shadowLift: number = 0;
  minLiftThreshold: number = 0;
  toneMapToe: number = 0;
  toneMapHighlights: number = 0;
  toneMapMidtones: number = 0;
  toneMapShoulder: number = 0;

  // Color control parameters
  enableColorization: boolean = true; // Toggle colorization pass
  centerColor: [number, number, number] = [1, 1, 1];
  discInnerColor: [number, number, number] = [1, 0.9, 0.7];
  discOuterColor: [number, number, number] = [1, 0.6, 0.3];
  backgroundTint: [number, number, number] = [0, 0, 0];
  whitePoint: number = 0.8;
  blackPoint: number = 0.02;
  transparencyStart: number = 1.5;
  transparencyEnd: number = 2.0;
  colorIntensity: number = 1.0; // Overall color intensity multiplier
  // Palette transition thresholds (0..1 along disc outer->inner proximity)
  colorOuterToInnerPoint: number = 0.4;
  colorInnerToCenterPoint: number = 0.85;

  private callbacks: BlackholeCallbacks;

  constructor(
    props: Partial<Blackhole> = {},
    callbacks: BlackholeCallbacks = {}
  ) {
    Object.assign(this, DEFAULT_BLACKHOLE_VALUES, props);
    this.callbacks = callbacks;
  }

  advanceTime(deltaTime: number) {
    const timeScale = 0.06;
    this.time += deltaTime * timeScale;
  }

  setTime(timeInSeconds: number) {
    this.time = timeInSeconds;
  }

  setCameraRotationX(val: number) {
    this.cameraRotationX = val;
    this.callbacks.onParametersChanged?.();
  }

  setCameraRotationY(val: number) {
    this.cameraRotationY = val;
    this.callbacks.onParametersChanged?.();
  }

  setCameraPanX(val: number) {
    this.cameraPanX = val;
    this.callbacks.onParametersChanged?.();
  }

  setCameraPanY(val: number) {
    this.cameraPanY = val;
    this.callbacks.onParametersChanged?.();
  }

  setBlackHoleRotationX(val: number) {
    this.blackHoleRotationX = val; // val is in degrees
    this.callbacks.onParametersChanged?.();
  }

  setBlackHoleRotationY(val: number) {
    this.blackHoleRotationY = val; // val is in degrees
    this.callbacks.onParametersChanged?.();
  }

  setBlackHoleRotationZ(val: number) {
    this.blackHoleRotationZ = val; // val is in degrees
    this.callbacks.onParametersChanged?.();
  }

  setIterations(val: number) {
    this.iterations = val;
    this.callbacks.onParametersChanged?.();
  }

  setWarpAmount(val: number) {
    this.warpAmount = val;
    this.callbacks.onParametersChanged?.();
  }

  setBrightnessFactor(val: number) {
    this.brightnessFactor = val;
    this.callbacks.onParametersChanged?.();
  }

  setDiscRadius(val: number) {
    this.discRadius = val;
    this.callbacks.onParametersChanged?.();
  }

  setDiscWidth(val: number) {
    this.discWidth = val;
    this.callbacks.onParametersChanged?.();
  }

  setDiscSpeed(val: number) {
    this.discSpeed = val;
    this.callbacks.onParametersChanged?.();
  }

  setDiscBrightness(val: number) {
    this.discBrightness = val;
    this.callbacks.onParametersChanged?.();
  }

  setDiscTemperature(val: number) {
    this.discTemperature = val;
    this.callbacks.onParametersChanged?.();
    this.callbacks.onTemperatureChanged?.();
  }

  setDiscTemperatureRadiusFactor(val: number) {
    this.discTemperatureRadiusFactor = val;
    this.callbacks.onTemperatureChanged?.();
  }

  setDiscMinColorTemperature(val: number) {
    this.discMinColorTemperature = val;
    this.callbacks.onTemperatureChanged?.();
  }

  setDiscMaxColorTemperature(val: number) {
    this.discMaxColorTemperature = val;
    this.callbacks.onTemperatureChanged?.();
  }

  setDiscInnerFalloff(val: number) {
    this.discInnerFalloff = val;
    this.callbacks.onParametersChanged?.();
  }

  setDiscOuterFalloff(val: number) {
    this.discOuterFalloff = val;
    this.callbacks.onParametersChanged?.();
  }

  setDiscTexturePower(val: number) {
    this.discTexturePower = val;
    this.callbacks.onParametersChanged?.();
  }

  setDiscMinCoverage(val: number) {
    this.discMinCoverage = val;
    this.callbacks.onParametersChanged?.();
  }

  setDiscOuterTransparency(val: number) {
    this.discOuterTransparency = val;
    this.callbacks.onParametersChanged?.();
  }

  setStepMinScale(val: number) {
    this.stepMinScale = val;
    this.callbacks.onParametersChanged?.();
  }

  setStepMaxScale(val: number) {
    this.stepMaxScale = val;
    this.callbacks.onParametersChanged?.();
  }

  setStepNearFactor(val: number) {
    this.stepNearFactor = val;
    this.callbacks.onParametersChanged?.();
  }

  setStepFarFactor(val: number) {
    this.stepFarFactor = val;
    this.callbacks.onParametersChanged?.();
  }

  setMaxFrameRate(val: number) {
    this.maxFrameRate = Math.max(1, Math.min(120, val));
  }

  setAnimationSpeed(val: number) {
    this.animationSpeed = Math.max(0.0, Math.min(5.0, val));
  }

  setTemporalAAFrames(val: number) {
    this.temporalAAFrames = Math.max(1, Math.min(100, val));
    this.callbacks.onParametersChanged?.();
  }

  // Calculate temporal blend weight based on number of frames
  getTemporalBlendWeight(): number {
    // Convert frame count to blend weight: w = (frames - 1) / frames
    // This gives: 1 frame = 0.0, 2 frames = 0.5, 10 frames = 0.9, 100 frames = 0.99
    return this.temporalAAFrames > 1
      ? (this.temporalAAFrames - 1) / this.temporalAAFrames
      : 0.0;
  }

  setExposure(val: number) {
    this.exposure = val;
    this.callbacks.onToneParametersChanged?.();
  }

  setSaturation(val: number) {
    this.saturation = val;
    this.callbacks.onToneParametersChanged?.();
  }

  setBloomIntensity(val: number) {
    this.bloomIntensity = val;
    this.callbacks.onToneParametersChanged?.();
  }

  setBloomThreshold(val: number) {
    this.bloomThreshold = val;
    this.callbacks.onBloomParametersChanged?.();
  }

  setShadowLift(val: number) {
    this.shadowLift = val;
    this.callbacks.onToneParametersChanged?.();
  }

  setToneMapToe(val: number) {
    this.toneMapToe = val;
    this.callbacks.onToneParametersChanged?.();
  }

  setToneMapHighlights(val: number) {
    this.toneMapHighlights = val;
    this.callbacks.onToneParametersChanged?.();
  }

  setToneMapMidtones(val: number) {
    this.toneMapMidtones = val;
    this.callbacks.onToneParametersChanged?.();
  }

  setToneMapShoulder(val: number) {
    this.toneMapShoulder = val;
    this.callbacks.onToneParametersChanged?.();
  }

  // Color control setters
  setEnableColorization(val: boolean) {
    this.enableColorization = val;
    this.callbacks.onParametersChanged?.();
  }

  setCenterColor(r: number, g: number, b: number) {
    this.centerColor = [r, g, b];
    this.callbacks.onParametersChanged?.();
  }

  setDiscInnerColor(r: number, g: number, b: number) {
    this.discInnerColor = [r, g, b];
    this.callbacks.onParametersChanged?.();
  }

  setDiscOuterColor(r: number, g: number, b: number) {
    this.discOuterColor = [r, g, b];
    this.callbacks.onParametersChanged?.();
  }

  setBackgroundTint(r: number, g: number, b: number) {
    this.backgroundTint = [r, g, b];
    this.callbacks.onParametersChanged?.();
  }

  setWhitePoint(val: number) {
    this.whitePoint = val;
    this.callbacks.onParametersChanged?.();
  }

  setBlackPoint(val: number) {
    this.blackPoint = val;
    this.callbacks.onParametersChanged?.();
  }

  setTransparencyStart(val: number) {
    this.transparencyStart = val;
    this.callbacks.onParametersChanged?.();
  }

  setTransparencyEnd(val: number) {
    this.transparencyEnd = val;
    this.callbacks.onParametersChanged?.();
  }

  setColorIntensity(val: number) {
    this.colorIntensity = val;
    this.callbacks.onParametersChanged?.();
  }

  setColorOuterToInnerPoint(val: number) {
    this.colorOuterToInnerPoint = Math.max(0.0, Math.min(1.0, val));
    this.callbacks.onParametersChanged?.();
  }

  setColorInnerToCenterPoint(val: number) {
    this.colorInnerToCenterPoint = Math.max(0.0, Math.min(1.0, val));
    this.callbacks.onParametersChanged?.();
  }

  toGpuArray(): Float32Array {
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

export const DEFAULT_BLACKHOLE_VALUES = {
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
  iterations: 23,
  enableTemporalAA: true,
  temporalAAFrames: 2, // Number of frames to blend for temporal AA (6 frames = 83.3% history weight)
  warpAmount: 3.3,
  brightnessFactor: 151.0, // Back to original since we're preserving intensity better

  // Accretion disc parameters
  discRadius: 3.1,
  discWidth: 5.7,
  discThickness: 0.1,
  discSpeed: 0.06,
  discBrightness: 6.7, // Adjusted for post-tone-mapping colorization
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
  exposure: 0.3, // Balanced for natural intensity preservation
  saturation: 1.0,
  bloomIntensity: 0.15,
  bloomThreshold: 0.0,
  shadowLift: 0.0,
  minLiftThreshold: 0.0,
  toneMapToe: 0.0,
  toneMapHighlights: 1.0,
  toneMapMidtones: 1.0,
  toneMapShoulder: 1.0,

  // Color control parameters (default to classic yellow-white-orange scheme)
  enableColorization: false, // Enable colorization by default
  centerColor: [1.0, 1.0, 0.8] as [number, number, number], // Bright yellow-white
  discInnerColor: [1.0, 0.9, 0.5] as [number, number, number], // Yellow
  discOuterColor: [1.0, 0.5, 0.2] as [number, number, number], // Orange
  backgroundTint: [0.0, 0.0, 0.0] as [number, number, number], // Black space
  whitePoint: 0.8, // Adjusted for better range
  blackPoint: 0.02, // Lower threshold for better black preservation
  transparencyStart: 2.0, // Start fading at 2x radius
  transparencyEnd: 3.0, // Fully transparent at 3x radius
  colorIntensity: 1.0, // Start at 1.0 since we're not manipulating as much
  colorOuterToInnerPoint: 0.4,
  colorInnerToCenterPoint: 0.85,
};

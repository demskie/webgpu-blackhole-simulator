export interface BlackholeCallbacks {
  onParametersChanged?: () => void;
  onToneParametersChanged?: () => void;
  onBloomParametersChanged?: () => void;
  onTemperatureChanged?: () => void;
}

export class Blackhole {
  // Core parameters
  time: number = 0;
  maxFrameRate: number = 30;
  animationSpeed: number = 1.2;

  // Camera parameters (rotation angles for RotateCamera function)
  cameraRotationX: number = 0.5;
  cameraRotationY: number = 0.5;
  cameraPanX: number = 0.0; // Pan offset in normalized screen space
  cameraPanY: number = 0.0;

  // Black hole rotation in degrees
  blackHoleRotationX: number = -11.0;
  blackHoleRotationY: number = 12.0;
  blackHoleRotationZ: number = 20.0;

  // Raymarching parameters
  iterations: number = 21;
  enableTemporalAA: boolean = true;
  temporalAAFrames: number = 2; // Number of frames to blend for temporal AA (6 frames = 83.3% history weight)
  warpAmount: number = 3.3;
  brightnessFactor: number = 151.0; // Back to original since we're preserving intensity better

  // Accretion disc parameters
  discRadius: number = 3.1;
  discWidth: number = 5.7;
  discThickness: number = 0.02;
  discSpeed: number = 0.06;
  discBrightness: number = 7; // Adjusted for post-tone-mapping colorization
  discTemperature: number = 6000; // Base temperature in Kelvin
  discTemperatureRadiusFactor: number = 10000.0; // Temperature increase per unit radius
  discMinColorTemperature: number = 1000.0; // Min temperature for color mapping
  discMaxColorTemperature: number = 40000.0; // Max temperature for color mapping
  discInnerFalloff: number = 4.7;
  discOuterFalloff: number = 1.8;
  discTexturePower: number = 0.8; // Power applied to procedural texture (higher = darker edges)
  discMinCoverage: number = 0.0; // Min coverage to prevent outer edges going black
  discOuterTransparency: number = 0.0; // 0 = fully transparent outer edge, 1 = opaque
  discVerticalFalloff: number = 1.0; // Min vertical thickness at outer edge (0.0-1.0, higher = thicker clouds far from equator)
  hazeIntensity: number = 12;
  temporalMouseThreshold: number = 1.0;

  // Adaptive step scaling parameters
  stepMinScale: number = 0.35; // Min step scale (near black hole)
  stepMaxScale: number = 1.85; // Max step scale (far from black hole)
  stepNearFactor: number = 0.6; // Factor for near radius calculation
  stepFarFactor: number = 1.2; // Factor for far radius calculation

  // Event horizon rejection parameters (currently disabled - feature not working correctly)
  eventHorizonRadius: number = 0.15; // Radius at which rays are absorbed (smaller = less aggressive)
  enableEventHorizon: boolean = false; // Enable event horizon rejection

  // HDR and Bloom parameters
  exposure: number = 0.3; // Balanced for natural intensity preservation
  saturation: number = 1.0;
  bloomIntensity: number = 0.0;
  bloomThreshold: number = 0.0;
  shadowLift: number = 0.0;
  minLiftThreshold: number = 0.0;
  toneMapToe: number = 0.0;
  toneMapHighlights: number = 1.0;
  toneMapMidtones: number = 1.0;
  toneMapShoulder: number = 1.0;

  // Color control parameters
  enableColorization: boolean = false; // Enable colorization by default
  centerColor: [number, number, number] = [1.0, 1.0, 1.0];
  discInnerColor: [number, number, number] = [1.0, 1.0, 1.0];
  whitePoint: number = 0.8; // Adjusted for better range
  blackPoint: number = 0.02; // Lower threshold for better black preservation
  transparencyStart: number = 2.0; // Start fading at 2x radius
  transparencyEnd: number = 3.0; // Fully transparent at 3x radius
  colorIntensity: number = 1.0; // Start at 1.0 since we're not manipulating as much
  // Palette transition thresholds (0..1 along disc outer->inner proximity)
  colorOuterToInnerPoint: number = 0.4; // unused now; kept for compatibility
  colorInnerToCenterPoint: number = 0.87; // fade start (inner->center)
  colorFadeWidth: number = 1.0; // width of fade (how quickly colors transition)

  private callbacks: BlackholeCallbacks;

  constructor(
    props: Partial<Blackhole> = {},
    callbacks: BlackholeCallbacks = {}
  ) {
    Object.assign(this, props);
    this.callbacks = callbacks;
  }

  advanceTime(deltaTime: number) {
    // Delta time is expected in seconds, already scaled by animationSpeed
    this.time += deltaTime;
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

  setDiscThickness(val: number) {
    this.discThickness = val;
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

  setDiscVerticalFalloff(val: number) {
    this.discVerticalFalloff = Math.max(0.0, Math.min(1.0, val));
    this.callbacks.onParametersChanged?.();
  }

  setHazeIntensity(val: number) {
    this.hazeIntensity = val;
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

  setEventHorizonRadius(val: number) {
    this.eventHorizonRadius = Math.max(0.01, val);
    this.callbacks.onParametersChanged?.();
  }

  setEnableEventHorizon(val: boolean) {
    this.enableEventHorizon = val;
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

  setColorFadeWidth(val: number) {
    this.colorFadeWidth = Math.max(0.001, Math.min(1.0, val));
    this.callbacks.onParametersChanged?.();
  }
}

import { BlackholeSimulator } from "../BlackholeSimulator";
import { DEFAULT_BLACKHOLE_VALUES } from "../entities/Blackhole";

export class UIManager {
  private simulator: BlackholeSimulator;
  private mouse = { x: 0, y: 0, z: 0, w: 0 };
  private mouseDown = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartPanX = 0;
  private dragStartPanY = 0;

  constructor(simulator: BlackholeSimulator) {
    this.simulator = simulator;
    this.setupMouseControls();
    this.setupResponsiveCanvas();
    this.updateHTML();
    this.setupPerformanceDisplay();
  }

  private setupMouseControls() {
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

  private setupResponsiveCanvas() {
    const canvas = this.simulator.canvas;
    let currentSize = 0;
    let resizeAnimationId: number | null = null;

    const resizeCanvas = () => {
      const canvasContainer = canvas.parentElement;
      if (!canvasContainer) return;

      const containerSize = Math.min(
        canvasContainer.clientWidth,
        canvasContainer.clientHeight
      );
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

      if (
        this.simulator &&
        typeof this.simulator.resize === "function" &&
        size > 0
      ) {
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

  private updateHTML() {
    // Initialize sliders if they exist
    this.initializeSlider("slIterations", "labelIterations", "iterations");
    this.initializeSlider("slWarpAmount", "labelWarpAmount", "warpAmount");
    this.initializeSlider(
      "slBrightnessFactor",
      "labelBrightnessFactor",
      "brightnessFactor"
    );
    
    // Adaptive step scaling sliders
    this.initializeSlider(
      "slStepMinScale",
      "labelStepMinScale",
      "stepMinScale"
    );
    this.initializeSlider(
      "slStepMaxScale",
      "labelStepMaxScale",
      "stepMaxScale"
    );
    this.initializeSlider(
      "slStepNearFactor",
      "labelStepNearFactor",
      "stepNearFactor"
    );
    this.initializeSlider(
      "slStepFarFactor",
      "labelStepFarFactor",
      "stepFarFactor"
    );

    // Black Hole Rotation sliders (degrees)
    this.initializeRotationSlider(
      "slBlackholeRotationX",
      "labelBlackholeRotationX",
      "blackHoleRotationX"
    );
    this.initializeRotationSlider(
      "slBlackholeRotationY",
      "labelBlackholeRotationY",
      "blackHoleRotationY"
    );
    this.initializeRotationSlider(
      "slBlackholeRotationZ",
      "labelBlackholeRotationZ",
      "blackHoleRotationZ"
    );

    this.initializeSlider("slDiscRadius", "labelDiscRadius", "discRadius");
    this.initializeSlider("slDiscWidth", "labelDiscWidth", "discWidth");
    this.initializeSlider("slDiscSpeed", "labelDiscSpeed", "discSpeed");
    this.initializeSlider(
      "slDiscBrightness",
      "labelDiscBrightness",
      "discBrightness"
    );
    
    // Color controls
    this.initializeColorToggle();
    this.initializeColorPresets();
    this.initializeColorPicker("centerColor");
    this.initializeColorPicker("discInnerColor");
    this.initializeColorPicker("discOuterColor");
    this.initializeColorPicker("backgroundTint");
    
    // Transition controls
    this.initializeSlider(
      "slColorIntensity",
      "labelColorIntensity",
      "colorIntensity"
    );
    // Palette threshold controls
    this.initializeSlider(
      "slColorOuterToInnerPoint",
      "labelColorOuterToInnerPoint",
      "colorOuterToInnerPoint"
    );
    this.initializeSlider(
      "slColorInnerToCenterPoint",
      "labelColorInnerToCenterPoint",
      "colorInnerToCenterPoint"
    );
    this.initializeSlider(
      "slWhitePoint",
      "labelWhitePoint",
      "whitePoint"
    );
    this.initializeSlider(
      "slBlackPoint",
      "labelBlackPoint",
      "blackPoint"
    );
    this.initializeSlider(
      "slTransparencyStart",
      "labelTransparencyStart",
      "transparencyStart"
    );
    this.initializeSlider(
      "slTransparencyEnd",
      "labelTransparencyEnd",
      "transparencyEnd"
    );
    this.initializeSlider(
      "slDiscInnerFalloff",
      "labelDiscInnerFalloff",
      "discInnerFalloff"
    );
    this.initializeSlider(
      "slDiscOuterFalloff",
      "labelDiscOuterFalloff",
      "discOuterFalloff"
    );
    this.initializeSlider(
      "slDiscTexturePower",
      "labelDiscTexturePower",
      "discTexturePower"
    );
    this.initializeSlider(
      "slDiscMinCoverage",
      "labelDiscMinCoverage",
      "discMinCoverage"
    );
    this.initializeSlider(
      "slDiscOuterTransparency",
      "labelDiscOuterTransparency",
      "discOuterTransparency"
    );
    this.initializeSlider(
      "slMaxFrameRate",
      "labelMaxFrameRate",
      "maxFrameRate"
    );
    this.initializeSlider(
      "slAnimationSpeed",
      "labelAnimationSpeed",
      "animationSpeed"
    );
    this.initializeSlider(
      "slTemporalAAFrames",
      "labelTemporalAAFrames",
      "temporalAAFrames"
    );

    // HDR & Bloom sliders
    this.initializeSlider("slExposure", "labelExposure", "exposure");
    this.initializeSlider("slSaturation", "labelSaturation", "saturation");
    this.initializeSlider(
      "slBloomIntensity",
      "labelBloomIntensity",
      "bloomIntensity"
    );
    this.initializeSlider(
      "slBloomThreshold",
      "labelBloomThreshold",
      "bloomThreshold"
    );
    this.initializeSlider("slShadowLift", "labelShadowLift", "shadowLift");

    // Tone mapping sliders
    this.initializeSlider("slToneMapToe", "labelToneMapToe", "toneMapToe");
    this.initializeSlider(
      "slToneMapHighlights",
      "labelToneMapHighlights",
      "toneMapHighlights"
    );
    this.initializeSlider(
      "slToneMapMidtones",
      "labelToneMapMidtones",
      "toneMapMidtones"
    );
    this.initializeSlider(
      "slToneMapShoulder",
      "labelToneMapShoulder",
      "toneMapShoulder"
    );
  }

  private checkIfChanged(value: any, defaultValue: any): boolean {
    // For numbers, check with small tolerance
    if (typeof value === 'number' && typeof defaultValue === 'number') {
      return Math.abs(value - defaultValue) > 0.001;
    }
    // For arrays (colors), check each element
    if (Array.isArray(value) && Array.isArray(defaultValue)) {
      return value.some((v, i) => Math.abs(v - defaultValue[i]) > 0.001);
    }
    return value !== defaultValue;
  }

  private updateChangedClass(element: HTMLElement, prop: string, value: any) {
    // Find the parent div.slider, not the input.slider
    const container = element.closest('div.slider');
    if (!container) {
      return;
    }

    const defaultValue = (DEFAULT_BLACKHOLE_VALUES as any)[prop];
    if (defaultValue === undefined) {
      // Property might not have a default value (e.g., camera controls)
      return;
    }
    
    const hasChanged = this.checkIfChanged(value, defaultValue);
    
    if (hasChanged) {
      container.classList.add('changed');
    } else {
      container.classList.remove('changed');
    }
  }

  private initializeSlider(id: string, labelId: string, prop: string) {
    const slider = document.getElementById(id) as HTMLInputElement;
    if (!slider) return;

    const label = document.getElementById(labelId) as HTMLElement;
    if (!label) return;

    const currentValue = (this.simulator.blackHole as any)[prop];
    slider.value = String(currentValue);
    label.innerHTML = slider.value;

    // Check initial state
    this.updateChangedClass(slider, prop, currentValue);

    slider.oninput = () => {
      label.innerHTML = slider.value;
      const newValue = parseFloat(slider.value);
      const methodName = `set${prop.charAt(0).toUpperCase()}${prop.slice(1)}`;
      const method = (this.simulator.blackHole as any)[methodName];
      if (typeof method === "function") {
        method.call(this.simulator.blackHole, newValue);
      }
      // Update changed state
      this.updateChangedClass(slider, prop, newValue);
    };
  }

  private initializeRotationSlider(id: string, labelId: string, prop: string) {
    const slider = document.getElementById(id) as HTMLInputElement;
    if (!slider) return;

    const label = document.getElementById(labelId) as HTMLElement;
    if (!label) return;

    // Get the current value in degrees
    const degrees = Math.round((this.simulator.blackHole as any)[prop]);
    slider.value = degrees.toString();
    label.innerHTML = degrees.toString();

    // Check initial state
    this.updateChangedClass(slider, prop, degrees);

    slider.oninput = () => {
      const degrees = parseFloat(slider.value);
      label.innerHTML = Math.round(degrees).toString();

      const methodName = `set${prop.charAt(0).toUpperCase()}${prop.slice(1)}`;
      const method = (this.simulator.blackHole as any)[methodName];
      if (typeof method === "function") {
        method.call(this.simulator.blackHole, degrees);
      }
      // Update changed state
      this.updateChangedClass(slider, prop, degrees);
    };
  }

  private initializeColorToggle() {
    const checkbox = document.getElementById("cbEnableColorization") as HTMLInputElement;
    if (!checkbox) return;
    
    // Set initial state
    checkbox.checked = this.simulator.blackHole.enableColorization;
    
    // Check if it's changed from default value
    const container = checkbox.closest('div.slider');
    if (container) {
      const hasChanged = this.checkIfChanged(
        this.simulator.blackHole.enableColorization, 
        DEFAULT_BLACKHOLE_VALUES.enableColorization
      );
      if (hasChanged) {
        container.classList.add('changed');
      }
    }
    
    // Handle checkbox changes
    checkbox.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      this.simulator.blackHole.setEnableColorization(target.checked);
      
      // Update changed state
      const container = checkbox.closest('div.slider');
      if (container) {
        const hasChanged = this.checkIfChanged(
          target.checked, 
          DEFAULT_BLACKHOLE_VALUES.enableColorization
        );
        if (hasChanged) {
          container.classList.add('changed');
        } else {
          container.classList.remove('changed');
        }
      }
      
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
        "slColorOuterToInnerPoint",
        "slColorInnerToCenterPoint",
        "slWhitePoint",
        "slBlackPoint"
      ];
      
      colorControls.forEach(id => {
        const element = document.getElementById(id) as HTMLInputElement | HTMLButtonElement | HTMLSelectElement;
        if (element) {
          element.disabled = !target.checked;
          element.style.opacity = target.checked ? "1" : "0.5";
        }
      });
    });
  }

  private initializeColorPresets() {
    const presetSelect = document.getElementById("colorPreset") as HTMLSelectElement;
    if (!presetSelect) return;

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
      const target = e.target as HTMLSelectElement;
      const presetName = target.value;
      
      if (presetName === "custom") {
        // Don't change colors for custom preset
        return;
      }
      
      const preset = presets[presetName as keyof typeof presets];
      if (preset) {
        // Apply all colors from the preset
        this.simulator.blackHole.setCenterColor(...(preset.centerColor as [number, number, number]));
        this.simulator.blackHole.setDiscInnerColor(...(preset.discInnerColor as [number, number, number]));
        this.simulator.blackHole.setDiscOuterColor(...(preset.discOuterColor as [number, number, number]));
        this.simulator.blackHole.setBackgroundTint(...(preset.backgroundTint as [number, number, number]));
        
        // Update color pickers to match
        const rgbToHex = (rgb: number[]) => {
          const toHex = (val: number) => {
            const hex = Math.round(val * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          };
          return '#' + toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]);
        };
        
        const centerPicker = document.getElementById("centerColor") as HTMLInputElement;
        const innerPicker = document.getElementById("discInnerColor") as HTMLInputElement;
        const outerPicker = document.getElementById("discOuterColor") as HTMLInputElement;
        const bgPicker = document.getElementById("backgroundTint") as HTMLInputElement;
        
        if (centerPicker) centerPicker.value = rgbToHex(preset.centerColor);
        if (innerPicker) innerPicker.value = rgbToHex(preset.discInnerColor);
        if (outerPicker) outerPicker.value = rgbToHex(preset.discOuterColor);
        if (bgPicker) bgPicker.value = rgbToHex(preset.backgroundTint);
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

  private initializeColorPicker(id: string) {
    const colorPicker = document.getElementById(id) as HTMLInputElement;
    const resetButton = document.getElementById(`reset${id.charAt(0).toUpperCase() + id.slice(1)}`) as HTMLButtonElement;
    
    if (!colorPicker) return;
    
    // Get the property name from the ID
    const propertyName = id as keyof typeof this.simulator.blackHole;
    
    // Convert RGB array to hex color
    const rgbToHex = (rgb: [number, number, number]) => {
      const toHex = (val: number) => {
        const hex = Math.round(val * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };
      return '#' + toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]);
    };
    
    // Set initial value
    const initialValue = this.simulator.blackHole[propertyName] as [number, number, number];
    colorPicker.value = rgbToHex(initialValue);
    
    // Check initial state
    this.updateChangedClass(colorPicker, id, initialValue);
    
    // Handle color changes
    colorPicker.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const hex = target.value;
      
      // Convert hex to RGB (0-1 range)
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      
      // Update the blackhole property
      const setterName = `set${id.charAt(0).toUpperCase() + id.slice(1)}` as keyof typeof this.simulator.blackHole;
      const setter = this.simulator.blackHole[setterName] as (r: number, g: number, b: number) => void;
      setter.call(this.simulator.blackHole, r, g, b);
      
      // Update changed state
      this.updateChangedClass(colorPicker, id, [r, g, b]);
    });
    
    // Handle reset button
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        const defaultValue = (DEFAULT_BLACKHOLE_VALUES as any)[id] as [number, number, number];
        if (defaultValue) {
          colorPicker.value = rgbToHex(defaultValue);
          const setterName = `set${id.charAt(0).toUpperCase() + id.slice(1)}` as keyof typeof this.simulator.blackHole;
          const setter = this.simulator.blackHole[setterName] as (r: number, g: number, b: number) => void;
          setter.call(this.simulator.blackHole, defaultValue[0], defaultValue[1], defaultValue[2]);
          
          // Remove changed class since we're resetting to default value
          const container = colorPicker.closest('div.slider');
          if (container) {
            container.classList.remove('changed');
          }
        }
      });
    }
  }

  private setupPerformanceDisplay() {
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
          (vramElement as HTMLElement).title = `Textures: ${(
            vramUsage.textures /
            (1024 * 1024)
          ).toFixed(0)} MB, Buffers: ${(
            vramUsage.buffers /
            (1024 * 1024)
          ).toFixed(1)} MB`;
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
            (gpuElement as HTMLElement).title = this.simulator.blackHole.maxFrameRate >= 120
              ? "GPU frame time (unlocked frame rate)"
              : "GPU timing varies with frame rate limiting due to power state changes. Set to 120 FPS for accurate timing.";
          }
          if (mainElement)
            mainElement.textContent = `Main: ${gpuTimes.main.toFixed(1)} ms`;
          if (postElement)
            postElement.textContent = `Post: ${gpuTimes.post.toFixed(1)} ms`;
        } else {
          if (gpuElement) gpuElement.textContent = `GPU: N/A`;
          if (mainElement) mainElement.textContent = `Main: N/A`;
          if (postElement) postElement.textContent = `Post: N/A`;
        }
      }
    };

    setInterval(updatePerformanceDisplay, 100);
  }
}

import { BlackholeSimulator } from "../BlackholeSimulator";

export class CameraManager {
  private simulator: BlackholeSimulator;

  constructor(simulator: BlackholeSimulator) {
    this.simulator = simulator;
  }

  adjustCamera() {
    // Camera adjustment logic if needed
    // Currently the camera is controlled via mouse interaction in the UI
  }
}

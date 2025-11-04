# WebGPU Black Hole Simulator

A WebGPU implementation of a black hole raymarching shader, converted from WebGL2.

## Features

- Real-time raymarching black hole visualization
- Accretion disc rendering with procedural textures
- Temporal anti-aliasing for smooth rendering
- Bloom post-processing effects
- Interactive camera controls (drag to rotate)
- Adjustable parameters via UI

## Getting Started

### Prerequisites

- Node.js and npm installed
- A modern browser with WebGPU support (Chrome/Edge 113+, Safari 18+)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

This will start a webpack dev server at `http://localhost:8080`

### Build

```bash
npm run build
```

For production build:

```bash
npm run prod
```

## Controls

- **Drag mouse** on canvas to rotate the camera around the black hole
- Adjust parameters using the sliders in the right panel

## Credits

Original shader inspired by Shadertoy "Gargantua" shader.


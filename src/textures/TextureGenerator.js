/**
 * TextureGenerator - Генератор процедурных текстур через Canvas
 */

import { Texture, DynamicTexture } from "babylonjs";
import { GameState } from '../core/GameState.js';
import { fbm, turbulence, voronoi, perlin2D } from './NoiseGenerator.js';
import { lerp, clamp } from '../utils/Math.js';

export class TextureGenerator {
  constructor(scene) {
    this.scene = scene;
    this.cache = new Map();
  }

  /**
   * Generate texture from definition
   */
  generate(definition) {
    const { id, type, size = 512, params = {} } = definition;

    // Check cache
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }

    let texture;
    switch (type) {
      case 'noise':
        texture = this.generateNoise(id, size, params);
        break;
      case 'checkerboard':
        texture = this.generateCheckerboard(id, size, params);
        break;
      case 'gradient':
        texture = this.generateGradient(id, size, params);
        break;
      case 'brick':
        texture = this.generateBrick(id, size, params);
        break;
      case 'wood':
        texture = this.generateWood(id, size, params);
        break;
      case 'metal':
        texture = this.generateMetal(id, size, params);
        break;
      case 'camo':
        texture = this.generateCamo(id, size, params);
        break;
      case 'skin':
        texture = this.generateSkin(id, size, params);
        break;
      case 'concrete':
        texture = this.generateConcrete(id, size, params);
        break;
      case 'fabric':
        texture = this.generateFabric(id, size, params);
        break;
      case 'tiles':
        texture = this.generateTiles(id, size, params);
        break;
      default:
        console.warn(`Unknown texture type: ${type}`);
        texture = this.generateNoise(id, size, params);
    }

    this.cache.set(id, texture);
    GameState.textures.set(id, texture);

    return texture;
  }

  /**
   * Create canvas and context
   */
  createCanvas(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    return { canvas, ctx };
  }

  /**
   * Convert canvas to Babylon texture
   */
  canvasToTexture(canvas, id) {
    const texture = new DynamicTexture(id, canvas, this.scene, true);
    texture.update();
    return texture;
  }

  /**
   * Perlin noise texture
   */
  generateNoise(id, size, params = {}) {
    const {
      scale = 50,
      octaves = 4,
      color1 = [50, 50, 50],
      color2 = [200, 200, 200]
    } = params;

    const { canvas, ctx } = this.createCanvas(size);
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const value = fbm(x / scale, y / scale, { octaves });
        const t = (value + 1) / 2; // Normalize to 0-1

        const idx = (y * size + x) * 4;
        data[idx] = lerp(color1[0], color2[0], t);
        data[idx + 1] = lerp(color1[1], color2[1], t);
        data[idx + 2] = lerp(color1[2], color2[2], t);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return this.canvasToTexture(canvas, id);
  }

  /**
   * Checkerboard pattern
   */
  generateCheckerboard(id, size, params = {}) {
    const {
      tileSize = 64,
      color1 = [255, 255, 255],
      color2 = [0, 0, 0]
    } = params;

    const { canvas, ctx } = this.createCanvas(size);

    for (let y = 0; y < size; y += tileSize) {
      for (let x = 0; x < size; x += tileSize) {
        const isEven = ((x / tileSize) + (y / tileSize)) % 2 === 0;
        const color = isEven ? color1 : color2;
        ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    return this.canvasToTexture(canvas, id);
  }

  /**
   * Gradient texture
   */
  generateGradient(id, size, params = {}) {
    const {
      direction = 'vertical', // 'vertical', 'horizontal', 'radial'
      color1 = [255, 0, 0],
      color2 = [0, 0, 255]
    } = params;

    const { canvas, ctx } = this.createCanvas(size);
    let gradient;

    if (direction === 'radial') {
      gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    } else if (direction === 'horizontal') {
      gradient = ctx.createLinearGradient(0, 0, size, 0);
    } else {
      gradient = ctx.createLinearGradient(0, 0, 0, size);
    }

    gradient.addColorStop(0, `rgb(${color1[0]},${color1[1]},${color1[2]})`);
    gradient.addColorStop(1, `rgb(${color2[0]},${color2[1]},${color2[2]})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return this.canvasToTexture(canvas, id);
  }

  /**
   * Brick wall texture
   */
  generateBrick(id, size, params = {}) {
    const {
      brickWidth = 64,
      brickHeight = 32,
      mortarWidth = 4,
      brickColor = [180, 80, 60],
      mortarColor = [100, 100, 100],
      variation = 30
    } = params;

    const { canvas, ctx } = this.createCanvas(size);

    // Fill with mortar
    ctx.fillStyle = `rgb(${mortarColor[0]},${mortarColor[1]},${mortarColor[2]})`;
    ctx.fillRect(0, 0, size, size);

    // Draw bricks
    const rows = Math.ceil(size / brickHeight) + 1;
    const cols = Math.ceil(size / brickWidth) + 2;

    for (let row = 0; row < rows; row++) {
      const offset = (row % 2) * (brickWidth / 2);

      for (let col = -1; col < cols; col++) {
        const x = col * brickWidth + offset;
        const y = row * brickHeight;

        // Random color variation
        const r = clamp(brickColor[0] + (Math.random() - 0.5) * variation, 0, 255);
        const g = clamp(brickColor[1] + (Math.random() - 0.5) * variation, 0, 255);
        const b = clamp(brickColor[2] + (Math.random() - 0.5) * variation, 0, 255);

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(
          x + mortarWidth / 2,
          y + mortarWidth / 2,
          brickWidth - mortarWidth,
          brickHeight - mortarWidth
        );

        // Add subtle noise to brick
        for (let i = 0; i < 5; i++) {
          const nx = x + mortarWidth / 2 + Math.random() * (brickWidth - mortarWidth);
          const ny = y + mortarWidth / 2 + Math.random() * (brickHeight - mortarWidth);
          ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
          ctx.fillRect(nx, ny, 2, 2);
        }
      }
    }

    return this.canvasToTexture(canvas, id);
  }

  /**
   * Wood grain texture
   */
  generateWood(id, size, params = {}) {
    const {
      color1 = [139, 90, 43],
      color2 = [101, 67, 33],
      grainScale = 100,
      ringScale = 20
    } = params;

    const { canvas, ctx } = this.createCanvas(size);
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Wood ring pattern
        const distFromCenter = Math.sqrt((x - size/2) ** 2 + (y - size/2) ** 2);
        const ring = Math.sin(distFromCenter / ringScale + perlin2D(x / grainScale, y / grainScale) * 10);

        // Add grain noise
        const grain = fbm(x / 50, y / 10, { octaves: 3 });
        const t = clamp((ring + grain + 1) / 2, 0, 1);

        const idx = (y * size + x) * 4;
        data[idx] = lerp(color1[0], color2[0], t);
        data[idx + 1] = lerp(color1[1], color2[1], t);
        data[idx + 2] = lerp(color1[2], color2[2], t);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return this.canvasToTexture(canvas, id);
  }

  /**
   * Brushed metal texture
   */
  generateMetal(id, size, params = {}) {
    const {
      color = [180, 180, 190],
      scratches = true,
      brushDirection = 'horizontal'
    } = params;

    const { canvas, ctx } = this.createCanvas(size);
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Base metal color with subtle variation
        let variation;
        if (brushDirection === 'horizontal') {
          variation = perlin2D(x / 200, y / 5);
        } else {
          variation = perlin2D(x / 5, y / 200);
        }

        const brightness = 0.8 + variation * 0.2;
        const idx = (y * size + x) * 4;
        data[idx] = clamp(color[0] * brightness, 0, 255);
        data[idx + 1] = clamp(color[1] * brightness, 0, 255);
        data[idx + 2] = clamp(color[2] * brightness, 0, 255);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Add scratches
    if (scratches) {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 50; i++) {
        const x1 = Math.random() * size;
        const y1 = Math.random() * size;
        const length = 20 + Math.random() * 50;
        const angle = brushDirection === 'horizontal' ? 0 : Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + Math.cos(angle) * length, y1 + Math.sin(angle) * length);
        ctx.stroke();
      }
    }

    return this.canvasToTexture(canvas, id);
  }

  /**
   * Camouflage pattern
   */
  generateCamo(id, size, params = {}) {
    const {
      colors = [
        [34, 85, 51],    // Dark green
        [85, 107, 47],   // Olive
        [139, 90, 43],   // Brown
        [47, 79, 79]     // Dark slate
      ],
      blobSize = 40,
      blobCount = 80
    } = params;

    const { canvas, ctx } = this.createCanvas(size);

    // Base color
    ctx.fillStyle = `rgb(${colors[0][0]},${colors[0][1]},${colors[0][2]})`;
    ctx.fillRect(0, 0, size, size);

    // Draw irregular blobs for each color
    for (let c = 1; c < colors.length; c++) {
      ctx.fillStyle = `rgb(${colors[c][0]},${colors[c][1]},${colors[c][2]})`;

      for (let i = 0; i < blobCount / colors.length; i++) {
        this.drawBlob(ctx, size, blobSize);
      }
    }

    return this.canvasToTexture(canvas, id);
  }

  /**
   * Draw an irregular blob shape
   */
  drawBlob(ctx, size, blobSize) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const points = 8 + Math.floor(Math.random() * 6);

    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radius = blobSize * (0.5 + Math.random() * 0.5);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Skin texture
   */
  generateSkin(id, size, params = {}) {
    const {
      baseColor = [210, 180, 140],
      variation = 15
    } = params;

    const { canvas, ctx } = this.createCanvas(size);
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const noise = fbm(x / 30, y / 30, { octaves: 4 }) * variation;

        const idx = (y * size + x) * 4;
        data[idx] = clamp(baseColor[0] + noise, 0, 255);
        data[idx + 1] = clamp(baseColor[1] + noise * 0.8, 0, 255);
        data[idx + 2] = clamp(baseColor[2] + noise * 0.6, 0, 255);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return this.canvasToTexture(canvas, id);
  }

  /**
   * Concrete texture
   */
  generateConcrete(id, size, params = {}) {
    const {
      color = [140, 140, 135],
      roughness = 0.5
    } = params;

    const { canvas, ctx } = this.createCanvas(size);
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const noise1 = fbm(x / 100, y / 100, { octaves: 5 }) * 30 * roughness;
        const noise2 = fbm(x / 20, y / 20, { octaves: 3 }) * 10 * roughness;

        const idx = (y * size + x) * 4;
        data[idx] = clamp(color[0] + noise1 + noise2, 0, 255);
        data[idx + 1] = clamp(color[1] + noise1 + noise2, 0, 255);
        data[idx + 2] = clamp(color[2] + noise1 + noise2, 0, 255);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Add occasional small stones/pebbles
    ctx.fillStyle = 'rgba(100,100,95,0.3)';
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 1 + Math.random() * 3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    return this.canvasToTexture(canvas, id);
  }

  /**
   * Fabric texture
   */
  generateFabric(id, size, params = {}) {
    const {
      color = [50, 50, 80],
      weaveSize = 4
    } = params;

    const { canvas, ctx } = this.createCanvas(size);

    // Base color
    ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
    ctx.fillRect(0, 0, size, size);

    // Horizontal threads
    ctx.strokeStyle = `rgba(${color[0]+30},${color[1]+30},${color[2]+30},0.5)`;
    ctx.lineWidth = 1;
    for (let y = 0; y < size; y += weaveSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Vertical threads
    ctx.strokeStyle = `rgba(${color[0]-20},${color[1]-20},${color[2]-20},0.5)`;
    for (let x = 0; x < size; x += weaveSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }

    return this.canvasToTexture(canvas, id);
  }

  /**
   * Tiles texture
   */
  generateTiles(id, size, params = {}) {
    const {
      tileSize = 64,
      groutWidth = 4,
      tileColor = [200, 200, 210],
      groutColor = [80, 80, 80],
      variation = 10
    } = params;

    const { canvas, ctx } = this.createCanvas(size);

    // Fill with grout
    ctx.fillStyle = `rgb(${groutColor[0]},${groutColor[1]},${groutColor[2]})`;
    ctx.fillRect(0, 0, size, size);

    // Draw tiles
    const numTiles = Math.ceil(size / tileSize);
    for (let row = 0; row < numTiles; row++) {
      for (let col = 0; col < numTiles; col++) {
        const x = col * tileSize;
        const y = row * tileSize;

        // Random tile color variation
        const r = clamp(tileColor[0] + (Math.random() - 0.5) * variation, 0, 255);
        const g = clamp(tileColor[1] + (Math.random() - 0.5) * variation, 0, 255);
        const b = clamp(tileColor[2] + (Math.random() - 0.5) * variation, 0, 255);

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(
          x + groutWidth / 2,
          y + groutWidth / 2,
          tileSize - groutWidth,
          tileSize - groutWidth
        );
      }
    }

    return this.canvasToTexture(canvas, id);
  }

  /**
   * Clear texture cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default TextureGenerator;

/**
 * MaterialPresets - Готовые пресеты материалов с процедурными текстурами
 */

import { StandardMaterial, Color3 } from "babylonjs";
import { GameState } from '../core/GameState.js';
import { TextureGenerator } from './TextureGenerator.js';

export class MaterialPresets {
  constructor(scene) {
    this.scene = scene;
    this.textureGenerator = new TextureGenerator(scene);
  }

  /**
   * Create material from preset name
   */
  createPreset(presetName, id = null) {
    const materialId = id || `mat_${presetName}_${Date.now()}`;

    switch (presetName) {
      // Environment materials
      case 'brick_red':
        return this.createBrickMaterial(materialId, { brickColor: [180, 80, 60] });
      case 'brick_brown':
        return this.createBrickMaterial(materialId, { brickColor: [120, 80, 60] });
      case 'brick_gray':
        return this.createBrickMaterial(materialId, { brickColor: [100, 100, 100] });

      case 'concrete':
        return this.createConcreteMaterial(materialId);
      case 'concrete_dark':
        return this.createConcreteMaterial(materialId, { color: [80, 80, 75] });

      case 'wood_light':
        return this.createWoodMaterial(materialId, { color1: [180, 140, 100], color2: [140, 100, 60] });
      case 'wood_dark':
        return this.createWoodMaterial(materialId, { color1: [100, 70, 40], color2: [60, 40, 20] });

      case 'metal_chrome':
        return this.createMetalMaterial(materialId, { color: [200, 200, 210] });
      case 'metal_dark':
        return this.createMetalMaterial(materialId, { color: [60, 65, 70] });
      case 'metal_rust':
        return this.createMetalMaterial(materialId, { color: [140, 80, 50], scratches: true });

      case 'tiles_white':
        return this.createTilesMaterial(materialId, { tileColor: [240, 240, 245] });
      case 'tiles_blue':
        return this.createTilesMaterial(materialId, { tileColor: [100, 150, 200] });

      // Character materials
      case 'skin_light':
        return this.createSkinMaterial(materialId, { baseColor: [255, 224, 189] });
      case 'skin_tan':
        return this.createSkinMaterial(materialId, { baseColor: [210, 180, 140] });
      case 'skin_dark':
        return this.createSkinMaterial(materialId, { baseColor: [139, 90, 43] });
      case 'skin_zombie':
        return this.createSkinMaterial(materialId, { baseColor: [130, 150, 100] });
      case 'skin_alien':
        return this.createSkinMaterial(materialId, { baseColor: [150, 100, 180] });

      case 'camo_green':
        return this.createCamoMaterial(materialId, {
          colors: [[34, 85, 51], [85, 107, 47], [139, 90, 43], [47, 79, 79]]
        });
      case 'camo_desert':
        return this.createCamoMaterial(materialId, {
          colors: [[194, 178, 128], [150, 113, 63], [100, 80, 50], [210, 180, 140]]
        });
      case 'camo_urban':
        return this.createCamoMaterial(materialId, {
          colors: [[80, 80, 80], [120, 120, 120], [60, 60, 60], [100, 100, 100]]
        });

      case 'fabric_black':
        return this.createFabricMaterial(materialId, { color: [30, 30, 30] });
      case 'fabric_blue':
        return this.createFabricMaterial(materialId, { color: [40, 50, 100] });
      case 'fabric_red':
        return this.createFabricMaterial(materialId, { color: [120, 30, 30] });

      // Special materials
      case 'emissive_red':
        return this.createEmissiveMaterial(materialId, [1, 0.2, 0.2]);
      case 'emissive_green':
        return this.createEmissiveMaterial(materialId, [0.2, 1, 0.4]);
      case 'emissive_blue':
        return this.createEmissiveMaterial(materialId, [0.2, 0.4, 1]);
      case 'emissive_orange':
        return this.createEmissiveMaterial(materialId, [1, 0.5, 0.1]);

      default:
        console.warn(`Unknown material preset: ${presetName}`);
        return this.createDefaultMaterial(materialId);
    }
  }

  createBrickMaterial(id, params = {}) {
    const texture = this.textureGenerator.generate({
      id: `tex_${id}`,
      type: 'brick',
      size: 512,
      params
    });

    const mat = new StandardMaterial(id, this.scene);
    mat.diffuseTexture = texture;
    mat.specularColor = new Color3(0.1, 0.1, 0.1);

    GameState.materials.set(id, mat);
    return mat;
  }

  createConcreteMaterial(id, params = {}) {
    const texture = this.textureGenerator.generate({
      id: `tex_${id}`,
      type: 'concrete',
      size: 512,
      params
    });

    const mat = new StandardMaterial(id, this.scene);
    mat.diffuseTexture = texture;
    mat.specularColor = new Color3(0.05, 0.05, 0.05);

    GameState.materials.set(id, mat);
    return mat;
  }

  createWoodMaterial(id, params = {}) {
    const texture = this.textureGenerator.generate({
      id: `tex_${id}`,
      type: 'wood',
      size: 512,
      params
    });

    const mat = new StandardMaterial(id, this.scene);
    mat.diffuseTexture = texture;
    mat.specularColor = new Color3(0.2, 0.15, 0.1);

    GameState.materials.set(id, mat);
    return mat;
  }

  createMetalMaterial(id, params = {}) {
    const texture = this.textureGenerator.generate({
      id: `tex_${id}`,
      type: 'metal',
      size: 512,
      params
    });

    const mat = new StandardMaterial(id, this.scene);
    mat.diffuseTexture = texture;
    mat.specularColor = new Color3(0.6, 0.6, 0.6);
    mat.specularPower = 64;

    GameState.materials.set(id, mat);
    return mat;
  }

  createTilesMaterial(id, params = {}) {
    const texture = this.textureGenerator.generate({
      id: `tex_${id}`,
      type: 'tiles',
      size: 512,
      params
    });

    const mat = new StandardMaterial(id, this.scene);
    mat.diffuseTexture = texture;
    mat.specularColor = new Color3(0.4, 0.4, 0.4);

    GameState.materials.set(id, mat);
    return mat;
  }

  createSkinMaterial(id, params = {}) {
    const texture = this.textureGenerator.generate({
      id: `tex_${id}`,
      type: 'skin',
      size: 256,
      params
    });

    const mat = new StandardMaterial(id, this.scene);
    mat.diffuseTexture = texture;
    mat.specularColor = new Color3(0.1, 0.08, 0.06);

    GameState.materials.set(id, mat);
    return mat;
  }

  createCamoMaterial(id, params = {}) {
    const texture = this.textureGenerator.generate({
      id: `tex_${id}`,
      type: 'camo',
      size: 512,
      params
    });

    const mat = new StandardMaterial(id, this.scene);
    mat.diffuseTexture = texture;
    mat.specularColor = new Color3(0.05, 0.05, 0.05);

    GameState.materials.set(id, mat);
    return mat;
  }

  createFabricMaterial(id, params = {}) {
    const texture = this.textureGenerator.generate({
      id: `tex_${id}`,
      type: 'fabric',
      size: 256,
      params
    });

    const mat = new StandardMaterial(id, this.scene);
    mat.diffuseTexture = texture;
    mat.specularColor = new Color3(0.02, 0.02, 0.02);

    GameState.materials.set(id, mat);
    return mat;
  }

  createEmissiveMaterial(id, color) {
    const mat = new StandardMaterial(id, this.scene);
    mat.emissiveColor = new Color3(color[0], color[1], color[2]);
    mat.diffuseColor = new Color3(color[0] * 0.3, color[1] * 0.3, color[2] * 0.3);
    mat.specularColor = new Color3(0, 0, 0);

    GameState.materials.set(id, mat);
    return mat;
  }

  createDefaultMaterial(id) {
    const mat = new StandardMaterial(id, this.scene);
    mat.diffuseColor = new Color3(0.5, 0.5, 0.5);
    mat.specularColor = new Color3(0.1, 0.1, 0.1);

    GameState.materials.set(id, mat);
    return mat;
  }
}

export default MaterialPresets;

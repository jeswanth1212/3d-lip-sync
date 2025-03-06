import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class ModelLoader {
    constructor() {
        this.loader = new GLTFLoader();
    }

    async loadModel(url) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (gltf) => {
                    const model = gltf.scene;
                    this.setupModel(model);
                    resolve(model);
                },
                (progress) => {
                    console.log('Loading model:', (progress.loaded / progress.total * 100) + '%');
                },
                (error) => {
                    console.error('Error loading model:', error);
                    reject(error);
                }
            );
        });
    }

    setupModel(model) {
        model.traverse((node) => {
            if (node.isMesh) {
                // Log all available morph target influences and dictionary
                if (node.morphTargetDictionary) {
                    console.log('Found mesh with morph targets:', node.name);
                    console.log('Morph target dictionary:', node.morphTargetDictionary);
                    console.log('Number of morph targets:', node.morphTargetInfluences.length);
                }

                // Enable morph targets
                if (node.morphTargetDictionary && node.morphTargetInfluences) {
                    // Ensure all morph targets are initialized
                    const morphTargetCount = Object.keys(node.morphTargetDictionary).length;
                    if (node.morphTargetInfluences.length !== morphTargetCount) {
                        node.morphTargetInfluences = new Float32Array(morphTargetCount);
                    }
                    node.morphTargetInfluences.fill(0);
                }

                // Setup materials
                if (node.material) {
                    node.material.side = THREE.DoubleSide;
                    node.material.transparent = true;
                    node.material.needsUpdate = true;
                }
            }
        });

        // Center and scale the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        model.position.sub(center);
        const scale = 2 / Math.max(size.x, size.y, size.z);
        model.scale.multiplyScalar(scale);
    }

    // Find all meshes with morph targets
    findMorphTargetMesh(model) {
        let targetMesh = null;
        let maxMorphTargets = 0;

        model.traverse((node) => {
            if (node.isMesh && node.morphTargetDictionary) {
                const numMorphTargets = Object.keys(node.morphTargetDictionary).length;
                console.log(`Found mesh ${node.name} with ${numMorphTargets} morph targets`);
                
                // Select the mesh with the most morph targets
                if (numMorphTargets > maxMorphTargets) {
                    targetMesh = node;
                    maxMorphTargets = numMorphTargets;
                }
            }
        });

        if (targetMesh) {
            console.log('Selected mesh for animation:', targetMesh.name);
            console.log('Available morph targets:', Object.keys(targetMesh.morphTargetDictionary));
        }

        return targetMesh;
    }
} 
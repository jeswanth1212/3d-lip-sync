import VRScene from './vr-scene.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Create VR scene
const vrScene = new VRScene();

// Load your 3D model
const loader = new GLTFLoader();
loader.load(
    'path/to/your/model.glb', // Replace with your model path
    (gltf) => {
        const model = gltf.scene;
        
        // Scale and position your model as needed
        model.scale.set(1, 1, 1);
        model.position.set(0, 0, -2); // Position the model 2 units in front of the camera
        
        // Add the model to the VR scene
        vrScene.addModel(model);
    },
    (progress) => {
        console.log('Loading model:', (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
        console.error('Error loading model:', error);
    }
); 
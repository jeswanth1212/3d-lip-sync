import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class VRScene {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.xr.enabled = true; // Enable WebXR
        document.body.appendChild(this.renderer.domElement);
        
        // Add VR button
        document.body.appendChild(VRButton.createButton(this.renderer));
        
        // Setup camera and controls
        this.camera.position.set(0, 1.6, 3); // Set camera at average human height
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        
        // Setup basic environment
        this.setupEnvironment();
        
        // Setup VR controllers
        this.setupVRControllers();
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Start animation loop
        this.renderer.setAnimationLoop(this.render.bind(this));
    }
    
    setupEnvironment() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        // Add directional light
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 5, 5);
        this.scene.add(dirLight);
        
        // Add ground
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Add a simple skybox
        const skyGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87ceeb,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
    }
    
    setupVRControllers() {
        this.controllers = [];
        const controllerModelFactory = new XRControllerModelFactory();
        
        // Setup controllers
        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            controller.addEventListener('selectstart', this.onSelectStart.bind(this));
            controller.addEventListener('selectend', this.onSelectEnd.bind(this));
            this.scene.add(controller);
            
            // Add visible controller models
            const controllerGrip = this.renderer.xr.getControllerGrip(i);
            const controllerModel = controllerModelFactory.createControllerModel(controllerGrip);
            controllerGrip.add(controllerModel);
            this.scene.add(controllerGrip);
            
            this.controllers.push(controller);
        }
    }
    
    onSelectStart(event) {
        // Handle VR controller selection start
        const controller = event.target;
        controller.userData.isSelecting = true;
    }
    
    onSelectEnd(event) {
        // Handle VR controller selection end
        const controller = event.target;
        controller.userData.isSelecting = false;
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    // Method to add your existing 3D model
    addModel(model) {
        // Assuming model is a THREE.Object3D
        this.scene.add(model);
    }
}

export default VRScene; 
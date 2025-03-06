import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as Tone from 'tone';
import { ModelLoader } from './modelLoader';

class FacialAnimationSystem {
    constructor() {
        this.initScene();
        this.initAudio();
        this.initControls();
        this.emotionalState = {
            happiness: 0,
            surprise: 0,
            thoughtful: 0,
            emphasis: 0
        };
        
        // Animation state
        this.isBlinking = false;
        this.blinkProgress = 0;
        this.nextBlinkTime = null;
        this.eyeLookTarget = { x: 0, y: 0 };
        this.currentEyeLook = { x: 0, y: 0 };
        this.eyeMovementTime = null;
        
        // Bind methods
        this.animate = this.animate.bind(this);
        this.updateMorphTargets = this.updateMorphTargets.bind(this);
        
        // Load the model
        this.loadFacialModel();
    }

    async loadFacialModel() {
        try {
            const modelLoader = new ModelLoader();
            const model = await modelLoader.loadModel('/assets/models/model_full.glb');
            
            this.scene.add(model);
            this.morphTargetMesh = modelLoader.findMorphTargetMesh(model);
            
            if (!this.morphTargetMesh) {
                throw new Error('No mesh with morph targets found in the model');
            }
            
            // Initialize morph target system
            this.initializeMorphTargets();
            
            // Set up audio
            const audioElement = document.getElementById('audioInput');
            audioElement.src = '/assets/audio/Ai.mp3';
            audioElement.loop = true;
            
            // Connect audio to analyzer
            const audioSource = this.audioContext.createMediaElementSource(audioElement);
            audioSource.connect(this.analyzer);
            audioSource.connect(this.audioContext.destination);
            
            // Add audio controls
            this.setupAudioControls();
        } catch (error) {
            console.error('Failed to load facial model:', error);
        }
    }

    initializeMorphTargets() {
        // Get all available morph targets
        this.availableMorphs = Object.keys(this.morphTargetMesh.morphTargetDictionary);
        console.log('All available morph targets:', this.availableMorphs);

        // Group morph targets by type
        this.morphGroups = {
            eyes: this.availableMorphs.filter(name => name.toLowerCase().includes('eye')),
            mouth: this.availableMorphs.filter(name => name.toLowerCase().includes('mouth')),
            brow: this.availableMorphs.filter(name => name.toLowerCase().includes('brow')),
            cheek: this.availableMorphs.filter(name => name.toLowerCase().includes('cheek')),
            nose: this.availableMorphs.filter(name => name.toLowerCase().includes('nose')),
            jaw: this.availableMorphs.filter(name => name.toLowerCase().includes('jaw')),
            viseme: this.availableMorphs.filter(name => name.toLowerCase().includes('viseme')),
            other: this.availableMorphs.filter(name => 
                !name.toLowerCase().match(/(eye|mouth|brow|cheek|nose|jaw|viseme)/))
        };

        console.log('Morph target groups:', this.morphGroups);

        // Initialize all morph target influences to 0
        this.morphTargetMesh.morphTargetInfluences.fill(0);
    }

    setupAudioControls() {
        // Add audio control button
        const controlsDiv = document.getElementById('controls');
        const audioButton = document.createElement('button');
        audioButton.id = 'audioButton';
        audioButton.textContent = 'Play Audio';
        audioButton.style.marginTop = '10px';
        controlsDiv.appendChild(audioButton);

        const audioElement = document.getElementById('audioInput');
        
        // Toggle audio playback
        audioButton.addEventListener('click', async () => {
            try {
                // Resume AudioContext if it's suspended
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
                
                if (audioElement.paused) {
                    await audioElement.play();
                    audioButton.textContent = 'Pause Audio';
                    // Start animation when audio plays
                    this.isAudioPlaying = true;
                } else {
                    audioElement.pause();
                    audioButton.textContent = 'Play Audio';
                    this.isAudioPlaying = false;
                }
            } catch (error) {
                console.error('Error playing audio:', error);
            }
        });
    }

    initScene() {
        // Three.js setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('animation-container').appendChild(this.renderer.domElement);

        // Camera position
        this.camera.position.z = 5;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 1, 1);
        this.scene.add(directionalLight);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Window resize handler
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    initAudio() {
        // Audio analysis setup
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyzer = this.audioContext.createAnalyser();
        this.analyzer.fftSize = 2048;
        this.bufferLength = this.analyzer.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        // Tone.js setup
        this.meter = new Tone.Meter();
        this.pitchDetector = new Tone.FFT(this.bufferLength);
    }

    initControls() {
        // UI Controls
        document.getElementById('startButton').addEventListener('click', () => this.start());
        
        // Emotion sliders
        const emotions = ['happiness', 'surprise', 'thoughtful'];
        emotions.forEach(emotion => {
            document.getElementById(emotion).addEventListener('input', (e) => {
                this.emotionalState[emotion] = parseFloat(e.target.value);
            });
        });
    }

    async start() {
        try {
            // Start animation loop
            this.animate();
        } catch (error) {
            console.error('Error starting the animation system:', error);
        }
    }

    updateMorphTargets() {
        if (!this.morphTargetMesh) return;

        // Reset all morph target influences
        this.morphTargetMesh.morphTargetInfluences.fill(0);

        // Apply emotional expressions
        this.applyEmotionalExpressions();
        
        // Apply eye movements
        this.applyEyeMovements();
        
        // Apply audio-based expressions
        this.applyAudioExpressions();
    }

    applyMorphTarget(name, value) {
        if (!this.morphTargetMesh || !this.morphTargetMesh.morphTargetDictionary) return;
        
        const dict = this.morphTargetMesh.morphTargetDictionary;
        if (name in dict) {
            const index = dict[name];
            this.morphTargetMesh.morphTargetInfluences[index] = value;
            return true;
        }
        return false;
    }

    applyEmotionalExpressions() {
        if (!this.morphTargetMesh) return;

        // Happy expression using eye movements
        if (this.emotionalState.happiness > 0.1) {
            const happyIntensity = this.emotionalState.happiness;
            // Slightly squint eyes by combining look up and down
            this.applyMorphTarget("eyesLookUp", happyIntensity * 0.3);
            this.applyMorphTarget("eyesLookDown", happyIntensity * 0.2);
        }

        // Surprise expression
        if (this.emotionalState.surprise > 0.1) {
            const surpriseIntensity = this.emotionalState.surprise;
            // Wide eyes looking up
            this.applyMorphTarget("eyesLookUp", surpriseIntensity);
            this.applyMorphTarget("eyeLookUpLeft", surpriseIntensity * 0.7);
            this.applyMorphTarget("eyeLookUpRight", surpriseIntensity * 0.7);
        }

        // Thoughtful expression
        if (this.emotionalState.thoughtful > 0.1) {
            const thoughtfulIntensity = this.emotionalState.thoughtful;
            // Look up and slightly to the side
            this.applyMorphTarget("eyesLookUp", thoughtfulIntensity * 0.5);
            this.applyMorphTarget("eyeLookOutRight", thoughtfulIntensity * 0.3);
        }
    }

    applyAudioExpressions() {
        if (!this.morphTargetMesh || !this.isAudioPlaying) return;
        
        const audioIntensity = this.handleAudioData();
        
        // Get frequency data for detailed analysis
        const frequencies = [...this.dataArray];
        const bassIntensity = frequencies.slice(0, 10).reduce((a, b) => a + b, 0) / 1280;
        const midIntensity = frequencies.slice(10, 30).reduce((a, b) => a + b, 0) / 2560;
        const highIntensity = frequencies.slice(30, 50).reduce((a, b) => a + b, 0) / 2560;

        if (audioIntensity > 0.1) {
            // Base mouth opening with teeth showing
            const mouthOpenAmount = Math.min(0.12, audioIntensity * 0.15);
            this.applyMorphTarget("mouthOpen", mouthOpenAmount);
            this.applyMorphTarget("jawOpen", mouthOpenAmount * 0.08);
            
            // Show teeth by rolling lips slightly
            this.applyMorphTarget("mouthRollUpper", -mouthOpenAmount * 0.3); // Negative value rolls lip up
            this.applyMorphTarget("mouthRollLower", -mouthOpenAmount * 0.2); // Negative value rolls lip down
            
            // Extremely subtle viseme transitions
            if (bassIntensity > 0.4) {
                // O/U sounds - round shapes with slight lip roll
                this.applyMorphTarget("viseme_O", bassIntensity * 0.08);
                this.applyMorphTarget("viseme_U", bassIntensity * 0.06);
                this.applyMorphTarget("mouthPucker", bassIntensity * 0.05);
                this.applyMorphTarget("mouthFunnel", bassIntensity * 0.03);
                // Roll lips slightly for O/U sounds
                this.applyMorphTarget("mouthRollUpper", -bassIntensity * 0.02);
                this.applyMorphTarget("mouthRollLower", -bassIntensity * 0.02);
            }
            
            if (midIntensity > 0.4) {
                // A/E sounds - open shapes showing teeth
                this.applyMorphTarget("viseme_aa", midIntensity * 0.08);
                this.applyMorphTarget("viseme_E", midIntensity * 0.06);
                this.applyMorphTarget("mouthStretchLeft", midIntensity * 0.03);
                this.applyMorphTarget("mouthStretchRight", midIntensity * 0.03);
                // Show more teeth for these sounds
                this.applyMorphTarget("mouthRollUpper", -midIntensity * 0.04);
                this.applyMorphTarget("mouthRollLower", -midIntensity * 0.03);
            }
            
            if (highIntensity > 0.4) {
                // Consonants with teeth visibility
                this.applyMorphTarget("viseme_FF", highIntensity * 0.06);
                this.applyMorphTarget("viseme_TH", highIntensity * 0.05);
                this.applyMorphTarget("viseme_DD", highIntensity * 0.04);
                this.applyMorphTarget("viseme_kk", highIntensity * 0.04);
                // Slight tongue movement for certain consonants
                if (highIntensity > 0.6) {
                    this.applyMorphTarget("tongueOut", highIntensity * 0.02);
                }
            }

            // Subtle jaw movement
            const jawMovement = Math.sin(performance.now() * 0.003) * 0.015;
            this.applyMorphTarget("jawLeft", Math.max(0, jawMovement) * audioIntensity * 0.03);
            this.applyMorphTarget("jawRight", Math.max(0, -jawMovement) * audioIntensity * 0.03);
            this.applyMorphTarget("jawForward", audioIntensity * 0.015);

            // Upper and lower lip coordination
            this.applyMorphTarget("mouthUpperUpLeft", audioIntensity * 0.02);
            this.applyMorphTarget("mouthUpperUpRight", audioIntensity * 0.02);
            this.applyMorphTarget("mouthLowerDownLeft", audioIntensity * 0.015);
            this.applyMorphTarget("mouthLowerDownRight", audioIntensity * 0.015);

            // Very subtle expressions
            if (audioIntensity > 0.7) {
                this.applyMorphTarget("browInnerUp", audioIntensity * 0.03);
                this.applyMorphTarget("eyeWideLeft", audioIntensity * 0.02);
                this.applyMorphTarget("eyeWideRight", audioIntensity * 0.02);
                this.applyMorphTarget("mouthSmile", audioIntensity * 0.03);
            }

            // Minimal secondary movements
            if (bassIntensity > 0.8) {
                this.applyMorphTarget("cheekPuff", bassIntensity * 0.03);
                // Subtle lip press for plosive sounds
                this.applyMorphTarget("mouthPressLeft", bassIntensity * 0.02);
                this.applyMorphTarget("mouthPressRight", bassIntensity * 0.02);
            }

        } else {
            // Resting face with slightly visible teeth
            this.applyMorphTarget("viseme_sil", 0.3);
            this.applyMorphTarget("mouthClose", 0.04);
            this.applyMorphTarget("mouthRollUpper", -0.02); // Slight upper lip roll to show teeth
            this.applyMorphTarget("mouthRollLower", -0.01); // Slight lower lip roll
            
            // Minimal idle movements
            const idleTime = performance.now() * 0.0001;
            const subtleMovement = Math.sin(idleTime) * 0.008;
            this.applyMorphTarget("mouthLeft", Math.max(0, subtleMovement) * 0.008);
            this.applyMorphTarget("mouthRight", Math.max(0, -subtleMovement) * 0.008);
        }
    }

    handleAudioData() {
        if (!this.analyzer || !this.dataArray || !this.isAudioPlaying) return 0;
        
        this.analyzer.getByteFrequencyData(this.dataArray);
        
        const speechFreqs = this.dataArray.slice(5, 100);
        const sum = speechFreqs.reduce((a, b) => a + b, 0);
        const averageFrequency = sum / speechFreqs.length;
        
        // Ultra-conservative normalization with focus on speech
        const normalizedValue = Math.min(0.2, averageFrequency / 300);
        if (!this.lastAudioValue) this.lastAudioValue = normalizedValue;
        
        // Maximum smoothing for natural movement
        this.lastAudioValue = this.smoothValue(this.lastAudioValue, normalizedValue, 0.04);
        
        return this.lastAudioValue;
    }

    smoothValue(current, target, smoothFactor) {
        return current * (1 - smoothFactor) + target * smoothFactor;
    }

    applyEyeMovements() {
        if (!this.morphTargetMesh) return;
        
        // Manage blinking
        if (!this.nextBlinkTime) {
            this.nextBlinkTime = performance.now() + Math.random() * 5000 + 1000;
            this.isBlinking = false;
            this.blinkProgress = 0;
        }
        
        const now = performance.now();
        
        // Check if it's time to blink
        if (!this.isBlinking && now > this.nextBlinkTime) {
            this.isBlinking = true;
            this.blinkProgress = 0;
        }
        
        // Process blinking animation
        if (this.isBlinking) {
            this.blinkProgress += 0.1; // Speed of blink
            
            // Blink curve (0 to 1 and back to 0)
            const blinkCurve = Math.sin(this.blinkProgress * Math.PI);
            this.applyMorphTarget("eyesClosed", blinkCurve);
            
            // End of blink
            if (this.blinkProgress >= 1) {
                this.isBlinking = false;
                this.nextBlinkTime = now + Math.random() * 5000 + 1000;
            }
        }
        
        // Natural eye movement
        if (!this.eyeMovementTime || now > this.eyeMovementTime) {
            this.eyeLookTarget = {
                x: (Math.random() * 2 - 1) * 0.5,
                y: (Math.random() * 2 - 1) * 0.3
            };
            this.eyeMovementTime = now + Math.random() * 3000 + 1000;
        }
        
        // Smooth eye movement
        this.currentEyeLook.x = this.smoothValue(this.currentEyeLook.x, this.eyeLookTarget.x, 0.05);
        this.currentEyeLook.y = this.smoothValue(this.currentEyeLook.y, this.eyeLookTarget.y, 0.05);
        
        // Apply eye look influences
        this.applyEyeLookInfluences();
    }

    applyEyeLookInfluences() {
        if (!this.morphTargetMesh) return;
        
        // Looking right
        if (this.currentEyeLook.x > 0) {
            this.applyMorphTarget("eyeLookOutRight", this.currentEyeLook.x);
            this.applyMorphTarget("eyeLookInLeft", this.currentEyeLook.x);
        } else {
            // Looking left
            this.applyMorphTarget("eyeLookOutLeft", -this.currentEyeLook.x);
            this.applyMorphTarget("eyeLookInRight", -this.currentEyeLook.x);
        }
        
        // Looking up/down
        if (this.currentEyeLook.y > 0) {
            this.applyMorphTarget("eyeLookUpLeft", this.currentEyeLook.y);
            this.applyMorphTarget("eyeLookUpRight", this.currentEyeLook.y);
            this.applyMorphTarget("eyesLookUp", this.currentEyeLook.y);
        } else {
            this.applyMorphTarget("eyeLookDownLeft", -this.currentEyeLook.y);
            this.applyMorphTarget("eyeLookDownRight", -this.currentEyeLook.y);
            this.applyMorphTarget("eyesLookDown", -this.currentEyeLook.y);
        }
    }

    animate() {
        requestAnimationFrame(this.animate);
        
        // Update controls
        this.controls.update();
        
        // Update morph targets
        this.updateMorphTargets();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    // Add this method to test all morph targets
    testAllMorphTargets() {
        if (!this.availableMorphs) return;
        
        const now = performance.now();
        const testValue = (Math.sin(now * 0.001) + 1) / 2; // 0 to 1

        this.availableMorphs.forEach((morphName, index) => {
            // Cycle through morph targets one by one
            const shouldActivate = Math.floor(now / 1000) % this.availableMorphs.length === index;
            if (shouldActivate) {
                this.applyMorphTarget(morphName, testValue);
                console.log('Testing morph target:', morphName, 'with value:', testValue);
            }
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const app = new FacialAnimationSystem();
    window.app = app; // Make it accessible for debugging
}); 
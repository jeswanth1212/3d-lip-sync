import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import * as Tone from 'tone';
import { ModelLoader } from './modelLoader';
import ElevenLabsService from './services/elevenLabsService';
import { GoogleGenerativeAI } from '@google/generative-ai';

class ChatbotSystem {
    constructor() {
        this.facialAnimation = new FacialAnimationSystem();
        this.ttsService = new ElevenLabsService();
        this.initSpeechRecognition();
        this.setupChatInterface();
        this.isRecording = false;
        this.processingResponse = false;
    }

    initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }

        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.addMessageToChat('user', transcript);
            if (event.results[0].isFinal) {
                this.generateResponse(transcript);
            }
        };

        this.recognition.onend = () => {
            if (this.isRecording && !this.processingResponse) {
                this.recognition.start();
            } else {
                this.updateRecordingUI(false);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.updateRecordingUI(false);
        };
    }

    setupChatInterface() {
        this.recordButton = document.getElementById('recordButton');
        this.recordingStatus = document.getElementById('recording-status');
        this.chatMessages = document.getElementById('chat-messages');
        this.currentMessage = null;

        this.recordButton.addEventListener('click', () => {
            if (!this.isRecording) {
                this.startRecording();
            } else {
                this.stopRecording();
            }
        });
    }

    startRecording() {
        if (this.processingResponse) return;

        this.isRecording = true;
        this.updateRecordingUI(true);
        
        // Create a new message container for this recording session
        this.currentMessage = document.createElement('div');
        this.currentMessage.classList.add('message', 'user-message');
        this.currentMessage.textContent = '';
        this.chatMessages.appendChild(this.currentMessage);
        
        this.recognition.start();
    }

    stopRecording() {
        this.isRecording = false;
        this.recognition.stop();
        this.updateRecordingUI(false);
        this.currentMessage = null;
    }

    updateRecordingUI(isRecording) {
        this.recordButton.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
        this.recordButton.classList.toggle('recording', isRecording);
        this.recordingStatus.textContent = isRecording ? 'Listening...' : 'Click to start speaking';
    }

    addMessageToChat(sender, text) {
        if (sender === 'user' && this.isRecording && this.currentMessage) {
            // Update the existing message during recording
            this.currentMessage.textContent = text;
        } else {
            // Create a new message for AI responses or when not recording
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', `${sender}-message`);
            messageDiv.textContent = text;
            this.chatMessages.appendChild(messageDiv);
        }
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    async generateResponse(userInput) {
        this.processingResponse = true;
        this.stopRecording();

        try {
            // Simulate AI response generation
            let response = await this.getAIResponse(userInput);
            
            // Add AI response to chat
            this.addMessageToChat('ai', response);

            // Convert response to speech and animate
            await this.facialAnimation.speakResponse(response);
        } catch (error) {
            console.error('Error generating response:', error);
            this.addMessageToChat('ai', 'I apologize, but I encountered an error. Please try again.');
        } finally {
            this.processingResponse = false;
        }
    }

    async getAIResponse(userInput) {
        try {
            const genAI = new GoogleGenerativeAI('AIzaSyCT43QYBuN8a4dA8Pq6i9wxXmgHPPnO8a0');
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

            const prompt = `You are a highly skilled, empathetic therapeutic human with expertise in evidence-based approaches including cognitive-behavioral therapy (CBT), mindfulness, and positive psychology. Your purpose is to provide supportive, reflective conversations while maintaining clear professional boundaries.

## Core Guidelines:
- Keep all responses concise, limited to 1-2 sentences maximum
- Practice active listening and validate emotions without judgment
- Use a warm, supportive tone with appropriate pacing
- Respond thoughtfully, reflecting the user's concerns with empathy
- Offer perspective and gentle reframing when appropriate
- Ask open-ended questions that promote self-reflection
- Provide evidence-based coping strategies and practical tools
- Maintain appropriate professional boundaries at all times

## Important Limitations:
- Clearly communicate you are not a licensed mental health professional
- Do not diagnose medical or psychiatric conditions
- Recommend professional help for serious concerns (suicidal thoughts, abuse, self-harm)
- Avoid making promises about outcomes or specific results
- Prioritize user safety above all else

## Session Structure:
1. Begin with a warm greeting and open-ended question about current concerns
2. Practice reflective listening to understand the underlying issues
3. Explore thoughts, feelings, and behaviors related to the situation
4. Collaborate on identifying patterns and potential areas for growth
5. Suggest relevant coping strategies or therapeutic techniques
6. Encourage small, achievable steps toward positive change
7. Close with validation and an invitation for further reflection

## Therapeutic Techniques:
- Cognitive restructuring for identifying and challenging unhelpful thoughts
- Mindfulness practices for grounding and present-moment awareness
- Values clarification to align actions with personal meaning
- Strengths-based approaches that build on existing resources
- Behavioral activation for depression and low motivation
- Emotion regulation strategies for intense feelings
- Problem-solving frameworks for navigating challenges

## Response Format:
- Always respond in just 1-2 concise sentences, even for complex topics
- Focus on the most essential insight or question in each response
- Use brief but impactful language that resonates emotionally
- When suggesting techniques, provide just one clear, actionable step

Always prioritize the user's wellbeing, maintain appropriate boundaries, and encourage professional help when needed. Respond to the following input from a client: "${userInput}"`;

            const result = await model.generateContent(prompt);
            const response = result.response.text();
            
            // Fallback responses in case of API failure
            if (!response) {
                return this.getFallbackResponse(userInput);
            }

            return response;
        } catch (error) {
            console.error('Error generating AI response:', error);
            return this.getFallbackResponse(userInput);
        }
    }

    getFallbackResponse(userInput) {
        const input = userInput.toLowerCase();
        
        // Handle repeated requests to talk
        if (input.includes('please') && (input.includes('talk') || input.includes('speak'))) {
            const conversationStarters = [
                "I'm here to listen and support you. What's on your mind today?",
                "I can hear that you want to talk. What would you like to share with me?",
                "You seem like you want to connect. I'm here for you - what would you like to discuss?"
            ];
            return conversationStarters[Math.floor(Math.random() * conversationStarters.length)];
        }

        // Default responses for when no specific keywords are matched
        const defaultResponses = [
            "I'm here to listen. What's on your mind?",
            "I understand. Would you like to tell me more?",
            "Your thoughts and feelings matter. What would you like to share?"
        ];

        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }
}

class FacialAnimationSystem {
    constructor() {
        this.initScene();
        this.initAudio();
        this.emotionalState = {
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
        
        // Start animation immediately
        this.animate();
        
        // Load the model
        this.loadFacialModel();
    }

    async loadFacialModel() {
        try {
            const modelLoader = new ModelLoader();
            const model = await modelLoader.loadModel('/assets/models/model_full.glb');
            
            // Position the model much lower for VR viewing
            model.position.set(0, 0.3, -1.0); // Reduced from 0.8 to 0.3 meters (much lower)
            this.scene.add(model);
            this.morphTargetMesh = modelLoader.findMorphTargetMesh(model);
            
            if (!this.morphTargetMesh) {
                throw new Error('No mesh with morph targets found in the model');
            }
            
            // Initialize morph target system
            this.initializeMorphTargets();
            
            // Set up audio element
            const audioElement = document.getElementById('audioInput');
            audioElement.loop = false;
            
            // Connect audio to analyzer
            this.audioSource = this.audioContext.createMediaElementSource(audioElement);
            this.audioSource.connect(this.analyzer);
            this.audioSource.connect(this.audioContext.destination);
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

    initScene() {
        // Three.js setup
        this.scene = new THREE.Scene();
        
        // Calculate aspect ratio based on container size
        const container = document.getElementById('animation-container');
        const aspect = container.clientWidth / container.clientHeight;
        
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000); // Wider FOV for VR
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        
        // Enable VR with specific XR features
        this.renderer.xr.enabled = true;
        
        // Enable tone mapping and correct color space
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);

        // Create VR Button with mobile VR support
        const createVRButton = () => {
            const button = document.createElement('button');
            button.className = 'vr-button';
            button.textContent = 'ENTER VR MODE';
            
            // Style the button for better mobile visibility
            const style = document.createElement('style');
            style.textContent = `
                .vr-button {
                    position: fixed;
                    bottom: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 20px 40px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 30px;
                    cursor: pointer;
                    z-index: 999;
                    font-size: 24px;
                    font-weight: bold;
                    box-shadow: 0 6px 12px rgba(0,0,0,0.3);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    -webkit-tap-highlight-color: transparent;
                    transition: all 0.3s ease;
                    width: 80%;
                    max-width: 300px;
                }
                .vr-button:hover {
                    background: #45a049;
                    transform: translateX(-50%) scale(1.05);
                }
                .vr-button:active {
                    transform: translateX(-50%) scale(0.95);
                }
                @media (max-width: 768px) {
                    .vr-button {
                        bottom: 40px;
                        padding: 24px 40px;
                        font-size: 28px;
                        width: 90%;
                    }
                }
            `;
            document.head.appendChild(style);

            // Handle VR session with specific configuration for mobile VR
            button.addEventListener('click', async () => {
                try {
                    if (navigator.xr) {
                        const session = await navigator.xr.requestSession('immersive-vr', {
                            optionalFeatures: [
                                'local-floor',
                                'bounded-floor',
                                'hand-tracking',
                                'layers'
                            ]
                        });
                        
                        await this.renderer.xr.setSession(session);
                        
                        // Reset camera position when entering VR
                        this.camera.position.set(0, 0.3, 1.0);
                        this.camera.lookAt(0, 0.3, -1.0);
                        
                        button.textContent = 'Exit VR';
                        
                        session.addEventListener('end', () => {
                            button.textContent = 'ENTER VR MODE';
                            this.renderer.xr.setSession(null);
                        });
                    } else {
                        alert('WebXR not available on your device. Please use a WebXR-compatible browser and VR headset.');
                    }
                } catch (error) {
                    console.error('VR initialization error:', error);
                    alert('Unable to enter VR. Make sure you have a compatible VR viewer and are using HTTPS.');
                }
            });

            return button;
        };

        // Add VR button to container
        const vrButton = createVRButton();
        container.appendChild(vrButton);

        // Position camera for comfortable viewing in VR
        this.camera.position.set(0, 0.3, 1.0); // Adjusted to match new model height
        this.camera.lookAt(0, 0.3, 0);

        // Set up the scene environment
        this.scene.background = new THREE.Color(0x1a1a1a);

        // Lighting setup optimized for VR
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Adjust lights to match new model position
        const frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
        frontLight.position.set(0, 0.5, 1.5); // Keep light slightly above head
        frontLight.target.position.set(0, 0.3, -1.0); // Point at new model position
        frontLight.castShadow = true;
        this.scene.add(frontLight);
        this.scene.add(frontLight.target);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-2, 1.6, 0);
        this.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
        rimLight.position.set(0, 1.7, -2);
        this.scene.add(rimLight);

        // Controls for non-VR mode
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        this.controls.minDistance = 1.0;
        this.controls.maxDistance = 3.0;
        this.controls.target.set(0, 0.3, -1.0); // Updated orbit controls target

        // Handle window resizing
        window.addEventListener('resize', () => {
            const container = document.getElementById('animation-container');
            const aspect = container.clientWidth / container.clientHeight;
            this.camera.aspect = aspect;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        });

        // Animation loop with VR support
        const animate = () => {
            this.renderer.setAnimationLoop(() => {
                // Update controls only in non-VR mode
                if (!this.renderer.xr.isPresenting) {
                    this.controls.update();
                }
                
                // Update morph targets
                this.updateMorphTargets();
                
                // Render scene
                this.renderer.render(this.scene, this.camera);
            });
        };

        animate();
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

    updateMorphTargets() {
        if (!this.morphTargetMesh) return;

        // Reset all morph target influences
        this.morphTargetMesh.morphTargetInfluences.fill(0);
        
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

    applyAudioExpressions() {
        if (!this.morphTargetMesh || !this.isAudioPlaying) return;
        
        const audioIntensity = this.handleAudioData();
        
        // Get frequency data for detailed analysis
        const frequencies = [...this.dataArray];
        // Analyze different frequency ranges for different phoneme types
        const bassIntensity = frequencies.slice(0, 10).reduce((a, b) => a + b, 0) / 1280; // Low frequencies (0-200Hz)
        const midLowIntensity = frequencies.slice(10, 20).reduce((a, b) => a + b, 0) / 1280; // Mid-low (200-400Hz)
        const midIntensity = frequencies.slice(20, 30).reduce((a, b) => a + b, 0) / 2560; // Mid (400-800Hz)
        const highIntensity = frequencies.slice(30, 50).reduce((a, b) => a + b, 0) / 2560; // High (800Hz+)

        if (audioIntensity > 0.1) {
            // Base mouth opening - slightly increased but still controlled
            const mouthOpenAmount = Math.min(0.11, audioIntensity * 0.15); // Increased from 0.08 to 0.11
            this.applyMorphTarget("mouthOpen", mouthOpenAmount);
            this.applyMorphTarget("jawOpen", mouthOpenAmount * 0.12); // Slightly increased jaw movement

            // Keep mouth naturally positioned with lip control
            this.applyMorphTarget("mouthClose", Math.max(0, 0.15 - mouthOpenAmount)); // Reduced closure for more opening
            
            // Dynamic teeth visibility control - adjusted for slightly more open mouth
            this.applyMorphTarget("mouthRollUpper", Math.max(0, 0.2 - mouthOpenAmount * 1.5));
            this.applyMorphTarget("mouthRollLower", Math.max(0, 0.15 - mouthOpenAmount * 1.2));

            // Natural lip movement
            this.applyMorphTarget("mouthShrugUpper", mouthOpenAmount * 0.1);
            this.applyMorphTarget("mouthShrugLower", mouthOpenAmount * 0.08);

            // Phoneme-specific mouth shapes with natural opening
            if (bassIntensity > 0.3) {
                // O/U sounds (boot, moon) - round shapes
                this.applyMorphTarget("viseme_O", bassIntensity * 0.1);
                this.applyMorphTarget("viseme_U", bassIntensity * 0.08);
                this.applyMorphTarget("mouthPucker", bassIntensity * 0.06);
                this.applyMorphTarget("mouthFunnel", bassIntensity * 0.05);
                // Natural lip roll for O/U sounds
                this.applyMorphTarget("mouthRollUpper", bassIntensity * 0.15);
                this.applyMorphTarget("mouthRollLower", bassIntensity * 0.15);
            }
            
            if (midLowIntensity > 0.25) {
                // A sounds (father) - natural opening
                this.applyMorphTarget("viseme_aa", midLowIntensity * 0.12);
                this.applyMorphTarget("mouthStretchLeft", midLowIntensity * 0.04);
                this.applyMorphTarget("mouthStretchRight", midLowIntensity * 0.04);
                // Natural lip movement for A sounds
                this.applyMorphTarget("mouthUpperUpLeft", midLowIntensity * 0.03);
                this.applyMorphTarget("mouthUpperUpRight", midLowIntensity * 0.03);
                this.applyMorphTarget("mouthLowerDownLeft", midLowIntensity * 0.02);
                this.applyMorphTarget("mouthLowerDownRight", midLowIntensity * 0.02);
            }

            if (midIntensity > 0.25) {
                // E/I sounds (bee, see) - natural spread
                this.applyMorphTarget("viseme_E", midIntensity * 0.08);
                this.applyMorphTarget("viseme_I", midIntensity * 0.07);
                this.applyMorphTarget("mouthSmileLeft", midIntensity * 0.04);
                this.applyMorphTarget("mouthSmileRight", midIntensity * 0.04);
                // Natural teeth exposure
                this.applyMorphTarget("mouthUpperUpLeft", midIntensity * 0.02);
                this.applyMorphTarget("mouthUpperUpRight", midIntensity * 0.02);
            }
            
            if (highIntensity > 0.3) {
                // Consonants (S, T, F) - clear but controlled movements
                this.applyMorphTarget("viseme_FF", highIntensity * 0.06);
                this.applyMorphTarget("viseme_TH", highIntensity * 0.05);
                this.applyMorphTarget("viseme_DD", highIntensity * 0.04);
                this.applyMorphTarget("viseme_kk", highIntensity * 0.04);
                this.applyMorphTarget("viseme_SS", highIntensity * 0.05);
                // Natural mouth position during consonants
                this.applyMorphTarget("mouthRollUpper", Math.max(0, 0.12 - highIntensity * 0.1));
                this.applyMorphTarget("mouthRollLower", Math.max(0, 0.12 - highIntensity * 0.1));
            }

            // Natural jaw movement
            const jawMovement = Math.sin(performance.now() * 0.003) * 0.025; // Slightly increased
            this.applyMorphTarget("jawLeft", Math.max(0, jawMovement) * audioIntensity * 0.04);
            this.applyMorphTarget("jawRight", Math.max(0, -jawMovement) * audioIntensity * 0.04);
            this.applyMorphTarget("jawForward", audioIntensity * 0.015);

            // Natural facial expressions
            if (audioIntensity > 0.6) {
                this.applyMorphTarget("browInnerUp", audioIntensity * 0.03);
                this.applyMorphTarget("eyeWideLeft", audioIntensity * 0.02);
                this.applyMorphTarget("eyeWideRight", audioIntensity * 0.02);
            }

            // Natural cheek movement
            if (bassIntensity > 0.5) {
                this.applyMorphTarget("cheekPuff", bassIntensity * 0.03);
            }

        } else {
            // Resting face - natural closed position
            this.applyMorphTarget("viseme_sil", 0.35); // Slightly reduced for more natural rest
            this.applyMorphTarget("mouthClose", 0.2); // Slightly reduced closure
            this.applyMorphTarget("mouthRollUpper", 0.15); // More natural lip position
            this.applyMorphTarget("mouthRollLower", 0.15); // More natural lip position
            
            // Subtle idle movement
            const idleTime = performance.now() * 0.0001;
            const subtleMovement = Math.sin(idleTime) * 0.008; // Slightly increased
            this.applyMorphTarget("mouthLeft", Math.max(0, subtleMovement) * 0.008);
            this.applyMorphTarget("mouthRight", Math.max(0, -subtleMovement) * 0.008);
        }
    }

    handleAudioData() {
        if (!this.analyzer || !this.dataArray || !this.isAudioPlaying) return 0;
        
        this.analyzer.getByteFrequencyData(this.dataArray);
        
        // Focus on speech frequencies (85-255 Hz for fundamental frequency)
        const speechFreqs = this.dataArray.slice(2, 30);
        const sum = speechFreqs.reduce((a, b) => a + b, 0);
        const averageFrequency = sum / speechFreqs.length;
        
        // Very conservative normalization
        const normalizedValue = Math.min(0.3, averageFrequency / 255); // Further reduced max value
        if (!this.lastAudioValue) this.lastAudioValue = normalizedValue;
        
        // Extra smooth transition
        this.lastAudioValue = this.smoothValue(this.lastAudioValue, normalizedValue, 0.08);
        
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

    async speakResponse(text) {
        if (!this.morphTargetMesh) return;

        try {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            const audioElement = document.getElementById('audioInput');
            
            // Generate speech from text
            const audioUrl = await window.chatbot.ttsService.textToSpeech(text);
            
            // Set the new audio source
            audioElement.src = audioUrl;
            
            // Reset audio playback
            audioElement.currentTime = 0;
            
            // Start facial animation
            this.isAudioPlaying = true;
            
            // Play the audio
            await audioElement.play();
            
            return new Promise((resolve) => {
                audioElement.onended = () => {
                    this.isAudioPlaying = false;
                    // Return to neutral expression
                    this.morphTargetMesh.morphTargetInfluences.fill(0);
                    // Clean up the temporary audio URL
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                };
            });
        } catch (error) {
            console.error('Error in speech response:', error);
            this.isAudioPlaying = false;
            throw error;
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const chatbot = new ChatbotSystem();
    window.chatbot = chatbot; // Make it accessible for debugging
}); 
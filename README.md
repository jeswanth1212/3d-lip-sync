# Facial Animation System

A sophisticated facial animation system that synchronizes with audio and video input to create realistic facial expressions and movements. The system uses morph targets to control various facial features and responds to both audio input and emotional states.

## Features

- Real-time facial animation with audio synchronization
- Natural eye movements and blinking
- Multiple emotional expressions (happiness, surprise, thoughtful)
- Audio-driven viseme generation for lip sync
- Smooth transitions between expressions
- Interactive controls for emotion adjustment

## Prerequisites

- Node.js (v14 or higher)
- Modern web browser with WebGL support
- Webcam and microphone access

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Click the "Start Animation" button to begin
2. Grant permission for camera and microphone access when prompted
3. Use the emotion sliders to adjust the facial expressions:
   - Happiness: Controls smile and cheek movements
   - Surprise: Controls eye widening and eyebrow raising
   - Thoughtful: Controls subtle eye and eyebrow movements

## Technical Details

The system uses the following technologies:
- Three.js for 3D rendering
- Web Audio API for audio analysis
- Tone.js for advanced audio processing
- MediaStream API for camera/microphone access

## Supported Morph Targets

The system supports a wide range of morph targets for facial expressions, including:
- Eye movements (look directions, blinking, squinting)
- Eyebrow controls
- Mouth shapes and expressions
- Cheek and nose movements
- Jaw controls
- Visemes for speech

## License

MIT License 
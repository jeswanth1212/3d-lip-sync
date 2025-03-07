import React, { useState, useRef, useEffect } from 'react';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useAI } from '../hooks/useAI';
import { elevenLabsService } from '../services/elevenLabsService';
import { FacialAnimationSystem } from '../main';

export const TherapistChatbot = () => {
    const [messages, setMessages] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const audioRef = useRef(null);
    const animationSystemRef = useRef(null);

    const { transcript, startListening, stopListening, isSupported } = useVoiceRecognition();
    const { generateResponse } = useAI();

    useEffect(() => {
        // Initialize the facial animation system
        animationSystemRef.current = new FacialAnimationSystem();
        
        // Clean up
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
        };
    }, []);

    const handleStartRecording = () => {
        setIsRecording(true);
        startListening();
    };

    const handleStopRecording = async () => {
        setIsRecording(false);
        stopListening();
        
        if (transcript) {
            setLoading(true);
            // Add user message
            setMessages(prev => [...prev, { text: transcript, sender: 'user' }]);
            
            try {
                // Generate AI response
                const response = await generateResponse(transcript);
                
                // Add AI message
                setMessages(prev => [...prev, { text: response, sender: 'ai' }]);
                
                // Convert to speech and play
                const audioUrl = await elevenLabsService.textToSpeech(response);
                
                if (audioRef.current) {
                    audioRef.current.src = audioUrl;
                    audioRef.current.play();
                    setIsPlaying(true);
                    
                    // Start facial animation
                    if (animationSystemRef.current) {
                        animationSystemRef.current.isAudioPlaying = true;
                    }
                }
            } catch (error) {
                console.error('Error processing response:', error);
                setMessages(prev => [...prev, { 
                    text: "I apologize, but I'm having trouble responding right now. Please try again.", 
                    sender: 'ai' 
                }]);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleAudioEnd = () => {
        setIsPlaying(false);
        if (animationSystemRef.current) {
            animationSystemRef.current.isAudioPlaying = false;
        }
    };

    return (
        <div className="therapist-chatbot">
            <div id="animation-container"></div>
            
            <div className="chat-section">
                <div className="messages">
                    {messages.map((message, index) => (
                        <div key={index} className={`message ${message.sender}`}>
                            {message.text}
                        </div>
                    ))}
                </div>

                <div className="controls">
                    <button
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        disabled={!isSupported || loading || isPlaying}
                    >
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </button>
                    {loading && <span className="loading-indicator">Processing...</span>}
                </div>
            </div>

            <audio
                ref={audioRef}
                onEnded={handleAudioEnd}
                style={{ display: 'none' }}
            />
        </div>
    );
}; 
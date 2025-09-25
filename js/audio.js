/**
 * Audio Manager Module
 * Handles sound alerts and audio notifications
 */

export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
        this.volume = 0.7;
        this.eventListeners = {};
        
        // Sound settings
        this.sounds = {
            alert: {
                frequency: 800,
                duration: 0.3,
                type: 'sine'
            },
            success: {
                frequency: 600,
                duration: 0.2,
                type: 'sine'
            },
            error: {
                frequency: 300,
                duration: 0.5,
                type: 'sine'
            },
            notification: {
                frequency: 1000,
                duration: 0.1,
                type: 'sine'
            }
        };

        // Pre-loaded audio files (optional)
        this.audioFiles = {};
        
        // Initialize audio context
        this.init();
    }

    /**
     * Initialize audio context
     */
    async init() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Handle browser autoplay policy
            if (this.audioContext.state === 'suspended') {
                console.log('🔊 Audio context suspended - waiting for user interaction');
                
                // Set up multiple event listeners for user interaction
                const resumeOnInteraction = () => this.resumeAudioContext();
                
                // Listen for various user interactions
                document.addEventListener('click', resumeOnInteraction, { once: true });
                document.addEventListener('keydown', resumeOnInteraction, { once: true });
                document.addEventListener('touchstart', resumeOnInteraction, { once: true });
                document.addEventListener('touchend', resumeOnInteraction, { once: true });
                document.addEventListener('mousedown', resumeOnInteraction, { once: true });
                
                // Also listen for button interactions specifically
                setTimeout(() => {
                    const buttons = document.querySelectorAll('button');
                    buttons.forEach(button => {
                        button.addEventListener('click', resumeOnInteraction, { once: true });
                    });
                }, 1000);
                
            } else {
                this.isInitialized = true;
                this.emit('ready');
            }
            
            console.log('🔊 Audio Manager initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Audio Manager:', error);
            this.emit('error', error);
        }
    }

    /**
     * Resume audio context (for autoplay policy) - improved version
     */
    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                this.isInitialized = true;
                this.emit('ready');
                console.log('🔊 Audio context resumed');
                
                // Remove any remaining event listeners since we're now ready
                document.removeEventListener('click', this.resumeAudioContext);
                document.removeEventListener('keydown', this.resumeAudioContext);
                document.removeEventListener('touchstart', this.resumeAudioContext);
                
            } catch (error) {
                console.error('❌ Failed to resume audio context:', error);
                
                // Try to create a new audio context if resuming fails
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    this.isInitialized = true;
                    this.emit('ready');
                    console.log('🔊 Created new audio context');
                } catch (newError) {
                    console.error('❌ Failed to create new audio context:', newError);
                }
            }
        }
    }

    /**
     * Play alert sound for box detection issues - improved version
     * @param {string} type - Alert type ('alert', 'success', 'error', 'notification')
     * @param {number} repeat - Number of times to repeat (default: 2)
     */
    async playAlert(type = 'alert', repeat = 2) {
        // Try to ensure audio context is ready before playing
        if (!this.isInitialized && this.audioContext && this.audioContext.state === 'suspended') {
            await this.resumeAudioContext();
        }
        
        if (!this.isInitialized) {
            console.warn('⚠️ Audio not initialized - attempting to play without audio context');
            // Try to initialize audio context again
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                await this.resumeAudioContext();
            } catch (error) {
                console.warn('⚠️ Could not initialize audio:', error);
                return;
            }
        }

        try {
            const soundConfig = this.sounds[type] || this.sounds.alert;
            
            // Play the alert sound with repetition
            for (let i = 0; i < repeat; i++) {
                setTimeout(() => {
                    this.playBeep(
                        soundConfig.frequency,
                        soundConfig.duration,
                        soundConfig.type
                    );
                }, i * (soundConfig.duration + 0.1) * 1000);
            }
            
            this.emit('alertPlayed', { type, repeat });
            
        } catch (error) {
            console.error('❌ Error playing alert:', error);
            this.emit('error', error);
        }
    }

    /**
     * Play a simple beep sound
     * @param {number} frequency - Sound frequency in Hz
     * @param {number} duration - Sound duration in seconds
     * @param {string} type - Oscillator type ('sine', 'square', 'sawtooth', 'triangle')
     */
    playBeep(frequency = 800, duration = 0.3, type = 'sine') {
        if (!this.isInitialized || !this.audioContext) return;

        try {
            // Create oscillator
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Configure oscillator
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = type;
            
            // Configure gain (volume envelope)
            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(this.volume, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            // Start and stop
            oscillator.start(now);
            oscillator.stop(now + duration);
            
        } catch (error) {
            console.error('❌ Error playing beep:', error);
        }
    }

    /**
     * Play a sequence of tones
     * @param {Array} sequence - Array of {frequency, duration, delay} objects
     */
    playSequence(sequence) {
        if (!this.isInitialized) return;

        let totalDelay = 0;
        
        sequence.forEach(({ frequency, duration, delay = 0 }) => {
            setTimeout(() => {
                this.playBeep(frequency, duration);
            }, totalDelay * 1000);
            
            totalDelay += duration + delay;
        });
    }

    /**
     * Play success sound (ascending tones)
     */
    playSuccess() {
        const sequence = [
            { frequency: 523, duration: 0.15 }, // C5
            { frequency: 659, duration: 0.15 }, // E5
            { frequency: 784, duration: 0.3 }   // G5
        ];
        
        this.playSequence(sequence);
        this.emit('successPlayed');
    }

    /**
     * Play error sound (descending tones)
     */
    playError() {
        const sequence = [
            { frequency: 400, duration: 0.2 },
            { frequency: 350, duration: 0.2 },
            { frequency: 300, duration: 0.4 }
        ];
        
        this.playSequence(sequence);
        this.emit('errorPlayed');
    }

    /**
     * Play notification sound (quick chirp)
     */
    playNotification() {
        this.playBeep(1000, 0.1);
        this.emit('notificationPlayed');
    }

    /**
     * Load audio file from URL
     * @param {string} name - Audio file identifier
     * @param {string} url - Audio file URL
     */
    async loadAudioFile(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            this.audioFiles[name] = audioBuffer;
            console.log(`🔊 Loaded audio file: ${name}`);
            
            this.emit('fileLoaded', { name, url });
            
        } catch (error) {
            console.error(`❌ Error loading audio file ${name}:`, error);
            this.emit('error', error);
        }
    }

    /**
     * Play loaded audio file
     * @param {string} name - Audio file identifier
     * @param {number} volume - Volume (0.0 to 1.0)
     */
    playAudioFile(name, volume = this.volume) {
        if (!this.isInitialized || !this.audioFiles[name]) {
            console.warn(`⚠️ Audio file "${name}" not loaded or audio not initialized`);
            return;
        }

        try {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = this.audioFiles[name];
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            source.start();
            
            this.emit('filePlayed', { name, volume });
            
        } catch (error) {
            console.error(`❌ Error playing audio file ${name}:`, error);
        }
    }

    /**
     * Create custom alert pattern
     * @param {Object} pattern - Alert pattern configuration
     */
    createAlertPattern(pattern) {
        const {
            frequencies = [800, 1000],
            durations = [0.2, 0.2],
            gaps = [0.1],
            repeats = 2,
            type = 'sine'
        } = pattern;

        if (!this.isInitialized) return;

        let currentTime = 0;
        
        for (let repeat = 0; repeat < repeats; repeat++) {
            frequencies.forEach((frequency, index) => {
                const duration = durations[index] || durations[0];
                const gap = gaps[index] || gaps[0] || 0.1;
                
                setTimeout(() => {
                    this.playBeep(frequency, duration, type);
                }, currentTime * 1000);
                
                currentTime += duration + gap;
            });
            
            // Add gap between repeats
            if (repeat < repeats - 1) {
                currentTime += 0.3;
            }
        }
    }

    /**
     * Play voice alert using Speech Synthesis API
     * @param {string} message - Message to speak
     * @param {Object} options - Speech options
     */
    playVoiceAlert(message, options = {}) {
        if (!window.speechSynthesis) {
            console.warn('⚠️ Speech Synthesis not supported');
            return;
        }

        try {
            // Cancel any ongoing speech
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(message);
            
            // Configure speech options
            utterance.lang = options.lang || 'th-TH';
            utterance.volume = options.volume || this.volume;
            utterance.rate = options.rate || 1.0;
            utterance.pitch = options.pitch || 1.0;
            
            // Event handlers
            utterance.onstart = () => this.emit('voiceStarted', message);
            utterance.onend = () => this.emit('voiceEnded', message);
            utterance.onerror = (error) => this.emit('voiceError', error);
            
            speechSynthesis.speak(utterance);
            
            console.log(`🗣️ Speaking: "${message}"`);
            
        } catch (error) {
            console.error('❌ Error playing voice alert:', error);
            this.emit('error', error);
        }
    }

    /**
     * Set master volume
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        console.log(`🔊 Volume set to: ${Math.round(this.volume * 100)}%`);
        this.emit('volumeChanged', this.volume);
    }

    /**
     * Get current volume
     * @returns {number} Current volume level
     */
    getVolume() {
        return this.volume;
    }

    /**
     * Mute/unmute audio
     * @param {boolean} muted - Mute state
     */
    setMuted(muted) {
        this.volume = muted ? 0 : 0.7;
        this.emit('muteChanged', muted);
        console.log(`🔊 Audio ${muted ? 'muted' : 'unmuted'}`);
    }

    /**
     * Test audio system
     */
    testAudio() {
        console.log('🔊 Testing audio system...');
        
        // Test beep sounds
        setTimeout(() => this.playBeep(440, 0.2), 0);      // A4
        setTimeout(() => this.playBeep(523, 0.2), 300);    // C5
        setTimeout(() => this.playBeep(659, 0.2), 600);    // E5
        
        // Test alert
        setTimeout(() => this.playAlert('alert', 1), 1000);
        
        // Test voice (if available)
        setTimeout(() => {
            this.playVoiceAlert('ระบบเสียงทำงานปกติ', { lang: 'th-TH' });
        }, 2000);
        
        this.emit('testCompleted');
    }

    /**
     * Get available voices for speech synthesis
     * @returns {Array} Array of available voices
     */
    getAvailableVoices() {
        if (!window.speechSynthesis) return [];
        
        return speechSynthesis.getVoices().map(voice => ({
            name: voice.name,
            lang: voice.lang,
            default: voice.default
        }));
    }

    /**
     * Create audio context info
     * @returns {Object} Audio context information
     */
    getAudioContextInfo() {
        if (!this.audioContext) return null;
        
        return {
            state: this.audioContext.state,
            sampleRate: this.audioContext.sampleRate,
            baseLatency: this.audioContext.baseLatency,
            outputLatency: this.audioContext.outputLatency
        };
    }

    /**
     * Check if audio is supported
     * @returns {boolean} Whether audio is supported
     */
    static isSupported() {
        return !!(window.AudioContext || window.webkitAudioContext);
    }

    /**
     * Check if speech synthesis is supported
     * @returns {boolean} Whether speech synthesis is supported
     */
    static isSpeechSupported() {
        return !!window.speechSynthesis;
    }

    /**
     * Create frequency sweep (for testing)
     * @param {number} startFreq - Starting frequency
     * @param {number} endFreq - Ending frequency
     * @param {number} duration - Sweep duration
     */
    playSweep(startFreq = 200, endFreq = 2000, duration = 2.0) {
        if (!this.isInitialized) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            const now = this.audioContext.currentTime;
            
            // Frequency sweep
            oscillator.frequency.setValueAtTime(startFreq, now);
            oscillator.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
            
            // Volume envelope
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.5, now + 0.1);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.5, now + duration - 0.1);
            gainNode.gain.linearRampToValueAtTime(0, now + duration);
            
            oscillator.start(now);
            oscillator.stop(now + duration);
            
        } catch (error) {
            console.error('❌ Error playing sweep:', error);
        }
    }

    /**
     * Create white noise (for testing)
     * @param {number} duration - Noise duration
     * @param {number} volume - Noise volume
     */
    playWhiteNoise(duration = 1.0, volume = 0.1) {
        if (!this.isInitialized) return;

        try {
            const bufferSize = this.audioContext.sampleRate * duration;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            // Generate white noise
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * volume;
            }
            
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);
            source.start();
            
        } catch (error) {
            console.error('❌ Error playing white noise:', error);
        }
    }

    /**
     * Get system audio preferences
     * @returns {Object} Audio preferences
     */
    getPreferences() {
        return {
            volume: this.volume,
            soundEnabled: this.isInitialized,
            voiceEnabled: AudioManager.isSpeechSupported(),
            audioContextInfo: this.getAudioContextInfo()
        };
    }

    /**
     * Event system methods
     */
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.eventListeners[event]) return;
        
        const index = this.eventListeners[event].indexOf(callback);
        if (index > -1) {
            this.eventListeners[event].splice(index, 1);
        }
    }

    emit(event, data = null) {
        if (!this.eventListeners[event]) return;
        
        this.eventListeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Error in audio event listener for '${event}':`, error);
            }
        });
    }

    /**
     * Get status information
     * @returns {Object} Audio manager status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            volume: this.volume,
            audioContextState: this.audioContext?.state,
            loadedFiles: Object.keys(this.audioFiles),
            speechSupported: AudioManager.isSpeechSupported()
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Stop speech synthesis
        if (window.speechSynthesis) {
            speechSynthesis.cancel();
        }
        
        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        // Clear resources
        this.audioFiles = {};
        this.eventListeners = {};
        this.isInitialized = false;
        
        console.log('🔊 Audio Manager destroyed');
    }
}
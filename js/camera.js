/**
 * Camera Manager Module
 * Handles webcam/camera operations for the visual control system
 */

export class CameraManager {
    constructor() {
        this.stream = null;
        this.videoElement = null;
        this.isActive = false;
        this.frameRate = 0;
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.eventListeners = {};
        
        // Camera settings
        this.settings = {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 30, min: 15, max: 60 },
            facingMode: 'environment', // prefer back camera on mobile
            aspectRatio: { ideal: 16/9 }
        };
    }

    /**
     * Start camera with given video element
     * @param {HTMLVideoElement} videoElement - Video element to stream to
     */
    async start(videoElement) {
        try {
            this.videoElement = videoElement;
            
            // Request camera permissions
            await this.requestCameraPermission();
            
            // Get media stream
            this.stream = await this.getMediaStream();
            
            // Setup video element
            this.setupVideoElement();
            
            // Start frame rate monitoring
            this.startFrameRateMonitoring();
            
            this.isActive = true;
            this.emit('started', {
                width: this.videoElement.videoWidth,
                height: this.videoElement.videoHeight
            });
            
            console.log('📹 Camera started successfully');
            
        } catch (error) {
            console.error('❌ Failed to start camera:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Stop camera and clean up resources
     */
    stop() {
        try {
            if (this.stream) {
                this.stream.getTracks().forEach(track => {
                    track.stop();
                });
                this.stream = null;
            }

            if (this.videoElement) {
                this.videoElement.srcObject = null;
            }

            this.isActive = false;
            this.frameRate = 0;
            
            this.emit('stopped');
            console.log('📹 Camera stopped');
            
        } catch (error) {
            console.error('❌ Error stopping camera:', error);
        }
    }

    /**
     * Request camera permission
     */
    async requestCameraPermission() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera API not supported in this browser');
        }

        // Check if permission is already granted
        if (navigator.permissions) {
            const permission = await navigator.permissions.query({ name: 'camera' });
            if (permission.state === 'denied') {
                throw new Error('Camera permission denied');
            }
        }
    }

    /**
     * Get media stream with best available settings
     */
    async getMediaStream() {
        const constraints = {
            video: this.settings,
            audio: false
        };

        try {
            // Try with ideal settings first
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
            console.warn('⚠️ Failed with ideal settings, trying fallback:', error.message);
            
            // Fallback to basic settings
            const fallbackConstraints = {
                video: {
                    width: { min: 640 },
                    height: { min: 480 },
                    frameRate: { min: 15 }
                },
                audio: false
            };
            
            try {
                return await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            } catch (fallbackError) {
                console.warn('⚠️ Fallback failed, using any available camera');
                
                // Last resort - any camera
                return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            }
        }
    }

    /**
     * Setup video element with stream
     */
    setupVideoElement() {
        if (!this.videoElement || !this.stream) return;

        this.videoElement.srcObject = this.stream;
        this.videoElement.playsInline = true;
        this.videoElement.muted = true;
        
        // Wait for metadata to load
        return new Promise((resolve, reject) => {
            this.videoElement.onloadedmetadata = () => {
                this.videoElement.play()
                    .then(() => {
                        console.log(`📹 Video resolution: ${this.videoElement.videoWidth}x${this.videoElement.videoHeight}`);
                        resolve();
                    })
                    .catch(reject);
            };
            
            this.videoElement.onerror = reject;
        });
    }

    /**
     * Start monitoring frame rate
     */
    startFrameRateMonitoring() {
        const updateFrameRate = () => {
            if (!this.isActive) return;

            const now = performance.now();
            this.frameCount++;

            if (now - this.lastFrameTime >= 1000) { // Update every second
                this.frameRate = Math.round(this.frameCount * 1000 / (now - this.lastFrameTime));
                this.frameCount = 0;
                this.lastFrameTime = now;
                
                this.emit('frameUpdate', {
                    fps: this.frameRate,
                    width: this.videoElement?.videoWidth || 0,
                    height: this.videoElement?.videoHeight || 0,
                    timestamp: now
                });
            }

            requestAnimationFrame(updateFrameRate);
        };

        this.lastFrameTime = performance.now();
        updateFrameRate();
    }

    /**
     * Capture current frame as ImageData
     * @returns {ImageData|null} Current frame data
     */
    captureFrame() {
        if (!this.videoElement || !this.isActive) {
            console.warn('⚠️ Cannot capture frame: camera not active');
            return null;
        }

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = this.videoElement.videoWidth;
            canvas.height = this.videoElement.videoHeight;
            
            ctx.drawImage(this.videoElement, 0, 0);
            
            return {
                imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
                width: canvas.width,
                height: canvas.height,
                timestamp: performance.now()
            };
            
        } catch (error) {
            console.error('❌ Error capturing frame:', error);
            return null;
        }
    }

    /**
     * Get current frame data for processing
     * @returns {Object|null} Frame data object
     */
    getCurrentFrame() {
        return this.captureFrame();
    }

    /**
     * Take a snapshot and return as blob
     * @param {string} format - Image format (jpeg, png, webp)
     * @param {number} quality - Image quality (0.0 to 1.0)
     * @returns {Promise<Blob>} Image blob
     */
    async takeSnapshot(format = 'jpeg', quality = 0.9) {
        if (!this.videoElement || !this.isActive) {
            throw new Error('Cannot take snapshot: camera not active');
        }

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = this.videoElement.videoWidth;
            canvas.height = this.videoElement.videoHeight;
            
            ctx.drawImage(this.videoElement, 0, 0);
            
            return new Promise((resolve) => {
                canvas.toBlob(resolve, `image/${format}`, quality);
            });
            
        } catch (error) {
            console.error('❌ Error taking snapshot:', error);
            throw error;
        }
    }

    /**
     * Download current frame as image
     * @param {string} filename - Download filename
     */
    async downloadSnapshot(filename = `visual-control-${Date.now()}.jpg`) {
        try {
            const blob = await this.takeSnapshot('jpeg', 0.9);
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('❌ Error downloading snapshot:', error);
        }
    }

    /**
     * Get available camera devices
     * @returns {Promise<Array>} Array of camera devices
     */
    async getAvailableCameras() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                throw new Error('Device enumeration not supported');
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
            
        } catch (error) {
            console.error('❌ Error getting camera devices:', error);
            return [];
        }
    }

    /**
     * Switch to different camera device
     * @param {string} deviceId - Camera device ID
     */
    async switchCamera(deviceId) {
        try {
            if (!this.isActive) {
                throw new Error('Cannot switch camera: not currently active');
            }

            // Stop current stream
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }

            // Update settings with new device
            const newSettings = {
                ...this.settings,
                deviceId: { exact: deviceId }
            };

            // Get new stream
            const constraints = {
                video: newSettings,
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.setupVideoElement();

            this.emit('cameraChanged', { deviceId });
            console.log('📹 Switched to camera:', deviceId);
            
        } catch (error) {
            console.error('❌ Error switching camera:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Update camera settings
     * @param {Object} newSettings - New camera settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        console.log('📹 Camera settings updated:', this.settings);
    }

    /**
     * Get current camera capabilities
     * @returns {Object|null} Camera capabilities
     */
    getCapabilities() {
        if (!this.stream) return null;

        try {
            const track = this.stream.getVideoTracks()[0];
            return track.getCapabilities();
        } catch (error) {
            console.error('❌ Error getting camera capabilities:', error);
            return null;
        }
    }

    /**
     * Get current camera settings
     * @returns {Object|null} Current camera settings
     */
    getCurrentSettings() {
        if (!this.stream) return null;

        try {
            const track = this.stream.getVideoTracks()[0];
            return track.getSettings();
        } catch (error) {
            console.error('❌ Error getting camera settings:', error);
            return null;
        }
    }

    /**
     * Apply camera constraints
     * @param {Object} constraints - Camera constraints to apply
     */
    async applyConstraints(constraints) {
        if (!this.stream) {
            throw new Error('Cannot apply constraints: camera not active');
        }

        try {
            const track = this.stream.getVideoTracks()[0];
            await track.applyConstraints(constraints);
            
            this.emit('constraintsApplied', constraints);
            console.log('📹 Camera constraints applied:', constraints);
            
        } catch (error) {
            console.error('❌ Error applying constraints:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Check if camera is supported
     * @returns {boolean} Whether camera is supported
     */
    static isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Get camera permission status
     * @returns {Promise<string>} Permission status
     */
    static async getPermissionStatus() {
        if (!navigator.permissions) {
            return 'unknown';
        }

        try {
            const permission = await navigator.permissions.query({ name: 'camera' });
            return permission.state;
        } catch (error) {
            console.error('❌ Error checking camera permission:', error);
            return 'unknown';
        }
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
                console.error(`❌ Error in event listener for '${event}':`, error);
            }
        });
    }

    /**
     * Get status information
     * @returns {Object} Camera status
     */
    getStatus() {
        return {
            isActive: this.isActive,
            frameRate: this.frameRate,
            resolution: this.videoElement ? {
                width: this.videoElement.videoWidth,
                height: this.videoElement.videoHeight
            } : null,
            stream: !!this.stream,
            settings: this.settings
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stop();
        this.eventListeners = {};
        this.videoElement = null;
        console.log('📹 Camera manager destroyed');
    }
}
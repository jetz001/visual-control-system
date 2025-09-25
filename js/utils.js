/**
 * Utility Functions Module
 * Common helper functions for the visual control system
 */

export class Utils {
    constructor() {
        this.debounceTimers = new Map();
        this.throttleTimers = new Map();
    }

    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @param {string} key - Unique key for this debounce
     * @returns {Function} Debounced function
     */
    debounce(func, wait, key = 'default') {
        return (...args) => {
            const timer = this.debounceTimers.get(key);
            if (timer) {
                clearTimeout(timer);
            }

            const newTimer = setTimeout(() => {
                this.debounceTimers.delete(key);
                func.apply(this, args);
            }, wait);

            this.debounceTimers.set(key, newTimer);
        };
    }

    /**
     * Throttle function execution
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @param {string} key - Unique key for this throttle
     * @returns {Function} Throttled function
     */
    throttle(func, limit, key = 'default') {
        return (...args) => {
            if (!this.throttleTimers.get(key)) {
                func.apply(this, args);
                this.throttleTimers.set(key, true);

                setTimeout(() => {
                    this.throttleTimers.delete(key);
                }, limit);
            }
        };
    }

    /**
     * Format file size in human readable format
     * @param {number} bytes - Size in bytes
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted size string
     */
    formatFileSize(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Format time duration
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration string
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Format timestamp to readable string
     * @param {number|Date} timestamp - Timestamp to format
     * @param {Object} options - Formatting options
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp, options = {}) {
        const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
        
        const defaults = {
            locale: 'th-TH',
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };

        const formatOptions = { ...defaults, ...options };

        try {
            return date.toLocaleString(formatOptions.locale, formatOptions);
        } catch (error) {
            console.warn('⚠️ Error formatting timestamp:', error);
            return date.toString();
        }
    }

    /**
     * Generate unique ID
     * @param {number} length - ID length
     * @param {string} prefix - ID prefix
     * @returns {string} Unique ID
     */
    generateId(length = 8, prefix = '') {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = prefix;
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    }

    /**
     * Deep clone an object
     * @param {any} obj - Object to clone
     * @returns {any} Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }

        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
    }

    /**
     * Calculate distance between two points
     * @param {Object} point1 - First point {x, y}
     * @param {Object} point2 - Second point {x, y}
     * @returns {number} Distance in pixels
     */
    calculateDistance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate angle between two points
     * @param {Object} point1 - First point {x, y}
     * @param {Object} point2 - Second point {x, y}
     * @returns {number} Angle in degrees
     */
    calculateAngle(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.atan2(dy, dx) * 180 / Math.PI;
    }

    /**
     * Normalize angle to 0-360 range
     * @param {number} angle - Angle in degrees
     * @returns {number} Normalized angle
     */
    normalizeAngle(angle) {
        angle = angle % 360;
        if (angle < 0) angle += 360;
        return angle;
    }

    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} Angle in radians
     */
    degreesToRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    /**
     * Convert radians to degrees
     * @param {number} radians - Angle in radians
     * @returns {number} Angle in degrees
     */
    radiansToDegrees(radians) {
        return radians * 180 / Math.PI;
    }

    /**
     * Clamp value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    lerp(a, b, t) {
        return a + (b - a) * this.clamp(t, 0, 1);
    }

    /**
     * Map value from one range to another
     * @param {number} value - Input value
     * @param {number} inMin - Input range minimum
     * @param {number} inMax - Input range maximum
     * @param {number} outMin - Output range minimum
     * @param {number} outMax - Output range maximum
     * @returns {number} Mapped value
     */
    mapRange(value, inMin, inMax, outMin, outMax) {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }

    /**
     * Check if point is inside rectangle
     * @param {Object} point - Point {x, y}
     * @param {Object} rect - Rectangle {x, y, width, height}
     * @returns {boolean} Whether point is inside rectangle
     */
    pointInRect(point, rect) {
        return point.x >= rect.x &&
               point.x <= rect.x + rect.width &&
               point.y >= rect.y &&
               point.y <= rect.y + rect.height;
    }

    /**
     * Check if two rectangles intersect
     * @param {Object} rect1 - First rectangle {x, y, width, height}
     * @param {Object} rect2 - Second rectangle {x, y, width, height}
     * @returns {boolean} Whether rectangles intersect
     */
    rectsIntersect(rect1, rect2) {
        return !(rect1.x + rect1.width < rect2.x ||
                rect2.x + rect2.width < rect1.x ||
                rect1.y + rect1.height < rect2.y ||
                rect2.y + rect2.height < rect1.y);
    }

    /**
     * Get device information
     * @returns {Object} Device information
     */
    getDeviceInfo() {
        const nav = navigator;
        
        return {
            userAgent: nav.userAgent,
            platform: nav.platform,
            language: nav.language,
            cookieEnabled: nav.cookieEnabled,
            onLine: nav.onLine,
            screenWidth: screen.width,
            screenHeight: screen.height,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            pixelRatio: window.devicePixelRatio || 1,
            touchSupport: 'ontouchstart' in window,
            maxTouchPoints: nav.maxTouchPoints || 0
        };
    }

    /**
     * Detect if running on mobile device
     * @returns {boolean} Whether running on mobile
     */
    isMobile() {
        const deviceInfo = this.getDeviceInfo();
        const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(deviceInfo.userAgent);
        const smallScreen = deviceInfo.windowWidth < 768;
        const touchDevice = deviceInfo.touchSupport && deviceInfo.maxTouchPoints > 0;
        
        return mobileUA || (smallScreen && touchDevice);
    }

    /**
     * Check if device supports camera
     * @returns {boolean} Camera support status
     */
    isCameraSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Check if device supports Web Audio
     * @returns {boolean} Web Audio support status
     */
    isWebAudioSupported() {
        return !!(window.AudioContext || window.webkitAudioContext);
    }

    /**
     * Check if device supports Bluetooth
     * @returns {boolean} Bluetooth support status
     */
    isBluetoothSupported() {
        return !!(navigator.bluetooth && window.isSecureContext);
    }

    /**
     * Get browser capabilities
     * @returns {Object} Browser capabilities
     */
    getBrowserCapabilities() {
        return {
            camera: this.isCameraSupported(),
            webAudio: this.isWebAudioSupported(),
            bluetooth: this.isBluetoothSupported(),
            webGL: !!window.WebGLRenderingContext,
            webAssembly: !!window.WebAssembly,
            serviceWorker: 'serviceWorker' in navigator,
            localStorage: !!window.localStorage,
            sessionStorage: !!window.sessionStorage,
            fullscreen: !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
            deviceMotion: 'DeviceMotionEvent' in window,
            deviceOrientation: 'DeviceOrientationEvent' in window
        };
    }

    /**
     * Save data to localStorage with error handling
     * @param {string} key - Storage key
     * @param {any} data - Data to save
     * @returns {boolean} Success status
     */
    saveToStorage(key, data) {
        try {
            const serialized = JSON.stringify(data);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('❌ Error saving to localStorage:', error);
            return false;
        }
    }

    /**
     * Load data from localStorage with error handling
     * @param {string} key - Storage key
     * @param {any} defaultValue - Default value if key not found
     * @returns {any} Loaded data or default value
     */
    loadFromStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('❌ Error loading from localStorage:', error);
            return defaultValue;
        }
    }

    /**
     * Clear storage item
     * @param {string} key - Storage key
     */
    clearStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('❌ Error clearing localStorage:', error);
        }
    }

    /**
     * Download data as file
     * @param {string} data - Data to download
     * @param {string} filename - File name
     * @param {string} mimeType - MIME type
     */
    downloadAsFile(data, filename, mimeType = 'text/plain') {
        try {
            const blob = new Blob([data], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('❌ Error downloading file:', error);
        }
    }

    /**
     * Convert canvas to blob
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {string} mimeType - Output MIME type
     * @param {number} quality - Quality (0-1)
     * @returns {Promise<Blob>} Image blob
     */
    canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.9) {
        return new Promise((resolve, reject) => {
            try {
                canvas.toBlob(resolve, mimeType, quality);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Load image from URL
     * @param {string} url - Image URL
     * @returns {Promise<HTMLImageElement>} Loaded image
     */
    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    /**
     * Resize image maintaining aspect ratio
     * @param {HTMLImageElement|HTMLCanvasElement} source - Source image
     * @param {number} maxWidth - Maximum width
     * @param {number} maxHeight - Maximum height
     * @returns {HTMLCanvasElement} Resized image canvas
     */
    resizeImage(source, maxWidth, maxHeight) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const { width: srcWidth, height: srcHeight } = source;
        
        // Calculate new dimensions maintaining aspect ratio
        const aspectRatio = srcWidth / srcHeight;
        let newWidth = maxWidth;
        let newHeight = maxHeight;
        
        if (newWidth / newHeight > aspectRatio) {
            newWidth = newHeight * aspectRatio;
        } else {
            newHeight = newWidth / aspectRatio;
        }
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        ctx.drawImage(source, 0, 0, newWidth, newHeight);
        
        return canvas;
    }

    /**
     * Get system performance info
     * @returns {Object} Performance information
     */
    getPerformanceInfo() {
        const nav = navigator;
        const perf = performance;
        
        return {
            memory: nav.deviceMemory || 'unknown',
            hardwareConcurrency: nav.hardwareConcurrency || 'unknown',
            connection: nav.connection ? {
                effectiveType: nav.connection.effectiveType,
                downlink: nav.connection.downlink,
                rtt: nav.connection.rtt
            } : 'unknown',
            timing: perf.timing ? {
                navigationStart: perf.timing.navigationStart,
                loadEventEnd: perf.timing.loadEventEnd,
                domContentLoaded: perf.timing.domContentLoadedEventEnd - perf.timing.navigationStart,
                loadComplete: perf.timing.loadEventEnd - perf.timing.navigationStart
            } : 'unknown'
        };
    }

    /**
     * Wait for specified time
     * @param {number} ms - Time to wait in milliseconds
     * @returns {Promise} Promise that resolves after specified time
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retry function execution with exponential backoff
     * @param {Function} fn - Function to retry
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} baseDelay - Base delay in milliseconds
     * @returns {Promise} Promise that resolves with function result
     */
    async retry(fn, maxRetries = 3, baseDelay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                
                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.warn(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
                await this.sleep(delay);
            }
        }
    }

    /**
     * Create element with attributes and styles
     * @param {string} tag - HTML tag name
     * @param {Object} attributes - Element attributes
     * @param {Object} styles - Element styles
     * @param {string} textContent - Element text content
     * @returns {HTMLElement} Created element
     */
    createElement(tag, attributes = {}, styles = {}, textContent = '') {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });
        
        // Set styles
        Object.keys(styles).forEach(key => {
            element.style[key] = styles[key];
        });
        
        // Set text content
        if (textContent) {
            element.textContent = textContent;
        }
        
        return element;
    }

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {boolean} Validation result
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Escape HTML characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get URL parameters
     * @returns {Object} URL parameters object
     */
    getUrlParams() {
        const params = {};
        const urlParams = new URLSearchParams(window.location.search);
        
        for (const [key, value] of urlParams) {
            params[key] = value;
        }
        
        return params;
    }

    /**
     * Cleanup timers
     */
    cleanup() {
        // Clear debounce timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        
        // Clear throttle timers
        this.throttleTimers.clear();
        
        console.log('🧹 Utils cleanup completed');
    }

    /**
     * Log system information
     */
    logSystemInfo() {
        console.group('🔍 System Information');
        console.log('Device:', this.getDeviceInfo());
        console.log('Capabilities:', this.getBrowserCapabilities());
        console.log('Performance:', this.getPerformanceInfo());
        console.groupEnd();
    }
}
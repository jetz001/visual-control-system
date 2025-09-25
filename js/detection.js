/**
 * Detection Engine Module
 * Handles image analysis and box position/rotation detection
 */

export class DetectionEngine {
    constructor() {
        this.referenceImage = null;
        this.referenceFeatures = null;
        this.eventListeners = {};
        
        // Detection parameters
        this.settings = {
            rotationSensitivity: 5,    // degrees
            positionSensitivity: 20,   // pixels
            detectionThreshold: 50,    // percentage
            minContourArea: 1000,      // minimum box area
            maxContourArea: 500000     // maximum box area
        };

        // Algorithm configuration
        this.config = {
            gaussianBlur: 5,
            cannyLower: 50,
            cannyUpper: 150,
            morphKernel: 3,
            approxEpsilon: 0.02
        };

        this.isInitialized = false;
        this.lastDetection = null;
        this.detectionHistory = [];
        
        // Initialize event system
        this.initEventSystem();
        
        console.log('📐 Detection Engine initialized with event system');
    }

    /**
     * Initialize event system
     */
    initEventSystem() {
        this.eventListeners = {};
        
        // Emit ready event after initialization
        setTimeout(() => {
            this.emit('ready', {
                engine: 'DetectionEngine',
                version: '1.0.0',
                capabilities: ['position', 'rotation', 'basic-cv']
            });
        }, 100);
    }

    /**
     * Set reference image for comparison
     * @param {Object} imageData - Reference image data
     */
    setReferenceImage(imageData) {
        try {
            this.referenceImage = imageData;
            this.referenceFeatures = this.extractFeatures(imageData);
            this.isInitialized = true;
            
            console.log('📐 Reference image set successfully');
            this.emit('referenceSet', {
                width: imageData.width,
                height: imageData.height,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('❌ Error setting reference image:', error);
            this.emit('error', error);
        }
    }

    /**
     * Clear reference image
     */
    clearReference() {
        this.referenceImage = null;
        this.referenceFeatures = null;
        this.isInitialized = false;
        this.lastDetection = null;
        this.detectionHistory = [];
        
        console.log('📐 Reference image cleared');
        this.emit('referenceCleared');
    }

    /**
     * Get reference data for saving
     * @returns {Object|null} Reference data
     */
    getReferenceData() {
        if (!this.referenceImage) return null;
        
        return {
            image: this.referenceImage,
            features: this.referenceFeatures,
            timestamp: Date.now()
        };
    }

    /**
     * Analyze current frame for box detection
     * @param {Object} frameData - Current frame data
     * @param {Object} settings - Detection settings
     * @returns {Object} Detection result
     */
    analyzeFrame(frameData, settings = {}) {
        if (!this.isInitialized || !frameData) {
            return {
                hasAlert: false,
                message: 'ไม่มีภาพอ้างอิง',
                box: null,
                confidence: 0
            };
        }

        try {
            // Update settings
            this.updateSettings(settings);

            // Detect boxes in current frame
            const detectedBoxes = this.detectBoxes(frameData);
            
            if (detectedBoxes.length === 0) {
                return {
                    hasAlert: false,
                    message: 'ไม่พบกล่อง',
                    box: null,
                    confidence: 0
                };
            }

            // Find the best matching box
            const bestMatch = this.findBestMatch(detectedBoxes);
            
            // Compare with reference
            const comparison = this.compareWithReference(bestMatch);
            
            // Store detection history
            this.addToHistory(comparison);
            
            this.lastDetection = comparison;
            
            return comparison;
            
        } catch (error) {
            console.error('❌ Error analyzing frame:', error);
            return {
                hasAlert: true,
                message: 'เกิดข้อผิดพลาดในการวิเคราะห์',
                box: null,
                confidence: 0
            };
        }
    }

    /**
     * Detect boxes in the image using edge detection
     * @param {Object} frameData - Image frame data
     * @returns {Array} Array of detected boxes
     */
    detectBoxes(frameData) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = frameData.width;
            canvas.height = frameData.height;
            
            // Put image data on canvas
            ctx.putImageData(frameData.imageData, 0, 0);
            
            // Convert to grayscale
            const grayImageData = this.convertToGrayscale(frameData.imageData);
            
            // Apply Gaussian blur to reduce noise
            const blurredData = this.applyGaussianBlur(grayImageData, this.config.gaussianBlur);
            
            // Edge detection using Canny algorithm (simplified)
            const edges = this.detectEdges(blurredData);
            
            // Find contours
            const contours = this.findContours(edges);
            
            // Filter and convert contours to boxes
            const boxes = this.contoursToBoxes(contours);
            
            return boxes;
            
        } catch (error) {
            console.error('❌ Error detecting boxes:', error);
            return [];
        }
    }

    /**
     * Convert image to grayscale
     * @param {ImageData} imageData - Input image data
     * @returns {ImageData} Grayscale image data
     */
    convertToGrayscale(imageData) {
        const data = new Uint8ClampedArray(imageData.data);
        
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = gray;     // R
            data[i + 1] = gray; // G
            data[i + 2] = gray; // B
            // Alpha remains the same
        }
        
        return new ImageData(data, imageData.width, imageData.height);
    }

    /**
     * Apply Gaussian blur (simplified)
     * @param {ImageData} imageData - Input image
     * @param {number} radius - Blur radius
     * @returns {ImageData} Blurred image
     */
    applyGaussianBlur(imageData, radius) {
        // Simplified blur implementation
        const data = new Uint8ClampedArray(imageData.data);
        const { width, height } = imageData;
        const output = new Uint8ClampedArray(data.length);
        
        const kernel = this.createGaussianKernel(radius);
        const kernelSize = kernel.length;
        const half = Math.floor(kernelSize / 2);
        
        for (let y = half; y < height - half; y++) {
            for (let x = half; x < width - half; x++) {
                let sum = 0;
                let weightSum = 0;
                
                for (let ky = 0; ky < kernelSize; ky++) {
                    for (let kx = 0; kx < kernelSize; kx++) {
                        const px = x + kx - half;
                        const py = y + ky - half;
                        const idx = (py * width + px) * 4;
                        const weight = kernel[ky][kx];
                        
                        sum += data[idx] * weight;
                        weightSum += weight;
                    }
                }
                
                const outputIdx = (y * width + x) * 4;
                const value = sum / weightSum;
                output[outputIdx] = value;
                output[outputIdx + 1] = value;
                output[outputIdx + 2] = value;
                output[outputIdx + 3] = data[outputIdx + 3];
            }
        }
        
        return new ImageData(output, width, height);
    }

    /**
     * Create Gaussian kernel
     * @param {number} radius - Kernel radius
     * @returns {Array} 2D kernel array
     */
    createGaussianKernel(radius) {
        const size = radius * 2 + 1;
        const kernel = [];
        const sigma = radius / 3;
        const sigma2 = sigma * sigma;
        const norm = 1 / (2 * Math.PI * sigma2);
        
        for (let y = 0; y < size; y++) {
            kernel[y] = [];
            for (let x = 0; x < size; x++) {
                const dx = x - radius;
                const dy = y - radius;
                const exp = -(dx * dx + dy * dy) / (2 * sigma2);
                kernel[y][x] = norm * Math.exp(exp);
            }
        }
        
        return kernel;
    }

    /**
     * Detect edges using simplified Canny algorithm
     * @param {ImageData} imageData - Input image
     * @returns {ImageData} Edge image
     */
    detectEdges(imageData) {
        const { width, height, data } = imageData;
        const edges = new Uint8ClampedArray(data.length);
        
        // Sobel operators
        const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
        const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0;
                let gy = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const pixel = data[idx]; // Use grayscale value
                        
                        gx += pixel * sobelX[ky + 1][kx + 1];
                        gy += pixel * sobelY[ky + 1][kx + 1];
                    }
                }
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const threshold = magnitude > this.config.cannyLower ? 
                    (magnitude > this.config.cannyUpper ? 255 : 128) : 0;
                
                const outputIdx = (y * width + x) * 4;
                edges[outputIdx] = threshold;
                edges[outputIdx + 1] = threshold;
                edges[outputIdx + 2] = threshold;
                edges[outputIdx + 3] = 255;
            }
        }
        
        return new ImageData(edges, width, height);
    }

    /**
     * Find contours in edge image (simplified)
     * @param {ImageData} edgeData - Edge detected image
     * @returns {Array} Array of contours
     */
    findContours(edgeData) {
        // Simplified contour detection
        // In a real implementation, you'd use a proper contour finding algorithm
        const contours = [];
        const { width, height, data } = edgeData;
        const visited = new Array(width * height).fill(false);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (!visited[idx] && data[idx * 4] > 128) {
                    const contour = this.traceContour(data, width, height, x, y, visited);
                    if (contour.length > 20) { // Minimum contour size
                        contours.push(contour);
                    }
                }
            }
        }
        
        return contours;
    }

    /**
     * Trace contour from starting point
     * @param {Uint8ClampedArray} data - Image data
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} startX - Starting X coordinate
     * @param {number} startY - Starting Y coordinate
     * @param {Array} visited - Visited pixels array
     * @returns {Array} Contour points
     */
    traceContour(data, width, height, startX, startY, visited) {
        const contour = [];
        const stack = [[startX, startY]];
        const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        
        while (stack.length > 0 && contour.length < 1000) {
            const [x, y] = stack.pop();
            const idx = y * width + x;
            
            if (x < 0 || x >= width || y < 0 || y >= height || visited[idx]) {
                continue;
            }
            
            if (data[idx * 4] > 128) {
                visited[idx] = true;
                contour.push([x, y]);
                
                // Add neighboring pixels
                for (const [dx, dy] of directions) {
                    stack.push([x + dx, y + dy]);
                }
            }
        }
        
        return contour;
    }

    /**
     * Convert contours to bounding boxes
     * @param {Array} contours - Array of contours
     * @returns {Array} Array of bounding boxes
     */
    contoursToBoxes(contours) {
        const boxes = [];
        
        for (const contour of contours) {
            if (contour.length < 4) continue;
            
            // Find bounding rectangle
            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;
            
            for (const [x, y] of contour) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
            
            const width = maxX - minX;
            const height = maxY - minY;
            const area = width * height;
            
            // Filter by area
            if (area < this.settings.minContourArea || area > this.settings.maxContourArea) {
                continue;
            }
            
            // Calculate center and rotation
            const centerX = minX + width / 2;
            const centerY = minY + height / 2;
            const rotation = this.calculateRotation(contour);
            
            boxes.push({
                x: minX,
                y: minY,
                width,
                height,
                centerX,
                centerY,
                rotation,
                area,
                contour
            });
        }
        
        return boxes;
    }

    /**
     * Calculate rotation angle of contour
     * @param {Array} contour - Contour points
     * @returns {number} Rotation angle in degrees
     */
    calculateRotation(contour) {
        if (contour.length < 2) return 0;
        
        // Use the first and last points to estimate orientation
        const start = contour[0];
        const end = contour[Math.floor(contour.length / 2)];
        
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        return angle;
    }

    /**
     * Find best matching box from detected boxes
     * @param {Array} boxes - Array of detected boxes
     * @returns {Object} Best matching box
     */
    findBestMatch(boxes) {
        if (boxes.length === 1) return boxes[0];
        
        // Find the box closest to the center of the image
        // (assuming the reference box was centered)
        const centerX = this.referenceImage.width / 2;
        const centerY = this.referenceImage.height / 2;
        
        let bestBox = boxes[0];
        let minDistance = Infinity;
        
        for (const box of boxes) {
            const distance = Math.sqrt(
                Math.pow(box.centerX - centerX, 2) + 
                Math.pow(box.centerY - centerY, 2)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                bestBox = box;
            }
        }
        
        return bestBox;
    }

    /**
     * Compare detected box with reference
     * @param {Object} box - Detected box
     * @returns {Object} Comparison result
     */
    compareWithReference(box) {
        if (!this.referenceFeatures) {
            return {
                hasAlert: false,
                message: 'ไม่มีข้อมูลอ้างอิง',
                box,
                confidence: 0
            };
        }
        
        const result = {
            hasAlert: false,
            message: 'กล่องอยู่ในตำแหน่งที่ถูกต้อง',
            box,
            confidence: 100,
            details: {
                positionOffset: 0,
                rotationOffset: 0,
                positionOk: true,
                rotationOk: true
            }
        };
        
        // Compare position
        const expectedCenterX = this.referenceFeatures.centerX;
        const expectedCenterY = this.referenceFeatures.centerY;
        const positionOffset = Math.sqrt(
            Math.pow(box.centerX - expectedCenterX, 2) + 
            Math.pow(box.centerY - expectedCenterY, 2)
        );
        
        result.details.positionOffset = Math.round(positionOffset);
        result.details.positionOk = positionOffset <= this.settings.positionSensitivity;
        
        // Compare rotation
        const rotationDiff = Math.abs(box.rotation - this.referenceFeatures.rotation);
        const normalizedRotation = Math.min(rotationDiff, 360 - rotationDiff); // Handle wrap-around
        
        result.details.rotationOffset = Math.round(normalizedRotation);
        result.details.rotationOk = normalizedRotation <= this.settings.rotationSensitivity;
        
        // Determine if there's an alert
        if (!result.details.positionOk || !result.details.rotationOk) {
            result.hasAlert = true;
            
            const issues = [];
            if (!result.details.positionOk) {
                issues.push(`ตำแหน่งเลื่อน ${result.details.positionOffset}px`);
            }
            if (!result.details.rotationOk) {
                issues.push(`เอียง ${result.details.rotationOffset}°`);
            }
            
            result.message = issues.join(', ');
            result.confidence = Math.max(0, 100 - (positionOffset / 5) - (normalizedRotation * 2));
        }
        
        return result;
    }

    /**
     * Extract features from reference image
     * @param {Object} imageData - Image data
     * @returns {Object} Extracted features
     */
    extractFeatures(imageData) {
        // For now, we'll extract basic features
        // In a more advanced implementation, you could use SIFT, SURF, or ORB features
        
        const features = {
            width: imageData.width,
            height: imageData.height,
            centerX: imageData.width / 2,
            centerY: imageData.height / 2,
            rotation: 0, // Assume reference is at 0 degrees
            area: imageData.width * imageData.height * 0.25, // Estimate box area
            timestamp: Date.now()
        };
        
        return features;
    }

    /**
     * Add detection result to history
     * @param {Object} result - Detection result
     */
    addToHistory(result) {
        this.detectionHistory.push({
            ...result,
            timestamp: Date.now()
        });
        
        // Keep only last 100 detections
        if (this.detectionHistory.length > 100) {
            this.detectionHistory.shift();
        }
    }

    /**
     * Get detection statistics
     * @returns {Object} Statistics
     */
    getStatistics() {
        if (this.detectionHistory.length === 0) {
            return {
                total: 0,
                alerts: 0,
                alertRate: 0,
                averageConfidence: 100
            };
        }
        
        const alerts = this.detectionHistory.filter(d => d.hasAlert).length;
        const totalConfidence = this.detectionHistory.reduce((sum, d) => sum + d.confidence, 0);
        
        return {
            total: this.detectionHistory.length,
            alerts,
            alertRate: (alerts / this.detectionHistory.length) * 100,
            averageConfidence: totalConfidence / this.detectionHistory.length
        };
    }

    /**
     * Update detection settings
     * @param {Object} newSettings - New settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * Get current settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Reset detection history
     */
    resetHistory() {
        this.detectionHistory = [];
        this.lastDetection = null;
        console.log('📐 Detection history reset');
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
                console.error(`❌ Error in detection event listener for '${event}':`, error);
            }
        });
    }

    /**
     * Get status information
     * @returns {Object} Detection engine status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasReference: !!this.referenceImage,
            historyCount: this.detectionHistory.length,
            lastDetection: this.lastDetection,
            settings: this.settings
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.clearReference();
        this.eventListeners = {};
        console.log('📐 Detection engine destroyed');
    }
}
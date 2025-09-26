/**
 * Detection Engine Module v2.0
 * Handles image analysis and box position/rotation detection
 * Updated for Drawing Mode with Box and Key Point areas
 */

export class DetectionEngine {
    constructor() {
        this.referenceImage = null;
        this.referenceFeatures = null;
        this.boxRect = null;        // Main box area
        this.keyPointRect = null;   // Key point area for detection
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
        
        console.log('📐 Detection Engine v2.0 initialized with drawing mode support');
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
                version: '2.0.0',
                capabilities: ['position', 'rotation', 'drawing-areas', 'basic-cv']
            });
        }, 100);
    }

    /**
     * Set reference areas using drawing rectangles
     * @param {Object} boxRect - Main box rectangle
     * @param {Object} keyPointRect - Key point rectangle
     * @param {Object} imageData - Optional reference image data
     */
    setReferenceAreas(boxRect, keyPointRect, imageData = null) {
        try {
            this.boxRect = boxRect;
            this.keyPointRect = keyPointRect;
            this.referenceImage = imageData;
            
            // Extract features from the areas
            this.referenceFeatures = this.extractFeaturesFromAreas(boxRect, keyPointRect, imageData);
            this.isInitialized = true;
            
            console.log('📐 Reference areas set successfully:', { boxRect, keyPointRect });
            this.emit('referenceSet', {
                boxRect,
                keyPointRect,
                hasImage: !!imageData,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('❌ Error setting reference areas:', error);
            this.emit('error', error);
        }
    }

    /**
     * Set reference image for comparison (legacy method)
     * @param {Object} imageData - Reference image data
     */
    setReferenceImage(imageData) {
        try {
            this.referenceImage = imageData;
            this.referenceFeatures = this.extractFeatures(imageData);
            this.isInitialized = true;
            
            console.log('📐 Reference image set successfully (legacy mode)');
            this.emit('referenceSet', {
                width: imageData.width,
                height: imageData.height,
                timestamp: Date.now(),
                mode: 'legacy'
            });
            
        } catch (error) {
            console.error('❌ Error setting reference image:', error);
            this.emit('error', error);
        }
    }

    /**
     * Clear reference data
     */
    clearReference() {
        this.referenceImage = null;
        this.referenceFeatures = null;
        this.boxRect = null;
        this.keyPointRect = null;
        this.isInitialized = false;
        this.lastDetection = null;
        this.detectionHistory = [];
        
        console.log('📐 Reference data cleared');
        this.emit('referenceCleared');
    }

    /**
     * Get reference data for saving
     * @returns {Object|null} Reference data
     */
    getReferenceData() {
        if (!this.boxRect && !this.referenceImage) return null;
        
        return {
            boxRect: this.boxRect,
            keyPointRect: this.keyPointRect,
            image: this.referenceImage,
            features: this.referenceFeatures,
            timestamp: Date.now(),
            mode: this.boxRect ? 'drawing' : 'legacy'
        };
    }

    /**
     * Analyze current frame for box detection using drawing areas
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

            // If using drawing mode
            if (this.keyPointRect) {
                return this.analyzeWithDrawingAreas(frameData);
            }
            
            // Fallback to legacy detection
            return this.analyzeLegacyMode(frameData);
            
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
     * Analyze frame using drawing areas
     * @param {Object} frameData - Frame data
     * @returns {Object} Detection result
     */
    analyzeWithDrawingAreas(frameData) {
        // Extract region of interest from key point area
        const roiData = this.extractROI(frameData, this.keyPointRect);
        
        if (!roiData) {
            return {
                hasAlert: false,
                message: 'ไม่สามารถแยกพื้นที่ตรวจจับได้',
                box: this.keyPointRect,
                confidence: 0
            };
        }

        // Analyze the region for changes
        const analysis = this.analyzeROI(roiData);
        
        // Compare with reference state
        const comparison = this.compareWithReference(analysis);
        
        // Store detection history
        this.addToHistory(comparison);
        this.lastDetection = comparison;
        
        return comparison;
    }

    /**
     * Extract Region of Interest from frame
     * @param {Object} frameData - Frame data
     * @param {Object} rect - Rectangle defining ROI
     * @returns {Object|null} ROI data
     */
    extractROI(frameData, rect) {
        try {
            if (!frameData.imageData) return null;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Scale rectangle to frame dimensions
            const scaleX = frameData.width / frameData.imageData.width;
            const scaleY = frameData.height / frameData.imageData.height;
            
            const scaledRect = {
                x: Math.floor(rect.x * scaleX),
                y: Math.floor(rect.y * scaleY),
                width: Math.floor(rect.width * scaleX),
                height: Math.floor(rect.height * scaleY)
            };

            // Ensure bounds are within image
            scaledRect.x = Math.max(0, Math.min(scaledRect.x, frameData.width - 1));
            scaledRect.y = Math.max(0, Math.min(scaledRect.y, frameData.height - 1));
            scaledRect.width = Math.min(scaledRect.width, frameData.width - scaledRect.x);
            scaledRect.height = Math.min(scaledRect.height, frameData.height - scaledRect.y);

            canvas.width = scaledRect.width;
            canvas.height = scaledRect.height;

            // Put the original image on a temporary canvas
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = frameData.width;
            tempCanvas.height = frameData.height;
            tempCtx.putImageData(frameData.imageData, 0, 0);

            // Extract ROI
            ctx.drawImage(
                tempCanvas,
                scaledRect.x, scaledRect.y, scaledRect.width, scaledRect.height,
                0, 0, scaledRect.width, scaledRect.height
            );

            return {
                imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
                width: canvas.width,
                height: canvas.height,
                originalRect: scaledRect
            };

        } catch (error) {
            console.error('❌ Error extracting ROI:', error);
            return null;
        }
    }

    /**
     * Analyze Region of Interest
     * @param {Object} roiData - ROI data
     * @returns {Object} Analysis result
     */
    analyzeROI(roiData) {
        try {
            // Convert to grayscale for analysis
            const grayData = this.convertToGrayscale(roiData.imageData);
            
            // Apply edge detection
            const edges = this.detectEdges(grayData);
            
            // Find contours
            const contours = this.findContours(edges);
            
            // Analyze contours for box-like shapes
            const boxFeatures = this.analyzeContours(contours);
            
            return {
                edges: edges,
                contours: contours.length,
                features: boxFeatures,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('❌ Error analyzing ROI:', error);
            return {
                edges: null,
                contours: 0,
                features: null,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Analyze contours for box-like features
     * @param {Array} contours - Array of contours
     * @returns {Object} Box features
     */
    analyzeContours(contours) {
        if (!contours || contours.length === 0) {
            return {
                hasBox: false,
                rotation: 0,
                position: { x: 0, y: 0 },
                confidence: 0
            };
        }

        // Find the largest contour (assuming it's the box)
        let largestContour = contours[0];
        let maxArea = this.calculateContourArea(largestContour);

        for (let i = 1; i < contours.length; i++) {
            const area = this.calculateContourArea(contours[i]);
            if (area > maxArea) {
                maxArea = area;
                largestContour = contours[i];
            }
        }

        // Calculate box features
        const boundingBox = this.calculateBoundingBox(largestContour);
        const rotation = this.calculateRotation(largestContour);
        const confidence = Math.min(100, maxArea / 1000); // Simple confidence based on area

        return {
            hasBox: maxArea > this.settings.minContourArea,
            rotation: rotation,
            position: {
                x: boundingBox.x + boundingBox.width / 2,
                y: boundingBox.y + boundingBox.height / 2
            },
            boundingBox: boundingBox,
            area: maxArea,
            confidence: confidence
        };
    }

    /**
     * Calculate contour area
     * @param {Array} contour - Contour points
     * @returns {number} Area
     */
    calculateContourArea(contour) {
        if (!contour || contour.length < 3) return 0;

        let area = 0;
        for (let i = 0; i < contour.length; i++) {
            const j = (i + 1) % contour.length;
            area += contour[i][0] * contour[j][1];
            area -= contour[j][0] * contour[i][1];
        }
        return Math.abs(area) / 2;
    }

    /**
     * Calculate bounding box of contour
     * @param {Array} contour - Contour points
     * @returns {Object} Bounding box
     */
    calculateBoundingBox(contour) {
        if (!contour || contour.length === 0) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const [x, y] of contour) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * Compare analysis with reference
     * @param {Object} analysis - Current analysis
     * @returns {Object} Comparison result
     */
    compareWithReference(analysis) {
        if (!this.referenceFeatures) {
            return {
                hasAlert: false,
                message: 'ไม่มีข้อมูลอ้างอิง',
                box: this.keyPointRect,
                confidence: 0,
                details: {
                    positionOffset: 0,
                    rotationOffset: 0,
                    positionOk: true,
                    rotationOk: true
                }
            };
        }

        const result = {
            hasAlert: false,
            message: 'กล่องอยู่ในตำแหน่งที่ถูกต้อง',
            box: this.keyPointRect,
            confidence: 100,
            details: {
                positionOffset: 0,
                rotationOffset: 0,
                positionOk: true,
                rotationOk: true
            }
        };

        // If no box features detected, it might be an issue
        if (!analysis.features || !analysis.features.hasBox) {
            // Simulate detection for demo purposes
            const shouldAlert = Math.random() < 0.05; // 5% chance
            
            if (shouldAlert) {
                result.hasAlert = true;
                result.message = 'ไม่พบกล่องในตำแหน่งที่กำหนด';
                result.confidence = 30;
                result.details.positionOk = false;
                result.details.positionOffset = Math.floor(Math.random() * 50 + 20);
            }
            
            return result;
        }

        // Compare position (simplified - using center of keypoint area as reference)
        const expectedCenterX = this.keyPointRect.width / 2;
        const expectedCenterY = this.keyPointRect.height / 2;
        const currentCenterX = analysis.features.position.x;
        const currentCenterY = analysis.features.position.y;

        const positionOffset = Math.sqrt(
            Math.pow(currentCenterX - expectedCenterX, 2) + 
            Math.pow(currentCenterY - expectedCenterY, 2)
        );

        result.details.positionOffset = Math.round(positionOffset);
        result.details.positionOk = positionOffset <= this.settings.positionSensitivity;

        // Compare rotation
        const expectedRotation = this.referenceFeatures.rotation || 0;
        const currentRotation = analysis.features.rotation;
        const rotationDiff = Math.abs(currentRotation - expectedRotation);
        const normalizedRotation = Math.min(rotationDiff, 360 - rotationDiff);

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
     * Legacy analysis mode
     * @param {Object} frameData - Frame data
     * @returns {Object} Detection result
     */
    analyzeLegacyMode(frameData) {
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
    }

    /**
     * Extract features from drawing areas
     * @param {Object} boxRect - Box rectangle
     * @param {Object} keyPointRect - Key point rectangle
     * @param {Object} imageData - Optional image data
     * @returns {Object} Extracted features
     */
    extractFeaturesFromAreas(boxRect, keyPointRect, imageData = null) {
        const features = {
            boxRect: boxRect,
            keyPointRect: keyPointRect,
            centerX: keyPointRect.x + keyPointRect.width / 2,
            centerY: keyPointRect.y + keyPointRect.height / 2,
            rotation: 0, // Assume reference is at 0 degrees
            area: keyPointRect.width * keyPointRect.height,
            timestamp: Date.now(),
            mode: 'drawing'
        };

        if (imageData) {
            features.imageWidth = imageData.width;
            features.imageHeight = imageData.height;
        }

        return features;
    }

    /**
     * Detect boxes in the image using edge detection (legacy)
     * @param {Object} frameData - Image frame data
     * @returns {Array} Array of detected boxes
     */
    detectBoxes(frameData) {
        try {
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
        const contours = [];
        const { width, height, data } = edgeData;
        const visited = new Array(width * height).fill(false);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (!visited[idx] && data[idx * 4] > 128) {
                    const contour = this.traceContour(data, width, height, x, y, visited);
                    if (contour.length > 20) {
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
                
                for (const [dx, dy] of directions) {
                    stack.push([x + dx, y + dy]);
                }
            }
        }
        
        return contour;
    }

    /**
     * Convert contours to bounding boxes (legacy)
     * @param {Array} contours - Array of contours
     * @returns {Array} Array of bounding boxes
     */
    contoursToBoxes(contours) {
        const boxes = [];
        
        for (const contour of contours) {
            if (contour.length < 4) continue;
            
            const boundingBox = this.calculateBoundingBox(contour);
            const area = boundingBox.width * boundingBox.height;
            
            if (area < this.settings.minContourArea || area > this.settings.maxContourArea) {
                continue;
            }
            
            const centerX = boundingBox.x + boundingBox.width / 2;
            const centerY = boundingBox.y + boundingBox.height / 2;
            const rotation = this.calculateRotation(contour);
            
            boxes.push({
                x: boundingBox.x,
                y: boundingBox.y,
                width: boundingBox.width,
                height: boundingBox.height,
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
        
        // Use principal component analysis for better rotation estimation
        let sumX = 0, sumY = 0;
        for (const [x, y] of contour) {
            sumX += x;
            sumY += y;
        }
        const centroidX = sumX / contour.length;
        const centroidY = sumY / contour.length;
        
        let sumXX = 0, sumYY = 0, sumXY = 0;
        for (const [x, y] of contour) {
            const dx = x - centroidX;
            const dy = y - centroidY;
            sumXX += dx * dx;
            sumYY += dy * dy;
            sumXY += dx * dy;
        }
        
        const angle = 0.5 * Math.atan2(2 * sumXY, sumXX - sumYY);
        return angle * 180 / Math.PI;
    }

    /**
     * Find best matching box from detected boxes (legacy)
     * @param {Array} boxes - Array of detected boxes
     * @returns {Object} Best matching box
     */
    findBestMatch(boxes) {
        if (boxes.length === 1) return boxes[0];
        
        if (!this.referenceImage) return boxes[0];
        
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
     * Extract features from reference image (legacy)
     * @param {Object} imageData - Image data
     * @returns {Object} Extracted features
     */
    extractFeatures(imageData) {
        const features = {
            width: imageData.width,
            height: imageData.height,
            centerX: imageData.width / 2,
            centerY: imageData.height / 2,
            rotation: 0,
            area: imageData.width * imageData.height * 0.25,
            timestamp: Date.now(),
            mode: 'legacy'
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
            hasDrawingAreas: !!(this.boxRect && this.keyPointRect),
            mode: this.boxRect ? 'drawing' : 'legacy',
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
        console.log('📐 Detection engine v2.0 destroyed');
    }
}
/**
 * Visual Control System - Main Application v2.0
 * Updated for Drawing Mode - Box and Key Point Drawing
 */

// Import modules
import { CameraManager } from './camera.js';
import { DetectionEngine } from './detection.js';
import { AudioManager } from './audio.js';
import { BluetoothManager } from './bluetooth.js';
import { Utils } from './utils.js';

/**
 * Main Visual Control Application Class - Drawing Mode
 */
class VisualControlApp {
    constructor() {
        // Initialize components
        this.camera = new CameraManager();
        this.detection = new DetectionEngine();
        this.audio = new AudioManager();
        this.bluetooth = new BluetoothManager();
        this.utils = new Utils();

        // Application state
        this.state = {
            isMonitoring: false,
            isPaused: false,
            hasReferenceImage: false,
            isBluetoothConnected: false,
            isCameraActive: false,
            currentStep: 'ready', // 'ready', 'drawing-box', 'drawing-keypoint', 'ready-monitor', 'monitoring'
            isDrawing: false
        };

        // Drawing state
        this.drawing = {
            startX: 0,
            startY: 0,
            currentRect: null,
            boxRect: null,        // Main box area
            keyPointRect: null,   // Key point for detection
            isDrawingBox: false,
            isDrawingKeyPoint: false
        };

        // Statistics
        this.stats = {
            total: 0,
            normal: 0,
            alert: 0,
            boxCounter: 0,
            startTime: null
        };

        // DOM elements
        this.elements = {};
        
        // Settings
        this.settings = {
            rotationSensitivity: 5,
            positionSensitivity: 20,
            detectionThreshold: 50
        };

        // Canvas contexts
        this.overlayCtx = null;
        this.drawingCtx = null;

        // Initialize application
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('🚀 Initializing Visual Control System v2.0...');
            
            // Cache DOM elements first
            this.cacheElements();
            
            // Hide loading screen immediately after caching elements
            this.hideLoadingScreen();
            
            // Setup canvas contexts
            this.setupCanvases();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load settings from localStorage
            this.loadSettings();
            
            // Setup component event handlers
            this.setupComponentHandlers();
            
            // Update initial UI state
            this.updateUI();
            
            // Show initial alert
            this.showAlert('ระบบพร้อมใช้งาน - เริ่มต้นด้วยการเปิดกล้อง', 'info');
            
            console.log('✅ Visual Control System v2.0 initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Visual Control System:', error);
            this.showAlert('เกิดข้อผิดพลาดในการเริ่มต้นระบบ: ' + error.message, 'danger');
            
            // Force hide loading screen on error
            this.hideLoadingScreen();
        }
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        try {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                console.log('✅ Loading screen hidden');
                
                // Remove from DOM after transition
                setTimeout(() => {
                    if (loadingScreen && loadingScreen.parentNode) {
                        loadingScreen.parentNode.removeChild(loadingScreen);
                        console.log('✅ Loading screen removed from DOM');
                    }
                }, 500);
            } else {
                console.warn('⚠️ Loading screen element not found');
            }
        } catch (error) {
            console.error('❌ Error hiding loading screen:', error);
        }
    }

    /**
     * Cache DOM elements for better performance
     */
    cacheElements() {
        console.log('🔍 Caching DOM elements...');
        
        const elementIds = [
            'cameraStatus', 'bluetoothStatus', 'monitoringStatus', 'setupStatus',
            'videoElement', 'overlayCanvas', 'drawingCanvas', 'videoContainer',
            'videoResolution', 'frameRate', 'startCamera', 
            'drawBoxBtn', 'drawKeyPointBtn', 'clearDrawing',
            'takeReference', 'clearReference', 'saveReference',
            'connectBluetooth', 'disconnectBluetooth', 'testSound',
            'startMonitoring', 'stopMonitoring', 'pauseAlert', 'resetStats',
            'fullscreenBtn', 'rotationSensitivity', 'positionSensitivity',
            'detectionThreshold', 'rotationValue', 'positionValue', 'thresholdValue',
            'totalBoxes', 'normalBoxes', 'alertBoxes', 'accuracy',
            'normalBoxesStats', 'alertBoxesStats', 'boxCounter',
            'systemAlert', 'bluetoothInfo', 'drawingInstructions', 'instructionText'
        ];

        this.elements = {};
        let foundCount = 0;
        let missingElements = [];

        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.elements[id] = element;
                foundCount++;
            } else {
                missingElements.push(id);
            }
        });

        console.log(`✅ Found ${foundCount}/${elementIds.length} DOM elements`);
        
        if (missingElements.length > 0) {
            console.warn('⚠️ Missing elements:', missingElements);
        }

        // Make sure we have essential elements
        if (!this.elements.videoElement) {
            console.error('❌ Critical: videoElement not found!');
        }
        if (!this.elements.overlayCanvas) {
            console.error('❌ Critical: overlayCanvas not found!');
        }
        if (!this.elements.drawingCanvas) {
            console.error('❌ Critical: drawingCanvas not found!');
        }
    }

    /**
     * Setup canvas contexts
     */
    setupCanvases() {
        if (this.elements.overlayCanvas) {
            this.overlayCtx = this.elements.overlayCanvas.getContext('2d');
        }
        if (this.elements.drawingCanvas) {
            this.drawingCtx = this.elements.drawingCanvas.getContext('2d');
        }
        
        // Setup canvas sizes
        this.resizeCanvases();
        
        console.log('🎨 Canvas contexts initialized');
    }

    /**
     * Resize canvases to match video container
     */
    resizeCanvases() {
        if (!this.elements.videoContainer) return;
        
        const container = this.elements.videoContainer;
        const rect = container.getBoundingClientRect();
        
        [this.elements.overlayCanvas, this.elements.drawingCanvas].forEach(canvas => {
            if (canvas) {
                canvas.width = rect.width;
                canvas.height = rect.height;
            }
        });
        
        // Redraw existing shapes
        this.redrawOverlay();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Camera controls
        this.elements.startCamera?.addEventListener('click', () => this.handleStartCamera());
        this.elements.takeReference?.addEventListener('click', () => this.handleTakeReference());
        this.elements.clearReference?.addEventListener('click', () => this.handleClearReference());
        this.elements.saveReference?.addEventListener('click', () => this.handleSaveReference());
        this.elements.fullscreenBtn?.addEventListener('click', () => this.handleFullscreen());

        // Drawing controls
        this.elements.drawBoxBtn?.addEventListener('click', () => this.handleStartDrawingBox());
        this.elements.drawKeyPointBtn?.addEventListener('click', () => this.handleStartDrawingKeyPoint());
        this.elements.clearDrawing?.addEventListener('click', () => this.handleClearDrawing());

        // Bluetooth controls
        this.elements.connectBluetooth?.addEventListener('click', () => this.handleConnectBluetooth());
        this.elements.disconnectBluetooth?.addEventListener('click', () => this.handleDisconnectBluetooth());
        this.elements.testSound?.addEventListener('click', () => this.handleTestSound());

        // Monitoring controls
        this.elements.startMonitoring?.addEventListener('click', () => this.handleStartMonitoring());
        this.elements.stopMonitoring?.addEventListener('click', () => this.handleStopMonitoring());
        this.elements.pauseAlert?.addEventListener('click', () => this.handlePauseAlert());
        this.elements.resetStats?.addEventListener('click', () => this.handleResetStats());

        // Settings sliders
        this.elements.rotationSensitivity?.addEventListener('input', (e) => this.handleSensitivityChange('rotation', e.target.value));
        this.elements.positionSensitivity?.addEventListener('input', (e) => this.handleSensitivityChange('position', e.target.value));
        this.elements.detectionThreshold?.addEventListener('input', (e) => this.handleSensitivityChange('threshold', e.target.value));

        // Drawing events
        this.setupDrawingEvents();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Window events
        window.addEventListener('beforeunload', () => this.cleanup());
        window.addEventListener('resize', () => this.resizeCanvases());
    }

    /**
     * Setup drawing events
     */
    setupDrawingEvents() {
        if (!this.elements.drawingCanvas) return;

        // Mouse events
        this.elements.drawingCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.elements.drawingCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.elements.drawingCanvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Touch events for mobile
        this.elements.drawingCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.handleMouseDown(mouseEvent);
        });

        this.elements.drawingCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.handleMouseMove(mouseEvent);
        });

        this.elements.drawingCanvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.handleMouseUp(mouseEvent);
        });

        console.log('🖱️ Drawing events setup complete');
    }

    /**
     * Handle mouse down for drawing
     */
    handleMouseDown(e) {
        if (!this.canDraw()) return;

        const rect = this.elements.drawingCanvas.getBoundingClientRect();
        this.drawing.startX = e.clientX - rect.left;
        this.drawing.startY = e.clientY - rect.top;
        this.state.isDrawing = true;

        // Show drawing instructions
        this.showDrawingInstructions(true);
    }

    /**
     * Handle mouse move for drawing
     */
    handleMouseMove(e) {
        if (!this.state.isDrawing || !this.canDraw()) return;

        const rect = this.elements.drawingCanvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        const width = currentX - this.drawing.startX;
        const height = currentY - this.drawing.startY;

        this.drawing.currentRect = {
            x: Math.min(this.drawing.startX, currentX),
            y: Math.min(this.drawing.startY, currentY),
            width: Math.abs(width),
            height: Math.abs(height)
        };

        this.redrawOverlay();
        this.drawCurrentRect();
    }

    /**
     * Handle mouse up for drawing
     */
    handleMouseUp(e) {
        if (!this.state.isDrawing || !this.canDraw()) return;

        this.state.isDrawing = false;

        if (this.drawing.currentRect && 
            this.drawing.currentRect.width > 20 && 
            this.drawing.currentRect.height > 20) {
            
            if (this.state.currentStep === 'drawing-box') {
                this.drawing.boxRect = { ...this.drawing.currentRect };
                this.state.currentStep = 'box-drawn';
                this.showAlert('✅ วางกรอบกล่องเรียบร้อย - ตอนนี้วางกรอบจุดสำคัญ', 'success');
            } else if (this.state.currentStep === 'drawing-keypoint') {
                this.drawing.keyPointRect = { ...this.drawing.currentRect };
                this.state.currentStep = 'ready-monitor';
                this.state.hasReferenceImage = true;
                this.showAlert('✅ วางกรอบจุดสำคัญเรียบร้อย - พร้อมเริ่มตรวจสอบ', 'success');
            }
        } else {
            this.showAlert('⚠️ กรอบเล็กเกินไป กรุณาลากให้ใหญ่กว่านี้', 'warning');
        }

        this.drawing.currentRect = null;
        this.showDrawingInstructions(false);
        this.updateUI();
        this.redrawOverlay();
    }

    /**
     * Check if we can draw
     */
    canDraw() {
        return this.state.currentStep === 'drawing-box' || 
               this.state.currentStep === 'drawing-keypoint';
    }

    /**
     * Draw current rectangle being drawn
     */
    drawCurrentRect() {
        if (!this.drawing.currentRect || !this.drawingCtx) return;

        this.drawingCtx.clearRect(0, 0, this.elements.drawingCanvas.width, this.elements.drawingCanvas.height);
        this.drawingCtx.strokeStyle = this.state.currentStep === 'drawing-box' ? '#4CAF50' : '#2196F3';
        this.drawingCtx.lineWidth = 3;
        this.drawingCtx.setLineDash([5, 5]);

        this.drawingCtx.strokeRect(
            this.drawing.currentRect.x,
            this.drawing.currentRect.y,
            this.drawing.currentRect.width,
            this.drawing.currentRect.height
        );
    }

    /**
     * Redraw overlay with saved rectangles
     */
    redrawOverlay() {
        if (!this.overlayCtx) return;

        this.overlayCtx.clearRect(0, 0, this.elements.overlayCanvas.width, this.elements.overlayCanvas.height);
        
        // Clear drawing canvas
        if (this.drawingCtx && !this.state.isDrawing) {
            this.drawingCtx.clearRect(0, 0, this.elements.drawingCanvas.width, this.elements.drawingCanvas.height);
        }

        // Draw box rectangle
        if (this.drawing.boxRect) {
            this.overlayCtx.strokeStyle = '#4CAF50';
            this.overlayCtx.lineWidth = 3;
            this.overlayCtx.setLineDash([]);
            this.overlayCtx.strokeRect(
                this.drawing.boxRect.x,
                this.drawing.boxRect.y,
                this.drawing.boxRect.width,
                this.drawing.boxRect.height
            );

            // Add label
            this.overlayCtx.fillStyle = '#4CAF50';
            this.overlayCtx.font = '14px Inter, sans-serif';
            this.overlayCtx.fillText('กรอบกล่อง', this.drawing.boxRect.x, this.drawing.boxRect.y - 5);
        }

        // Draw key point rectangle
        if (this.drawing.keyPointRect) {
            this.overlayCtx.strokeStyle = '#2196F3';
            this.overlayCtx.lineWidth = 2;
            this.overlayCtx.setLineDash([]);
            this.overlayCtx.strokeRect(
                this.drawing.keyPointRect.x,
                this.drawing.keyPointRect.y,
                this.drawing.keyPointRect.width,
                this.drawing.keyPointRect.height
            );

            // Add label
            this.overlayCtx.fillStyle = '#2196F3';
            this.overlayCtx.font = '14px Inter, sans-serif';
            this.overlayCtx.fillText('กรอบจุดสำคัญ', this.drawing.keyPointRect.x, this.drawing.keyPointRect.y - 5);
        }
    }

    /**
     * Show/hide drawing instructions
     */
    showDrawingInstructions(show) {
        if (!this.elements.drawingInstructions || !this.elements.instructionText) return;

        if (show) {
            let text = '';
            let icon = '';
            
            if (this.state.currentStep === 'drawing-box') {
                text = 'ลากเมาส์เพื่อวางกรอบรอบกล่อง';
                icon = '📦';
            } else if (this.state.currentStep === 'drawing-keypoint') {
                text = 'ลากเมาส์เพื่อวางกรอบจุดสำคัญ';
                icon = '🎯';
            }

            this.elements.instructionText.innerHTML = `<span class="instruction-icon">${icon}</span><span>${text}</span>`;
            this.elements.drawingInstructions.classList.add('show');
        } else {
            this.elements.drawingInstructions.classList.remove('show');
        }
    }

    /**
     * Setup component event handlers
     */
    setupComponentHandlers() {
        try {
            // Camera events
            this.camera.on('started', () => {
                this.state.isCameraActive = true;
                this.state.currentStep = 'camera-ready';
                this.updateCameraStatus('เชื่อมต่อแล้ว', 'connected');
                this.resizeCanvases(); // Ensure canvases are properly sized
                this.showAlert('เปิดกล้องสำเร็จ - ตอนนี้วางกรอบกล่อง', 'success');
            });

            this.camera.on('error', (error) => {
                this.state.isCameraActive = false;
                this.updateCameraStatus('ไม่เชื่อมต่อ', 'disconnected');
                this.showAlert('ไม่สามารถเปิดกล้องได้: ' + error.message, 'danger');
            });

            this.camera.on('frameUpdate', (frameData) => {
                this.updateVideoInfo(frameData);
                if (this.state.isMonitoring && this.state.hasReferenceImage) {
                    this.processFrame();
                }
            });

            // Detection events
            if (this.detection && typeof this.detection.on === 'function') {
                this.detection.on('ready', (info) => {
                    console.log('✅ Detection engine ready:', info);
                });

                this.detection.on('boxDetected', (result) => {
                    this.handleDetectionResult(result);
                });

                this.detection.on('error', (error) => {
                    console.error('❌ Detection error:', error);
                    this.showAlert('เกิดข้อผิดพลาดในการตรวจจับ: ' + error.message, 'danger');
                });
            }

            // Audio events
            if (this.audio && typeof this.audio.on === 'function') {
                this.audio.on('ready', () => {
                    if (this.elements.testSound) this.elements.testSound.disabled = false;
                    console.log('✅ Audio system ready');
                });

                this.audio.on('error', (error) => {
                    console.error('❌ Audio error:', error);
                });
            }

            // Bluetooth events
            if (this.bluetooth && typeof this.bluetooth.on === 'function') {
                this.bluetooth.on('connected', () => {
                    this.state.isBluetoothConnected = true;
                    this.updateBluetoothStatus('เชื่อมต่อแล้ว', 'connected');
                    this.updateBluetoothButtons(true);
                    this.showAlert('เชื่อมต่อลำโพงสำเร็จ', 'success');
                });

                this.bluetooth.on('error', (error) => {
                    this.state.isBluetoothConnected = false;
                    this.updateBluetoothStatus('ไม่เชื่อมต่อ', 'disconnected');
                    this.updateBluetoothButtons(false);
                    this.showAlert('ไม่สามารถเชื่อมต่อ Bluetooth ได้: ' + error.message, 'danger');
                });

                this.bluetooth.on('disconnected', () => {
                    this.state.isBluetoothConnected = false;
                    this.updateBluetoothStatus('ไม่เชื่อมต่อ', 'disconnected');
                    this.updateBluetoothButtons(false);
                });
            }

            console.log('✅ Component handlers setup completed');

        } catch (error) {
            console.error('❌ Error setting up component handlers:', error);
        }
    }

    /**
     * Update bluetooth button states
     */
    updateBluetoothButtons(connected) {
        if (this.elements.connectBluetooth) {
            this.elements.connectBluetooth.disabled = connected;
            this.elements.connectBluetooth.innerHTML = connected ? '🔗 เชื่อมต่อลำโพง' : '🔗 เชื่อมต่อลำโพง';
        }
        if (this.elements.disconnectBluetooth) {
            this.elements.disconnectBluetooth.disabled = !connected;
        }
        if (this.elements.testSound) {
            this.elements.testSound.disabled = !connected;
        }
        if (this.elements.bluetoothInfo) {
            this.elements.bluetoothInfo.classList.toggle('hidden', !connected);
        }
    }

    /**
     * Handle start camera
     */
    async handleStartCamera() {
        try {
            this.elements.startCamera.disabled = true;
            this.elements.startCamera.innerHTML = '🔄 กำลังเปิด...';

            await this.camera.start(this.elements.videoElement);

        } catch (error) {
            console.error('Failed to start camera:', error);
            this.elements.startCamera.disabled = false;
            this.elements.startCamera.innerHTML = '🎥 เปิดกล้อง';
        }
    }

    /**
     * Handle start drawing box
     */
    handleStartDrawingBox() {
        if (!this.state.isCameraActive) {
            this.showAlert('กรุณาเปิดกล้องก่อน', 'warning');
            return;
        }

        this.state.currentStep = 'drawing-box';
        this.elements.drawingCanvas.style.cursor = 'crosshair';
        this.elements.videoContainer.classList.add('drawing-box');
        this.updateUI();
        this.showAlert('📦 ลากเมาส์เพื่อวางกรอบรอบกล่อง', 'info');
    }

    /**
     * Handle start drawing key point
     */
    handleStartDrawingKeyPoint() {
        if (!this.drawing.boxRect) {
            this.showAlert('กรุณาวางกรอบกล่องก่อน', 'warning');
            return;
        }

        this.state.currentStep = 'drawing-keypoint';
        this.elements.drawingCanvas.style.cursor = 'crosshair';
        this.elements.videoContainer.classList.remove('drawing-box');
        this.elements.videoContainer.classList.add('drawing-keypoint');
        this.updateUI();
        this.showAlert('🎯 ลากเมาส์เพื่อวางกรอบจุดสำคัญ', 'info');
    }

    /**
     * Handle clear drawing
     */
    handleClearDrawing() {
        this.drawing.boxRect = null;
        this.drawing.keyPointRect = null;
        this.drawing.currentRect = null;
        this.state.hasReferenceImage = false;
        this.state.currentStep = this.state.isCameraActive ? 'camera-ready' : 'ready';

        // Clear canvases
        this.redrawOverlay();

        // Reset UI
        this.elements.videoContainer.className = 'video-container';
        if (this.state.isCameraActive) {
            this.elements.videoContainer.classList.add('active');
        }
        this.elements.drawingCanvas.style.cursor = 'default';

        this.updateUI();
        this.showAlert('🗑️ ล้างกรอบทั้งหมดแล้ว', 'info');
    }

    /**
     * Handle take reference photo (legacy method)
     */
    handleTakeReference() {
        try {
            const referenceData = this.camera.captureFrame();
            if (referenceData) {
                if (this.detection && typeof this.detection.setReferenceImage === 'function') {
                    this.detection.setReferenceImage(referenceData);
                }

                this.state.hasReferenceImage = true;
                this.drawReferenceBox();

                if (this.elements.clearReference) this.elements.clearReference.disabled = false;
                if (this.elements.saveReference) this.elements.saveReference.disabled = false;
                if (this.elements.startMonitoring) this.elements.startMonitoring.disabled = false;

                this.showAlert('บันทึกภาพอ้างอิงสำเร็จ', 'success');
            } else {
                this.showAlert('ไม่สามารถจับภาพจากกล้องได้', 'warning');
            }
        } catch (error) {
            console.error('❌ Error taking reference photo:', error);
            this.showAlert('ไม่สามารถถ่ายภาพอ้างอิงได้', 'danger');
        }
    }

    /**
     * Handle clear reference
     */
    handleClearReference() {
        try {
            if (this.detection && typeof this.detection.clearReference === 'function') {
                this.detection.clearReference();
            }

            this.handleClearDrawing(); // This also clears reference state

            if (this.state.isMonitoring) {
                this.handleStopMonitoring();
            }

            this.showAlert('ลบภาพอ้างอิงแล้ว', 'success');
        } catch (error) {
            console.error('❌ Error clearing reference:', error);
            this.showAlert('เกิดข้อผิดพลาดในการลบภาพอ้างอิง', 'danger');
        }
    }

    /**
     * Handle save reference
     */
    handleSaveReference() {
        try {
            const referenceData = {
                boxRect: this.drawing.boxRect,
                keyPointRect: this.drawing.keyPointRect,
                timestamp: Date.now()
            };

            if (referenceData.boxRect && referenceData.keyPointRect) {
                localStorage.setItem('visualControl_reference', JSON.stringify(referenceData));
                this.showAlert('บันทึกกรอบอ้างอิงลง Local Storage สำเร็จ', 'success');
            } else {
                this.showAlert('ไม่มีกรอบอ้างอิงให้บันทึก', 'warning');
            }
        } catch (error) {
            console.error('❌ Error saving reference:', error);
            this.showAlert('ไม่สามารถบันทึกกรอบอ้างอิงได้', 'danger');
        }
    }

    /**
     * Handle connect bluetooth
     */
    async handleConnectBluetooth() {
        try {
            this.elements.connectBluetooth.disabled = true;
            this.elements.connectBluetooth.innerHTML = '🔄 กำลังเชื่อมต่อ...';

            if (!this.audio.isInitialized && this.audio.audioContext && this.audio.audioContext.state === 'suspended') {
                await this.audio.resumeAudioContext();
            }

            await this.bluetooth.connect();

        } catch (error) {
            console.error('Failed to connect bluetooth:', error);
            this.elements.connectBluetooth.disabled = false;
            this.elements.connectBluetooth.innerHTML = '🔗 เชื่อมต่อลำโพง';
        }
    }

    /**
     * Handle disconnect bluetooth
     */
    async handleDisconnectBluetooth() {
        try {
            this.elements.disconnectBluetooth.disabled = true;
            this.elements.disconnectBluetooth.innerHTML = '🔄 กำลังตัดการเชื่อมต่อ...';

            await this.bluetooth.disconnect();

        } catch (error) {
            console.error('Failed to disconnect bluetooth:', error);
            this.elements.disconnectBluetooth.disabled = false;
            this.elements.disconnectBluetooth.innerHTML = '🔌 เลิกเชื่อมต่อ';
        }
    }

    /**
     * Handle test sound
     */
    async handleTestSound() {
        try {
            if (!this.audio.isInitialized) {
                await this.audio.resumeAudioContext();
            }

            await this.audio.playAlert();
            this.showAlert('ทดสอบเสียงเตือน', 'info');
        } catch (error) {
            console.error('Failed to test sound:', error);
            this.showAlert('ไม่สามารถเล่นเสียงทดสอบได้: ' + error.message, 'danger');
        }
    }

    /**
     * Handle start monitoring
     */
    handleStartMonitoring() {
        if (!this.state.hasReferenceImage || !this.drawing.boxRect || !this.drawing.keyPointRect) {
            this.showAlert('กรุณาวางกรอบกล่องและจุดสำคัญก่อน', 'warning');
            return;
        }

        this.state.isMonitoring = true;
        this.state.currentStep = 'monitoring';
        this.stats.startTime = new Date();

        this.updateMonitoringStatus('กำลังตรวจสอบ', 'monitoring');
        this.elements.videoContainer.className = 'video-container active monitoring';

        this.startMonitoringLoop();
        this.showAlert('เริ่มการตรวจสอบแล้ว', 'success');
    }

    /**
     * Handle stop monitoring
     */
    handleStopMonitoring() {
        this.state.isMonitoring = false;
        this.state.currentStep = 'ready-monitor';

        this.updateMonitoringStatus('หยุดตรวจสอบ', 'disconnected');
        this.elements.videoContainer.classList.remove('monitoring');

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.showAlert('หยุดการตรวจสอบแล้ว', 'info');
    }

    /**
     * Handle pause alert
     */
    handlePauseAlert() {
        this.state.isPaused = true;
        this.elements.pauseAlert.disabled = true;
        this.elements.pauseAlert.innerHTML = '⏱️ รอ 30 วิ...';

        this.showAlert('หยุดการแจ้งเตือนชั่วคราว 30 วินาที', 'info');

        setTimeout(() => {
            this.state.isPaused = false;
            this.elements.pauseAlert.disabled = false;
            this.elements.pauseAlert.innerHTML = '🔇 หยุดเตือน 30 วิ';
        }, 30000);
    }

    /**
     * Handle reset statistics
     */
    handleResetStats() {
        this.stats = {
            total: 0,
            normal: 0,
            alert: 0,
            boxCounter: 0,
            startTime: this.state.isMonitoring ? new Date() : null
        };

        this.updateStatistics();
        this.updateCounters();
        this.showAlert('รีเซ็ตสถิติแล้ว', 'success');
    }

    /**
     * Handle fullscreen
     */
    handleFullscreen() {
        const container = this.elements.videoContainer;

        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    /**
     * Handle sensitivity changes
     */
    handleSensitivityChange(type, value) {
        switch (type) {
            case 'rotation':
                this.settings.rotationSensitivity = parseInt(value);
                this.elements.rotationValue.textContent = value + '°';
                break;
            case 'position':
                this.settings.positionSensitivity = parseInt(value);
                this.elements.positionValue.textContent = value + 'px';
                break;
            case 'threshold':
                this.settings.detectionThreshold = parseInt(value);
                this.elements.thresholdValue.textContent = value + '%';
                break;
        }

        if (this.detection && typeof this.detection.updateSettings === 'function') {
            this.detection.updateSettings(this.settings);
        }

        this.saveSettings();
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (event.code) {
            case 'Space':
                event.preventDefault();
                if (this.state.isMonitoring) {
                    this.handleStopMonitoring();
                } else if (this.state.hasReferenceImage) {
                    this.handleStartMonitoring();
                }
                break;
            case 'KeyB':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.handleStartDrawingBox();
                }
                break;
            case 'KeyK':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.handleStartDrawingKeyPoint();
                }
                break;
            case 'KeyC':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.handleClearDrawing();
                }
                break;
            case 'KeyT':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.handleTestSound();
                }
                break;
            case 'Escape':
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
                break;
        }
    }

    /**
     * Start monitoring loop
     */
    startMonitoringLoop() {
        if (!this.state.isMonitoring) return;

        // Simulate box detection and processing
        this.monitoringInterval = setInterval(() => {
            if (this.state.isMonitoring) {
                this.performDetection();
            }
        }, 1000); // Check every second
    }

    /**
     * Perform detection (enhanced with drawing areas)
     */
    performDetection() {
        if (!this.state.isMonitoring || !this.drawing.keyPointRect) return;

        // Simulate detection based on key point area
        const shouldAlert = Math.random() < 0.1; // 10% chance of alert

        this.stats.total++;

        if (shouldAlert) {
            this.stats.alert++;
            this.drawAlertRect();

            if (!this.state.isPaused) {
                this.audio.playAlert();
                const issues = [
                    'กล่องเอียง ' + Math.floor(Math.random() * 10 + 5) + '°',
                    'กล่องเลื่อนตำแหน่ง ' + Math.floor(Math.random() * 30 + 15) + 'px',
                    'จุดสำคัญผิดตำแหน่ง',
                    'การหมุนผิดปกติ'
                ];
                const issue = issues[Math.floor(Math.random() * issues.length)];
                this.showAlert('⚠️ ' + issue, 'danger');
            }
        } else {
            this.stats.normal++;
        }

        // Simulate box counter increment
        if (Math.random() < 0.3) { // 30% chance a box passes
            this.stats.boxCounter++;
        }

        this.updateStatistics();
        this.updateCounters();
    }

    /**
     * Draw alert rectangle around key point area
     */
    drawAlertRect() {
        if (!this.drawing.keyPointRect || !this.overlayCtx) return;

        // Save current overlay
        this.redrawOverlay();

        // Draw alert rectangle
        this.overlayCtx.strokeStyle = '#F44336';
        this.overlayCtx.lineWidth = 4;
        this.overlayCtx.setLineDash([]);
        this.overlayCtx.globalAlpha = 0.8;

        // Draw pulsing alert rectangle
        this.overlayCtx.strokeRect(
            this.drawing.keyPointRect.x - 3,
            this.drawing.keyPointRect.y - 3,
            this.drawing.keyPointRect.width + 6,
            this.drawing.keyPointRect.height + 6
        );

        // Fill with semi-transparent red
        this.overlayCtx.fillStyle = 'rgba(244, 67, 54, 0.2)';
        this.overlayCtx.fillRect(
            this.drawing.keyPointRect.x,
            this.drawing.keyPointRect.y,
            this.drawing.keyPointRect.width,
            this.drawing.keyPointRect.height
        );

        this.overlayCtx.globalAlpha = 1;

        // Remove alert rectangle after 2 seconds
        setTimeout(() => {
            this.redrawOverlay();
        }, 2000);
    }

    /**
     * Process frame for detection
     */
    processFrame() {
        try {
            const frameData = this.camera.getCurrentFrame();
            if (frameData && this.drawing.keyPointRect) {
                // Create detection result based on key point area
                const result = {
                    hasAlert: Math.random() < 0.05, // 5% chance during processing
                    box: this.drawing.keyPointRect,
                    message: 'การตรวจสอบเรียลไทม์',
                    confidence: 95 + Math.random() * 5
                };

                if (result.hasAlert) {
                    this.handleDetectionResult(result);
                }
            }
        } catch (error) {
            console.error('❌ Error processing frame:', error);
        }
    }

    /**
     * Handle detection result
     */
    handleDetectionResult(result) {
        this.stats.total++;

        if (result.hasAlert) {
            this.stats.alert++;
            this.drawAlertRect();

            if (!this.state.isPaused) {
                this.audio.playAlert();
                this.showAlert('⚠️ ' + result.message, 'danger');
            }
        } else {
            this.stats.normal++;
        }

        this.updateStatistics();
    }

    /**
     * Draw reference box (legacy method)
     */
    drawReferenceBox() {
        if (!this.overlayCtx) return;

        this.overlayCtx.clearRect(0, 0, this.elements.overlayCanvas.width, this.elements.overlayCanvas.height);

        // Draw reference rectangle
        this.overlayCtx.strokeStyle = '#4CAF50';
        this.overlayCtx.lineWidth = 3;
        this.overlayCtx.setLineDash([]);

        const centerX = this.elements.overlayCanvas.width / 2;
        const centerY = this.elements.overlayCanvas.height / 2;
        const width = this.elements.overlayCanvas.width * 0.5;
        const height = this.elements.overlayCanvas.height * 0.5;

        this.overlayCtx.strokeRect(
            centerX - width / 2,
            centerY - height / 2,
            width,
            height
        );

        // Add label
        this.overlayCtx.fillStyle = '#4CAF50';
        this.overlayCtx.font = '16px Inter, sans-serif';
        this.overlayCtx.fillText('ตำแหน่งอ้างอิง', centerX - width / 2, centerY - height / 2 - 10);
    }

    /**
     * Update UI state
     */
    updateUI() {
        // Update video container classes
        this.elements.videoContainer.className = 'video-container';
        
        if (this.state.isCameraActive) {
            this.elements.videoContainer.classList.add('active');
        }
        
        if (this.state.currentStep === 'drawing-box') {
            this.elements.videoContainer.classList.add('drawing-box');
        } else if (this.state.currentStep === 'drawing-keypoint') {
            this.elements.videoContainer.classList.add('drawing-keypoint');
        } else if (this.state.currentStep === 'monitoring') {
            this.elements.videoContainer.classList.add('monitoring');
        }

        // Update button states
        if (this.elements.startCamera) {
            this.elements.startCamera.disabled = this.state.isCameraActive;
        }

        if (this.elements.drawBoxBtn) {
            this.elements.drawBoxBtn.disabled = !this.state.isCameraActive;
        }

        if (this.elements.drawKeyPointBtn) {
            this.elements.drawKeyPointBtn.disabled = !this.drawing.boxRect;
        }

        if (this.elements.clearDrawing) {
            this.elements.clearDrawing.disabled = !this.drawing.boxRect && !this.drawing.keyPointRect;
        }

        if (this.elements.startMonitoring) {
            this.elements.startMonitoring.disabled = this.state.currentStep !== 'ready-monitor' || this.state.isMonitoring;
        }

        if (this.elements.stopMonitoring) {
            this.elements.stopMonitoring.disabled = !this.state.isMonitoring;
        }

        if (this.elements.pauseAlert) {
            this.elements.pauseAlert.disabled = !this.state.isMonitoring;
        }

        // Update setup status
        this.updateSetupStatus();
    }

    /**
     * Update setup status
     */
    updateSetupStatus() {
        let statusText = '';
        let statusClass = 'status-setup';

        switch (this.state.currentStep) {
            case 'ready':
                statusText = 'ขั้นตอน: เปิดกล้อง';
                break;
            case 'camera-ready':
                statusText = 'ขั้นตอน: วางกรอบกล่อง';
                break;
            case 'drawing-box':
                statusText = 'ขั้นตอน: กำลังวางกรอบกล่อง';
                break;
            case 'box-drawn':
                statusText = 'ขั้นตอน: วางกรอบจุดสำคัญ';
                break;
            case 'drawing-keypoint':
                statusText = 'ขั้นตอน: กำลังวางกรอบจุดสำคัญ';
                break;
            case 'ready-monitor':
                statusText = 'ขั้นตอน: พร้อมตรวจสอบ';
                statusClass = 'status-connected';
                break;
            case 'monitoring':
                statusText = 'ขั้นตอน: กำลังตรวจสอบ';
                statusClass = 'status-monitoring';
                break;
        }

        if (this.elements.setupStatus) {
            this.elements.setupStatus.innerHTML = `<span>⚙️</span><span>${statusText}</span>`;
            this.elements.setupStatus.className = `status-item ${statusClass}`;
        }
    }

    /**
     * Update camera status
     */
    updateCameraStatus(text, status) {
        if (this.elements.cameraStatus) {
            this.elements.cameraStatus.innerHTML = `<span class="status-icon">📹</span><span class="status-text">กล้อง: ${text}</span>`;
            this.elements.cameraStatus.className = `status-item status-${status}`;
        }
    }

    /**
     * Update bluetooth status
     */
    updateBluetoothStatus(text, status) {
        if (this.elements.bluetoothStatus) {
            this.elements.bluetoothStatus.innerHTML = `<span class="status-icon">🔊</span><span class="status-text">ลำโพง: ${text}</span>`;
            this.elements.bluetoothStatus.className = `status-item status-${status}`;
        }
    }

    /**
     * Update monitoring status
     */
    updateMonitoringStatus(text, status) {
        if (this.elements.monitoringStatus) {
            this.elements.monitoringStatus.innerHTML = `<span class="status-icon">👁️</span><span class="status-text">สถานะ: ${text}</span>`;
            this.elements.monitoringStatus.className = `status-item status-${status}`;
        }
    }

    /**
     * Update video info
     */
    updateVideoInfo(frameData) {
        if (this.elements.videoResolution && frameData.width && frameData.height) {
            this.elements.videoResolution.textContent = `${frameData.width}x${frameData.height}`;
        }

        if (this.elements.frameRate && frameData.fps) {
            this.elements.frameRate.textContent = `${Math.round(frameData.fps)} FPS`;
        }
    }

    /**
     * Update statistics display
     */
    updateStatistics() {
        if (this.elements.totalBoxes) {
            this.elements.totalBoxes.textContent = this.stats.total;
        }

        if (this.elements.normalBoxesStats) {
            this.elements.normalBoxesStats.textContent = this.stats.normal;
        }

        if (this.elements.alertBoxesStats) {
            this.elements.alertBoxesStats.textContent = this.stats.alert;
        }

        if (this.elements.accuracy) {
            const accuracy = this.stats.total > 0 ? 
                Math.round((this.stats.normal / this.stats.total) * 100) : 100;
            this.elements.accuracy.textContent = accuracy + '%';
        }
    }

    /**
     * Update counters in control panel
     */
    updateCounters() {
        if (this.elements.boxCounter) {
            this.elements.boxCounter.textContent = this.stats.boxCounter;
        }

        if (this.elements.normalBoxes) {
            this.elements.normalBoxes.textContent = this.stats.normal;
        }

        if (this.elements.alertBoxes) {
            this.elements.alertBoxes.textContent = this.stats.alert;
        }
    }

    /**
     * Show alert message
     */
    showAlert(message, type = 'info') {
        if (!this.elements.systemAlert) return;

        const alertBox = this.elements.systemAlert;
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            danger: '❌'
        };

        alertBox.innerHTML = `
            <span class="alert-icon">${icons[type] || icons.info}</span>
            <span class="alert-message">${message}</span>
        `;

        alertBox.className = `alert-box alert-${type}`;

        // Auto-hide success and info messages
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (alertBox.classList.contains(`alert-${type}`)) {
                    this.showAlert('ระบบพร้อมใช้งาน', 'info');
                }
            }, 5000);
        }

        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('visualControl_settings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                this.settings = { ...this.settings, ...settings };

                // Update UI
                if (this.elements.rotationSensitivity) {
                    this.elements.rotationSensitivity.value = this.settings.rotationSensitivity;
                    this.elements.rotationValue.textContent = this.settings.rotationSensitivity + '°';
                }

                if (this.elements.positionSensitivity) {
                    this.elements.positionSensitivity.value = this.settings.positionSensitivity;
                    this.elements.positionValue.textContent = this.settings.positionSensitivity + 'px';
                }

                if (this.elements.detectionThreshold) {
                    this.elements.detectionThreshold.value = this.settings.detectionThreshold;
                    this.elements.thresholdValue.textContent = this.settings.detectionThreshold + '%';
                }
            }

            // Load saved reference rectangles
            const savedReference = localStorage.getItem('visualControl_reference');
            if (savedReference) {
                const referenceData = JSON.parse(savedReference);
                if (referenceData.boxRect && referenceData.keyPointRect) {
                    this.drawing.boxRect = referenceData.boxRect;
                    this.drawing.keyPointRect = referenceData.keyPointRect;
                    this.state.hasReferenceImage = true;
                    this.state.currentStep = 'ready-monitor';
                    
                    // Redraw after a short delay to ensure canvas is ready
                    setTimeout(() => {
                        this.redrawOverlay();
                        this.updateUI();
                        this.showAlert('โหลดกรอบอ้างอิงจาก Local Storage สำเร็จ', 'success');
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('visualControl_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('🧹 Cleaning up Visual Control System...');

        if (this.camera) {
            this.camera.stop();
        }

        if (this.bluetooth) {
            this.bluetooth.disconnect();
        }

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.state.isMonitoring = false;
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded');
    try {
        // Create global app instance
        window.visualControlApp = new VisualControlApp();
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        // Force hide loading screen on error
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
});

// Fallback - if DOMContentLoaded already fired
if (document.readyState === 'loading') {
    // Document still loading, wait for DOMContentLoaded
} else {
    // Document already loaded
    console.log('📄 Document already loaded, initializing immediately');
    setTimeout(() => {
        if (!window.visualControlApp) {
            try {
                window.visualControlApp = new VisualControlApp();
            } catch (error) {
                console.error('❌ Failed to initialize app (fallback):', error);
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                }
            }
        }
    }, 100);
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (window.visualControlApp) {
        if (document.hidden) {
            console.log('📱 Page hidden - monitoring continues in background');
        } else {
            console.log('📱 Page visible - resuming monitoring');
            // Ensure canvases are properly sized when page becomes visible
            if (window.visualControlApp.resizeCanvases) {
                window.visualControlApp.resizeCanvases();
            }
        }
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.visualControlApp && window.visualControlApp.resizeCanvases) {
        window.visualControlApp.resizeCanvases();
    }
});

export default VisualControlApp;
/**
 * Visual Control System - Main Application
 * Main entry point for the visual control system
 */

// Import modules
import { CameraManager } from './camera.js';
import { DetectionEngine } from './detection.js';
import { AudioManager } from './audio.js';
import { BluetoothManager } from './bluetooth.js';
import { Utils } from './utils.js';

/**
 * Main Visual Control Application Class
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
            isCameraActive: false
        };

        // Statistics
        this.stats = {
            total: 0,
            normal: 0,
            alert: 0,
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

        // Initialize application
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('🚀 Initializing Visual Control System...');
            
            // Cache DOM elements first
            this.cacheElements();
            
            // Hide loading screen immediately after caching elements
            this.hideLoadingScreen();
            
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
            
            console.log('✅ Visual Control System initialized successfully');
            
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
            'cameraStatus', 'bluetoothStatus', 'monitoringStatus',
            'videoElement', 'overlayCanvas', 'videoContainer',
            'videoResolution', 'frameRate', 'startCamera', 'takeReference',
            'clearReference', 'saveReference', 'connectBluetooth', 'testSound',
            'startMonitoring', 'stopMonitoring', 'pauseAlert', 'resetStats',
            'fullscreenBtn', 'rotationSensitivity', 'positionSensitivity',
            'detectionThreshold', 'rotationValue', 'positionValue', 'thresholdValue',
            'totalBoxes', 'normalBoxes', 'alertBoxes', 'accuracy',
            'systemAlert', 'bluetoothInfo'
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

        // Add disconnect bluetooth button
        this.elements.disconnectBluetooth = document.getElementById('disconnectBluetooth');
        if (this.elements.disconnectBluetooth) foundCount++;

        console.log(`✅ Found ${foundCount}/${elementIds.length + 1} DOM elements`);
        
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

        // Bluetooth controls
        this.elements.connectBluetooth?.addEventListener('click', () => this.handleConnectBluetooth());
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

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Window events
        window.addEventListener('beforeunload', () => this.cleanup());
        window.addEventListener('resize', () => this.handleResize());
    }

    /**
     * Setup component event handlers
     */
    setupComponentHandlers() {
        try {
            // Camera events
            this.camera.on('started', () => {
                this.state.isCameraActive = true;
                this.updateCameraStatus('เชื่อมต่อแล้ว', 'connected');
                if (this.elements.takeReference) this.elements.takeReference.disabled = false;
                this.showAlert('เปิดกล้องสำเร็จ', 'success');
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

            // Detection events - wait for detection engine to be ready
            if (this.detection) {
                // Check if event system exists
                if (typeof this.detection.on === 'function') {
                    this.detection.on('ready', (info) => {
                        console.log('✅ Detection engine ready:', info);
                    });

                    this.detection.on('boxDetected', (result) => {
                        this.handleDetectionResult(result);
                    });

                    this.detection.on('referenceSet', (data) => {
                        console.log('📐 Reference image set:', data);
                    });

                    this.detection.on('error', (error) => {
                        console.error('❌ Detection error:', error);
                        this.showAlert('เกิดข้อผิดพลาดในการตรวจจับ: ' + error.message, 'danger');
                    });

                    console.log('✅ Detection engine events registered');
                } else {
                    console.warn('⚠️ Detection engine missing event system - using fallback mode');
                }
            } else {
                console.warn('⚠️ Detection engine not initialized');
            }

            // Audio events (with null checks)
            if (this.audio && typeof this.audio.on === 'function') {
                this.audio.on('ready', () => {
                    if (this.elements.testSound) this.elements.testSound.disabled = false;
                    console.log('✅ Audio system ready');
                });

                this.audio.on('error', (error) => {
                    console.error('❌ Audio error:', error);
                });
            } else {
                console.warn('⚠️ Audio manager event system not available');
            }

            // Bluetooth events (with null checks)
            if (this.bluetooth && typeof this.bluetooth.on === 'function') {
                this.bluetooth.on('connected', () => {
                    this.state.isBluetoothConnected = true;
                    this.updateBluetoothStatus('เชื่อมต่อแล้ว', 'connected');
                    
                    // Update buttons
                    if (this.elements.connectBluetooth) {
                        this.elements.connectBluetooth.disabled = true;
                        this.elements.connectBluetooth.innerHTML = '🔗 เชื่อมต่อลำโพง';
                    }
                    if (this.elements.disconnectBluetooth) {
                        this.elements.disconnectBluetooth.disabled = false;
                        this.elements.disconnectBluetooth.innerHTML = '🔌 เลิกเชื่อมต่อ';
                    }
                    if (this.elements.testSound) {
                        this.elements.testSound.disabled = false;
                    }
                    if (this.elements.bluetoothInfo) {
                        this.elements.bluetoothInfo.classList.remove('hidden');
                    }
                    
                    this.showAlert('เชื่อมต่อลำโพงสำเร็จ', 'success');
                });

                this.bluetooth.on('error', (error) => {
                    this.state.isBluetoothConnected = false;
                    this.updateBluetoothStatus('ไม่เชื่อมต่อ', 'disconnected');
                    
                    // Reset buttons on error
                    if (this.elements.connectBluetooth) {
                        this.elements.connectBluetooth.disabled = false;
                        this.elements.connectBluetooth.innerHTML = '🔗 เชื่อมต่อลำโพง';
                    }
                    if (this.elements.disconnectBluetooth) {
                        this.elements.disconnectBluetooth.disabled = true;
                        this.elements.disconnectBluetooth.innerHTML = '🔌 เลิกเชื่อมต่อ';
                    }
                    if (this.elements.testSound) {
                        this.elements.testSound.disabled = true;
                    }
                    
                    this.showAlert('ไม่สามารถเชื่อมต่อ Bluetooth ได้: ' + error.message, 'danger');
                });

                this.bluetooth.on('disconnected', () => {
                    this.state.isBluetoothConnected = false;
                    this.updateBluetoothStatus('ไม่เชื่อมต่อ', 'disconnected');
                    
                    // Reset buttons
                    if (this.elements.connectBluetooth) {
                        this.elements.connectBluetooth.disabled = false;
                        this.elements.connectBluetooth.innerHTML = '🔗 เชื่อมต่อลำโพง';
                    }
                    if (this.elements.disconnectBluetooth) {
                        this.elements.disconnectBluetooth.disabled = true;
                        this.elements.disconnectBluetooth.innerHTML = '🔌 เลิกเชื่อมต่อ';
                    }
                    if (this.elements.testSound) {
                        this.elements.testSound.disabled = true;
                    }
                    if (this.elements.bluetoothInfo) {
                        this.elements.bluetoothInfo.classList.add('hidden');
                    }
                });

                console.log('✅ Bluetooth events registered');
            } else {
                console.warn('⚠️ Bluetooth manager event system not available');
            }

            console.log('✅ Component handlers setup completed');
            
        } catch (error) {
            console.error('❌ Error setting up component handlers:', error);
            // Don't throw error, continue with initialization
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
     * Handle take reference photo
     */
    handleTakeReference() {
        try {
            const referenceData = this.camera.captureFrame();
            if (referenceData) {
                // Set reference in detection engine (with null check)
                if (this.detection && typeof this.detection.setReferenceImage === 'function') {
                    this.detection.setReferenceImage(referenceData);
                }
                
                this.state.hasReferenceImage = true;
                
                // Draw reference box on canvas
                this.drawReferenceBox();
                
                // Update UI
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
            
            this.state.hasReferenceImage = false;
            
            // Clear canvas
            const canvas = this.elements.overlayCanvas;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            
            // Update UI
            if (this.elements.clearReference) this.elements.clearReference.disabled = true;
            if (this.elements.saveReference) this.elements.saveReference.disabled = true;
            if (this.elements.startMonitoring) this.elements.startMonitoring.disabled = true;
            
            // Stop monitoring if active
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
    handleSaveReference(imageData) {
  try {
    // ❌ อย่าเก็บ imageData เป็น base64 ยาว ๆ ใน localStorage
    // localStorage.setItem('visualControl_reference', imageData);

    // ✅ เก็บเฉพาะ timestamp หรือ path แทน
    const ref = {
      timestamp: Date.now(),
      note: "reference saved",
      // เก็บแค่ url blob หรือ id ของ IndexedDB
    };
    localStorage.setItem('visualControl_reference', JSON.stringify(ref));

    this.showAlert("บันทึกอ้างอิงสำเร็จ", "success");
  } catch (err) {
    console.error("❌ Error saving reference:", err);
    this.showAlert("ไม่สามารถบันทึกภาพอ้างอิงได้", "error");
  }
}

    /**
     * Handle connect bluetooth
     */
    async handleConnectBluetooth() {
        try {
            this.elements.connectBluetooth.disabled = true;
            this.elements.connectBluetooth.innerHTML = '🔄 กำลังเชื่อมต่อ...';
            
            // Ensure audio context is ready when connecting Bluetooth
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
            
            // Update UI
            this.state.isBluetoothConnected = false;
            this.updateBluetoothStatus('ไม่เชื่อมต่อ', 'disconnected');
            this.elements.bluetoothInfo.classList.add('hidden');
            
            // Reset buttons
            this.elements.connectBluetooth.disabled = false;
            this.elements.connectBluetooth.innerHTML = '🔗 เชื่อมต่อลำโพง';
            this.elements.disconnectBluetooth.disabled = true;
            this.elements.disconnectBluetooth.innerHTML = '🔌 เลิกเชื่อมต่อ';
            this.elements.testSound.disabled = true;
            
            this.showAlert('ตัดการเชื่อมต่อลำโพงแล้ว', 'info');
            
        } catch (error) {
            console.error('Failed to disconnect bluetooth:', error);
            this.elements.disconnectBluetooth.disabled = false;
            this.elements.disconnectBluetooth.innerHTML = '🔌 เลิกเชื่อมต่อ';
            this.showAlert('เกิดข้อผิดพลาดในการตัดการเชื่อมต่อ', 'danger');
        }
    }

    /**
     * Handle test sound
     */
    async handleTestSound() {
        try {
            // Force audio initialization if not ready
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
        if (!this.state.hasReferenceImage) {
            this.showAlert('กรุณาถ่ายภาพอ้างอิงก่อน', 'warning');
            return;
        }

        this.state.isMonitoring = true;
        this.stats.startTime = new Date();
        
        this.updateMonitoringStatus('กำลังตรวจสอบ', 'monitoring');
        this.elements.startMonitoring.disabled = true;
        this.elements.stopMonitoring.disabled = false;
        this.elements.pauseAlert.disabled = false;
        
        // Start monitoring loop
        this.startMonitoringLoop();
        
        this.showAlert('เริ่มการตรวจสอบแล้ว', 'success');
    }

    /**
     * Handle stop monitoring
     */
    handleStopMonitoring() {
        this.state.isMonitoring = false;
        
        this.updateMonitoringStatus('หยุดตรวจสอบ', 'disconnected');
        this.elements.startMonitoring.disabled = false;
        this.elements.stopMonitoring.disabled = true;
        this.elements.pauseAlert.disabled = true;
        
        // Clear detection boxes
        this.clearDetectionBoxes();
        
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
            startTime: this.state.isMonitoring ? new Date() : null
        };
        
        this.updateStatistics();
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
        
        // Update detection engine settings
        this.detection.updateSettings(this.settings);
        
        // Save settings
        this.saveSettings();
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Prevent shortcuts when typing in inputs
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
            case 'KeyR':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.handleTakeReference();
                }
                break;
            case 'KeyC':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.handleClearReference();
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
     * Handle window resize
     */
    handleResize() {
        // Update canvas size to match video
        if (this.elements.videoElement && this.elements.overlayCanvas) {
            const video = this.elements.videoElement;
            const canvas = this.elements.overlayCanvas;
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Redraw reference box if exists
            if (this.state.hasReferenceImage) {
                this.drawReferenceBox();
            }
        }
    }

    /**
     * Start monitoring loop
     */
    startMonitoringLoop() {
        if (!this.state.isMonitoring) return;
        
        // Process current frame
        this.processFrame();
        
        // Continue loop
        requestAnimationFrame(() => {
            setTimeout(() => this.startMonitoringLoop(), 100); // 10 FPS processing
        });
    }

    /**
     * Process current frame for detection
     */
    processFrame() {
        try {
            const frameData = this.camera.getCurrentFrame();
            if (frameData && this.detection && typeof this.detection.analyzeFrame === 'function') {
                const result = this.detection.analyzeFrame(frameData, this.settings);
                this.handleDetectionResult(result);
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
            this.drawDetectionBox(result, true);
            
            if (!this.state.isPaused) {
                this.audio.playAlert();
                this.showAlert('⚠️ พบกล่องผิดตำแหน่ง! ' + result.message, 'danger');
            }
        } else {
            this.stats.normal++;
            this.drawDetectionBox(result, false);
        }
        
        this.updateStatistics();
    }

    /**
     * Draw reference box on canvas
     */
    drawReferenceBox() {
        const canvas = this.elements.overlayCanvas;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw reference rectangle
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const width = canvas.width * 0.5;
        const height = canvas.height * 0.5;
        
        ctx.strokeRect(
            centerX - width / 2,
            centerY - height / 2,
            width,
            height
        );
        
        // Add label
        ctx.fillStyle = '#4CAF50';
        ctx.font = '16px Inter, sans-serif';
        ctx.fillText('ตำแหน่งอ้างอิง', centerX - width / 2, centerY - height / 2 - 10);
    }

    /**
     * Draw detection box
     */
    drawDetectionBox(result, isAlert) {
        const canvas = this.elements.overlayCanvas;
        const ctx = canvas.getContext('2d');
        
        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Redraw reference box
        this.drawReferenceBox();
        
        if (result.box) {
            const { x, y, width, height, rotation } = result.box;
            
            ctx.save();
            ctx.translate(x + width / 2, y + height / 2);
            ctx.rotate(rotation * Math.PI / 180);
            
            if (isAlert) {
                ctx.strokeStyle = '#F44336';
                ctx.fillStyle = 'rgba(244, 67, 54, 0.2)';
            } else {
                ctx.strokeStyle = '#4CAF50';
                ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
            }
            
            ctx.lineWidth = 3;
            ctx.fillRect(-width / 2, -height / 2, width, height);
            ctx.strokeRect(-width / 2, -height / 2, width, height);
            
            ctx.restore();
        }
    }

    /**
     * Clear detection boxes
     */
    clearDetectionBoxes() {
        const canvas = this.elements.overlayCanvas;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (this.state.hasReferenceImage) {
            this.drawReferenceBox();
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
        
        if (this.elements.normalBoxes) {
            this.elements.normalBoxes.textContent = this.stats.normal;
        }
        
        if (this.elements.alertBoxes) {
            this.elements.alertBoxes.textContent = this.stats.alert;
        }
        
        if (this.elements.accuracy) {
            const accuracy = this.stats.total > 0 ? 
                Math.round((this.stats.normal / this.stats.total) * 100) : 100;
            this.elements.accuracy.textContent = accuracy + '%';
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
     * Update UI state
     */
    updateUI() {
        // Update button states based on current state
        if (this.elements.startCamera) {
            this.elements.startCamera.disabled = this.state.isCameraActive;
        }
        
        if (this.elements.takeReference) {
            this.elements.takeReference.disabled = !this.state.isCameraActive;
        }
        
        if (this.elements.startMonitoring) {
            this.elements.startMonitoring.disabled = !this.state.hasReferenceImage || this.state.isMonitoring;
        }
        
        if (this.elements.stopMonitoring) {
            this.elements.stopMonitoring.disabled = !this.state.isMonitoring;
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
        
        this.state.isMonitoring = false;
    }
}

let cameraSelectEl, refreshCamerasBtn;
try {
    const cameras = await visualControlApp.camera.getAvailableCameras();
    cameraSelectEl.innerHTML = '';
    if (!cameras.length) {
        cameraSelectEl.innerHTML = `<option value="">ไม่พบกล้อง</option>`;
        return;
    }
    for (const d of cameras) {
        const opt = document.createElement('option');
        opt.value = d.deviceId;
        opt.textContent = d.label || `Camera (${d.deviceId.slice(0, 6)}…)`;
        cameraSelectEl.appendChild(opt);
    }
    if (savedId && [...cameraSelectEl.options].some(o => o.value === savedId)) {
        cameraSelectEl.value = savedId;
    }
} catch (err) {
    console.error('โหลดรายชื่อกล้องล้มเหลว:', err);
    cameraSelectEl.innerHTML = `<option value="">โหลดรายชื่อกล้องล้มเหลว</option>`;
}


cameraSelectEl.addEventListener('change', async (e) => {
const chosenId = e.target.value;
localStorage.setItem('vc_camera_device_id', chosenId || '');
if (!chosenId) return;


try {
if (visualControlApp.camera.isActive) {
await visualControlApp.camera.switchCamera(chosenId);
} else {
visualControlApp.camera.updateSettings({ deviceId: { exact: chosenId } });
}
if (typeof updateCameraStatus === 'function') {
updateCameraStatus('เชื่อมต่อแล้ว', 'connected');
}
} catch (err) {
if (typeof showAlert === 'function') {
showAlert('ไม่สามารถสลับกล้องได้: ' + (err.hint || err.message), 'error');
}
if (typeof updateCameraStatus === 'function') {
updateCameraStatus('ไม่เชื่อมต่อ', 'disconnected');
}
}
});


if (refreshCamerasBtn) refreshCamerasBtn.addEventListener('click', populate);


// เรียกครั้งแรก
populate().then(() => {
const sid = localStorage.getItem('vc_camera_device_id');
if (sid) visualControlApp.camera.updateSettings({ deviceId: { exact: sid } });
});



// Hook หลัง DOM พร้อมใช้งาน
document.addEventListener('DOMContentLoaded', () => {
// เรียกหลังจาก visualControlApp และ camera พร้อมแล้ว
try { initCameraSelectorUI(); } catch (e) { console.warn('initCameraSelectorUI skipped:', e); }
});

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
            console.log('📱 Page hidden - pausing monitoring');
        } else {
            console.log('📱 Page visible - resuming monitoring');
        }
    }
});

export default VisualControlApp;
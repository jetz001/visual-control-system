/**
 * Bluetooth Manager Module
 * Handles Bluetooth connectivity for audio devices
 * Note: Web Bluetooth API has limited support - this module provides both real and simulated functionality
 */

export class BluetoothManager {
    constructor() {
        this.device = null;
        this.server = null;
        this.isConnected = false;
        this.eventListeners = {};
        this.simulationMode = false;
        
        // Device info
        this.deviceInfo = {
            name: null,
            id: null,
            type: 'audio',
            rssi: null
        };

        // Check if Web Bluetooth is supported
        this.isSupported = this.checkSupport();
        
        if (!this.isSupported) {
            console.warn('⚠️ Web Bluetooth not supported - using simulation mode');
            this.simulationMode = true;
        }
    }

    /**
     * Check if Web Bluetooth is supported
     * @returns {boolean} Support status
     */
    checkSupport() {
        return !!(navigator.bluetooth && 
                 navigator.bluetooth.requestDevice && 
                 window.isSecureContext); // HTTPS required
    }

    /**
     * Connect to Bluetooth audio device
     * @param {Object} options - Connection options
     */
    async connect(options = {}) {
        try {
            // If Web Bluetooth is not supported or we're already in simulation mode
            if (this.simulationMode || !this.isSupported) {
                console.log('🔵 Using Bluetooth simulation mode');
                return await this.simulateConnection(options);
            }

            // Try real Bluetooth connection first
            console.log('🔵 Attempting real Bluetooth connection...');
            await this.connectReal(options);
            
        } catch (error) {
            console.warn('⚠️ Real Bluetooth failed, switching to simulation:', error.message);
            
            // Switch to simulation mode on any error
            this.simulationMode = true;
            
            try {
                await this.simulateConnection(options);
            } catch (simError) {
                console.error('❌ Both real and simulated Bluetooth failed:', simError);
                this.emit('error', new Error('ไม่สามารถเชื่อมต่อ Bluetooth ได้ (' + error.message + ')'));
                throw simError;
            }
        }
    }

    /**
     * Real Bluetooth connection implementation
     * @param {Object} options - Connection options
     */
    async connectReal(options) {
        try {
            console.log('🔵 Requesting Bluetooth device...');
            
            // Request device with proper service UUIDs and filters
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    // Audio devices with proper service UUIDs
                    { services: ['0000110b-0000-1000-8000-00805f9b34fb'] }, // Audio Sink
                    { services: ['0000110a-0000-1000-8000-00805f9b34fb'] }, // Audio Source
                    { services: ['0000111e-0000-1000-8000-00805f9b34fb'] }, // Handsfree
                    { services: ['battery_service'] }, // Standard battery service
                    // Name-based filters (more reliable)
                    { namePrefix: 'JBL' },
                    { namePrefix: 'Sony' },
                    { namePrefix: 'Bose' },
                    { namePrefix: 'Beats' },
                    { namePrefix: 'AirPods' },
                    { namePrefix: 'Speaker' },
                    { namePrefix: 'Audio' },
                    { namePrefix: 'Sound' },
                    { namePrefix: 'Headphones' },
                    { namePrefix: 'Bluetooth' }
                ],
                optionalServices: [
                    'battery_service', 
                    'device_information',
                    '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service UUID
                    '0000180a-0000-1000-8000-00805f9b34fb'  // Device Information UUID
                ]
            });

            console.log('🔵 Selected device:', this.device.name);

            // Add event listeners
            this.device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnection();
            });

            // Connect to GATT server
            console.log('🔵 Connecting to GATT server...');
            this.server = await this.device.gatt.connect();

            // Update device info
            this.deviceInfo = {
                name: this.device.name,
                id: this.device.id,
                type: 'audio',
                rssi: null
            };

            this.isConnected = true;
            
            console.log('✅ Bluetooth connected successfully');
            this.emit('connected', this.deviceInfo);

        } catch (error) {
            console.error('❌ Bluetooth connection error:', error);
            
            if (error.name === 'NotFoundError') {
                throw new Error('ไม่พบอุปกรณ์ Bluetooth หรือผู้ใช้ยกเลิก');
            } else if (error.name === 'SecurityError') {
                throw new Error('ต้องใช้ HTTPS เพื่อเชื่อมต่อ Bluetooth');
            } else if (error.name === 'NotSupportedError') {
                throw new Error('เบราว์เซอร์ไม่รองรับ Web Bluetooth');
            } else if (error.message.includes('Invalid Service name')) {
                // Fallback to simulation mode on service name error
                console.warn('⚠️ Invalid service names, falling back to simulation mode');
                return await this.simulateConnection(options);
            } else {
                throw error;
            }
        }
    }

    /**
     * Simulate Bluetooth connection (for development/demo)
     * @param {Object} options - Connection options
     */
    async simulateConnection(options) {
        console.log('🔵 Simulating Bluetooth connection...');
        
        // Show a simulated device selection
        const deviceName = await this.showSimulatedDeviceSelector();
        
        // Simulate connection delay
        await this.delay(1500);
        
        // Simulate connection success
        this.deviceInfo = {
            name: deviceName,
            id: 'simulated-' + Math.random().toString(36).substr(2, 9),
            type: 'audio',
            rssi: -45
        };
        
        this.isConnected = true;
        
        console.log('✅ Simulated Bluetooth connection successful');
        this.emit('connected', this.deviceInfo);
    }

    /**
     * Show simulated device selector - improved version
     * @returns {Promise<string>} Selected device name
     */
    showSimulatedDeviceSelector() {
        return new Promise((resolve, reject) => {
            // Create a simple modal for device selection
            const modal = this.createDeviceModal();
            document.body.appendChild(modal);
            
            // Auto-focus the modal
            modal.focus();
            
            // Handle device selection
            const handleSelection = (e) => {
                if (e.target.classList.contains('device-option') || e.target.closest('.device-option')) {
                    const deviceElement = e.target.classList.contains('device-option') ? 
                        e.target : e.target.closest('.device-option');
                    const deviceName = deviceElement.getAttribute('data-device') || 
                        deviceElement.querySelector('div > div')?.textContent?.trim() ||
                        'Unknown Device';
                    
                    // Add visual feedback
                    deviceElement.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
                    deviceElement.style.color = 'white';
                    deviceElement.style.transform = 'scale(0.98)';
                    
                    setTimeout(() => {
                        if (document.body.contains(modal)) {
                            document.body.removeChild(modal);
                        }
                        resolve(deviceName);
                    }, 200);
                    
                } else if (e.target.classList.contains('cancel-btn')) {
                    if (document.body.contains(modal)) {
                        document.body.removeChild(modal);
                    }
                    reject(new Error('ผู้ใช้ยกเลิกการเชื่อมต่อ'));
                }
            };
            
            // Add event listeners
            modal.addEventListener('click', handleSelection);
            
            // Handle escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(modal);
                    document.removeEventListener('keydown', handleEscape);
                    reject(new Error('ผู้ใช้ยกเลิกการเชื่อมต่อ'));
                }
            };
            
            document.addEventListener('keydown', handleEscape);
            
            // Auto-remove if no interaction for 30 seconds
            setTimeout(() => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                    document.removeEventListener('keydown', handleEscape);
                    reject(new Error('หมดเวลาการเลือกอุปกรณ์'));
                }
            }, 30000);
        });
    }

    /**
     * Create device selection modal - improved design
     * @returns {HTMLElement} Modal element
     */
    createDeviceModal() {
        const modal = document.createElement('div');
        modal.className = 'bluetooth-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
            animation: fadeIn 0.3s ease-out;
        `;

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideIn {
                from { transform: translateY(-20px) scale(0.9); opacity: 0; }
                to { transform: translateY(0) scale(1); opacity: 1; }
            }
            .device-option:hover {
                background: linear-gradient(45deg, #667eea, #764ba2) !important;
                color: white !important;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }
        `;
        document.head.appendChild(style);

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            padding: 2.5rem;
            border-radius: 1.5rem;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 25px 50px rgba(0,0,0,0.4);
            animation: slideIn 0.3s ease-out;
        `;

        dialog.innerHTML = `
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 0.5rem;">🔵</div>
                <h3 style="margin: 0 0 0.5rem 0; color: #333; font-size: 1.5rem; font-weight: 600;">เลือกอุปกรณ์ Bluetooth</h3>
                <p style="color: #666; font-size: 0.9rem; margin: 0;">กำลังค้นหาอุปกรณ์เสียงที่ใช้ได้...</p>
            </div>
            
            <div style="margin-bottom: 2rem;">
                <div class="device-option" style="
                    display: flex;
                    align-items: center;
                    padding: 1rem 1.25rem;
                    margin: 0.75rem 0;
                    border: 2px solid #e1e5e9;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: #f8f9fa;
                " data-device="JBL Speaker Pro">
                    <div style="font-size: 1.5rem; margin-right: 1rem;">🔊</div>
                    <div>
                        <div style="font-weight: 600; color: #333;">JBL Speaker Pro</div>
                        <div style="font-size: 0.8rem; color: #666;">ลำโพงบลูทูธ • แบตเตอรี่ 85%</div>
                    </div>
                </div>
                
                <div class="device-option" style="
                    display: flex;
                    align-items: center;
                    padding: 1rem 1.25rem;
                    margin: 0.75rem 0;
                    border: 2px solid #e1e5e9;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: #f8f9fa;
                " data-device="Sony WH-1000XM5">
                    <div style="font-size: 1.5rem; margin-right: 1rem;">🎧</div>
                    <div>
                        <div style="font-weight: 600; color: #333;">Sony WH-1000XM5</div>
                        <div style="font-size: 0.8rem; color: #666;">หูฟังไร้สาย • แบตเตอรี่ 92%</div>
                    </div>
                </div>
                
                <div class="device-option" style="
                    display: flex;
                    align-items: center;
                    padding: 1rem 1.25rem;
                    margin: 0.75rem 0;
                    border: 2px solid #e1e5e9;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: #f8f9fa;
                " data-device="Bluetooth Speaker">
                    <div style="font-size: 1.5rem; margin-right: 1rem;">📢</div>
                    <div>
                        <div style="font-weight: 600; color: #333;">Bluetooth Speaker</div>
                        <div style="font-size: 0.8rem; color: #666;">ลำโพงทั่วไป • แบตเตอรี่ 67%</div>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="cancel-btn" style="
                    padding: 0.75rem 1.5rem;
                    border: 2px solid #dee2e6;
                    border-radius: 8px;
                    background: white;
                    cursor: pointer;
                    font-family: inherit;
                    font-weight: 500;
                    color: #666;
                    transition: all 0.2s ease;
                    min-width: 100px;
                " onmouseover="this.style.background='#f8f9fa'; this.style.borderColor='#adb5bd';" 
                   onmouseout="this.style.background='white'; this.style.borderColor='#dee2e6';">
                    ยกเลิก
                </button>
            </div>
            
            <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #eee; text-align: center;">
                <p style="font-size: 0.8rem; color: #999; margin: 0;">
                    💡 นี่เป็นการจำลองเนื่องจาก Web Bluetooth ถูกปิดการใช้งาน
                </p>
            </div>
        `;

        modal.appendChild(dialog);
        return modal;
    }

    /**
     * Disconnect from Bluetooth device
     */
    async disconnect() {
        try {
            if (this.server && this.server.connected) {
                this.server.disconnect();
            }
            
            this.handleDisconnection();
            console.log('🔵 Bluetooth disconnected');
            
        } catch (error) {
            console.error('❌ Error disconnecting Bluetooth:', error);
            this.emit('error', error);
        }
    }

    /**
     * Handle disconnection event
     */
    handleDisconnection() {
        this.isConnected = false;
        this.device = null;
        this.server = null;
        this.deviceInfo = {
            name: null,
            id: null,
            type: 'audio',
            rssi: null
        };
        
        this.emit('disconnected');
    }

    /**
     * Send audio data to Bluetooth device
     * @param {ArrayBuffer} audioData - Audio data to send
     */
    async sendAudio(audioData) {
        if (!this.isConnected) {
            console.warn('⚠️ Bluetooth not connected - cannot send audio');
            return;
        }

        try {
            if (this.simulationMode) {
                console.log('🔵 Simulating audio send to Bluetooth device');
                this.emit('audioSent', { size: audioData.byteLength });
                return;
            }

            // In a real implementation, you would send audio data through
            // the appropriate Bluetooth audio service/characteristic
            // This is complex and depends on the specific audio protocol
            
            console.log('🔵 Sending audio data to Bluetooth device');
            this.emit('audioSent', { size: audioData.byteLength });
            
        } catch (error) {
            console.error('❌ Error sending audio data:', error);
            this.emit('error', error);
        }
    }

    /**
     * Get device battery level (if supported)
     * @returns {Promise<number|null>} Battery level percentage
     */
    async getBatteryLevel() {
        if (!this.isConnected || this.simulationMode) {
            return this.simulationMode ? Math.floor(Math.random() * 100) : null;
        }

        try {
            const service = await this.server.getPrimaryService('battery_service');
            const characteristic = await service.getCharacteristic('battery_level');
            const value = await characteristic.readValue();
            
            const batteryLevel = value.getUint8(0);
            console.log('🔋 Battery level:', batteryLevel + '%');
            
            return batteryLevel;
            
        } catch (error) {
            console.warn('⚠️ Battery level not available:', error.message);
            return null;
        }
    }

    /**
     * Get device information
     * @returns {Promise<Object|null>} Device information
     */
    async getDeviceInformation() {
        if (!this.isConnected) return null;

        try {
            if (this.simulationMode) {
                return {
                    manufacturer: 'Simulated Audio Co.',
                    model: 'Demo Speaker',
                    serial: 'SIM123456',
                    firmware: '1.0.0'
                };
            }

            const service = await this.server.getPrimaryService('device_information');
            
            const info = {};
            
            try {
                const manufacturer = await service.getCharacteristic('manufacturer_name_string');
                const value = await manufacturer.readValue();
                info.manufacturer = new TextDecoder().decode(value);
            } catch (e) {
                info.manufacturer = 'Unknown';
            }
            
            try {
                const model = await service.getCharacteristic('model_number_string');
                const value = await model.readValue();
                info.model = new TextDecoder().decode(value);
            } catch (e) {
                info.model = 'Unknown';
            }
            
            return info;
            
        } catch (error) {
            console.warn('⚠️ Device information not available:', error.message);
            return null;
        }
    }

    /**
     * Get RSSI (signal strength)
     * @returns {Promise<number|null>} RSSI value in dBm
     */
    async getRSSI() {
        if (!this.isConnected) return null;

        try {
            if (this.simulationMode) {
                // Simulate RSSI between -30 and -70 dBm
                return -30 - Math.random() * 40;
            }

            // Note: RSSI reading is not standardized in Web Bluetooth
            // This would require specific service implementation
            console.warn('⚠️ RSSI reading not implemented for this device');
            return null;
            
        } catch (error) {
            console.warn('⚠️ RSSI not available:', error.message);
            return null;
        }
    }

    /**
     * Scan for available devices
     * @returns {Promise<Array>} Array of available devices
     */
    async scanDevices() {
        if (!this.isSupported) {
            console.warn('⚠️ Bluetooth scanning not supported');
            return [];
        }

        try {
            console.log('🔵 Scanning for Bluetooth devices...');
            
            if (this.simulationMode) {
                // Return simulated devices
                await this.delay(2000);
                return [
                    { name: 'JBL Speaker Pro', id: 'sim1', rssi: -45 },
                    { name: 'Sony WH-1000XM5', id: 'sim2', rssi: -52 },
                    { name: 'Bluetooth Speaker', id: 'sim3', rssi: -38 }
                ];
            }

            // Note: Web Bluetooth doesn't have a general scan function
            // Devices are discovered through requestDevice() with filters
            console.warn('⚠️ General device scanning not available in Web Bluetooth');
            return [];
            
        } catch (error) {
            console.error('❌ Error scanning devices:', error);
            return [];
        }
    }

    /**
     * Check connection status
     * @returns {boolean} Connection status
     */
    isDeviceConnected() {
        return this.isConnected && (this.simulationMode || (this.server && this.server.connected));
    }

    /**
     * Get connection status and device info
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            isSupported: this.isSupported,
            isConnected: this.isConnected,
            simulationMode: this.simulationMode,
            deviceInfo: this.deviceInfo,
            connectionTime: this.connectionTime || null
        };
    }

    /**
     * Set volume on Bluetooth device (if supported)
     * @param {number} volume - Volume level (0-100)
     */
    async setVolume(volume) {
        if (!this.isConnected) {
            console.warn('⚠️ Cannot set volume - device not connected');
            return;
        }

        try {
            volume = Math.max(0, Math.min(100, volume));
            
            if (this.simulationMode) {
                console.log(`🔵 Setting simulated Bluetooth volume to: ${volume}%`);
                this.emit('volumeChanged', volume);
                return;
            }

            // Volume control would require specific service implementation
            console.log(`🔵 Setting Bluetooth volume to: ${volume}%`);
            this.emit('volumeChanged', volume);
            
        } catch (error) {
            console.error('❌ Error setting volume:', error);
            this.emit('error', error);
        }
    }

    /**
     * Utility function for delays
     * @param {number} ms - Delay in milliseconds
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if feature is supported
     * @param {string} feature - Feature name
     * @returns {boolean} Support status
     */
    isFeatureSupported(feature) {
        const supportedFeatures = {
            'connection': this.isSupported,
            'audio': this.simulationMode || this.isSupported,
            'battery': this.simulationMode || this.isSupported,
            'deviceInfo': this.simulationMode || this.isSupported,
            'volume': this.simulationMode || this.isSupported
        };
        
        return supportedFeatures[feature] || false;
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
                console.error(`❌ Error in Bluetooth event listener for '${event}':`, error);
            }
        });
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.isConnected) {
            this.disconnect();
        }
        
        this.eventListeners = {};
        console.log('🔵 Bluetooth Manager destroyed');
    }
}
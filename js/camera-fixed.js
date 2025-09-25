/**
 * Camera Manager Fixed Version - camera-fixed.js
 * พร้อม fallback เป็นกล้องจำลองเมื่อกล้องจริงใช้ไม่ได้
 */

export class CameraManager {
    constructor() {
        this.stream = null;
        this.videoElement = null;
        this.isActive = false;
        this.frameRate = 30;
        this.frameCount = 0;
        this.eventListeners = {};
        this.isSimulating = false;
        this.simulationCanvas = null;
        this.animationId = null;
        
        console.log('📹 CameraManager Fixed Version initialized');
    }

    /**
     * เริ่มกล้อง - ลองจริงก่อน ถ้าไม่ได้ใช้จำลอง
     */
    async start(videoElement) {
        console.log('📹 Starting camera (Fixed Version)...');
        
        this.videoElement = videoElement;
        
        try {
            // ขั้นตอนที่ 1: ลองกล้องจริงก่อน
            console.log('📹 Step 1: Trying real camera...');
            await this.tryRealCamera();
            
        } catch (realError) {
            console.warn('⚠️ Real camera failed:', realError.message);
            
            try {
                // ขั้นตอนที่ 2: ใช้กล้องจำลอง
                console.log('📹 Step 2: Starting simulation mode...');
                await this.startSimulationMode();
                
            } catch (simError) {
                console.error('❌ Both real and simulation failed:', simError);
                throw simError;
            }
        }
    }

    /**
     * ลองใช้กล้องจริง
     */
    async tryRealCamera() {
        // ตรวจสอบพื้นฐาน
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Browser does not support camera API');
        }

        const constraints = [
            { video: { width: 640, height: 480 }, audio: false },
            { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
            { video: true, audio: false },
            { video: {} }
        ];

        let lastError;

        for (let i = 0; i < constraints.length; i++) {
            try {
                console.log(`📹 Trying constraint ${i + 1}:`, constraints[i]);
                
                const stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
                
                // ตรวจสอบ stream
                const tracks = stream.getVideoTracks();
                if (tracks.length > 0 && tracks[0].readyState === 'live') {
                    
                    // ตั้งค่า video element
                    await this.setupVideo(stream);
                    
                    this.stream = stream;
                    this.isActive = true;
                    this.isSimulating = false;
                    
                    this.startFrameMonitoring();
                    
                    this.emit('started', {
                        width: this.videoElement.videoWidth,
                        height: this.videoElement.videoHeight,
                        simulated: false
                    });
                    
                    console.log('✅ Real camera started successfully');
                    return;
                }
                
                // ถ้า stream ไม่ดี ปิดแล้วลองต่อ
                stream.getTracks().forEach(track => track.stop());
                
            } catch (error) {
                console.warn(`❌ Constraint ${i + 1} failed:`, error.message);
                lastError = error;
                continue;
            }
        }
        
        throw lastError || new Error('All real camera attempts failed');
    }

    /**
     * เริ่มโหมดกล้องจำลอง
     */
    async startSimulationMode() {
        console.log('🎬 Starting camera simulation...');
        
        // สร้าง canvas จำลอง
        this.simulationCanvas = document.createElement('canvas');
        this.simulationCanvas.width = 1280;
        this.simulationCanvas.height = 720;
        
        const ctx = this.simulationCanvas.getContext('2d');
        
        // สร้าง MediaStream จาก canvas
        const stream = this.simulationCanvas.captureStream(30);
        
        // ตั้งค่า video element
        this.videoElement.srcObject = stream;
        this.videoElement.playsInline = true;
        this.videoElement.muted = true;
        this.videoElement.autoplay = true;
        
        // รอ video พร้อม
        await this.waitForVideoReady();
        
        this.stream = stream;
        this.isActive = true;
        this.isSimulating = true;
        
        // เริ่มการวาดจำลอง
        this.startSimulationLoop();
        this.startFrameMonitoring();
        
        // แสดงแจ้งเตือน
        this.showSimulationNotice();
        
        this.emit('started', {
            width: this.simulationCanvas.width,
            height: this.simulationCanvas.height,
            simulated: true
        });
        
        console.log('✅ Camera simulation started successfully');
    }

    /**
     * ตั้งค่า video element สำหรับกล้องจริง
     */
    setupVideo(stream) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Video setup timeout'));
            }, 8000);

            const onReady = () => {
                clearTimeout(timeout);
                this.videoElement.removeEventListener('loadedmetadata', onReady);
                
                this.videoElement.play()
                    .then(() => {
                        console.log('▶️ Video playback started');
                        resolve();
                    })
                    .catch(reject);
            };

            this.videoElement.addEventListener('loadedmetadata', onReady);
            this.videoElement.srcObject = stream;
            this.videoElement.playsInline = true;
            this.videoElement.muted = true;
        });
    }

    /**
     * รอให้ video พร้อม (สำหรับ simulation)
     */
    waitForVideoReady() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Simulation video timeout'));
            }, 5000);

            const onReady = () => {
                clearTimeout(timeout);
                this.videoElement.removeEventListener('loadedmetadata', onReady);
                resolve();
            };

            if (this.videoElement.readyState >= 1) {
                clearTimeout(timeout);
                resolve();
            } else {
                this.videoElement.addEventListener('loadedmetadata', onReady);
            }
        });
    }

    /**
     * เริ่ม loop การวาดจำลอง
     */
    startSimulationLoop() {
        let frame = 0;
        const startTime = Date.now();
        
        const draw = () => {
            if (!this.isActive || !this.isSimulating) return;
            
            this.drawSimulationFrame(frame, startTime);
            frame++;
            
            this.animationId = requestAnimationFrame(draw);
        };
        
        draw();
    }

    /**
     * วาด frame จำลอง
     */
    drawSimulationFrame(frame, startTime) {
        const canvas = this.simulationCanvas;
        const ctx = canvas.getContext('2d');
        
        // ล้างพื้นหลัง
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1e3c72');
        gradient.addColorStop(1, '#2a5298');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // วาดกริด
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        const gridSize = 60;
        
        for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // วาดกล่องที่เคลื่อนไหว
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const time = frame * 0.03;
        
        // กล่องเคลื่อนไหว (จำลองกล่องจริงที่เคลื่อนผ่าน)
        const moveX = Math.sin(time) * 80;
        const moveY = Math.cos(time * 0.7) * 40;
        const rotation = Math.sin(time * 0.5) * 0.15;
        
        ctx.save();
        ctx.translate(centerX + moveX, centerY + moveY);
        ctx.rotate(rotation);
        
        // กล่องหลัก
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(-80, -50, 160, 100);
        
        ctx.strokeStyle = '#fbc02d';
        ctx.lineWidth = 4;
        ctx.strokeRect(-80, -50, 160, 100);
        
        // ข้อความในกล่อง
        ctx.fillStyle = '#333';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOX', 0, 8);
        
        ctx.restore();
        
        // กรอบอ้างอิง (คงที่)
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 3;
        ctx.setLineDash([15, 8]);
        ctx.strokeRect(centerX - 100, centerY - 60, 200, 120);
        ctx.setLineDash([]);
        
        // ป้าย Reference
        ctx.fillStyle = '#4caf50';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('กรอบอ้างอิง', centerX - 95, centerY - 70);
        
        // ข้อมูลสถิติ
        const runtime = ((Date.now() - startTime) / 1000).toFixed(1);
        const fps = Math.round(frame / (runtime || 1));
        
        // พื้นหลังข้อมูล
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.roundRect(20, 20, 320, 140, 10);
        ctx.fill();
        
        // ข้อความข้อมูล
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('🎬 กล้องจำลอง DEMO', 35, 50);
        
        ctx.font = '16px Arial';
        ctx.fillText(`📊 ความละเอียด: ${canvas.width}×${canvas.height}`, 35, 75);
        ctx.fillText(`⏱️ เวลาทำงาน: ${runtime} วินาที`, 35, 100);
        ctx.fillText(`🎯 เฟรม: ${frame} (${fps} FPS)`, 35, 125);
        ctx.fillText(`📦 กล่องจำลองเคลื่อนไหวอัตโนมัติ`, 35, 150);
        
        // ข้อความเตือนด้านล่าง
        ctx.fillStyle = '#ff9800';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ นี่คือกล้องจำลอง - กล้องจริงใช้ไม่ได้', centerX, canvas.height - 40);
        
        // เพิ่ม roundRect method หากไม่มี
        if (!ctx.roundRect) {
            CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
                this.beginPath();
                this.moveTo(x + radius, y);
                this.lineTo(x + width - radius, y);
                this.arcTo(x + width, y, x + width, y + radius, radius);
                this.lineTo(x + width, y + height - radius);
                this.arcTo(x + width, y + height, x + width - radius, y + height, radius);
                this.lineTo(x + radius, y + height);
                this.arcTo(x, y + height, x, y + height - radius, radius);
                this.lineTo(x, y + radius);
                this.arcTo(x, y, x + radius, y, radius);
                this.closePath();
            };
        }
    }

    /**
     * แสดงแจ้งเตือนการใช้กล้องจำลอง
     */
    showSimulationNotice() {
        // ลบ notice เก่าถ้ามี
        const oldNotice = document.getElementById('camera-sim-notice');
        if (oldNotice) oldNotice.remove();
        
        const notice = document.createElement('div');
        notice.id = 'camera-sim-notice';
        notice.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ff9800, #f57c00);
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            z-index: 10001;
            font-family: 'Segoe UI', Arial, sans-serif;
            max-width: 350px;
            animation: slideInNotice 0.6s ease-out;
            border: 2px solid #ffa726;
        `;
        
        notice.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="font-size: 24px; flex-shrink: 0;">🎬</div>
                <div style="flex: 1;">
                    <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">
                        ใช้กล้องจำลอง
                    </div>
                    <div style="font-size: 13px; opacity: 0.9; line-height: 1.4;">
                        กล้องจริงไม่สามารถใช้งานได้<br>
                        • ระบบจำลองพร้อมใช้งาน<br>
                        • สามารถทดสอบฟีเจอร์ได้ปกติ
                    </div>
                    <button onclick="this.closest('#camera-sim-notice').remove()" 
                            style="margin-top: 10px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); 
                                   color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        รับทราบ
                    </button>
                </div>
                <button onclick="this.closest('#camera-sim-notice').remove()" 
                        style="background: none; border: none; color: white; font-size: 20px; 
                               cursor: pointer; opacity: 0.7; padding: 0; width: 24px; height: 24px;">×</button>
            </div>
        `;
        
        // เพิ่ม CSS animation
        if (!document.getElementById('sim-notice-style')) {
            const style = document.createElement('style');
            style.id = 'sim-notice-style';
            style.textContent = `
                @keyframes slideInNotice {
                    from { 
                        transform: translateX(120%) scale(0.8); 
                        opacity: 0; 
                    }
                    to { 
                        transform: translateX(0) scale(1); 
                        opacity: 1; 
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notice);
        
        // ลบอัตโนมัติ
        setTimeout(() => {
            if (notice.parentElement) {
                notice.style.animation = 'slideInNotice 0.4s ease-in reverse';
                setTimeout(() => notice.remove(), 400);
            }
        }, 15000);
    }

    /**
     * เริ่มติดตาม frame rate
     */
    startFrameMonitoring() {
        let lastTime = performance.now();
        let frameCount = 0;
        
        const monitor = () => {
            if (!this.isActive) return;
            
            const now = performance.now();
            frameCount++;
            
            if (now - lastTime >= 1000) {
                this.frameRate = Math.round(frameCount * 1000 / (now - lastTime));
                frameCount = 0;
                lastTime = now;
                
                this.emit('frameUpdate', {
                    fps: this.frameRate,
                    width: this.videoElement?.videoWidth || (this.simulationCanvas?.width || 0),
                    height: this.videoElement?.videoHeight || (this.simulationCanvas?.height || 0),
                    timestamp: now,
                    simulated: this.isSimulating
                });
            }
            
            requestAnimationFrame(monitor);
        };
        
        monitor();
    }

    /**
     * จับภาพปัจจุบัน
     */
    captureFrame() {
        if (!this.isActive || !this.videoElement) {
            console.warn('⚠️ Cannot capture: camera not active');
            return null;
        }

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = this.videoElement.videoWidth || 1280;
            canvas.height = this.videoElement.videoHeight || 720;
            
            if (canvas.width === 0 || canvas.height === 0) {
                console.warn('⚠️ Invalid dimensions for capture');
                return null;
            }
            
            ctx.drawImage(this.videoElement, 0, 0);
            
            return {
                imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
                width: canvas.width,
                height: canvas.height,
                timestamp: performance.now(),
                simulated: this.isSimulating
            };
            
        } catch (error) {
            console.error('❌ Capture error:', error);
            return null;
        }
    }

    getCurrentFrame() {
        return this.captureFrame();
    }

    /**
     * หยุดกล้อง
     */
    stop() {
        try {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }

            if (this.videoElement) {
                this.videoElement.srcObject = null;
            }

            // ลบ notice
            const notice = document.getElementById('camera-sim-notice');
            if (notice) notice.remove();

            this.isActive = false;
            this.isSimulating = false;
            this.frameRate = 0;
            
            this.emit('stopped');
            console.log('📹 Camera stopped (Fixed Version)');
            
        } catch (error) {
            console.error('❌ Error stopping camera:', error);
        }
    }

    /**
     * Event system
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
                console.error(`❌ Event error for '${event}':`, error);
            }
        });
    }

    /**
     * ดูสถานะ
     */
    getStatus() {
        return {
            isActive: this.isActive,
            isSimulating: this.isSimulating,
            frameRate: this.frameRate,
            resolution: this.isSimulating ? 
                { width: 1280, height: 720 } : 
                (this.videoElement ? {
                    width: this.videoElement.videoWidth,
                    height: this.videoElement.videoHeight
                } : null),
            stream: !!this.stream
        };
    }

    /**
     * ดูกล้องที่มี
     */
    async getAvailableCameras() {
        try {
            if (!navigator.mediaDevices) return [];
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
        } catch (error) {
            console.error('❌ Error getting cameras:', error);
            return [];
        }
    }

    /**
     * ตรวจสอบการรองรับ
     */
    static isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * ทำลาย
     */
    destroy() {
        this.stop();
        this.eventListeners = {};
        this.videoElement = null;
        console.log('📹 Camera manager destroyed (Fixed Version)');
    }
}
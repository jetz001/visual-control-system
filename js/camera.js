export class CameraManager {
	constructor(settings = {}) {
		this.settings = settings;
		this.stream = null;
		this.isActive = false;
		this.frameRate = null;
		this.videoElement = null;
		this.eventListeners = {};
	}

	static async getCameraDevices() {
		try {
			if (!navigator.mediaDevices?.enumerateDevices) throw new Error('Device enumeration not supported');
			const devices = await navigator.mediaDevices.enumerateDevices();
			return devices.filter(d => d.kind === 'videoinput');
		} catch (error) {
			console.error('❌ Error getting camera devices:', error);
			return [];
		}
	}

	async switchCamera(deviceId) {
		try {
			if (!this.isActive) throw new Error('Cannot switch camera: not currently active');
			if (this.stream) this.stream.getTracks().forEach(t => t.stop());
			const constraints = { video: { ...this.settings, deviceId: { exact: deviceId } }, audio: false };
			this.stream = await navigator.mediaDevices.getUserMedia(constraints);
			await this.setupVideoElement();
			this.emit('cameraChanged', { deviceId });
			console.log('📹 Switched to camera:', deviceId);
		} catch (error) {
			console.error('❌ Error switching camera:', error);
			this.emit('error', error);
			throw error;
		}
	}

	updateSettings(newSettings) {
		this.settings = { ...this.settings, ...newSettings };
		console.log('📹 Camera settings updated:', this.settings);
	}

	getCapabilities() {
		if (!this.stream) return null;
		try {
			return this.stream.getVideoTracks()[0].getCapabilities();
		} catch {
			return null;
		}
	}

	getCurrentSettings() {
		if (!this.stream) return null;
		try {
			return this.stream.getVideoTracks()[0].getSettings();
		} catch {
			return null;
		}
	}

	async applyConstraints(constraints) {
		if (!this.stream) throw new Error('Cannot apply constraints: camera not active');
		const track = this.stream.getVideoTracks()[0];
		await track.applyConstraints(constraints);
		this.emit('constraintsApplied', constraints);
		console.log('📹 Camera constraints applied:', constraints);
	}

	static isSupported() {
		return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
	}

	static async getPermissionStatus() {
		if (!navigator.permissions) return 'unknown';
		try {
			const permission = await navigator.permissions.query({ name: 'camera' });
			return permission.state;
		} catch {
			return 'unknown';
		}
	}

	on(event, callback) {
		(this.eventListeners[event] ||= []).push(callback);
	}

	off(event, callback) {
		const a = this.eventListeners[event];
		if (!a) return;
		const i = a.indexOf(callback);
		if (i > -1) a.splice(i, 1);
	}

	emit(event, data = null) {
		const a = this.eventListeners[event];
		if (!a) return;
		a.forEach(cb => {
			try {
				cb(data);
			} catch (e) {
				console.error(`❌ Error in event listener for '${event}':`, e);
			}
		});
	}

	getStatus() {
		return {
			isActive: this.isActive,
			frameRate: this.frameRate,
			resolution: this.videoElement ? { width: this.videoElement.videoWidth, height: this.videoElement.videoHeight } : null,
			stream: !!this.stream,
			settings: this.settings
		};
	}

	destroy() {
		this.stop?.();
		this.eventListeners = {};
		this.videoElement = null;
		console.log('📹 Camera manager destroyed');
	}
}
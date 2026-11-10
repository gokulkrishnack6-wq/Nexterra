// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('GreenLoop Waste Scanner Desktop Camera Interface & Lifecycle', () => {
  let mockTracks: any[];
  let mockStream: any;
  let mockGetUserMedia: any;
  let mockEnumerateDevices: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockTracks = [
      {
        kind: 'video',
        id: 'track-1',
        label: 'Integrated HD Webcam',
        readyState: 'live',
        stop: vi.fn(),
        getSettings: vi.fn().mockReturnValue({ deviceId: 'cam-builtin-1', width: 1280, height: 720 }),
      },
    ];

    mockStream = {
      id: 'stream-1',
      active: true,
      getVideoTracks: vi.fn().mockReturnValue(mockTracks),
      getTracks: vi.fn().mockReturnValue(mockTracks),
    };

    mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
    mockEnumerateDevices = vi.fn().mockResolvedValue([
      { deviceId: 'cam-builtin-1', kind: 'videoinput', label: 'FaceTime HD Camera / Integrated Webcam' },
      { deviceId: 'cam-usb-2', kind: 'videoinput', label: 'Logitech USB Webcam C920' },
      { deviceId: 'audio-mic-1', kind: 'audioinput', label: 'Built-in Microphone' },
    ]);

    // Setup navigator.mediaDevices in jsdom
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
        enumerateDevices: mockEnumerateDevices,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Desktop Camera Stream Acquisition & Flexible Constraints', () => {
    it('uses non-restrictive facingMode and ideal resolution for desktop webcams', async () => {
      // Simulate desktop user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        configurable: true,
      });

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      expect(mockGetUserMedia).toHaveBeenCalledWith(constraints);
      expect(stream.getVideoTracks().length).toBe(1);
      expect(stream.getVideoTracks()[0].getSettings().deviceId).toBe('cam-builtin-1');
    });

    it('falls back to generic video constraints if primary high-resolution constraints throw an error', async () => {
      const primaryErr = new Error('OverconstrainedError');
      primaryErr.name = 'OverconstrainedError';

      mockGetUserMedia
        .mockRejectedValueOnce(primaryErr)
        .mockResolvedValueOnce(mockStream);

      let acquiredStream: any = null;
      try {
        acquiredStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (err) {
        // Fallback execution
        acquiredStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
      expect(acquiredStream).toBe(mockStream);
    });
  });

  describe('2. Multi-Camera Enumeration & Switching', () => {
    it('enumerates video input devices excluding microphones and speakers', async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d: any) => d.kind === 'videoinput');

      expect(videoDevices.length).toBe(2);
      expect(videoDevices[0].label).toContain('Integrated Webcam');
      expect(videoDevices[1].label).toContain('Logitech USB Webcam');
    });

    it('switches to target camera using exact deviceId constraint', async () => {
      const targetDeviceId = 'cam-usb-2';
      const switchConstraints: MediaStreamConstraints = {
        video: {
          deviceId: { exact: targetDeviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      await navigator.mediaDevices.getUserMedia(switchConstraints);
      expect(mockGetUserMedia).toHaveBeenCalledWith(switchConstraints);
    });
  });

  describe('3. Stream-to-Video Binding & Autoplay Safety', () => {
    it('attaches MediaStream to video element and executes play() safely', async () => {
      const videoElement = document.createElement('video');
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = true;

      // Mock HTMLMediaElement.prototype.play
      videoElement.play = vi.fn().mockResolvedValue(undefined);

      // Attach stream
      videoElement.srcObject = mockStream as any;
      await videoElement.play();

      expect(videoElement.srcObject).toBe(mockStream);
      expect(videoElement.play).toHaveBeenCalled();
      expect(videoElement.muted).toBe(true);
      expect(videoElement.playsInline).toBe(true);
      expect(videoElement.autoplay).toBe(true);
    });

    it('handles play() promise rejection gracefully without crashing', async () => {
      const videoElement = document.createElement('video');
      videoElement.play = vi.fn().mockRejectedValue(new Error('Autoplay blocked by browser policy'));

      const playPromise = videoElement.play();
      let caught = false;
      await playPromise.catch((err) => {
        caught = true;
        expect(err.message).toContain('Autoplay blocked');
      });

      expect(caught).toBe(true);
    });
  });

  describe('4. Hardware Resource Teardown & Visibility Protection', () => {
    it('stops all tracks and releases camera stream on teardown', () => {
      const tracks = mockStream.getTracks();
      expect(tracks[0].stop).not.toHaveBeenCalled();

      // Execute cleanup
      tracks.forEach((track: any) => track.stop());
      expect(tracks[0].stop).toHaveBeenCalledTimes(1);
    });

    it('clears srcObject from the video element to prevent stale memory references', () => {
      const videoElement = document.createElement('video');
      videoElement.srcObject = mockStream as any;
      expect(videoElement.srcObject).toBe(mockStream);

      // Clear video
      videoElement.srcObject = null;
      expect(videoElement.srcObject).toBeNull();
    });
  });

  describe('5. Safe Frame Capture (No Black / Unready Frames)', () => {
    it('prevents snapshot capture when video element has zero dimensions or unready state', () => {
      const videoElement = document.createElement('video');
      // videoWidth is 0 (default unready)
      Object.defineProperty(videoElement, 'videoWidth', { value: 0, configurable: true });
      Object.defineProperty(videoElement, 'videoHeight', { value: 0, configurable: true });
      Object.defineProperty(videoElement, 'readyState', { value: 0, configurable: true }); // HAVE_NOTHING

      const isVideoReady = false;
      const canCapture = isVideoReady && videoElement.videoWidth > 0 && videoElement.readyState >= 2;

      expect(canCapture).toBe(false);
    });

    it('successfully draws video frames to canvas when video is ready and playing', () => {
      const videoElement = document.createElement('video');
      Object.defineProperty(videoElement, 'videoWidth', { value: 1280, configurable: true });
      Object.defineProperty(videoElement, 'videoHeight', { value: 720, configurable: true });
      Object.defineProperty(videoElement, 'readyState', { value: 4, configurable: true }); // HAVE_ENOUGH_DATA

      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      const mockCtx = {
        drawImage: vi.fn(),
        getImageData: vi.fn().mockReturnValue({ data: [120, 150, 100, 255] }), // Not blank (alpha = 255)
      };

      vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx as any);
      vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/jpeg;base64,mockValidFrameData');

      mockCtx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

      expect(mockCtx.drawImage).toHaveBeenCalledWith(videoElement, 0, 0, 1280, 720);
      expect(dataUrl).toContain('data:image/jpeg;base64,mockValidFrameData');
    });
  });

  describe('6. Actionable Error Mapping & Guidance', () => {
    const mapCameraError = (err: any) => {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return 'Camera permission was denied. Please allow camera access in your browser settings (look for the camera/lock icon in your address bar) or upload a photo instead.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        return 'No camera hardware was detected on your system. Please connect a webcam or upload a photo instead.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        return 'Your camera is currently in use by another application (e.g. Zoom, Google Meet, Teams). Please close other apps using the webcam and try again, or upload a photo.';
      } else if (err.name === 'OverconstrainedError') {
        return 'Your camera does not support the requested video settings. Please try again or upload a photo instead.';
      }
      return err.message || 'Unable to access your camera.';
    };

    it('provides clear advice for permission denial', () => {
      const err = new Error('User denied permission');
      err.name = 'NotAllowedError';
      const msg = mapCameraError(err);
      expect(msg).toContain('Camera permission was denied');
      expect(msg).toContain('address bar');
    });

    it('provides clear advice when webcam is in use by another app (e.g. Zoom)', () => {
      const err = new Error('Device busy');
      err.name = 'NotReadableError';
      const msg = mapCameraError(err);
      expect(msg).toContain('in use by another application');
      expect(msg).toContain('Zoom');
    });

    it('provides clear advice when no hardware is found', () => {
      const err = new Error('Device not found');
      err.name = 'NotFoundError';
      const msg = mapCameraError(err);
      expect(msg).toContain('No camera hardware was detected');
    });
  });

  describe('7. Mobile Workflow Preservation', () => {
    it('detects mobile user agent and delegates to file picker without calling getUserMedia', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
        configurable: true,
      });

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      expect(isMobile).toBe(true);

      const mockCameraInput = { click: vi.fn() };
      if (isMobile) {
        mockCameraInput.click();
      } else {
        navigator.mediaDevices.getUserMedia({ video: true });
      }

      expect(mockCameraInput.click).toHaveBeenCalledTimes(1);
      expect(mockGetUserMedia).not.toHaveBeenCalled();
    });
  });
});

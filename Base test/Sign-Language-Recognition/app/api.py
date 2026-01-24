# app/api.py
"""
FastAPI server for ASL hand sign detection.
Exposes endpoints to get the current detected letter and accumulated sentence.
Includes video streaming endpoint.
"""

import os
import cv2
import time
import threading
from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime

import torch
import numpy as np
import mediapipe as mp
from torchvision import transforms
from fastapi import FastAPI
from fastapi.responses import JSONResponse, StreamingResponse

# Import model utilities
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import load_model, LabelMapper

# Import the exact same feature extraction used in frame.py
from app.frame_utils import extract_hand_features_mask, draw_hand_features


class ASLDetector:
    """
    ASL Detection class that runs webcam capture and prediction in a background thread.
    """
    
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[{self._timestamp()}] Using device: {self.device}")
        
        # Load the model
        model_path = os.path.join(os.path.dirname(__file__), '../data/weights/asl_crop_v4_1_mobilenet_weights.pth')
        self.model = load_model(model_path, self.device)
        self.model.eval()
        print(f"[{self._timestamp()}] Model loaded successfully")
        
        # Initialize MediaPipe hands
        self.hands = mp.solutions.hands.Hands(min_detection_confidence=0.7, min_tracking_confidence=0.7)
        
        # Image transforms
        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        # Prediction settings - matches original frame.py
        self.PREDICTION_WINDOW = 10  # Same as original
        self.CONFIDENCE_THRESHOLD = 0.7  # Same as original
        self.predictions_queue = deque(maxlen=self.PREDICTION_WINDOW)
        self.frame_delay = 0.01  # ~100 FPS capture
        
        # State
        self.current_letter = None
        self.last_logged_letter = None
        self.sentence = ""
        self.running = False
        self.cap = None
        self.thread = None
        self.lock = threading.Lock()
        self.current_frame = None
        self.frame_lock = threading.Lock()
        
    def _timestamp(self):
        """Get current timestamp for logging."""
        return datetime.now().strftime("%H:%M:%S")
        
    def start(self):
        """Start the webcam capture and prediction loop."""
        if self.running:
            return
            
        print(f"[{self._timestamp()}] Opening webcam...")
        self.cap = cv2.VideoCapture(0)
        if not self.cap.isOpened():
            raise RuntimeError("Could not open webcam")
            
        self.running = True
        self.thread = threading.Thread(target=self._prediction_loop, daemon=True)
        self.thread.start()
        print(f"[{self._timestamp()}] ASL Detector started - Ready for predictions!")
        print(f"[{self._timestamp()}] Video stream available at: http://localhost:8000/video")
        
    def stop(self):
        """Stop the prediction loop."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=2)
        if self.cap:
            self.cap.release()
        print(f"[{self._timestamp()}] ASL Detector stopped")
        
    def _prediction_loop(self):
        """Background thread that continuously captures and processes frames."""
        while self.running:
            ret, frame = self.cap.read()
            if not ret:
                continue
            
            # Mirror the frame for more natural self-viewing
            frame = cv2.flip(frame, 1)
            
            # Process frame for prediction (uses same logic as frame.py)
            prediction, display_frame = self._make_prediction(frame.copy())
            
            # Store frame for video streaming
            with self.frame_lock:
                self.current_frame = display_frame
            
            with self.lock:
                self.current_letter = prediction
                
                # Log when letter changes (not None)
                if prediction and prediction != self.last_logged_letter:
                    print(f"[{self._timestamp()}] Detected: {prediction}")
                    self.last_logged_letter = prediction
                    
            time.sleep(self.frame_delay)
        
    def _draw_prediction_overlay(self, frame, letter):
        """Draw the prediction as overlay text on the frame."""
        if letter:
            # Draw background rectangle
            cv2.rectangle(frame, (10, 10), (100, 60), (0, 0, 0), -1)
            # Draw letter
            cv2.putText(frame, letter, (25, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)
            
    def _make_prediction(self, frame):
        """
        Process a single frame and return the predicted letter and annotated frame.
        Uses the EXACT same logic as frame_utils.make_prediction()
        """
        display_frame = frame.copy()
        results = self.hands.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        
        predicted_letter = None
        
        if results.multi_hand_landmarks:
            for idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
                if idx > 0:
                    break
                
                # Draw on display frame (for viewing)
                draw_hand_features(display_frame, hand_landmarks)
                
                # Create feature mask - EXACT same as original frame_utils.py
                orig_features_mask = np.zeros_like(frame)
                extract_hand_features_mask(orig_features_mask, hand_landmarks)
                mirror_features_mask = cv2.flip(orig_features_mask, 1)
                
                # Transform and predict
                orig_input = self.transform(orig_features_mask).unsqueeze(0).to(self.device)
                mirror_input = self.transform(mirror_features_mask).unsqueeze(0).to(self.device)
                
                with torch.no_grad():
                    orig_output = self.model(orig_input)
                    mirror_output = self.model(mirror_input)
                    
                    final_output = torch.max(orig_output, mirror_output)
                    confidence, predicted_class = torch.max(final_output, 1)
                    
                    if confidence.item() > self.CONFIDENCE_THRESHOLD:
                        predicted_sign = LabelMapper.index_to_label(predicted_class.item())
                        
                        # Smooth predictions - same as original
                        self.predictions_queue.append(predicted_sign)
                        if len(self.predictions_queue) == self.PREDICTION_WINDOW:
                            smoothed = max(set(self.predictions_queue), key=self.predictions_queue.count)
                            self.predictions_queue.clear()
                            predicted_letter = smoothed
        
        # Draw prediction overlay
        self._draw_prediction_overlay(display_frame, predicted_letter or self.current_letter)
                            
        return predicted_letter, display_frame
        
    def get_current_letter(self):
        """Get the current detected letter."""
        with self.lock:
            return self.current_letter
            
    def get_current_frame(self):
        """Get the current frame for video streaming."""
        with self.frame_lock:
            return self.current_frame.copy() if self.current_frame is not None else None
            
    def get_sentence(self):
        """Get the accumulated sentence."""
        with self.lock:
            return self.sentence
            
    def add_to_sentence(self, letter):
        """Add a letter to the sentence."""
        with self.lock:
            if letter:
                self.sentence += letter
                print(f"[{self._timestamp()}] Added '{letter}' -> Sentence: '{self.sentence}'")
                
    def add_space(self):
        """Add a space to the sentence."""
        with self.lock:
            self.sentence += " "
            print(f"[{self._timestamp()}] Added space -> Sentence: '{self.sentence}'")
            
    def reset_sentence(self):
        """Clear the sentence."""
        with self.lock:
            self.sentence = ""
            print(f"[{self._timestamp()}] Sentence reset")


# Global detector instance
detector = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    global detector
    detector = ASLDetector()
    detector.start()
    yield
    detector.stop()


# Create FastAPI app
app = FastAPI(
    title="ASL Detection API",
    description="API for real-time ASL hand sign detection",
    version="1.0.0",
    lifespan=lifespan
)


def generate_video_frames():
    """Generator function for video streaming."""
    while True:
        frame = detector.get_current_frame()
        if frame is not None:
            # Encode frame as JPEG
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            frame_bytes = buffer.tobytes()
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.033)  # ~30 FPS


@app.get("/")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "message": "ASL Detection API is running"}


@app.get("/predict")
async def get_prediction():
    """Get the current detected letter with timestamp."""
    letter = detector.get_current_letter()
    return {
        "letter": letter,
        "detected": letter is not None,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/sentence")
async def get_sentence():
    """Get the accumulated sentence."""
    return {"sentence": detector.get_sentence()}


@app.get("/video")
async def video_feed():
    """
    Video streaming endpoint.
    View in browser at: http://localhost:8000/video
    """
    return StreamingResponse(
        generate_video_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.post("/add")
async def add_letter():
    """Add the current detected letter to the sentence."""
    letter = detector.get_current_letter()
    if letter:
        detector.add_to_sentence(letter)
        return {"success": True, "letter": letter, "sentence": detector.get_sentence()}
    return {"success": False, "message": "No letter detected"}


@app.post("/space")
async def add_space():
    """Add a space to the sentence."""
    detector.add_space()
    return {"success": True, "sentence": detector.get_sentence()}


@app.post("/reset")
async def reset_sentence():
    """Reset/clear the sentence."""
    detector.reset_sentence()
    return {"success": True, "sentence": ""}


@app.get("/settings")
async def get_settings():
    """Get current detection settings."""
    return {
        "prediction_window": detector.PREDICTION_WINDOW,
        "confidence_threshold": detector.CONFIDENCE_THRESHOLD,
        "frame_delay": detector.frame_delay
    }


@app.post("/settings")
async def update_settings(
    prediction_window: int = None,
    confidence_threshold: float = None,
    frame_delay: float = None
):
    """
    Update detection settings.
    
    - prediction_window: 5-30 (lower = faster, higher = smoother)
    - confidence_threshold: 0.5-0.95 (lower = more sensitive)
    - frame_delay: 0.01-0.1 (lower = higher FPS)
    """
    if prediction_window is not None:
        detector.PREDICTION_WINDOW = max(5, min(30, prediction_window))
        detector.predictions_queue = deque(maxlen=detector.PREDICTION_WINDOW)
        print(f"[{detector._timestamp()}] Prediction window set to: {detector.PREDICTION_WINDOW}")
        
    if confidence_threshold is not None:
        detector.CONFIDENCE_THRESHOLD = max(0.5, min(0.95, confidence_threshold))
        print(f"[{detector._timestamp()}] Confidence threshold set to: {detector.CONFIDENCE_THRESHOLD}")
        
    if frame_delay is not None:
        detector.frame_delay = max(0.01, min(0.1, frame_delay))
        print(f"[{detector._timestamp()}] Frame delay set to: {detector.frame_delay}")
        
    return {
        "success": True,
        "prediction_window": detector.PREDICTION_WINDOW,
        "confidence_threshold": detector.CONFIDENCE_THRESHOLD,
        "frame_delay": detector.frame_delay
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

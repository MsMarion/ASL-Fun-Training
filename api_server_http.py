
import sys
import os
import time
import logging
import random
import torch
import cv2
import numpy as np
import mediapipe as mp
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from torchvision import transforms
from PIL import Image
import io

# Setup paths to import from existing codebase
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "Base test/Sign-Language-Recognition"))
sys.path.insert(0, BASE_DIR)

from utils import load_model, LabelMapper
# We need to import these specific functions. 
# Since app/frame_utils.py is inside app package in BASE_DIR/app
from app.frame_utils import extract_hand_features_mask, draw_hand_features

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ASL_API")

app = FastAPI(
    title="ASL Real Inference API",
    description="Server for real-time ASL hand sign detection using PyTorch model",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SignPrediction(BaseModel):
    letter: str
    confidence: float
    timestamp: float
    clientTimestamp: float
    handDetected: bool

# Global Resources
class DetectionResources:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")
        
        # Load Model
        # Path relative to BASE_DIR
        model_path = os.path.join(BASE_DIR, 'data/weights/asl_crop_v4_1_mobilenet_weights.pth')
        if not os.path.exists(model_path):
             # Try alternate path if generic name
             model_path = os.path.join(BASE_DIR, 'data/weights/asl_crop_v4_0_mobilenet_weights.pth')

        logger.info(f"Loading model from: {model_path}")
        self.model = load_model(model_path, self.device)
        self.model.eval()
        
        # MediaPipe
        self.hands = mp.solutions.hands.Hands(
            static_image_mode=True, # Important for independent frames
            max_num_hands=1,
            min_detection_confidence=0.5
        )
        
        # Transform
        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        self.confidence_threshold = 0.5  # Match frontend CONFIDENCE_THRESHOLD

resources = None

@app.on_event("startup")
async def startup_event():
    global resources
    try:
        resources = DetectionResources()
        logger.info("ASL Inference Resources Loaded Successfully")
    except Exception as e:
        logger.error(f"Failed to load resources: {e}")
        raise e

@app.get("/")
async def root():
    return {"message": "ASL Real Inference API Ready"}

@app.post("/predict_frame")
async def predict_frame(file: UploadFile = File(...), client_timestamp: float = 0.0):
    start_time = time.time()
    
    # Read image
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None:
        return SignPrediction(
            letter="None",
            confidence=0.0,
            timestamp=time.time(),
            clientTimestamp=client_timestamp,
            handDetected=False
        )

    # Process with MediaPipe
    # Note: MediaPipe expects RGB
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = resources.hands.process(frame_rgb)
    
    detected_letter = "None"
    confidence = 0.0
    hand_detected = False
    
    if results.multi_hand_landmarks:
        hand_detected = True
        # Process first hand only
        hand_landmarks = results.multi_hand_landmarks[0]
        
        # Feature Extraction Logic (Mirrored from frame_utils.py)
        # 1. Create black mask
        orig_features_mask = np.zeros_like(frame)
        # 2. Draw features on mask
        extract_hand_features_mask(orig_features_mask, hand_landmarks)
        # 3. Flip mask (Mirror effect for consistency with training)
        mirror_features_mask = cv2.flip(orig_features_mask, 1)
        
        # 4. Transform for model
        # The model expects [Batch, Channel, Height, Width]
        # We process both original and mirrored to find best match? 
        # api.py does max(orig, mirror). Let's do the same.
        
        orig_input = resources.transform(orig_features_mask).unsqueeze(0).to(resources.device)
        mirror_input = resources.transform(mirror_features_mask).unsqueeze(0).to(resources.device)
        
        with torch.no_grad():
            orig_output = resources.model(orig_input)
            mirror_output = resources.model(mirror_input)
            
            final_output = torch.max(orig_output, mirror_output)
            # Apply softmax to get probabilities
            probs = torch.nn.functional.softmax(final_output, dim=1)
            conf_tensor, predicted_class = torch.max(probs, 1)
            
            current_conf = conf_tensor.item()
            
            if current_conf > resources.confidence_threshold:
                detected_letter = LabelMapper.index_to_label(predicted_class.item())
                confidence = current_conf
                # Log for verification
                logger.info(f"DETECTED: {detected_letter} (Conf: {confidence:.2f})")
            else:
                detected_letter = "None"
                confidence = current_conf

    return SignPrediction(
        letter=detected_letter,
        confidence=confidence,
        timestamp=time.time(),
        clientTimestamp=client_timestamp,
        handDetected=hand_detected
    )

if __name__ == "__main__":
    import uvicorn
    # Clean up old processes if needed manually
    uvicorn.run(app, host="0.0.0.0", port=4001)

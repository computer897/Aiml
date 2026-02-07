"""
Face detection module using MediaPipe and OpenCV.
Detects faces in webcam frames and determines if student is looking at screen.
"""

import cv2
import mediapipe as mp
import numpy as np
import base64
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class FaceDetector:
    """
    Face detection and engagement analysis using MediaPipe Face Mesh.
    Tracks face presence and head pose to determine screen attention.
    """
    
    def __init__(self):
        """Initialize MediaPipe Face Mesh detector."""
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        logger.info("✓ Face detector initialized")
    
    def decode_base64_image(self, base64_string: str) -> Optional[np.ndarray]:
        """
        Decode base64 encoded image to numpy array.
        
        Args:
            base64_string: Base64 encoded image string
            
        Returns:
            Numpy array image in BGR format, or None if decoding fails
        """
        try:
            # Remove data URL prefix if present
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            # Decode base64 to bytes
            img_bytes = base64.b64decode(base64_string)
            
            # Convert bytes to numpy array
            nparr = np.frombuffer(img_bytes, np.uint8)
            
            # Decode image
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            return img
        except Exception as e:
            logger.error(f"Error decoding base64 image: {e}")
            return None
    
    def detect_face_and_pose(self, image: np.ndarray) -> Tuple[bool, bool]:
        """
        Detect face and determine if person is looking at screen.
        
        Algorithm:
        1. Detect face using MediaPipe Face Mesh
        2. Calculate head pose angles (pitch, yaw, roll) using facial landmarks
        3. Determine if face is centered and looking forward
        
        Args:
            image: Input image in BGR format (OpenCV format)
            
        Returns:
            Tuple of (face_detected, looking_at_screen)
        """
        try:
            # Convert BGR to RGB for MediaPipe
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Process image with Face Mesh
            results = self.face_mesh.process(rgb_image)
            
            # No face detected
            if not results.multi_face_landmarks:
                return False, False
            
            # Face detected, now check head pose
            face_landmarks = results.multi_face_landmarks[0]
            
            # Calculate if looking at screen based on head pose
            looking_at_screen = self._is_looking_at_screen(face_landmarks, image.shape)
            
            return True, looking_at_screen
            
        except Exception as e:
            logger.error(f"Error in face detection: {e}")
            return False, False
    
    def _is_looking_at_screen(self, face_landmarks, image_shape: Tuple[int, int, int]) -> bool:
        """
        Determine if person is looking at the screen based on head pose.
        
        Uses key facial landmarks to estimate head rotation:
        - Nose tip
        - Chin
        - Left eye outer corner
        - Right eye outer corner
        - Left ear
        - Right ear
        
        Args:
            face_landmarks: MediaPipe face landmarks
            image_shape: Image dimensions (height, width, channels)
            
        Returns:
            True if looking at screen, False otherwise
        """
        h, w = image_shape[:2]
        
        # Key landmark indices (MediaPipe Face Mesh)
        # Nose tip: 1, Chin: 152
        # Left eye outer: 33, Right eye outer: 263
        # Left mouth corner: 61, Right mouth corner: 291
        
        nose_tip = face_landmarks.landmark[1]
        chin = face_landmarks.landmark[152]
        left_eye = face_landmarks.landmark[33]
        right_eye = face_landmarks.landmark[263]
        left_mouth = face_landmarks.landmark[61]
        right_mouth = face_landmarks.landmark[291]
        
        # Convert normalized coordinates to pixel coordinates
        nose_x, nose_y = int(nose_tip.x * w), int(nose_tip.y * h)
        chin_x, chin_y = int(chin.x * w), int(chin.y * h)
        left_eye_x = int(left_eye.x * w)
        right_eye_x = int(right_eye.x * w)
        left_mouth_x = int(left_mouth.x * w)
        right_mouth_x = int(right_mouth.x * w)
        
        # Calculate face center
        face_center_x = (left_eye_x + right_eye_x) // 2
        image_center_x = w // 2
        
        # Check if face is roughly centered (horizontal deviation)
        horizontal_deviation = abs(face_center_x - image_center_x) / w
        
        # Check face symmetry (indicates frontal view)
        eye_distance = abs(right_eye_x - left_eye_x)
        mouth_distance = abs(right_mouth_x - left_mouth_x)
        
        # Both distances should be similar for frontal view
        symmetry_ratio = min(eye_distance, mouth_distance) / max(eye_distance, mouth_distance) if max(eye_distance, mouth_distance) > 0 else 0
        
        # Calculate vertical alignment (pitch)
        vertical_distance = abs(nose_y - chin_y)
        
        # Thresholds for determining "looking at screen"
        # Face should be:
        # - Reasonably centered (horizontal deviation < 30%)
        # - Symmetrical (symmetry ratio > 0.7)
        # - Not too tilted (vertical distance reasonable)
        
        is_centered = horizontal_deviation < 0.3
        is_symmetrical = symmetry_ratio > 0.7
        has_proper_pose = vertical_distance > 50  # Face not too tilted down/up
        
        looking_at_screen = is_centered and is_symmetrical and has_proper_pose
        
        # Log for debugging
        logger.debug(f"Face analysis: centered={is_centered}, symmetrical={is_symmetrical}, "
                    f"proper_pose={has_proper_pose}, result={looking_at_screen}")
        
        return looking_at_screen
    
    def analyze_frame(self, base64_frame: str) -> Tuple[bool, bool]:
        """
        Main method to analyze a frame from base64 encoding.
        
        Args:
            base64_frame: Base64 encoded image frame
            
        Returns:
            Tuple of (face_detected, looking_at_screen)
        """
        # Decode image
        image = self.decode_base64_image(base64_frame)
        
        if image is None:
            logger.warning("Failed to decode image")
            return False, False
        
        # Detect face and pose
        return self.detect_face_and_pose(image)
    
    def cleanup(self):
        """Clean up resources."""
        if self.face_mesh:
            self.face_mesh.close()
            logger.info("✓ Face detector cleaned up")


# Global face detector instance
face_detector = FaceDetector()


def get_face_detector() -> FaceDetector:
    """
    Get the global face detector instance.
    Used for dependency injection.
    
    Returns:
        FaceDetector instance
    """
    return face_detector

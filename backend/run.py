"""
Quick start script to run the Virtual Classroom backend.
Run this file to start the server quickly.
"""

import uvicorn
import os
import sys

def main():
    """Start the FastAPI server."""
    
    print("=" * 60)
    print("🎓 Virtual Classroom Backend API")
    print("=" * 60)
    print()
    
    # Check if .env exists
    if not os.path.exists(".env"):
        print("⚠️  Warning: .env file not found! Using default settings.")
    
    print("🚀 Starting server...")
    print("📍 API will be available at: http://localhost:8080")
    print("📚 Documentation: http://localhost:8080/docs")
    print("🔍 Alternative docs: http://localhost:8080/redoc")
    print()
    print("Press CTRL+C to stop the server")
    print("=" * 60)
    print()
    
    # Start the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main()

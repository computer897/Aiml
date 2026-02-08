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
    port = int(os.environ.get("PORT", 10000))
    print(f"📍 API will be available at: http://localhost:{port}")
    print(f"📚 Documentation: http://localhost:{port}/docs")
    print(f"🔍 Alternative docs: http://localhost:{port}/redoc")
    print()
    print("Press CTRL+C to stop the server")
    print("=" * 60)
    print()
    
    is_prod = os.environ.get("ENVIRONMENT", "development") == "production"
    
    # Start the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=not is_prod,
        log_level="info"
    )

if __name__ == "__main__":
    main()

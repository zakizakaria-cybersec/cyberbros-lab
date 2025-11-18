#!/usr/bin/env python3
"""
Script to create an admin user for CyberBros Lab
Run this from the backend directory: python create_admin.py
"""
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent))

from src.database import SessionLocal
from src.models.user import User, UserRole
from src.utils.auth import get_password_hash

def create_admin_user():
    """Create admin user"""
    db = SessionLocal()
    
    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.email == "admin@cyberbros.lab").first()
        
        if existing_admin:
            print("❌ Admin user already exists: admin@cyberbros.lab")
            print(f"   Role: {existing_admin.role}")
            print(f"   Active: {existing_admin.is_active}")
            
            # Ask if user wants to reset password
            response = input("\nDo you want to reset the password? (yes/no): ")
            if response.lower() in ['yes', 'y']:
                existing_admin.hashed_password = get_password_hash('admin123')
                db.commit()
                print("✅ Password reset to: admin123")
            return
        
        # Create new admin user
        admin = User(
            email='admin@cyberbros.lab',
            hashed_password=get_password_hash('admin123'),
            role=UserRole.ADMIN,
            is_active=True
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print("✅ Admin user created successfully!")
        print(f"\n📧 Email: admin@cyberbros.lab")
        print(f"🔑 Password: admin123")
        print(f"👤 Role: {admin.role}")
        print(f"\n⚠️  IMPORTANT: Change this password after first login!")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()

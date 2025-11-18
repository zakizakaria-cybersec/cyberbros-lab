"""
Create test admin and user accounts
Run: python create_test_users.py
"""
import sys
sys.path.append('src')

from database import SessionLocal
from models.user import User, UserRole
from utils.auth import get_password_hash

def create_test_users():
    db = SessionLocal()
    
    try:
        # Check if users already exist
        admin = db.query(User).filter(User.email == "admin@cyberbros.lab").first()
        user1 = db.query(User).filter(User.email == "user1@cyberbros.lab").first()
        user2 = db.query(User).filter(User.email == "user2@cyberbros.lab").first()
        
        # Create admin if doesn't exist
        if not admin:
            admin = User(
                email="admin@cyberbros.lab",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            print("✓ Created admin account")
        else:
            print("✓ Admin account already exists")
        
        # Create test users if don't exist
        if not user1:
            user1 = User(
                email="user1@cyberbros.lab",
                hashed_password=get_password_hash("user123"),
                role=UserRole.USER,
                is_active=True
            )
            db.add(user1)
            print("✓ Created user1 account")
        else:
            print("✓ User1 account already exists")
            
        if not user2:
            user2 = User(
                email="user2@cyberbros.lab",
                hashed_password=get_password_hash("user123"),
                role=UserRole.USER,
                is_active=True
            )
            db.add(user2)
            print("✓ Created user2 account")
        else:
            print("✓ User2 account already exists")
        
        db.commit()
        
        print("\n" + "="*50)
        print("TEST ACCOUNTS READY!")
        print("="*50)
        print("\n📧 ADMIN ACCOUNT:")
        print("   Email: admin@cyberbros.lab")
        print("   Password: admin123")
        print("\n📧 USER ACCOUNTS:")
        print("   Email: user1@cyberbros.lab")
        print("   Password: user123")
        print("\n   Email: user2@cyberbros.lab")
        print("   Password: user123")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_users()

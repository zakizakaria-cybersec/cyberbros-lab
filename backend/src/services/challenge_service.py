from sqlalchemy.orm import Session
from typing import List, Optional
from ..models.challenge import Challenge
from ..models.assignment import Assignment
from fastapi import HTTPException, status


class ChallengeService:
    """Service for challenge operations"""
    
    @staticmethod
    def get_all_challenges(db: Session) -> List[Challenge]:
        """Get all available challenges"""
        return db.query(Challenge).all()
    
    @staticmethod
    def get_user_challenges(db: Session, user_id: int) -> List[Challenge]:
        """Get challenges assigned to a specific user"""
        return db.query(Challenge).join(Assignment).filter(Assignment.user_id == user_id).all()
    
    @staticmethod
    def get_challenge_by_id(db: Session, challenge_id: int) -> Challenge:
        """Get a specific challenge by ID"""
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Challenge not found"
            )
        return challenge
    
    @staticmethod
    def seed_challenges(db: Session):
        """Seed initial challenges (for development)"""
        # Check if challenges already exist
        if db.query(Challenge).count() > 0:
            return
        
        challenges = [
            Challenge(
                name="Web Exploitation 101",
                description="Learn the basics of web application security. Identify and exploit common vulnerabilities like SQL injection and XSS.",
                snapshot_id="web-101-snapshot",
                difficulty="easy",
                cpu_count=2,
                memory_gb=4,
            ),
            Challenge(
                name="Linux Privilege Escalation",
                description="Practice privilege escalation techniques on a misconfigured Linux system. Find the vulnerability and gain root access.",
                snapshot_id="linux-privesc-snapshot",
                difficulty="medium",
                cpu_count=2,
                memory_gb=4,
            ),
            Challenge(
                name="Network Penetration Testing",
                description="Conduct a full network penetration test. Identify open ports, exploit vulnerabilities, and pivot through the network.",
                snapshot_id="network-pentest-snapshot",
                difficulty="hard",
                cpu_count=4,
                memory_gb=8,
            ),
            Challenge(
                name="Binary Exploitation",
                description="Exploit a vulnerable binary application. Learn buffer overflows, return-oriented programming, and shellcode injection.",
                snapshot_id="binary-exploit-snapshot",
                difficulty="hard",
                cpu_count=2,
                memory_gb=4,
            ),
        ]
        
        db.add_all(challenges)
        db.commit()

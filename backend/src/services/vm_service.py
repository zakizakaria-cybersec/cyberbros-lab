from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import logging
from fastapi import HTTPException, status
from ..models.vm_instance import VMInstance, VMStatus
from ..models.user import User
from ..models.challenge import Challenge
from ..cloud_providers import get_cloud_provider
from ..config import settings

logger = logging.getLogger(__name__)


class VMService:
    """Service for VM lifecycle management"""
    
    @staticmethod
    def start_challenge(db: Session, user: User, challenge_id: int) -> VMInstance:
        """Start a challenge by provisioning a VM"""
        # Get the challenge
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Challenge not found"
            )
        
        # Check if user already has a running VM for this challenge
        existing_vm = (
            db.query(VMInstance)
            .filter(
                VMInstance.user_id == user.id,
                VMInstance.challenge_id == challenge_id,
                VMInstance.status == VMStatus.RUNNING,
            )
            .first()
        )
        
        if existing_vm:
            # Check if it's expired
            if datetime.utcnow() > existing_vm.expires_at:
                VMService.cleanup_expired_vm(db, existing_vm)
            else:
                return existing_vm
        
        # Create VM instance record
        expires_at = datetime.utcnow() + timedelta(hours=settings.vm_default_lifetime_hours)
        vm_instance = VMInstance(
            user_id=user.id,
            challenge_id=challenge_id,
            status=VMStatus.PENDING,
            expires_at=expires_at,
        )
        db.add(vm_instance)
        db.commit()
        db.refresh(vm_instance)
        
        try:
            # Provision VM via cloud provider
            cloud_provider = get_cloud_provider()
            vm_name = f"challenge-{challenge_id}-user-{user.id}-{vm_instance.id}"
            
            vm_info = cloud_provider.create_vm_from_snapshot(
                snapshot_id=challenge.snapshot_id,
                name=vm_name,
                expires_at=expires_at,
                cpu_count=challenge.cpu_count,
                memory_gb=challenge.memory_gb,
            )
            
            # Update VM instance with cloud provider info
            vm_instance.instance_id = vm_info.instance_id
            vm_instance.public_ip = vm_info.public_ip
            vm_instance.ssh_username = vm_info.ssh_username
            vm_instance.ssh_password = vm_info.ssh_password
            vm_instance.ssh_key = vm_info.ssh_key
            vm_instance.status = VMStatus.RUNNING
            
            db.commit()
            db.refresh(vm_instance)
            
            logger.info(f"Started VM {vm_instance.id} for user {user.id}, challenge {challenge_id}")
            
            return vm_instance
            
        except Exception as e:
            logger.error(f"Failed to provision VM: {e}")
            vm_instance.status = VMStatus.FAILED
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to provision VM"
            )
    
    @staticmethod
    def get_vm_status(db: Session, user: User, challenge_id: int) -> Optional[VMInstance]:
        """Get the status of a user's VM for a challenge"""
        vm_instance = (
            db.query(VMInstance)
            .filter(
                VMInstance.user_id == user.id,
                VMInstance.challenge_id == challenge_id,
                VMInstance.status.in_([VMStatus.PENDING, VMStatus.RUNNING]),
            )
            .order_by(VMInstance.created_at.desc())
            .first()
        )
        
        if vm_instance and datetime.utcnow() > vm_instance.expires_at:
            VMService.cleanup_expired_vm(db, vm_instance)
            return None
        
        return vm_instance
    
    @staticmethod
    def cleanup_expired_vm(db: Session, vm_instance: VMInstance):
        """Clean up an expired VM"""
        if vm_instance.instance_id:
            try:
                cloud_provider = get_cloud_provider()
                cloud_provider.destroy_vm(vm_instance.instance_id)
                logger.info(f"Destroyed expired VM {vm_instance.id}")
            except Exception as e:
                logger.error(f"Failed to destroy VM {vm_instance.id}: {e}")
        
        vm_instance.status = VMStatus.EXPIRED
        vm_instance.destroyed_at = datetime.utcnow()
        db.commit()
    
    @staticmethod
    def cleanup_all_expired_vms(db: Session):
        """Clean up all expired VMs (called by scheduler)"""
        expired_vms = (
            db.query(VMInstance)
            .filter(
                VMInstance.status == VMStatus.RUNNING,
                VMInstance.expires_at < datetime.utcnow(),
            )
            .all()
        )
        
        logger.info(f"Found {len(expired_vms)} expired VMs to clean up")
        
        for vm in expired_vms:
            VMService.cleanup_expired_vm(db, vm)

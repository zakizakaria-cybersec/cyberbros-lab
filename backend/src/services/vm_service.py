from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, Tuple
import logging
from fastapi import HTTPException, status
from cryptography.fernet import Fernet
import base64
from ..models.vm_instance import VMInstance, VMStatus
from ..models.user import User
from ..models.challenge import Challenge
from ..models.assignment import Assignment, AssignmentStatus
from ..cloud_providers import get_cloud_provider, get_provider_with_fallback
from ..services.provisioning_log_service import ProvisioningLogService
from ..config import settings

logger = logging.getLogger(__name__)

# Encryption key for SSH credentials (should be in environment variables)
ENCRYPTION_KEY = getattr(settings, "encryption_key", Fernet.generate_key())
cipher_suite = Fernet(ENCRYPTION_KEY)


class VMService:
    """Service for VM lifecycle management with provider fallback"""
    
    @staticmethod
    def encrypt_credential(credential: str) -> str:
        """Encrypt a credential"""
        return cipher_suite.encrypt(credential.encode()).decode()
    
    @staticmethod
    def decrypt_credential(encrypted_credential: str) -> str:
        """Decrypt a credential"""
        return cipher_suite.decrypt(encrypted_credential.encode()).decode()
    
    @staticmethod
    def start_challenge(
        db: Session, 
        user: User, 
        challenge_id: int,
        assignment_id: Optional[int] = None
    ) -> VMInstance:
        """Start a challenge by provisioning a VM with automatic fallback"""
        # Get the challenge
        challenge = db.query(Challenge).filter(
            Challenge.id == challenge_id,
            Challenge.is_active == True
        ).first()
        
        if not challenge:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Challenge not found or not active"
            )
        
        # Check if user has an active VM (one VM per user rule)
        existing_vm = db.query(VMInstance).filter(
            VMInstance.user_id == user.id,
            VMInstance.status.in_([VMStatus.PROVISIONING, VMStatus.RUNNING])
        ).first()
        
        if existing_vm:
            # Check if it's expired
            if datetime.utcnow() > existing_vm.expires_at:
                VMService.cleanup_expired_vm(db, existing_vm)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"You already have an active VM (Instance ID: {existing_vm.id}). Please destroy it first."
                )
        
        # Calculate expiration based on challenge duration
        expires_at = datetime.utcnow() + timedelta(hours=challenge.duration_hours)
        
        # Create VM instance record
        vm_instance = VMInstance(
            user_id=user.id,
            challenge_id=challenge_id,
            assignment_id=assignment_id,
            status=VMStatus.PROVISIONING,
            expires_at=expires_at,
        )
        db.add(vm_instance)
        db.commit()
        db.refresh(vm_instance)
        
        # Update assignment status if applicable
        if assignment_id:
            assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
            if assignment and assignment.status == AssignmentStatus.ASSIGNED:
                assignment.status = AssignmentStatus.IN_PROGRESS
                assignment.started_at = datetime.utcnow()
                db.commit()
        
        # Provision VM with fallback
        vm_instance = VMService._provision_vm_with_fallback(db, vm_instance, challenge)
        
        return vm_instance
    
    @staticmethod
    def _provision_vm_with_fallback(
        db: Session,
        vm_instance: VMInstance,
        challenge: Challenge,
        primary_provider: str = "scaleway",
        fallback_provider: str = "hetzner"
    ) -> VMInstance:
        """Provision VM with automatic fallback to another provider"""
        vm_name = f"challenge-{challenge.id}-user-{vm_instance.user_id}-{vm_instance.id}"
        
        # Log provisioning started
        ProvisioningLogService.log_provisioning_started(
            db=db,
            instance_id=vm_instance.id,
            provider=primary_provider,
            challenge_name=challenge.name
        )
        
        # Try primary provider first
        try:
            logger.info(f"Attempting to provision VM on {primary_provider}")
            cloud_provider = get_cloud_provider(primary_provider)
            vm_instance.provider = primary_provider
            
            vm_info = cloud_provider.create_vm_from_snapshot(
                snapshot_id=challenge.snapshot_id,
                name=vm_name,
                expires_at=vm_instance.expires_at,
                cpu_count=challenge.cpu_count,
                memory_gb=challenge.memory_gb,
            )
            
            # Success! Update VM instance
            return VMService._finalize_vm_provisioning(db, vm_instance, vm_info, primary_provider)
            
        except Exception as primary_error:
            logger.error(f"Failed to provision on {primary_provider}: {primary_error}")
            
            # Log the failure
            ProvisioningLogService.log_provisioning_failed(
                db=db,
                instance_id=vm_instance.id,
                provider=primary_provider,
                error=primary_error
            )
            
            # Log fallback attempt
            ProvisioningLogService.log_provider_fallback(
                db=db,
                instance_id=vm_instance.id,
                from_provider=primary_provider,
                to_provider=fallback_provider,
                reason=str(primary_error)
            )
            
            # Try fallback provider
            try:
                logger.info(f"Falling back to {fallback_provider}")
                fallback_cloud_provider = get_cloud_provider(fallback_provider)
                vm_instance.provider = fallback_provider
                
                vm_info = fallback_cloud_provider.create_vm_from_snapshot(
                    snapshot_id=challenge.snapshot_id,
                    name=vm_name,
                    expires_at=vm_instance.expires_at,
                    cpu_count=challenge.cpu_count,
                    memory_gb=challenge.memory_gb,
                )
                
                # Success on fallback!
                return VMService._finalize_vm_provisioning(db, vm_instance, vm_info, fallback_provider)
                
            except Exception as fallback_error:
                logger.error(f"Failed to provision on fallback {fallback_provider}: {fallback_error}")
                
                # Log fallback failure
                ProvisioningLogService.log_provisioning_failed(
                    db=db,
                    instance_id=vm_instance.id,
                    provider=fallback_provider,
                    error=fallback_error
                )
                
                # Mark VM as failed
                vm_instance.status = VMStatus.FAILED
                db.commit()
                
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to provision VM on both {primary_provider} and {fallback_provider}"
                )
    
    @staticmethod
    def _finalize_vm_provisioning(
        db: Session,
        vm_instance: VMInstance,
        vm_info,
        provider: str
    ) -> VMInstance:
        """Finalize VM provisioning after successful creation"""
        # Encrypt SSH credentials
        ssh_password_encrypted = None
        ssh_key_encrypted = None
        
        if vm_info.ssh_password:
            ssh_password_encrypted = VMService.encrypt_credential(vm_info.ssh_password)
        if vm_info.ssh_key:
            ssh_key_encrypted = VMService.encrypt_credential(vm_info.ssh_key)
        
        # Update VM instance
        vm_instance.instance_id = vm_info.instance_id
        vm_instance.public_ip = vm_info.public_ip
        vm_instance.ssh_username = vm_info.ssh_username
        vm_instance.ssh_password_encrypted = ssh_password_encrypted
        vm_instance.ssh_private_key_encrypted = ssh_key_encrypted
        vm_instance.status = VMStatus.RUNNING
        vm_instance.started_at = datetime.utcnow()
        vm_instance.provider = provider
        
        db.commit()
        db.refresh(vm_instance)
        
        # Log success
        ProvisioningLogService.log_provisioning_success(
            db=db,
            instance_id=vm_instance.id,
            provider=provider,
            vm_info={
                "instance_id": vm_info.instance_id,
                "public_ip": vm_info.public_ip,
                "ssh_username": vm_info.ssh_username
            }
        )
        
        ProvisioningLogService.log_vm_running(
            db=db,
            instance_id=vm_instance.id,
            provider=provider
        )
        
        logger.info(f"Successfully provisioned VM {vm_instance.id} on {provider}")
        return vm_instance
    
    @staticmethod
    def get_vm_credentials(db: Session, user: User, instance_id: int) -> dict:
        """Get VM credentials (one-time display)"""
        vm_instance = db.query(VMInstance).filter(
            VMInstance.id == instance_id,
            VMInstance.user_id == user.id
        ).first()
        
        if not vm_instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="VM instance not found"
            )
        
        if vm_instance.status != VMStatus.RUNNING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="VM is not in running state"
            )
        
        # Decrypt credentials
        ssh_password = None
        ssh_key = None
        
        if vm_instance.ssh_password_encrypted:
            ssh_password = VMService.decrypt_credential(vm_instance.ssh_password_encrypted)
        if vm_instance.ssh_private_key_encrypted:
            ssh_key = VMService.decrypt_credential(vm_instance.ssh_private_key_encrypted)
        
        # Mark credentials as accessed
        if not vm_instance.credentials_accessed:
            vm_instance.credentials_accessed = True
            vm_instance.credentials_accessed_at = datetime.utcnow()
            db.commit()
        
        return {
            "ssh_username": vm_instance.ssh_username,
            "ssh_password": ssh_password,
            "ssh_private_key": ssh_key,
            "public_ip": vm_instance.public_ip,
            "credentials_accessed": vm_instance.credentials_accessed
        }
    
    @staticmethod
    def get_vm_status(db: Session, user: User, instance_id: int) -> VMInstance:
        """Get VM status without sensitive credentials"""
        vm_instance = db.query(VMInstance).filter(
            VMInstance.id == instance_id,
            VMInstance.user_id == user.id
        ).first()
        
        if not vm_instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="VM instance not found"
            )
        
        # Check if expired
        if vm_instance.status == VMStatus.RUNNING and datetime.utcnow() > vm_instance.expires_at:
            VMService.cleanup_expired_vm(db, vm_instance)
        
        return vm_instance
    
    @staticmethod
    def get_active_vm(db: Session, user: User) -> Optional[VMInstance]:
        """Get user's active VM if any"""
        return db.query(VMInstance).filter(
            VMInstance.user_id == user.id,
            VMInstance.status.in_([VMStatus.PROVISIONING, VMStatus.RUNNING])
        ).first()
    
    @staticmethod
    def reset_vm(db: Session, user: User, instance_id: int) -> VMInstance:
        """Reset (destroy and recreate) a VM"""
        vm_instance = db.query(VMInstance).filter(
            VMInstance.id == instance_id,
            VMInstance.user_id == user.id
        ).first()
        
        if not vm_instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="VM instance not found"
            )
        
        challenge_id = vm_instance.challenge_id
        assignment_id = vm_instance.assignment_id
        
        # Destroy existing VM
        VMService.destroy_vm(db, user, instance_id)
        
        # Create new VM
        return VMService.start_challenge(db, user, challenge_id, assignment_id)
    
    @staticmethod
    def destroy_vm(db: Session, user: User, instance_id: int):
        """Destroy a VM"""
        vm_instance = db.query(VMInstance).filter(
            VMInstance.id == instance_id,
            VMInstance.user_id == user.id
        ).first()
        
        if not vm_instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="VM instance not found"
            )
        
        if vm_instance.status in [VMStatus.DESTROYED, VMStatus.DESTROYING]:
            return  # Already destroyed or being destroyed
        
        # Log destruction start
        ProvisioningLogService.log_vm_destroying(
            db=db,
            instance_id=vm_instance.id,
            provider=vm_instance.provider
        )
        
        vm_instance.status = VMStatus.DESTROYING
        db.commit()
        
        # Destroy on cloud provider
        if vm_instance.instance_id:
            try:
                cloud_provider = get_cloud_provider(vm_instance.provider)
                cloud_provider.destroy_vm(vm_instance.instance_id)
                logger.info(f"Destroyed VM {vm_instance.id}")
            except Exception as e:
                logger.error(f"Failed to destroy VM {vm_instance.id}: {e}")
                ProvisioningLogService.log_error(
                    db=db,
                    instance_id=vm_instance.id,
                    provider=vm_instance.provider,
                    error=e
                )
        
        # Update status
        vm_instance.status = VMStatus.DESTROYED
        vm_instance.destroyed_at = datetime.utcnow()
        db.commit()
        
        # Log destruction complete
        ProvisioningLogService.log_vm_destroyed(
            db=db,
            instance_id=vm_instance.id,
            provider=vm_instance.provider
        )
    
    @staticmethod
    def cleanup_expired_vm(db: Session, vm_instance: VMInstance):
        """Clean up an expired VM"""
        logger.info(f"Cleaning up expired VM {vm_instance.id}")
        
        # Log expiration
        ProvisioningLogService.log_vm_expired(
            db=db,
            instance_id=vm_instance.id,
            provider=vm_instance.provider
        )
        
        # Destroy the VM
        if vm_instance.instance_id:
            try:
                cloud_provider = get_cloud_provider(vm_instance.provider)
                cloud_provider.destroy_vm(vm_instance.instance_id)
            except Exception as e:
                logger.error(f"Failed to destroy expired VM {vm_instance.id}: {e}")
        
        vm_instance.status = VMStatus.EXPIRED
        vm_instance.destroyed_at = datetime.utcnow()
        db.commit()
    
    @staticmethod
    def cleanup_all_expired_vms(db: Session):
        """Clean up all expired VMs (called by scheduler)"""
        expired_vms = db.query(VMInstance).filter(
            VMInstance.status.in_([VMStatus.PROVISIONING, VMStatus.RUNNING]),
            VMInstance.expires_at < datetime.utcnow()
        ).all()
        
        logger.info(f"Found {len(expired_vms)} expired VMs to clean up")
        
        for vm in expired_vms:
            try:
                VMService.cleanup_expired_vm(db, vm)
            except Exception as e:
                logger.error(f"Error cleaning up VM {vm.id}: {e}")

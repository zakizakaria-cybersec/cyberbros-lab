from sqlalchemy.orm import Session
from typing import Optional
import json
import logging
from ..models import ProvisioningLog, ProvisioningEventType
from ..schemas import ProvisioningLogCreate

logger = logging.getLogger(__name__)


class ProvisioningLogService:
    """Service for managing provisioning logs"""
    
    @staticmethod
    def log_event(
        db: Session,
        instance_id: int,
        event_type: ProvisioningEventType,
        message: str,
        provider: Optional[str] = None,
        error_details: Optional[dict] = None,
        metadata: Optional[dict] = None
    ) -> ProvisioningLog:
        """Log a provisioning event"""
        try:
            log_entry = ProvisioningLog(
                instance_id=instance_id,
                event_type=event_type,
                provider=provider,
                message=message,
                error_details=json.dumps(error_details) if error_details else None,
                metadata=json.dumps(metadata) if metadata else None
            )
            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)
            
            logger.info(f"Logged event {event_type} for instance {instance_id}: {message}")
            return log_entry
        except Exception as e:
            logger.error(f"Failed to log provisioning event: {e}")
            db.rollback()
            raise
    
    @staticmethod
    def log_provisioning_started(
        db: Session,
        instance_id: int,
        provider: str,
        challenge_name: str
    ):
        """Log when provisioning starts"""
        return ProvisioningLogService.log_event(
            db=db,
            instance_id=instance_id,
            event_type=ProvisioningEventType.PROVISIONING_STARTED,
            provider=provider,
            message=f"Started provisioning VM for challenge: {challenge_name}",
            metadata={"challenge_name": challenge_name}
        )
    
    @staticmethod
    def log_provisioning_success(
        db: Session,
        instance_id: int,
        provider: str,
        vm_info: dict
    ):
        """Log successful provisioning"""
        return ProvisioningLogService.log_event(
            db=db,
            instance_id=instance_id,
            event_type=ProvisioningEventType.PROVISIONING_SUCCESS,
            provider=provider,
            message=f"Successfully provisioned VM with IP: {vm_info.get('public_ip')}",
            metadata=vm_info
        )
    
    @staticmethod
    def log_provisioning_failed(
        db: Session,
        instance_id: int,
        provider: str,
        error: Exception
    ):
        """Log provisioning failure"""
        return ProvisioningLogService.log_event(
            db=db,
            instance_id=instance_id,
            event_type=ProvisioningEventType.PROVISIONING_FAILED,
            provider=provider,
            message=f"Provisioning failed on {provider}: {str(error)}",
            error_details={
                "error_type": type(error).__name__,
                "error_message": str(error)
            }
        )
    
    @staticmethod
    def log_provider_fallback(
        db: Session,
        instance_id: int,
        from_provider: str,
        to_provider: str,
        reason: str
    ):
        """Log provider fallback"""
        return ProvisioningLogService.log_event(
            db=db,
            instance_id=instance_id,
            event_type=ProvisioningEventType.PROVIDER_FALLBACK,
            provider=to_provider,
            message=f"Falling back from {from_provider} to {to_provider}: {reason}",
            metadata={
                "from_provider": from_provider,
                "to_provider": to_provider,
                "reason": reason
            }
        )
    
    @staticmethod
    def log_vm_running(
        db: Session,
        instance_id: int,
        provider: str
    ):
        """Log when VM becomes running"""
        return ProvisioningLogService.log_event(
            db=db,
            instance_id=instance_id,
            event_type=ProvisioningEventType.VM_RUNNING,
            provider=provider,
            message="VM is now running and accessible"
        )
    
    @staticmethod
    def log_vm_expired(
        db: Session,
        instance_id: int,
        provider: str
    ):
        """Log when VM expires"""
        return ProvisioningLogService.log_event(
            db=db,
            instance_id=instance_id,
            event_type=ProvisioningEventType.VM_EXPIRED,
            provider=provider,
            message="VM has expired"
        )
    
    @staticmethod
    def log_vm_destroying(
        db: Session,
        instance_id: int,
        provider: str
    ):
        """Log when VM destruction starts"""
        return ProvisioningLogService.log_event(
            db=db,
            instance_id=instance_id,
            event_type=ProvisioningEventType.VM_DESTROYING,
            provider=provider,
            message="Starting VM destruction"
        )
    
    @staticmethod
    def log_vm_destroyed(
        db: Session,
        instance_id: int,
        provider: str
    ):
        """Log when VM is destroyed"""
        return ProvisioningLogService.log_event(
            db=db,
            instance_id=instance_id,
            event_type=ProvisioningEventType.VM_DESTROYED,
            provider=provider,
            message="VM successfully destroyed"
        )
    
    @staticmethod
    def log_error(
        db: Session,
        instance_id: int,
        provider: Optional[str],
        error: Exception
    ):
        """Log a general error"""
        return ProvisioningLogService.log_event(
            db=db,
            instance_id=instance_id,
            event_type=ProvisioningEventType.ERROR,
            provider=provider,
            message=f"Error occurred: {str(error)}",
            error_details={
                "error_type": type(error).__name__,
                "error_message": str(error)
            }
        )

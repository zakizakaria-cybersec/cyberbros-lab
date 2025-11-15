import logging
import secrets
import string
from typing import Optional, Dict
from datetime import datetime
from .base import CloudProvider, VMInfo

logger = logging.getLogger(__name__)


class MockProvider(CloudProvider):
    """Mock cloud provider for local testing"""
    
    def __init__(self):
        self.vms: Dict[str, dict] = {}
        self.vm_counter = 1
    
    def _generate_password(self, length: int = 16) -> str:
        """Generate a random password"""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def _generate_ip(self) -> str:
        """Generate a fake IP address"""
        return f"192.168.{secrets.randbelow(255)}.{secrets.randbelow(255)}"
    
    def create_vm_from_snapshot(
        self,
        snapshot_id: str,
        name: str,
        expires_at: datetime,
        cpu_count: int = 2,
        memory_gb: int = 4,
    ) -> VMInfo:
        """Create a mock VM"""
        instance_id = f"mock-vm-{self.vm_counter}"
        self.vm_counter += 1
        
        public_ip = self._generate_ip()
        password = self._generate_password()
        
        self.vms[instance_id] = {
            "name": name,
            "snapshot_id": snapshot_id,
            "public_ip": public_ip,
            "status": "running",
            "created_at": datetime.utcnow(),
            "expires_at": expires_at,
        }
        
        logger.info(f"Created mock VM: {instance_id} at {public_ip}")
        
        return VMInfo(
            instance_id=instance_id,
            public_ip=public_ip,
            status="running",
            ssh_username="root",
            ssh_password=password,
        )
    
    def destroy_vm(self, instance_id: str) -> bool:
        """Destroy a mock VM"""
        if instance_id in self.vms:
            del self.vms[instance_id]
            logger.info(f"Destroyed mock VM: {instance_id}")
            return True
        return False
    
    def get_vm_status(self, instance_id: str) -> Optional[str]:
        """Get the status of a mock VM"""
        if instance_id in self.vms:
            return self.vms[instance_id]["status"]
        return None

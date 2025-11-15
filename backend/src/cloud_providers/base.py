from abc import ABC, abstractmethod
from typing import Optional, Dict
from datetime import datetime


class VMInfo:
    """Data class for VM information"""
    def __init__(
        self,
        instance_id: str,
        public_ip: str,
        status: str,
        ssh_username: str = "root",
        ssh_password: Optional[str] = None,
        ssh_key: Optional[str] = None,
    ):
        self.instance_id = instance_id
        self.public_ip = public_ip
        self.status = status
        self.ssh_username = ssh_username
        self.ssh_password = ssh_password
        self.ssh_key = ssh_key


class CloudProvider(ABC):
    """Abstract base class for cloud providers"""
    
    @abstractmethod
    def create_vm_from_snapshot(
        self,
        snapshot_id: str,
        name: str,
        expires_at: datetime,
        cpu_count: int = 2,
        memory_gb: int = 4,
    ) -> VMInfo:
        """
        Create a VM from a snapshot
        
        Args:
            snapshot_id: ID of the snapshot/image
            name: Name for the VM instance
            expires_at: When the VM should expire
            cpu_count: Number of CPU cores
            memory_gb: Amount of memory in GB
            
        Returns:
            VMInfo object with instance details
        """
        pass
    
    @abstractmethod
    def destroy_vm(self, instance_id: str) -> bool:
        """
        Destroy a VM instance
        
        Args:
            instance_id: ID of the instance to destroy
            
        Returns:
            True if successful, False otherwise
        """
        pass
    
    @abstractmethod
    def get_vm_status(self, instance_id: str) -> Optional[str]:
        """
        Get the status of a VM instance
        
        Args:
            instance_id: ID of the instance
            
        Returns:
            Status string or None if not found
        """
        pass

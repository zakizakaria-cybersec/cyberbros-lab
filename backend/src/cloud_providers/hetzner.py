import httpx
import logging
from typing import Optional
from datetime import datetime
import secrets
import string
from .base import CloudProvider, VMInfo

logger = logging.getLogger(__name__)


class HetznerProvider(CloudProvider):
    """Hetzner Cloud provider implementation"""
    
    BASE_URL = "https://api.hetzner.cloud/v1"
    
    def __init__(self, api_token: str):
        if not api_token:
            raise ValueError("Hetzner API token is required")
        self.api_token = api_token
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        }
    
    def _generate_password(self, length: int = 16) -> str:
        """Generate a random password"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*()"
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def _get_server_type(self, cpu_count: int, memory_gb: int) -> str:
        """Map CPU and memory requirements to Hetzner server types"""
        # Simple mapping - can be refined based on actual requirements
        if cpu_count <= 2 and memory_gb <= 4:
            return "cx11"  # 1 vCPU, 2GB RAM
        elif cpu_count <= 2 and memory_gb <= 8:
            return "cpx11"  # 2 vCPU, 2GB RAM
        elif cpu_count <= 4 and memory_gb <= 8:
            return "cpx21"  # 3 vCPU, 4GB RAM
        elif cpu_count <= 4 and memory_gb <= 16:
            return "cpx31"  # 4 vCPU, 8GB RAM
        else:
            return "cpx41"  # 8 vCPU, 16GB RAM
    
    def create_vm_from_snapshot(
        self,
        snapshot_id: str,
        name: str,
        expires_at: datetime,
        cpu_count: int = 2,
        memory_gb: int = 4,
    ) -> VMInfo:
        """Create a VM from a snapshot on Hetzner Cloud"""
        try:
            server_type = self._get_server_type(cpu_count, memory_gb)
            password = self._generate_password()
            
            payload = {
                "name": name,
                "server_type": server_type,
                "image": snapshot_id,
                "location": "nbg1",  # Nuremberg datacenter
                "start_after_create": True,
                "public_net": {
                    "enable_ipv4": True,
                    "enable_ipv6": False,
                },
                "labels": {
                    "managed_by": "cyberbros-lab",
                    "expires_at": expires_at.isoformat(),
                }
            }
            
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.BASE_URL}/servers",
                    headers=self.headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
            
            server = data["server"]
            instance_id = str(server["id"])
            public_ip = server["public_net"]["ipv4"]["ip"]
            
            logger.info(f"Created Hetzner VM: {instance_id} at {public_ip}")
            
            return VMInfo(
                instance_id=instance_id,
                public_ip=public_ip,
                status="running",
                ssh_username="root",
                ssh_password=password,
            )
            
        except Exception as e:
            logger.error(f"Failed to create Hetzner VM: {e}")
            raise
    
    def destroy_vm(self, instance_id: str) -> bool:
        """Destroy a VM on Hetzner Cloud"""
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.delete(
                    f"{self.BASE_URL}/servers/{instance_id}",
                    headers=self.headers,
                )
                response.raise_for_status()
            
            logger.info(f"Destroyed Hetzner VM: {instance_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to destroy Hetzner VM {instance_id}: {e}")
            return False
    
    def get_vm_status(self, instance_id: str) -> Optional[str]:
        """Get the status of a VM on Hetzner Cloud"""
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.get(
                    f"{self.BASE_URL}/servers/{instance_id}",
                    headers=self.headers,
                )
                response.raise_for_status()
                data = response.json()
            
            return data["server"]["status"]
            
        except Exception as e:
            logger.error(f"Failed to get status for Hetzner VM {instance_id}: {e}")
            return None

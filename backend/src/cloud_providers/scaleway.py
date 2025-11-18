import requests
from typing import Optional
from datetime import datetime
import logging
from .base import CloudProvider, VMInfo

logger = logging.getLogger(__name__)


class ScalewayProvider(CloudProvider):
    """Scaleway cloud provider implementation"""
    
    def __init__(self, api_token: str, api_base_url: str = "https://api.scaleway.com"):
        self.api_token = api_token
        self.api_base_url = api_base_url
        self.headers = {
            "X-Auth-Token": api_token,
            "Content-Type": "application/json",
        }
        self.default_zone = "fr-par-1"
        self.default_organization_id = None  # Should be set from config
    
    def create_vm_from_snapshot(
        self,
        snapshot_id: str,
        name: str,
        expires_at: datetime,
        cpu_count: int = 2,
        memory_gb: int = 4,
    ) -> VMInfo:
        """Create a VM from a snapshot on Scaleway"""
        try:
            # Map resources to Scaleway instance types
            instance_type = self._get_instance_type(cpu_count, memory_gb)
            
            # Create instance payload
            payload = {
                "name": name,
                "commercial_type": instance_type,
                "image": snapshot_id,
                "organization": self.default_organization_id,
                "tags": [
                    f"expires:{expires_at.isoformat()}",
                    "cyberbros-lab",
                ],
                "enable_ipv6": False,
            }
            
            # Create the instance
            url = f"{self.api_base_url}/instance/v1/zones/{self.default_zone}/servers"
            response = requests.post(url, json=payload, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            server_data = response.json()["server"]
            instance_id = server_data["id"]
            
            # Start the instance
            start_url = f"{url}/{instance_id}/action"
            start_response = requests.post(
                start_url,
                json={"action": "poweron"},
                headers=self.headers,
                timeout=30
            )
            start_response.raise_for_status()
            
            # Wait for IP assignment (poll for a bit)
            public_ip = self._wait_for_ip(instance_id)
            
            # Get root password (if available)
            # Note: Scaleway may require SSH keys instead
            ssh_password = None  # Scaleway uses SSH keys
            
            logger.info(f"Created Scaleway VM: {instance_id} with IP: {public_ip}")
            
            return VMInfo(
                instance_id=instance_id,
                public_ip=public_ip,
                status="running",
                ssh_username="root",
                ssh_password=ssh_password,
                ssh_key=None,  # Would need to retrieve or generate
            )
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Scaleway API error: {e}")
            raise Exception(f"Failed to create VM on Scaleway: {e}")
        except Exception as e:
            logger.error(f"Unexpected error creating Scaleway VM: {e}")
            raise
    
    def destroy_vm(self, instance_id: str) -> bool:
        """Destroy a Scaleway VM instance"""
        try:
            # Power off the instance first
            action_url = f"{self.api_base_url}/instance/v1/zones/{self.default_zone}/servers/{instance_id}/action"
            poweroff_response = requests.post(
                action_url,
                json={"action": "poweroff"},
                headers=self.headers,
                timeout=30
            )
            
            # Wait a bit for poweroff
            import time
            time.sleep(5)
            
            # Delete the instance
            delete_url = f"{self.api_base_url}/instance/v1/zones/{self.default_zone}/servers/{instance_id}"
            response = requests.delete(delete_url, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            logger.info(f"Destroyed Scaleway VM: {instance_id}")
            return True
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to destroy Scaleway VM {instance_id}: {e}")
            return False
    
    def get_vm_status(self, instance_id: str) -> Optional[str]:
        """Get the status of a Scaleway VM instance"""
        try:
            url = f"{self.api_base_url}/instance/v1/zones/{self.default_zone}/servers/{instance_id}"
            response = requests.get(url, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            server_data = response.json()["server"]
            return server_data.get("state", "unknown")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get status for Scaleway VM {instance_id}: {e}")
            return None
    
    def _get_instance_type(self, cpu_count: int, memory_gb: int) -> str:
        """Map CPU and memory requirements to Scaleway instance types"""
        # Scaleway instance type mapping
        # DEV1-S: 2 vCPUs, 2GB RAM
        # DEV1-M: 3 vCPUs, 4GB RAM
        # DEV1-L: 4 vCPUs, 8GB RAM
        # GP1-XS: 1 vCPU, 1GB RAM
        
        if cpu_count <= 2 and memory_gb <= 2:
            return "DEV1-S"
        elif cpu_count <= 3 and memory_gb <= 4:
            return "DEV1-M"
        elif cpu_count <= 4 and memory_gb <= 8:
            return "DEV1-L"
        else:
            return "DEV1-L"  # Default to largest
    
    def _wait_for_ip(self, instance_id: str, max_attempts: int = 10) -> str:
        """Wait for IP address to be assigned"""
        import time
        
        for attempt in range(max_attempts):
            try:
                url = f"{self.api_base_url}/instance/v1/zones/{self.default_zone}/servers/{instance_id}"
                response = requests.get(url, headers=self.headers, timeout=30)
                response.raise_for_status()
                
                server_data = response.json()["server"]
                if server_data.get("public_ip") and server_data["public_ip"].get("address"):
                    return server_data["public_ip"]["address"]
                
                time.sleep(2)
            except Exception as e:
                logger.warning(f"Failed to check IP on attempt {attempt + 1}: {e}")
                time.sleep(2)
        
        raise Exception("Timeout waiting for IP address assignment")

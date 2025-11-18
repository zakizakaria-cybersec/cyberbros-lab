"""
Cloudflare Workers API Client
Communicates with the Workers backend that manages D1 database and Terraform provisioning
"""

import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime
from ..config import settings
import logging

logger = logging.getLogger(__name__)


class WorkersAPIClient:
    """Client for communicating with Cloudflare Workers API"""
    
    def __init__(self):
        self.base_url = getattr(settings, 'workers_api_url', 'https://api.cyberbros.lab')
        self.timeout = 30.0
        
    async def _request(
        self, 
        method: str, 
        endpoint: str, 
        token: Optional[str] = None,
        json_data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to Workers API"""
        url = f"{self.base_url}{endpoint}"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=json_data,
                    params=params
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logger.error(f"Workers API request failed: {e}")
                raise
    
    # ========== Authentication ==========
    
    async def register_user(self, email: str, password: str) -> Dict[str, Any]:
        """Register a new user in D1"""
        return await self._request(
            "POST",
            "/api/register",
            json_data={"email": email, "password": password}
        )
    
    async def login_user(self, email: str, password: str) -> Dict[str, Any]:
        """Login user and get JWT token"""
        return await self._request(
            "POST",
            "/api/login",
            json_data={"email": email, "password": password}
        )
    
    async def get_current_user(self, token: str) -> Dict[str, Any]:
        """Get current user info"""
        return await self._request("GET", "/api/me", token=token)
    
    # ========== Challenges ==========
    
    async def get_challenges(self, token: str) -> List[Dict[str, Any]]:
        """Get all active challenges"""
        response = await self._request("GET", "/api/challenges", token=token)
        return response.get("data", [])
    
    async def get_challenge(self, challenge_id: int, token: str) -> Dict[str, Any]:
        """Get challenge by ID"""
        return await self._request("GET", f"/api/challenges/{challenge_id}", token=token)
    
    # ========== Assignments (stored in D1) ==========
    
    async def create_assignment(
        self, 
        user_id: int, 
        challenge_id: int,
        assigned_by: int,
        notes: Optional[str] = None,
        token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create assignment in D1 database"""
        return await self._request(
            "POST",
            "/api/admin/assignments",
            token=token,
            json_data={
                "user_id": user_id,
                "challenge_id": challenge_id,
                "assigned_by": assigned_by,
                "notes": notes
            }
        )
    
    async def bulk_create_assignments(
        self,
        user_ids: List[int],
        challenge_id: int,
        assigned_by: int,
        notes: Optional[str] = None,
        token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Bulk create assignments in D1"""
        return await self._request(
            "POST",
            "/api/admin/assignments/bulk",
            token=token,
            json_data={
                "user_ids": user_ids,
                "challenge_id": challenge_id,
                "assigned_by": assigned_by,
                "notes": notes
            }
        )
    
    async def get_user_assignments(self, token: str) -> List[Dict[str, Any]]:
        """Get assignments for the current user"""
        response = await self._request("GET", "/api/user/assignments", token=token)
        return response.get("data", [])
    
    async def get_all_assignments(self, token: str, filters: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """Get all assignments (admin)"""
        response = await self._request(
            "GET", 
            "/api/admin/assignments", 
            token=token,
            params=filters
        )
        return response.get("data", [])
    
    # ========== VM Instances (Terraform provisioning via Workers) ==========
    
    async def start_challenge(
        self, 
        challenge_id: int,
        assignment_id: Optional[int],
        token: str
    ) -> Dict[str, Any]:
        """
        Start challenge - triggers Terraform provisioning via GitHub Actions
        Returns instance details with 'provisioning' status
        """
        return await self._request(
            "POST",
            "/api/challenge/start",
            token=token,
            json_data={
                "challenge_id": challenge_id,
                "assignment_id": assignment_id
            }
        )
    
    async def get_vm_status(self, instance_id: int, token: str) -> Dict[str, Any]:
        """Get VM instance status from D1"""
        return await self._request(
            "GET",
            f"/api/instances/{instance_id}",
            token=token
        )
    
    async def get_vm_credentials(self, instance_id: int, token: str) -> Dict[str, Any]:
        """Get VM SSH credentials (decrypted)"""
        return await self._request(
            "GET",
            f"/api/instances/{instance_id}/credentials",
            token=token
        )
    
    async def get_user_vms(self, token: str) -> List[Dict[str, Any]]:
        """Get all VMs for current user"""
        response = await self._request("GET", "/api/vms", token=token)
        return response.get("data", [])
    
    async def destroy_vm(self, instance_id: int, token: str) -> Dict[str, Any]:
        """Destroy VM instance - triggers Terraform destroy via GitHub Actions"""
        return await self._request(
            "DELETE",
            f"/api/instances/{instance_id}",
            token=token
        )
    
    async def reset_vm(self, instance_id: int, token: str) -> Dict[str, Any]:
        """Reset VM - destroy and recreate"""
        return await self._request(
            "POST",
            f"/api/instances/{instance_id}/reset",
            token=token
        )
    
    # ========== Admin - Users ==========
    
    async def get_all_users(
        self, 
        token: str,
        role: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """Get all users (admin)"""
        params = {}
        if role:
            params["role"] = role
        if is_active is not None:
            params["is_active"] = str(is_active).lower()
        
        response = await self._request(
            "GET",
            "/api/admin/users",
            token=token,
            params=params if params else None
        )
        return response.get("data", [])
    
    async def get_user_by_id(self, user_id: int, token: str) -> Dict[str, Any]:
        """Get user by ID (admin)"""
        return await self._request("GET", f"/api/admin/users/{user_id}", token=token)
    
    # ========== Provisioning Logs ==========
    
    async def get_provisioning_logs(
        self, 
        instance_id: int,
        token: str
    ) -> List[Dict[str, Any]]:
        """Get provisioning logs for an instance"""
        response = await self._request(
            "GET",
            f"/api/admin/monitoring/instances/{instance_id}/logs",
            token=token
        )
        return response.get("data", [])


# Singleton instance
workers_api = WorkersAPIClient()

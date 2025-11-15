from .base import CloudProvider
from .hetzner import HetznerProvider
from .mock import MockProvider
from ..config import settings


def get_cloud_provider() -> CloudProvider:
    """Factory function to get the configured cloud provider"""
    if settings.cloud_provider == "hetzner":
        return HetznerProvider(api_token=settings.hetzner_api_token)
    elif settings.cloud_provider == "mock":
        return MockProvider()
    else:
        raise ValueError(f"Unknown cloud provider: {settings.cloud_provider}")


__all__ = ["CloudProvider", "HetznerProvider", "MockProvider", "get_cloud_provider"]

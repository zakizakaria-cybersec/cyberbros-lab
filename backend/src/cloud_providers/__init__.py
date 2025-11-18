from .base import CloudProvider
from .hetzner import HetznerProvider
from .scaleway import ScalewayProvider
from .mock import MockProvider
from ..config import settings
import logging

logger = logging.getLogger(__name__)


def get_cloud_provider(provider_name: str = None) -> CloudProvider:
    """Factory function to get a specific cloud provider"""
    provider = provider_name or settings.cloud_provider
    
    if provider == "hetzner":
        return HetznerProvider(api_token=settings.hetzner_api_token)
    elif provider == "scaleway":
        return ScalewayProvider(
            api_token=getattr(settings, "scaleway_api_token", ""),
        )
    elif provider == "mock":
        return MockProvider()
    else:
        raise ValueError(f"Unknown cloud provider: {provider}")


def get_provider_with_fallback(primary: str = "scaleway", fallback: str = "hetzner") -> tuple[CloudProvider, str]:
    """Get cloud provider with fallback capability"""
    try:
        provider = get_cloud_provider(primary)
        return provider, primary
    except Exception as e:
        logger.warning(f"Failed to get primary provider {primary}: {e}, falling back to {fallback}")
        provider = get_cloud_provider(fallback)
        return provider, fallback


__all__ = [
    "CloudProvider", 
    "HetznerProvider", 
    "ScalewayProvider",
    "MockProvider", 
    "get_cloud_provider",
    "get_provider_with_fallback"
]

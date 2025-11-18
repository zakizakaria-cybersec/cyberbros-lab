from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/cyberbros"
    
    # JWT
    jwt_secret: str = "change-this-secret-key"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 1440
    
    # Cloud Provider
    cloud_provider: str = "mock"
    hetzner_api_token: Optional[str] = None
    
    # VM Configuration
    vm_default_lifetime_hours: int = 2
    vm_cleanup_interval_minutes: int = 5
    
    # Application
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    frontend_url: str = "http://localhost:3000"
    
    # Development
    debug: bool = True
    environment: str = "development"
    
    # Encryption (for VM credentials)
    encryption_key: Optional[str] = None
    
    # Additional provider settings (optional)
    cloud_provider_fallback: Optional[str] = None
    scaleway_api_token: Optional[str] = None
    scaleway_project_id: Optional[str] = None
    scaleway_zone: Optional[str] = None
    backend_url: Optional[str] = None
    database_host: Optional[str] = None
    database_port: Optional[int] = None
    database_name: Optional[str] = None
    database_user: Optional[str] = None
    database_password: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra environment variables


settings = Settings()

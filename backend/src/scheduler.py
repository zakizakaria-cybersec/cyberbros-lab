import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from .database import SessionLocal
from .services.vm_service import VMService
from .config import settings

logger = logging.getLogger(__name__)


def cleanup_expired_vms_job():
    """Background job to clean up expired VMs"""
    logger.info("Running VM cleanup job")
    db = SessionLocal()
    try:
        VMService.cleanup_all_expired_vms(db)
    except Exception as e:
        logger.error(f"Error in VM cleanup job: {e}")
    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler"""
    scheduler = BackgroundScheduler()
    
    # Schedule VM cleanup job
    scheduler.add_job(
        cleanup_expired_vms_job,
        trigger=IntervalTrigger(minutes=settings.vm_cleanup_interval_minutes),
        id="cleanup_expired_vms",
        name="Clean up expired VMs",
        replace_existing=True,
    )
    
    scheduler.start()
    logger.info(f"Scheduler started - VM cleanup will run every {settings.vm_cleanup_interval_minutes} minutes")
    
    return scheduler

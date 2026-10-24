"""LeadFlow AI - Scheduled Lead Discovery Service (FR-10)"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal
from backend.app.models import DiscoverySchedule, AutomationRun, ActivityLog
from backend.app.services.orchestrator import execute_discovery_run

logger = logging.getLogger("leadflow.scheduler")


class SchedulerService:
    def __init__(self):
        self._is_running = False
        self._task: Optional[asyncio.Task] = None

    async def check_and_execute_due_schedules(self):
        """Checks database for any active schedules whose next_run_at has arrived."""
        db: Session = SessionLocal()
        try:
            now = datetime.utcnow()
            due_schedules = db.query(DiscoverySchedule).filter(
                DiscoverySchedule.is_active == True,
                DiscoverySchedule.next_run_at <= now
            ).all()

            for sched in due_schedules:
                logger.info(f"Triggering scheduled discovery for schedule #{sched.id}: '{sched.name}'")

                profile_data = {
                    "industry": sched.industry,
                    "location": sched.location or "United States",
                    "company_size": sched.company_size or "20-100",
                    "criteria": sched.criteria,
                    "max_leads": sched.max_leads,
                    "source": f"Scheduled Run: {sched.name}"
                }

                run = AutomationRun(
                    profile_id=sched.profile_id,
                    status="PENDING",
                    input_profile=profile_data
                )
                db.add(run)
                db.commit()
                db.refresh(run)

                # Advance next run time
                sched.last_run_at = now
                sched.next_run_at = now + timedelta(hours=sched.interval_hours or 24)

                db.add(ActivityLog(
                    run_id=run.id,
                    action="SCHEDULED_RUN_TRIGGERED",
                    level="INFO",
                    details=f"Automated discovery run #{run.id} started on schedule '{sched.name}' (every {sched.interval_hours}h)."
                ))
                db.commit()

                # Trigger orchestrator
                asyncio.create_task(execute_discovery_run(run.id))
        except Exception as e:
            logger.error(f"Error checking due schedules: {e}")
        finally:
            db.close()

    async def trigger_schedule_now(self, schedule_id: int) -> Optional[int]:
        """Manually trigger a scheduled run immediately and return the created run_id."""
        db: Session = SessionLocal()
        try:
            sched = db.query(DiscoverySchedule).filter(DiscoverySchedule.id == schedule_id).first()
            if not sched:
                return None

            now = datetime.utcnow()
            profile_data = {
                "industry": sched.industry,
                "location": sched.location or "United States",
                "company_size": sched.company_size or "20-100",
                "criteria": sched.criteria,
                "max_leads": sched.max_leads,
                "source": f"Immediate Trigger: {sched.name}"
            }

            run = AutomationRun(
                profile_id=sched.profile_id,
                status="PENDING",
                input_profile=profile_data
            )
            db.add(run)
            db.commit()
            db.refresh(run)

            sched.last_run_at = now
            sched.next_run_at = now + timedelta(hours=sched.interval_hours or 24)

            db.add(ActivityLog(
                run_id=run.id,
                action="SCHEDULED_RUN_TRIGGERED",
                level="INFO",
                details=f"Immediate run #{run.id} triggered for schedule '{sched.name}'."
            ))
            db.commit()

            asyncio.create_task(execute_discovery_run(run.id))
            return run.id
        except Exception as e:
            logger.error(f"Error triggering immediate schedule #{schedule_id}: {e}")
            return None
        finally:
            db.close()

    async def start_scheduler_loop(self, poll_interval_seconds: int = 60):
        """Continuous background loop checking for due schedules."""
        self._is_running = True
        logger.info(f"LeadFlow Scheduler Service started (poll interval: {poll_interval_seconds}s).")
        while self._is_running:
            try:
                await self.check_and_execute_due_schedules()
            except asyncio.CancelledError:
                logger.info("Scheduler task cancelled.")
                break
            except Exception as e:
                logger.error(f"Scheduler loop error: {e}")

            try:
                await asyncio.sleep(poll_interval_seconds)
            except asyncio.CancelledError:
                break

    def stop(self):
        self._is_running = False


scheduler_service = SchedulerService()

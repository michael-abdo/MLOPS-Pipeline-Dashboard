#!/usr/bin/env python3
"""
Background Task Manager for MLOps Backend
Handles periodic tasks with thread safety and graceful shutdown
"""

import asyncio
import threading
import logging
from datetime import datetime
from typing import Dict, Optional, Callable, Any
from concurrent.futures import ThreadPoolExecutor
import time

class PeriodicTask:
    """Represents a periodic task that runs at specified intervals"""
    
    def __init__(self, task_id: str, func: Callable, interval_seconds: int, initial_delay: int = 0):
        self.task_id = task_id
        self.func = func
        self.interval_seconds = interval_seconds
        self.initial_delay = initial_delay
        self.last_run = None
        self.run_count = 0
        self.error_count = 0
        
class BackgroundTaskManager:
    """Manages background tasks with thread safety and graceful shutdown"""
    
    def __init__(self, max_workers: int = 4):
        self._tasks: Dict[str, asyncio.Task] = {}
        self._shutdown_event = threading.Event()
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self._periodic_tasks: Dict[str, PeriodicTask] = {}
        self.logger = logging.getLogger(__name__)
        self._lock = threading.RLock()
        
    def register_periodic_task(
        self, 
        task_id: str, 
        func: Callable, 
        interval_seconds: int,
        initial_delay: int = 0
    ) -> None:
        """Register a periodic task for execution"""
        with self._lock:
            if task_id in self._periodic_tasks:
                self.logger.warning(f"Task {task_id} already registered, updating...")
                
            task = PeriodicTask(task_id, func, interval_seconds, initial_delay)
            self._periodic_tasks[task_id] = task
            self.logger.info(f"Registered periodic task: {task_id} (interval: {interval_seconds}s)")
            
    async def start_all_tasks(self) -> None:
        """Start all registered periodic tasks"""
        with self._lock:
            for task_id, task in self._periodic_tasks.items():
                if task_id not in self._tasks or self._tasks[task_id].done():
                    self._tasks[task_id] = asyncio.create_task(
                        self._run_periodic_task(task)
                    )
                    self.logger.info(f"Started periodic task: {task_id}")
                    
    async def _run_periodic_task(self, task: PeriodicTask) -> None:
        """Run a periodic task with error handling"""
        # Apply initial delay if specified
        if task.initial_delay > 0:
            self.logger.info(f"Task {task.task_id} waiting {task.initial_delay}s before first run")
            await asyncio.sleep(task.initial_delay)
            
        while not self._shutdown_event.is_set():
            try:
                start_time = time.time()
                
                # Execute the task
                if asyncio.iscoroutinefunction(task.func):
                    await task.func()
                else:
                    # Run sync functions in executor to avoid blocking
                    await asyncio.get_event_loop().run_in_executor(
                        self._executor, task.func
                    )
                
                # Update task statistics
                task.last_run = datetime.now()
                task.run_count += 1
                
                execution_time = time.time() - start_time
                self.logger.debug(
                    f"Task {task.task_id} completed in {execution_time:.2f}s "
                    f"(run #{task.run_count})"
                )
                
            except Exception as e:
                task.error_count += 1
                self.logger.error(
                    f"Error in periodic task {task.task_id} "
                    f"(error #{task.error_count}): {str(e)}"
                )
                
            # Wait for the next execution
            try:
                await asyncio.wait_for(
                    asyncio.create_task(self._wait_for_shutdown(task.interval_seconds)),
                    timeout=task.interval_seconds
                )
            except asyncio.TimeoutError:
                # Normal timeout, continue loop
                pass
                
    async def _wait_for_shutdown(self, timeout: float) -> None:
        """Wait for shutdown event with timeout"""
        start_time = time.time()
        while not self._shutdown_event.is_set() and (time.time() - start_time) < timeout:
            await asyncio.sleep(0.1)
            
    async def stop_task(self, task_id: str) -> None:
        """Stop a specific task"""
        with self._lock:
            if task_id in self._tasks:
                task = self._tasks[task_id]
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                del self._tasks[task_id]
                self.logger.info(f"Stopped task: {task_id}")
                
    async def shutdown(self, timeout: float = 30.0) -> None:
        """Graceful shutdown of all tasks"""
        self.logger.info("Initiating background task manager shutdown...")
        
        # Signal all tasks to stop
        self._shutdown_event.set()
        
        # Cancel all running tasks
        with self._lock:
            tasks_to_cancel = list(self._tasks.values())
            
        for task in tasks_to_cancel:
            task.cancel()
            
        # Wait for all tasks to complete with timeout
        try:
            await asyncio.wait_for(
                asyncio.gather(*tasks_to_cancel, return_exceptions=True),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            self.logger.warning(f"Some tasks did not complete within {timeout}s timeout")
            
        # Shutdown executor
        self._executor.shutdown(wait=True, timeout=timeout)
        
        self.logger.info("Background task manager shutdown complete")
        
    def get_task_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all registered tasks"""
        with self._lock:
            status = {}
            for task_id, task in self._periodic_tasks.items():
                status[task_id] = {
                    "interval_seconds": task.interval_seconds,
                    "last_run": task.last_run.isoformat() if task.last_run else None,
                    "run_count": task.run_count,
                    "error_count": task.error_count,
                    "is_running": task_id in self._tasks and not self._tasks[task_id].done()
                }
            return status

# Global instance for easy access
task_manager = BackgroundTaskManager()
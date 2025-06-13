#!/usr/bin/env python3
"""
Caching layer with TTL support for MLOps backend
Provides thread-safe in-memory caching with automatic expiration and eviction
"""

import time
import asyncio
import threading
import hashlib
import json
import logging
from typing import Any, Dict, Optional, Tuple, Callable, Union
from datetime import datetime, timedelta
from functools import wraps
from collections import OrderedDict

class CacheManager:
    """Thread-safe caching layer with TTL support and automatic eviction"""
    
    def __init__(self, default_ttl: int = 300, max_cache_size: int = 1000):
        self._cache: OrderedDict[str, Tuple[Any, float, float]] = OrderedDict()  # key: (value, expiry, access_time)
        self._lock = threading.RLock()
        self._default_ttl = default_ttl  # Default TTL in seconds
        self._max_cache_size = max_cache_size
        self.logger = logging.getLogger(__name__)
        
        # Cache statistics
        self._stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
            "expired": 0,
            "sets": 0
        }
        
    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate cache key from arguments"""
        try:
            # Create a stable representation of arguments
            key_data = {
                "prefix": prefix,
                "args": args,
                "kwargs": sorted(kwargs.items()) if kwargs else None
            }
            
            # Convert to JSON for consistent hashing
            key_string = json.dumps(key_data, sort_keys=True, default=str)
            
            # Generate hash
            return hashlib.md5(key_string.encode('utf-8')).hexdigest()
            
        except Exception as e:
            # Fallback to simple string concatenation
            self.logger.warning(f"Failed to generate cache key: {e}")
            return f"{prefix}:{hash((args, tuple(sorted(kwargs.items()))))}"
            
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        with self._lock:
            if key not in self._cache:
                self._stats["misses"] += 1
                return None
                
            value, expiry, _ = self._cache[key]
            current_time = time.time()
            
            if current_time >= expiry:
                # Expired entry
                del self._cache[key]
                self._stats["expired"] += 1
                self._stats["misses"] += 1
                return None
                
            # Update access time and move to end (LRU)
            self._cache[key] = (value, expiry, current_time)
            self._cache.move_to_end(key)
            
            self._stats["hits"] += 1
            return value
            
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache with TTL"""
        with self._lock:
            current_time = time.time()
            expiry = current_time + (ttl or self._default_ttl)
            
            # Check if we need to evict entries
            if key not in self._cache and len(self._cache) >= self._max_cache_size:
                self._evict_entries()
                
            self._cache[key] = (value, expiry, current_time)
            self._cache.move_to_end(key)
            
            self._stats["sets"] += 1
            
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
            
    def clear(self) -> None:
        """Clear entire cache"""
        with self._lock:
            self._cache.clear()
            # Reset stats except configuration
            self._stats = {
                "hits": 0,
                "misses": 0,
                "evictions": 0,
                "expired": 0,
                "sets": 0
            }
            
    def _evict_entries(self, count: Optional[int] = None) -> int:
        """Evict oldest entries from cache"""
        if not self._cache:
            return 0
            
        # Default to evicting 10% of cache
        if count is None:
            count = max(1, len(self._cache) // 10)
            
        evicted = 0
        current_time = time.time()
        
        # First, remove any expired entries
        expired_keys = []
        for key, (_, expiry, _) in self._cache.items():
            if current_time >= expiry:
                expired_keys.append(key)
                
        for key in expired_keys:
            del self._cache[key]
            evicted += 1
            self._stats["expired"] += 1
            
        # If we still need to evict more, remove LRU entries
        while evicted < count and self._cache:
            # Remove the first item (oldest)
            self._cache.popitem(last=False)
            evicted += 1
            self._stats["evictions"] += 1
            
        return evicted
        
    def cleanup_expired(self) -> int:
        """Remove all expired entries"""
        with self._lock:
            current_time = time.time()
            expired_keys = [
                key for key, (_, expiry, _) in self._cache.items()
                if current_time >= expiry
            ]
            
            for key in expired_keys:
                del self._cache[key]
                self._stats["expired"] += 1
                
            return len(expired_keys)
            
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            total_requests = self._stats["hits"] + self._stats["misses"]
            hit_rate = (self._stats["hits"] / total_requests * 100) if total_requests > 0 else 0
            
            current_time = time.time()
            active_items = sum(
                1 for _, expiry, _ in self._cache.values()
                if current_time < expiry
            )
            
            return {
                "total_items": len(self._cache),
                "active_items": active_items,
                "expired_items": len(self._cache) - active_items,
                "max_size": self._max_cache_size,
                "usage_percent": (len(self._cache) / self._max_cache_size) * 100,
                "hit_rate_percent": round(hit_rate, 2),
                "total_hits": self._stats["hits"],
                "total_misses": self._stats["misses"],
                "total_sets": self._stats["sets"],
                "total_evictions": self._stats["evictions"],
                "total_expired": self._stats["expired"],
                "default_ttl": self._default_ttl
            }
            
    def get_cache_info(self, include_keys: bool = False) -> Dict[str, Any]:
        """Get detailed cache information"""
        with self._lock:
            info = self.get_stats()
            
            if include_keys:
                current_time = time.time()
                key_info = []
                
                for key, (_, expiry, access_time) in self._cache.items():
                    key_info.append({
                        "key": key[:50] + "..." if len(key) > 50 else key,
                        "expires_in": max(0, expiry - current_time),
                        "last_accessed": current_time - access_time,
                        "is_expired": current_time >= expiry
                    })
                    
                info["keys"] = key_info
                
            return info
            
    def resize_cache(self, new_size: int) -> None:
        """Resize the cache, evicting entries if necessary"""
        with self._lock:
            old_size = self._max_cache_size
            self._max_cache_size = new_size
            
            if len(self._cache) > new_size:
                excess = len(self._cache) - new_size
                evicted = self._evict_entries(excess)
                self.logger.info(f"Resized cache from {old_size} to {new_size}, evicted {evicted} entries")
            else:
                self.logger.info(f"Resized cache from {old_size} to {new_size}")

# Decorator for caching function results
def cache_result(
    cache_manager: CacheManager, 
    ttl: int = 300, 
    key_prefix: Optional[str] = None
):
    """Decorator to cache function results"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Generate cache key
            prefix = key_prefix or func.__name__
            cache_key = cache_manager._generate_key(prefix, *args, **kwargs)
            
            # Try to get from cache
            cached = cache_manager.get(cache_key)
            if cached is not None:
                return cached
                
            # Execute function and cache result
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
                
            cache_manager.set(cache_key, result, ttl)
            return result
            
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Generate cache key
            prefix = key_prefix or func.__name__
            cache_key = cache_manager._generate_key(prefix, *args, **kwargs)
            
            # Try to get from cache
            cached = cache_manager.get(cache_key)
            if cached is not None:
                return cached
                
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_manager.set(cache_key, result, ttl)
            return result
            
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
            
    return decorator

# Context manager for temporary cache entries
class TemporaryCache:
    """Context manager for temporary cache entries that auto-expire"""
    
    def __init__(self, cache_manager: CacheManager, key: str, value: Any, ttl: int = 60):
        self.cache_manager = cache_manager
        self.key = key
        self.value = value
        self.ttl = ttl
        
    def __enter__(self):
        self.cache_manager.set(self.key, self.value, self.ttl)
        return self.value
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cache_manager.delete(self.key)

# Global cache instance
cache_manager = CacheManager(default_ttl=300, max_cache_size=1000)
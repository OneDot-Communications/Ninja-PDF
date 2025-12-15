"""
Gunicorn Configuration optimized for 1GB RAM DigitalOcean Droplet
Basic formula: (2 x num_cores) + 1
For 1 vCPU, ideally 3 workers, but 1GB RAM is tight.
We start conservatively with 2 workers to prevent OOM.
"""
import multiprocessing

bind = "0.0.0.0:8000"
workers = 2 # Conservative for 1GB RAM. 
threads = 2 # Add concurrency within workers
timeout = 120 # Higher timeout for long-running PDF generations
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Worker class
# 'gthread' is good for I/O bound tasks (database/external APIs)
worker_class = "gthread"
max_requests = 1000
max_requests_jitter = 50

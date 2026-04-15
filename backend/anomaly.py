import numpy as np
from collections import defaultdict
from datetime import datetime

def detect_anomalies(logs, window=10, threshold=2.0):
    """Detect anomalous event frequency per IP using Z-score."""
    ip_events = defaultdict(list)
    for log in logs:
        ip_events[log['ip']].append(log)
    anomalies = []
    for ip, events in ip_events.items():
        if len(events) < window:
            continue
        # Count events in last `window` entries
        counts = [1] * len(events[-window:])
        if len(counts) < 2:
            continue
        mean = np.mean(counts)
        std = np.std(counts)
        if std > 0 and (len(events[-window:]) - mean) / std > threshold:
            anomalies.extend(events[-window:])
    return anomalies
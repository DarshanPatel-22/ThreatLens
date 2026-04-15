import requests
import random
import time

url = "http://127.0.0.1:5000/api/ingest"

# Sample dynamic data
ips = ["192.168.1.100", "10.0.0.55", "172.16.0.8", "203.0.113.5", "45.33.12.77"]
events = ["failed_login", "port_scan", "malware_detected", "privilege_escalation", "login_success"]
users = ["alice", "bob", "admin", "external_user"]

while True:
    log = {
        "ip": random.choice(ips),
        "event": random.choice(events),
        "user": random.choice(users),
        "time": time.strftime("%H:%M:%S")
    }
    try:
        resp = requests.post(url, json=log, timeout=2)
        if resp.status_code == 200:
            print(f"Sent: {log} -> Status: {resp.status_code}")
        else:
            print(f"Failed: {log} -> Status: {resp.status_code}")
    except requests.exceptions.ConnectionError:
        print(f"Backend not reachable. Retrying in 5 seconds...")
        time.sleep(5)
        continue
    except Exception as e:
        print(f"Error: {e}")
    time.sleep(3)  # Send a new log every 3 seconds
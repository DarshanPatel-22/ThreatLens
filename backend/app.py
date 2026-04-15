import os
import json
import random
import time
import requests
import threading
import re
from collections import Counter
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_socketio import SocketIO
from elasticsearch import Elasticsearch
from dotenv import load_dotenv
from flask_cors import CORS
from anomaly import detect_anomalies
from log_ingestor import start_file_watcher

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret')
CORS(app, resources={r"/api/*": {"origins": "*"}})  # Allow all origins for development
socketio = SocketIO(app, cors_allowed_origins="*")

# ---------- Elasticsearch Connection ----------
ES_HOST = os.getenv('ES_HOST')
ES_API_KEY = os.getenv('ES_API_KEY')
INDEX_NAME = "soc_logs"

if ES_HOST and ES_API_KEY:
    es = Elasticsearch(ES_HOST, api_key=ES_API_KEY, verify_certs=True)
    print(f"Connected to Elastic Cloud: {ES_HOST}")
else:
    es = Elasticsearch("http://localhost:9200", verify_certs=False)
    print("Warning: ES_HOST or ES_API_KEY not set, using localhost.")

# Create index if it doesn't exist
try:
    if not es.indices.exists(index=INDEX_NAME):
        es.indices.create(index=INDEX_NAME)
        print(f"Created index: {INDEX_NAME}")
except Exception as e:
    print(f"Elasticsearch index error: {e}")

# ---------- VirusTotal ----------
VT_API_KEY = os.getenv('VT_API_KEY')
VT_IP_URL = "https://www.virustotal.com/api/v3/ip_addresses/{}"
vt_cache = {}

def get_vt_ip_score(ip):
    if not VT_API_KEY:
        return None, None
    headers = {"x-apikey": VT_API_KEY}
    url = VT_IP_URL.format(ip)
    try:
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            attrs = data.get("data", {}).get("attributes", {})
            stats = attrs.get("last_analysis_stats", {})
            malicious = stats.get("malicious", 0)
            total = sum(stats.values())
            print(f"VT for {ip}: malicious={malicious}, total={total}")
            return malicious, total
        elif resp.status_code == 204:
            print(f"Rate limit hit for {ip}")
            return None, None
        else:
            print(f"VT error {resp.status_code} for {ip}")
            return None, None
    except Exception as e:
        print(f"VT request failed: {e}")
        return None, None

def get_vt_ip_score_cached(ip, ttl=3600):
    now = time.time()
    if ip in vt_cache and now - vt_cache[ip][2] < ttl:
        return vt_cache[ip][0], vt_cache[ip][1]
    malicious, total = get_vt_ip_score(ip)
    if malicious is not None:
        vt_cache[ip] = (malicious, total, now)
    return malicious, total

# ---------- Slack Alert ----------
SLACK_WEBHOOK = os.getenv('SLACK_WEBHOOK')
def send_slack_alert(log):
    if SLACK_WEBHOOK and log.get('severity') == 'CRITICAL':
        text = f"🚨 *CRITICAL Alert*\nIP: {log['ip']}\nEvent: {log['event']}\nScore: {log.get('log_score', 'N/A')}"
        try:
            requests.post(SLACK_WEBHOOK, json={'text': text}, timeout=2)
        except:
            pass

# ---------- MITRE Mapping ----------
MITRE_MAP = {
    "failed_login": "T1110",
    "port_scan": "T1046",
    "malware_detected": "T1204",
    "login_success": "T1078",
    "privilege_escalation": "T1068"
}

def enrich_log(log):
    # Get real VirusTotal score (if available)
    malicious, total = get_vt_ip_score_cached(log['ip'])
    if malicious is not None and total is not None:
        real_score = int((malicious / total) * 100) if total > 0 else 0
    else:
        real_score = None

    # Simulate higher scores for demo (40% chance if real score is low)
    simulate_threat = False
    if real_score is None or real_score < 15:
        simulate_threat = random.random() < 0.4

    if simulate_threat:
        log_score = random.randint(50, 100)
        if log_score >= 80:
            severity = "CRITICAL"
        elif log_score >= 60:
            severity = "HIGH"
        else:
            severity = "MEDIUM"
        vt_info = "SIMULATED"
    elif real_score is not None:
        log_score = real_score
        if log_score >= 70:
            severity = "CRITICAL"
        elif log_score >= 40:
            severity = "HIGH"
        elif log_score >= 10:
            severity = "MEDIUM"
        else:
            severity = "LOW"
        vt_info = f"{malicious}/{total}"
    else:
        log_score = random.randint(10, 100)
        severity = random.choice(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
        vt_info = "N/A"

    log['log_score'] = log_score
    log['severity'] = severity
    log['vt_detections'] = vt_info
    log['mitre_technique'] = MITRE_MAP.get(log.get('event', ''), 'T1071')
    if 'time' not in log:
        log['time'] = datetime.now().strftime("%H:%M:%S")
    return log

def ingest_log(log):
    log = enrich_log(log)
    # Index into Elasticsearch
    try:
        es.index(index=INDEX_NAME, document=log)
    except Exception as e:
        print(f"ES indexing error: {e}")
    # Real-time WebSocket
    socketio.emit('new_log', log)
    # Slack alert
    send_slack_alert(log)

# ---------- Log Ingestion (file or mock) ----------
LOG_FILE_PATH = os.getenv('LOG_FILE_PATH', '../logs/events.log')
if os.path.exists(LOG_FILE_PATH):
    threading.Thread(target=start_file_watcher, args=(LOG_FILE_PATH, ingest_log), daemon=True).start()
    print(f"Watching log file: {LOG_FILE_PATH}")
else:
    print(f"Log file {LOG_FILE_PATH} not found. Generating mock logs every 5 seconds.")
    users = ["alice", "bob", "admin"]
    ips = ["8.8.8.8", "1.1.1.1", "45.33.12.77", "185.130.5.253", "94.102.61.78"]
    events = ["login_success", "failed_login", "port_scan", "malware_detected"]
    def mock_logs():
        while True:
            log = {
                "user": random.choice(users),
                "ip": random.choice(ips),
                "event": random.choice(events),
                "time": datetime.now().strftime("%H:%M:%S")
            }
            ingest_log(log)
            time.sleep(5)
    threading.Thread(target=mock_logs, daemon=True).start()

# ---------- API Endpoints ----------
@app.route('/api/logs')
def get_logs():
    # Fixed: use match_all to avoid date parsing errors
    body = {
        "query": {"match_all": {}},
        "sort": [{"time": "desc"}],
        "size": 500
    }
    try:
        res = es.search(index=INDEX_NAME, body=body)
        logs = [hit['_source'] for hit in res['hits']['hits']]
        return jsonify({'logs': logs})
    except Exception as e:
        return jsonify({'logs': [], 'error': str(e)}), 500

@app.route('/api/anomalies')
def get_anomalies():
    body = {"query": {"match_all": {}}, "size": 1000, "sort": [{"time": "desc"}]}
    try:
        res = es.search(index=INDEX_NAME, body=body)
        logs = [hit['_source'] for hit in res['hits']['hits']]
        anomalies = detect_anomalies(logs)
        return jsonify({'anomalies': anomalies})
    except Exception as e:
        return jsonify({'anomalies': [], 'error': str(e)}), 500

# ========= DYNAMIC LOG INGESTION ENDPOINT =========
@app.route('/api/ingest', methods=['POST'])
def dynamic_ingest():
    try:
        log_data = request.get_json()
        if not log_data:
            return jsonify({"error": "Missing JSON body"}), 400
        if 'ip' not in log_data:
            log_data['ip'] = '0.0.0.0'
        if 'event' not in log_data:
            log_data['event'] = 'unknown'
        if 'time' not in log_data:
            log_data['time'] = datetime.now().strftime("%H:%M:%S")
        if 'user' not in log_data:
            log_data['user'] = 'external'
        ingest_log(log_data)
        return jsonify({"status": "success", "message": "Log ingested"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ========= RULE-BASED SOC ASSISTANT (fallback) =========
@app.route('/api/assistant/query', methods=['POST'])
def assistant_query():
    data = request.get_json()
    query = data.get('query', '').lower()
    logs = data.get('logs', [])
    if not logs:
        return jsonify({'answer': 'No logs available yet. Wait for events.'})
    if 'top attacker' in query or 'top ip' in query:
        ip_counts = Counter(log.get('ip') for log in logs)
        top = ip_counts.most_common(3)
        if top:
            answer = "Top attackers: " + ", ".join([f"{ip} ({count} events)" for ip, count in top])
        else:
            answer = "No attackers detected."
    elif 'critical' in query:
        criticals = [log for log in logs if log.get('severity') == 'CRITICAL']
        answer = f"There are {len(criticals)} critical alerts. Latest: {criticals[0]['event'] if criticals else 'none'}"
    else:
        answer = "Try 'top attackers' or 'critical alerts'."
    return jsonify({'answer': answer})

# ========= LLM-POWERED SOC ASSISTANT ENDPOINT =========
@app.route('/api/llm/ask', methods=['POST'])
def llm_ask():
    try:
        import ollama
    except ImportError:
        return jsonify({'answer': 'Ollama library not installed. Please run: pip install ollama'}), 500
    
    data = request.get_json()
    user_query = data.get('query', '')
    logs = data.get('logs', [])
    
    # Prepare context from recent logs (last 15)
    if logs and len(logs) > 0:
        log_context = "\n".join([
            f"Time: {log.get('time')}, IP: {log.get('ip')}, Event: {log.get('event')}, Severity: {log.get('severity')}, Score: {log.get('log_score')}"
            for log in logs[-15:]
        ])
    else:
        log_context = "No logs available yet."
    
    system_prompt = f"""You are an expert security analyst assistant for a SOC team.
Answer the user's question based ONLY on the provided security logs below.
Be concise, direct, and factual. If the answer is not in the logs, say "I don't have enough information from the logs."

Recent Logs (last 15 events):
{log_context}
"""
    
    try:
        response = ollama.chat(model='llama3.2', messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_query}
        ], options={'temperature': 0.3})
        answer = response['message']['content']
        return jsonify({'answer': answer}), 200
    except Exception as e:
        print(f"Ollama error: {e}")
        return jsonify({'answer': f'LLM error: {str(e)}'}), 500

@app.route('/health')
def health():
    return {"status": "ok"}

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
import time
import json
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class LogFileHandler(FileSystemEventHandler):
    def __init__(self, callback):
        self.callback = callback
        self.file_position = {}

    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith('.log'):
            self.process_file(event.src_path)

    def process_file(self, filepath):
        if filepath not in self.file_position:
            self.file_position[filepath] = 0
        with open(filepath, 'r') as f:
            f.seek(self.file_position[filepath])
            for line in f:
                line = line.strip()
                if line:
                    try:
                        log = json.loads(line)
                        self.callback(log)
                    except:
                        print(f"Invalid JSON line: {line}")
            self.file_position[filepath] = f.tell()

def start_file_watcher(filepath, callback):
    """Watch a JSON lines file and call callback for each new line."""
    # Process existing content first
    handler = LogFileHandler(callback)
    handler.process_file(filepath)
    observer = Observer()
    observer.schedule(handler, path=os.path.dirname(filepath), recursive=False)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
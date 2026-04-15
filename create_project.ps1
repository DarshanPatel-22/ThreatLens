# create_project.ps1
$folders = @("backend", "frontend/components", "frontend/pages", "frontend/styles", "logs")
foreach ($folder in $folders) { New-Item -ItemType Directory -Force -Path $folder }

# Backend files
@"
flask
flask-socketio
elasticsearch
requests
python-dotenv
numpy
watchdog
"@ | Out-File -FilePath backend/requirements.txt -Encoding utf8

# (Copy each file content as shown above – too long for this script, but you can manually create them)
Write-Host "Project structure created. Please copy the file contents from the answer above."
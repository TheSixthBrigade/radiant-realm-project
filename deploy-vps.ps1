$commands = @"
cd /var/www/react-app
sudo git fetch origin
sudo git reset --hard origin/main
cd database
sudo docker stop database_dashboard_1
sudo docker rm database_dashboard_1
sudo docker-compose build --no-cache dashboard
sudo docker-compose up -d dashboard
sudo docker exec database_postgres_1 psql -U postgres -d postgres -c 'SELECT * FROM blog_post;'
"@

# Write commands to a temp file
$tempFile = [System.IO.Path]::GetTempFileName()
$commands | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "Run these commands on VPS manually:"
Write-Host $commands

param([int]$RootProcessId, [string]$RunDirectory, [string]$CacheDirectory)
$ErrorActionPreference = 'Stop'
while ($true) {
  $all = @(Get-CimInstance Win32_Process)
  if (-not ($all | Where-Object ProcessId -eq $RootProcessId)) { break }
  $ids = [System.Collections.Generic.HashSet[int]]::new()
  [void]$ids.Add($RootProcessId)
  do {
    $added = $false
    foreach ($process in $all) {
      if ($ids.Contains([int]$process.ParentProcessId) -and $ids.Add([int]$process.ProcessId)) { $added = $true }
    }
  } while ($added)
  $memory = ($all | Where-Object { $ids.Contains([int]$_.ProcessId) } | Measure-Object -Property WorkingSetSize -Sum).Sum
  $disk = (Get-ChildItem -LiteralPath $RunDirectory -File -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
  $cache = (Get-ChildItem -LiteralPath $CacheDirectory -File -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
  @{utc=[DateTime]::UtcNow.ToString('o'); workingSetBytes=[long]$memory; runDiskBytes=[long]$disk; cacheDiskBytes=[long]$cache; processCount=$ids.Count} | ConvertTo-Json -Compress
  Start-Sleep -Seconds 2
}

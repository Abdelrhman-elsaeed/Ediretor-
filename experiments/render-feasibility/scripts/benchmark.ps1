param([int]$DeadlineSeconds = 120)
$ErrorActionPreference = 'Stop'
if ($DeadlineSeconds -lt 10) { throw 'DeadlineSeconds must be at least 10' }
# Each process receives the complete snapshot. A timeout is a censored failure.
foreach ($candidate in @('A','B')) {
  foreach ($fixture in @('Q05','Q06','Q10')) {
    foreach ($cache in @('cold','warm')) {
      & node --import tsx experiments/render-feasibility/scripts/render.ts $fixture $candidate $cache $DeadlineSeconds
      Write-Host "Finished $fixture / $candidate / $cache with exit $LASTEXITCODE"
    }
  }
}

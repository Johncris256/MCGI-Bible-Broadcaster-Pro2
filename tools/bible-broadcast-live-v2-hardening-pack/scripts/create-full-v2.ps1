[CmdletBinding()]
param(
    [string]$Destination = (Join-Path $HOME 'BibleBroadcast\bible-broadcast-live-v2'),
    [string]$RepositoryUrl = 'https://github.com/Johncris256/bible-broadcast-live.git'
)

$ErrorActionPreference = 'Stop'

function Invoke-Git {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)
    & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed (exit $LASTEXITCODE): git $($Arguments -join ' ')"
    }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git is required. Install Git for Windows, then run this script again.'
}

$destinationFull = [System.IO.Path]::GetFullPath($Destination)
if (Test-Path -LiteralPath $destinationFull) {
    throw "Destination already exists. Nothing was overwritten: $destinationFull"
}

$parent = Split-Path -Parent $destinationFull
if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
}

$packRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$packRootPrefix = $packRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
$destinationPrefix = $destinationFull.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
if ($destinationFull.StartsWith($packRootPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or
    $packRoot.StartsWith($destinationPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Destination must be separate from the extracted starter-pack folder.'
}
$tempDestination = "$destinationFull.__clone_tmp"
if (Test-Path -LiteralPath $tempDestination) {
    throw "Temporary destination already exists. Remove it after checking it is not needed: $tempDestination"
}

try {
    Write-Host 'Cloning V1 into a new, separate V2 workspace...' -ForegroundColor Cyan
    Invoke-Git -Arguments @('clone', '--single-branch', '--branch', 'main', $RepositoryUrl, $tempDestination)

    Push-Location $tempDestination
    try {
        $sourceCommit = (& git rev-parse HEAD).Trim()
        if ($LASTEXITCODE -ne 0 -or -not $sourceCommit) { throw 'Could not read source commit SHA.' }
        Invoke-Git -Arguments @('switch', '-c', 'v2-hardening')
        # Rename the remote to make it obvious that it is the V1 source, not a V2 publish target.
        Invoke-Git -Arguments @('remote', 'rename', 'origin', 'v1-upstream')
    }
    finally {
        Pop-Location
    }

    $toolDestination = Join-Path $tempDestination 'tools\bible-broadcast-live-v2-hardening-pack'
    New-Item -ItemType Directory -Path $toolDestination -Force | Out-Null
    Get-ChildItem -LiteralPath $packRoot -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $toolDestination $_.Name) -Recurse -Force
    }

    # Install the optional helper-test workflow into the V2 clone only.
    $workflowDestination = Join-Path $tempDestination '.github\workflows\v2-hardening-tests.yml'
    New-Item -ItemType Directory -Path (Split-Path -Parent $workflowDestination) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $packRoot '.github\workflows\v2-hardening-tests.yml') -Destination $workflowDestination -Force

    $readmePath = Join-Path $tempDestination 'V2_START_HERE.md'
    $readmeTemplate = @'
# Bible Broadcast Live — V2 hardening workspace

This folder is a separate working copy. The original GitHub repository was not edited or pushed to.

- V1 source commit: __SOURCE_COMMIT__
- Local branch: `v2-hardening`
- V1 remote name: `v1-upstream` (renamed deliberately to reduce accidental pushes)
- Hardening toolkit: `tools/bible-broadcast-live-v2-hardening-pack`

## First checks

1. Review the original startup instructions and install dependencies using the repo's documented process.
2. Run the existing app unchanged once to record a baseline.
3. Run the toolkit tests:
   ```powershell
   cd tools/bible-broadcast-live-v2-hardening-pack
   node --test
   ```
4. Return to the repository root and run the read-only scan:
   ```powershell
   node .\tools\bible-broadcast-live-v2-hardening-pack\scripts\preflight.js .
   ```
5. Read `tools/bible-broadcast-live-v2-hardening-pack\V2_IMPLEMENTATION_PLAN.md` before integrating any helper into `server.js`.

**Important:** this bootstrap creates a complete separate clone plus the V2 hardening tools. It does not automatically modify the running server; that is intentional until the actual endpoint contracts and regression behavior are verified.
'@
    $readmeContent = $readmeTemplate.Replace('__SOURCE_COMMIT__', $sourceCommit)
    Set-Content -LiteralPath $readmePath -Value $readmeContent -Encoding UTF8

    Move-Item -LiteralPath $tempDestination -Destination $destinationFull
    Write-Host ''
    Write-Host "V2 workspace created: $destinationFull" -ForegroundColor Green
    Write-Host 'V1 was not edited, and no push was performed.' -ForegroundColor Green
    Write-Host "Source commit: $sourceCommit"
}
catch {
    if (Test-Path -LiteralPath $tempDestination) {
        Write-Warning "Clone/setup did not finish. Temporary folder left for inspection: $tempDestination"
    }
    throw
}

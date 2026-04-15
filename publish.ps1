<#
.SYNOPSIS
    Packages browser extensions for Edge Add-ons Store submission.

.DESCRIPTION
    For each extension, sets the version in manifest.json to
    <major>.<minor>.<YYMMDD>.<HHMM> and creates a .zip ready to upload
    to Microsoft Partner Center.

    The major.minor prefix is read from the current manifest version.

.PARAMETER NoBump
    Skip version update — package with the current version as-is.

.PARAMETER OutputDir
    Directory for the .zip files. Defaults to .\dist.

.EXAMPLE
    .\publish.ps1                  # set timestamp version + package all
    .\publish.ps1 -NoBump          # package without version update
#>
[CmdletBinding()]
param(
    [switch]$NoBump,
    [string]$OutputDir = (Join-Path $PSScriptRoot "dist")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$extensions = @("ms-qol-improvements", "ms-tab-lock")

# --- helpers ---

function Set-TimestampVersion {
    param([string]$ManifestPath)

    $json = Get-Content $ManifestPath -Raw | ConvertFrom-Json
    $parts = $json.version -split '\.'

    # Keep major.minor from the existing version
    $major = $parts[0]
    $minor = if ($parts.Count -ge 2) { $parts[1] } else { "0" }

    $now = Get-Date
    $datePart  = $now.ToString("yyMMdd")    # e.g. 260415
    $timePart  = $now.ToString("HHmm")      # e.g. 1420

    $newVersion = "$major.$minor.$datePart.$timePart"
    $json.version = $newVersion

    $json | ConvertTo-Json -Depth 10 | Set-Content $ManifestPath -Encoding UTF8
    return $newVersion
}

function Get-Version {
    param([string]$ManifestPath)
    $json = Get-Content $ManifestPath -Raw | ConvertFrom-Json
    return $json.version
}

function Package-Extension {
    param(
        [string]$Name,
        [string]$SourceDir,
        [string]$OutDir
    )

    $manifest = Join-Path $SourceDir "manifest.json"
    if (-not (Test-Path $manifest)) {
        Write-Error "manifest.json not found in $SourceDir"
        return
    }

    # Version update
    if ($NoBump) {
        $version = Get-Version $manifest
        Write-Host "  Version: $version (no bump)" -ForegroundColor Cyan
    } else {
        $version = Set-TimestampVersion $manifest
        Write-Host "  Version: $version (timestamp)" -ForegroundColor Green
    }

    # Create output dir
    if (-not (Test-Path $OutDir)) {
        New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
    }

    # Zip
    $zipName = "$Name-v$version.zip"
    $zipPath = Join-Path $OutDir $zipName

    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }

    Compress-Archive -Path (Join-Path $SourceDir "*") -DestinationPath $zipPath
    Write-Host "  Package: $zipPath" -ForegroundColor Green

    return $zipPath
}

# --- main ---

Write-Host ""
Write-Host "=== Packaging browser extensions ===" -ForegroundColor Yellow
Write-Host ""

$results = @()

foreach ($ext in $extensions) {
    $extDir = Join-Path $PSScriptRoot $ext

    if (-not (Test-Path $extDir)) {
        Write-Warning "Extension directory not found: $extDir — skipping"
        continue
    }

    Write-Host "[$ext]" -ForegroundColor Yellow
    $zip = Package-Extension -Name $ext -SourceDir $extDir -OutDir $OutputDir
    $results += @{ Name = $ext; Zip = $zip }
    Write-Host ""
}

Write-Host "=== Done ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Go to https://partner.microsoft.com/dashboard/microsoftedge/overview"
Write-Host "  2. Upload each .zip as a new extension (or update an existing one)"
Write-Host "  3. Commit the version bumps: git add -A && git commit -m 'Bump versions for release'"
Write-Host ""

# Wklej klucz TypeSafe (Jev) — skrypt zapisze go lokalnie (.env.local)
# i na serwerze (.env obok docker-compose.yml Baiolo). Klucz nie jest
# wyświetlany ani przekazywany w linii poleceń (na serwer idzie przez stdin SSH).
# Jeśli JEV_MODERATION nie jest ustawione, skrypt ustawia tryb "shadow".
param(
  [string]$Klucz = "",
  [string]$PlikLokalny = (Join-Path $PSScriptRoot ".env.local"),
  [string]$Serwer = "root@46.202.191.248",
  # Puste = skrypt sam szuka .env Baiolo w /opt/baiolo, /root/baiolo, /srv/baiolo.
  [string]$PlikNaSerwerze = "",
  [ValidateSet("", "off", "shadow", "on")]
  [string]$Tryb = "",
  [switch]$BezSerwera,
  [switch]$BezTestu
)

$ErrorActionPreference = "Stop"
$Nazwa = "TYPESAFE_API_KEY"
$NazwaTrybu = "JEV_MODERATION"

function Zapisz-Lokalnie([string]$plik, [string]$wartosc, [string]$tryb) {
  $linie = @()
  if (Test-Path $plik) {
    $linie = @(Get-Content -LiteralPath $plik -Encoding UTF8 | Where-Object { $_ -notmatch "^\s*$Nazwa\s*=" })
  }
  $linie += "$Nazwa=$wartosc"
  $maTryb = @($linie | Where-Object { $_ -match "^\s*$NazwaTrybu\s*=" }).Count -gt 0
  if ($tryb) {
    $linie = @($linie | Where-Object { $_ -notmatch "^\s*$NazwaTrybu\s*=" }) + "$NazwaTrybu=$tryb"
  } elseif (-not $maTryb) {
    $linie += "$NazwaTrybu=shadow"
  }
  # WriteAllText nadpisuje ten sam plik, UTF-8 bez BOM (tak czyta go Next.js i docker compose).
  [IO.File]::WriteAllText($plik, (($linie -join "`n") + "`n"), (New-Object Text.UTF8Encoding $false))
}

function Test-Jev([string]$klucz) {
  $cialo = @{
    state     = @{ title = "Cloud Hopper"; description = "Skacz po chmurkach i zbieraj monety." }
    model     = "jev-latest"
    questions = @{
      spam = @{ type = "noul"; instructions = "Is this project mainly spam or an advertisement?" }
    }
  } | ConvertTo-Json -Depth 6
  $odp = Invoke-RestMethod -Method Post -Uri "https://api.typesafe.ai/v1/systemone" `
    -Headers @{ Authorization = "Bearer $klucz" } -ContentType "application/json; charset=utf-8" `
    -Body ([Text.Encoding]::UTF8.GetBytes($cialo)) -TimeoutSec 20
  return $odp
}

Write-Host ""
Write-Host "=== Baiolo — klucz TypeSafe (Jev) ===" -ForegroundColor Cyan

if (-not $Klucz) {
  Write-Host "Wklej klucz (Ctrl+V lub prawy przycisk myszy) i naciśnij Enter."
  Write-Host "Znaki nie będą widoczne — to normalne."
  $bezpieczny = Read-Host "Klucz" -AsSecureString
  $Klucz = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($bezpieczny))
}
$Klucz = $Klucz.Trim().Trim('"').Trim("'")
if ($Klucz -match "^$Nazwa=") { $Klucz = $Klucz.Substring($Nazwa.Length + 1) }

if ($Klucz.Length -lt 8 -or $Klucz -match "\s") {
  Write-Host "To nie wygląda na klucz (za krótki albo zawiera spacje). Nic nie zapisano." -ForegroundColor Red
  exit 1
}

# 1) Test klucza — zanim cokolwiek zapiszemy
if (-not $BezTestu) {
  Write-Host "Sprawdzam klucz w TypeSafe..."
  try {
    $odp = Test-Jev $Klucz
    Write-Host "[OK] Klucz działa (model: $($odp.model))." -ForegroundColor Green
  } catch {
    $kod = $null
    if ($_.Exception.Response) { $kod = [int]$_.Exception.Response.StatusCode }
    if ($kod -eq 401 -or $kod -eq 403) {
      Write-Host "[X] TypeSafe odrzucił klucz (HTTP $kod). Nic nie zapisano." -ForegroundColor Red
      exit 1
    }
    Write-Host "[!] Nie udało się sprawdzić klucza: $($_.Exception.Message)" -ForegroundColor Yellow
    $dalej = Read-Host "Zapisać mimo to? (t/N)"
    if ($dalej -notmatch "^[TtYy]") { Write-Host "Nic nie zapisano."; exit 1 }
  }
}

# 2) Lokalnie
Zapisz-Lokalnie $PlikLokalny $Klucz $Tryb
Write-Host "[OK] Zapisano w $PlikLokalny" -ForegroundColor Green
Write-Host "     Uruchom ponownie 'npm run dev', żeby lokalny serwer zobaczył klucz." -ForegroundColor DarkGray

# 3) Serwer
if (-not $BezSerwera) {
  $zdalnie = @'
set -e
f="$1"
tryb="$2"
IFS= read -r K
# PowerShell 5.1 może dokleić BOM na początku i CRLF na końcu stdin — zdejmujemy oba.
K=$(printf '%s' "$K" | sed 's/^\xEF\xBB\xBF//; s/\r$//')
if [ -z "$f" ]; then
  for d in /opt/baiolo /root/baiolo /srv/baiolo; do
    if [ -f "$d/.env" ] && [ -f "$d/docker-compose.yml" ]; then f="$d/.env"; break; fi
  done
fi
[ -n "$f" ] && [ -f "$f" ] || { echo "Nie znaleziono .env Baiolo (podaj -PlikNaSerwerze)" >&2; exit 2; }
cp -p "$f" "$f.bak-jev"
tmp=$(mktemp)
grep -v '^TYPESAFE_API_KEY=' "$f" > "$tmp" || true
printf 'TYPESAFE_API_KEY=%s\n' "$K" >> "$tmp"
if [ -n "$tryb" ]; then
  grep -v '^JEV_MODERATION=' "$tmp" > "$tmp.2" || true
  mv "$tmp.2" "$tmp"
  printf 'JEV_MODERATION=%s\n' "$tryb" >> "$tmp"
elif ! grep -q '^JEV_MODERATION=' "$tmp"; then
  printf 'JEV_MODERATION=shadow\n' >> "$tmp"
fi
cat "$tmp" > "$f"
rm -f "$tmp"
echo "$f"
'@
  $zdalnie = $zdalnie -replace "`r", ""
  # Skrypt w base64 (bez cudzysłowów w argumencie ssh), klucz przez stdin.
  $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($zdalnie))
  $argPlik = if ($PlikNaSerwerze) { $PlikNaSerwerze } else { "''" }
  $argTryb = if ($Tryb) { $Tryb } else { "''" }
  # Bez BOM: PowerShell 5.1 może dokleić go na początek tekstu wysyłanego potokiem
  # do programu, a klucz z BOM-em wywraca nagłówek Authorization (U+FEFF).
  $OutputEncoding = New-Object Text.UTF8Encoding $false
  try {
    $wynik = $Klucz | ssh -o ConnectTimeout=10 $Serwer "echo $b64 | base64 -d > /tmp/ustaw-jev-baiolo.sh && sh /tmp/ustaw-jev-baiolo.sh $argPlik $argTryb; k=`$?; rm -f /tmp/ustaw-jev-baiolo.sh; exit `$k"
    if ($LASTEXITCODE -ne 0) { throw "ssh zwrócił kod $LASTEXITCODE" }
    $plikZdalny = ("$wynik").Trim()
    Write-Host "[OK] Zapisano na serwerze w $plikZdalny (kopia: .env.bak-jev)" -ForegroundColor Green

    $restart = Read-Host "Przeładować teraz Baiolo na serwerze, żeby użył klucza? (t/N)"
    if ($restart -match "^[TtYy]") {
      $katalog = $plikZdalny -replace "/\.env$", ""
      ssh -o ConnectTimeout=10 $Serwer "cd '$katalog' && docker compose up -d"
      if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Baiolo przeładowane." -ForegroundColor Green
      } else {
        Write-Host "[!] Przeładowanie nie powiodło się — zrób 'docker compose up -d' w $katalog." -ForegroundColor Yellow
      }
    } else {
      Write-Host "     Zadziała po najbliższym 'docker compose up -d' na serwerze." -ForegroundColor DarkGray
    }
  } catch {
    Write-Host "[!] Nie udało się zapisać na serwerze: $_" -ForegroundColor Yellow
    Write-Host "    Lokalnie klucz jest zapisany. Na serwerze dopisz ręcznie linię $Nazwa=... do .env Baiolo." -ForegroundColor Yellow
  }
}

$Klucz = $null

Write-Host ""
Write-Host "Gotowe." -ForegroundColor Cyan

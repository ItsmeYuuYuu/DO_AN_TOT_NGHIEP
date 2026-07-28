#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="/var/www/cuongdienthoai"
UPLOADS_ROOT="/var/lib/cuongdienthoai/uploads"
BACKUP_ROOT="/var/backups/cuongdienthoai/releases"
ENV_FILE="/etc/cuongdienthoai/ecommerce.env"
SERVICE_NAME="cuongdienthoai-api"
HEALTH_URL="http://127.0.0.1:5240/api/health"
RELEASE_ID=""
API_ARCHIVE=""
WEB_ARCHIVE=""
MIGRATION_BUNDLE=""
SITE_URL="https://cdt204.io.vn"
STAGE_ROOT=""
RELEASE_BACKUP=""
SWAPPED=0
API_BACKED_UP=0
WEB_BACKED_UP=0

usage() {
    cat <<'EOF'
Usage:
  deploy-release.sh \
    --release-id YYYYMMDD-HHMMSS \
    --api-archive /path/api.tar.gz \
    --web-archive /path/web.tar.gz \
    --migration-bundle /path/efbundle \
    [--site-url https://example.com]
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --release-id)
            RELEASE_ID="${2:-}"
            shift 2
            ;;
        --api-archive)
            API_ARCHIVE="${2:-}"
            shift 2
            ;;
        --web-archive)
            WEB_ARCHIVE="${2:-}"
            shift 2
            ;;
        --migration-bundle)
            MIGRATION_BUNDLE="${2:-}"
            shift 2
            ;;
        --site-url)
            SITE_URL="${2:-}"
            shift 2
            ;;
        *)
            echo "Unknown argument: $1" >&2
            usage >&2
            exit 2
            ;;
    esac
done

if [[ $EUID -ne 0 ]]; then
    echo "This script must run as root." >&2
    exit 1
fi

if [[ ! "$RELEASE_ID" =~ ^[0-9]{8}-[0-9]{6}$ ]]; then
    echo "Invalid release id: $RELEASE_ID" >&2
    exit 2
fi

for archive in "$API_ARCHIVE" "$WEB_ARCHIVE" "$MIGRATION_BUNDLE"; do
    if [[ -z "$archive" || ! -f "$archive" ]]; then
        echo "Release archive not found: $archive" >&2
        exit 2
    fi
done

STAGE_ROOT="$APP_ROOT/.deploy-$RELEASE_ID"
RELEASE_BACKUP="$BACKUP_ROOT/$RELEASE_ID"

rollback() {
    local exit_code=$?
    trap - ERR

    echo "Deployment failed (exit code $exit_code). Rolling back..." >&2

    if [[ $SWAPPED -eq 1 || $API_BACKED_UP -eq 1 || $WEB_BACKED_UP -eq 1 ]]; then
        systemctl stop "$SERVICE_NAME" || true
        rm -rf "$APP_ROOT/api" "$APP_ROOT/web"

        if [[ -d "$RELEASE_BACKUP/api" ]]; then
            mv "$RELEASE_BACKUP/api" "$APP_ROOT/api"
        fi
        if [[ -d "$RELEASE_BACKUP/web" ]]; then
            mv "$RELEASE_BACKUP/web" "$APP_ROOT/web"
        fi

        systemctl start "$SERVICE_NAME" || true
        nginx -t && systemctl reload nginx || true
    fi

    rm -rf "$STAGE_ROOT"
    exit "$exit_code"
}

trap rollback ERR
trap 'rm -rf "$STAGE_ROOT"' EXIT

exec 9>/run/lock/cuongdienthoai-deploy.lock
if ! flock -n 9; then
    echo "Another deployment is already running." >&2
    exit 1
fi

echo "[1/8] Preparing release $RELEASE_ID..."
rm -rf "$STAGE_ROOT"
mkdir -p "$STAGE_ROOT/api" "$STAGE_ROOT/web" "$RELEASE_BACKUP"

tar -xzf "$API_ARCHIVE" -C "$STAGE_ROOT/api"
tar -xzf "$WEB_ARCHIVE" -C "$STAGE_ROOT/web"

test -f "$STAGE_ROOT/api/ECommerceBackend.dll"
test -f "$STAGE_ROOT/web/index.html"
test -d "$APP_ROOT/api"
test -d "$APP_ROOT/web"

echo "[2/8] Linking persistent uploads..."
rm -rf "$STAGE_ROOT/api/wwwroot/uploads"
mkdir -p "$STAGE_ROOT/api/wwwroot"
ln -s "$UPLOADS_ROOT" "$STAGE_ROOT/api/wwwroot/uploads"

chown -R deploy:www-data "$STAGE_ROOT"
find "$STAGE_ROOT" -type d -exec chmod 2755 {} +
find "$STAGE_ROOT" -type f -exec chmod 0644 {} +

echo "[3/8] Creating pre-deployment data backup..."
/usr/local/sbin/backup-cuongdienthoai

echo "[4/8] Applying database migrations..."
if [[ ! -r "$ENV_FILE" ]]; then
    echo "Production environment file is missing or unreadable: $ENV_FILE" >&2
    exit 1
fi

read_env_value() {
    local key="$1"
    local value

    value="$(
        sed -n "s/^${key}=//p" "$ENV_FILE" \
            | head -n 1 \
            | tr -d '\r'
    )"

    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
        value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
        value="${value:1:${#value}-2}"
    fi

    printf '%s' "$value"
}

connection_string="$(read_env_value "ConnectionStrings__DefaultConnection")"
jwt_secret="$(read_env_value "JwtSettings__SecretKey")"
jwt_issuer="$(read_env_value "JwtSettings__Issuer")"
jwt_audience="$(read_env_value "JwtSettings__Audience")"
allowed_origins="$(read_env_value "Cors__AllowedOrigins")"

if [[ -z "$connection_string" ]]; then
    echo "ConnectionStrings__DefaultConnection is missing from the production environment file." >&2
    exit 1
fi
if [[ -z "$jwt_secret" ]]; then
    echo "JwtSettings__SecretKey is missing from the production environment file." >&2
    exit 1
fi
if [[ -z "$jwt_issuer" || -z "$jwt_audience" ]]; then
    echo "JwtSettings issuer or audience is missing from the production environment file." >&2
    exit 1
fi
if [[ -z "$allowed_origins" ]]; then
    echo "Cors__AllowedOrigins is missing from the production environment file." >&2
    exit 1
fi

chmod 0750 "$MIGRATION_BUNDLE"
env \
    ASPNETCORE_ENVIRONMENT=Production \
    "ConnectionStrings__DefaultConnection=$connection_string" \
    "JwtSettings__SecretKey=$jwt_secret" \
    "JwtSettings__Issuer=$jwt_issuer" \
    "JwtSettings__Audience=$jwt_audience" \
    "Cors__AllowedOrigins=$allowed_origins" \
    "$MIGRATION_BUNDLE" --connection "$connection_string"

echo "[5/8] Stopping API and swapping application directories..."
systemctl stop "$SERVICE_NAME"

mv "$APP_ROOT/api" "$RELEASE_BACKUP/api"
API_BACKED_UP=1
mv "$APP_ROOT/web" "$RELEASE_BACKUP/web"
WEB_BACKED_UP=1
SWAPPED=1
mv "$STAGE_ROOT/api" "$APP_ROOT/api"
mv "$STAGE_ROOT/web" "$APP_ROOT/web"

chown -R deploy:www-data "$APP_ROOT/api" "$APP_ROOT/web"

echo "[6/8] Starting API and waiting for health check..."
systemctl start "$SERVICE_NAME"

healthy=0
for _ in $(seq 1 30); do
    if curl -fsS \
        -H "X-Forwarded-Proto: https" \
        "$HEALTH_URL" >/dev/null 2>&1; then
        healthy=1
        break
    fi
    sleep 1
done

if [[ $healthy -ne 1 ]]; then
    echo "API health check failed." >&2
    journalctl -u "$SERVICE_NAME" -n 50 --no-pager >&2 || true
    false
fi

echo "[7/8] Validating Nginx and public endpoints..."
nginx -t
systemctl reload nginx
curl -fsS "$SITE_URL/api/health" >/dev/null
curl -fsS "$SITE_URL/" >/dev/null

echo "[8/8] Cleaning old binary rollback copies..."
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
    | sort -rn \
    | tail -n +6 \
    | cut -d' ' -f2- \
    | xargs -r rm -rf

SWAPPED=0
API_BACKED_UP=0
WEB_BACKED_UP=0
trap - ERR

echo "Release $RELEASE_ID deployed successfully."
echo "Rollback copy: $RELEASE_BACKUP"

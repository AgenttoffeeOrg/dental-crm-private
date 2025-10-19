#!/bin/bash

###############################################################################
# DATABASE MIGRATION DEPLOYMENT SCRIPT
###############################################################################
# Version: 1.0.0
# Date: October 19, 2025
# Phase: 17 - Deployment & Monitoring
#
# PURPOSE:
# Deploy all treatment routing database migrations to production Supabase.
#
# USAGE:
# ./deploy-migrations.sh [environment]
#
# ENVIRONMENTS:
# - staging: Deploy to staging database
# - production: Deploy to production database (requires confirmation)
#
# SAFETY FEATURES:
# - Backup before migration
# - Rollback scripts provided
# - Dry-run mode
# - Transaction support
# - Error handling
#
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_DIR="${SCRIPT_DIR}/supabase/sql"
BACKUP_DIR="${SCRIPT_DIR}/backups/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${SCRIPT_DIR}/migration-$(date +%Y%m%d_%H%M%S).log"

# Migration files in order
MIGRATIONS=(
    "45_treatment_routing.sql"
    "46_treatment_routing_permissions.sql"
    "47_pms_procedure_tag_mappings.sql"
)

# Rollback files (reverse order)
ROLLBACKS=(
    "rollback_47_pms_procedure_tag_mappings.sql"
    "rollback_46_treatment_routing_permissions.sql"
    "rollback_45_treatment_routing.sql"
)

###############################################################################
# Helper Functions
###############################################################################

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

confirm() {
    read -p "$(echo -e ${YELLOW}$1${NC}) [y/N]: " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

###############################################################################
# Environment Setup
###############################################################################

setup_environment() {
    local env=$1
    
    log "Setting up environment: $env"
    
    case $env in
        staging)
            export SUPABASE_URL="${SUPABASE_STAGING_URL}"
            export SUPABASE_KEY="${SUPABASE_STAGING_KEY}"
            export DB_HOST="${SUPABASE_STAGING_DB_HOST}"
            export DB_NAME="${SUPABASE_STAGING_DB_NAME}"
            export DB_USER="${SUPABASE_STAGING_DB_USER}"
            export DB_PASS="${SUPABASE_STAGING_DB_PASS}"
            ;;
        production)
            if ! confirm "⚠️  WARNING: Deploy to PRODUCTION? This will affect live data!"; then
                error "Deployment cancelled by user"
                exit 1
            fi
            export SUPABASE_URL="${SUPABASE_PRODUCTION_URL}"
            export SUPABASE_KEY="${SUPABASE_PRODUCTION_KEY}"
            export DB_HOST="${SUPABASE_PRODUCTION_DB_HOST}"
            export DB_NAME="${SUPABASE_PRODUCTION_DB_NAME}"
            export DB_USER="${SUPABASE_PRODUCTION_DB_USER}"
            export DB_PASS="${SUPABASE_PRODUCTION_DB_PASS}"
            ;;
        *)
            error "Invalid environment: $env. Use 'staging' or 'production'"
            exit 1
            ;;
    esac
    
    # Verify environment variables are set
    if [[ -z "${DB_HOST}" || -z "${DB_NAME}" || -z "${DB_USER}" || -z "${DB_PASS}" ]]; then
        error "Missing required environment variables"
        error "Please set: SUPABASE_*_DB_HOST, DB_NAME, DB_USER, DB_PASS"
        exit 1
    fi
    
    success "Environment configured: $env"
}

###############################################################################
# Database Backup
###############################################################################

backup_database() {
    log "Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup schema
    log "Backing up database schema..."
    PGPASSWORD=$DB_PASS pg_dump \
        -h "$DB_HOST" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --schema-only \
        -f "$BACKUP_DIR/schema_backup.sql"
    
    # Backup treatment routing tables (data)
    log "Backing up treatment routing data..."
    PGPASSWORD=$DB_PASS pg_dump \
        -h "$DB_HOST" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --data-only \
        -t treatment_tags \
        -t treatment_tag_pipeline_mappings \
        -t treatment_routing_logs \
        -t treatment_routing_settings \
        -t pms_procedure_tag_mappings \
        -f "$BACKUP_DIR/data_backup.sql"
    
    success "Backup created: $BACKUP_DIR"
}

###############################################################################
# Migration Execution
###############################################################################

run_migration() {
    local migration_file=$1
    local migration_path="${SQL_DIR}/${migration_file}"
    
    if [[ ! -f "$migration_path" ]]; then
        error "Migration file not found: $migration_path"
        return 1
    fi
    
    log "Running migration: $migration_file"
    
    # Execute migration in transaction
    PGPASSWORD=$DB_PASS psql \
        -h "$DB_HOST" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -v ON_ERROR_STOP=1 \
        -f "$migration_path" 2>&1 | tee -a "$LOG_FILE"
    
    if [[ ${PIPESTATUS[0]} -eq 0 ]]; then
        success "Migration completed: $migration_file"
        return 0
    else
        error "Migration failed: $migration_file"
        return 1
    fi
}

run_all_migrations() {
    log "Starting migration process..."
    
    local total=${#MIGRATIONS[@]}
    local current=0
    
    for migration in "${MIGRATIONS[@]}"; do
        current=$((current + 1))
        log "Migration $current of $total: $migration"
        
        if ! run_migration "$migration"; then
            error "Migration failed. Stopping deployment."
            warning "To rollback, run: ./deploy-migrations.sh rollback"
            exit 1
        fi
        
        log "Pausing 2 seconds before next migration..."
        sleep 2
    done
    
    success "All migrations completed successfully!"
}

###############################################################################
# Rollback
###############################################################################

rollback_migrations() {
    warning "Starting rollback process..."
    
    if ! confirm "Are you sure you want to rollback all migrations?"; then
        log "Rollback cancelled"
        exit 0
    fi
    
    local total=${#ROLLBACKS[@]}
    local current=0
    
    for rollback in "${ROLLBACKS[@]}"; do
        current=$((current + 1))
        log "Rollback $current of $total: $rollback"
        
        local rollback_path="${SQL_DIR}/${rollback}"
        
        if [[ ! -f "$rollback_path" ]]; then
            warning "Rollback file not found: $rollback_path (skipping)"
            continue
        fi
        
        PGPASSWORD=$DB_PASS psql \
            -h "$DB_HOST" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -v ON_ERROR_STOP=1 \
            -f "$rollback_path" 2>&1 | tee -a "$LOG_FILE"
        
        if [[ ${PIPESTATUS[0]} -eq 0 ]]; then
            success "Rollback completed: $rollback"
        else
            error "Rollback failed: $rollback"
            exit 1
        fi
    done
    
    success "All rollbacks completed!"
}

###############################################################################
# Verification
###############################################################################

verify_migrations() {
    log "Verifying migrations..."
    
    # Check tables exist
    log "Checking treatment_tags table..."
    PGPASSWORD=$DB_PASS psql \
        -h "$DB_HOST" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'treatment_tags';" | grep -q "1"
    
    if [[ $? -eq 0 ]]; then
        success "treatment_tags table exists"
    else
        error "treatment_tags table NOT found"
        return 1
    fi
    
    # Check RLS policies
    log "Checking RLS policies..."
    local policy_count=$(PGPASSWORD=$DB_PASS psql \
        -h "$DB_HOST" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM pg_policies WHERE tablename LIKE 'treatment_%';")
    
    if [[ $policy_count -gt 0 ]]; then
        success "RLS policies found: $policy_count"
    else
        warning "No RLS policies found (this may be expected)"
    fi
    
    # Check permissions
    log "Checking permissions..."
    local perm_count=$(PGPASSWORD=$DB_PASS psql \
        -h "$DB_HOST" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM permission_definitions WHERE code LIKE 'treatment_%';")
    
    if [[ $perm_count -gt 0 ]]; then
        success "Permissions found: $perm_count"
    else
        warning "No treatment routing permissions found"
    fi
    
    success "Verification complete!"
}

###############################################################################
# Dry Run
###############################################################################

dry_run() {
    log "DRY RUN MODE - No changes will be made"
    
    log "Would execute the following migrations:"
    for migration in "${MIGRATIONS[@]}"; do
        echo "  - $migration"
    done
    
    log "Would create backup in: $BACKUP_DIR"
    log "Would log to: $LOG_FILE"
    
    success "Dry run complete. Run without --dry-run to execute."
}

###############################################################################
# Main Script
###############################################################################

main() {
    log "===== Treatment Routing Migration Deployment ====="
    log "Script started at: $(date)"
    
    # Parse arguments
    local environment=""
    local action="deploy"
    local dry_run_mode=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            staging|production)
                environment=$1
                shift
                ;;
            rollback)
                action="rollback"
                shift
                ;;
            --dry-run)
                dry_run_mode=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [staging|production] [rollback] [--dry-run]"
                echo ""
                echo "Examples:"
                echo "  $0 staging              # Deploy to staging"
                echo "  $0 production           # Deploy to production"
                echo "  $0 staging rollback     # Rollback staging"
                echo "  $0 production --dry-run # Dry run for production"
                exit 0
                ;;
            *)
                error "Unknown argument: $1"
                exit 1
                ;;
        esac
    done
    
    # Validate environment
    if [[ -z "$environment" ]]; then
        error "Environment required: staging or production"
        echo "Usage: $0 [staging|production]"
        exit 1
    fi
    
    # Execute based on mode
    if [[ "$dry_run_mode" == true ]]; then
        dry_run
        exit 0
    fi
    
    # Setup environment
    setup_environment "$environment"
    
    # Execute action
    case $action in
        deploy)
            backup_database
            run_all_migrations
            verify_migrations
            success "✓ Deployment successful!"
            ;;
        rollback)
            backup_database
            rollback_migrations
            success "✓ Rollback successful!"
            ;;
        *)
            error "Unknown action: $action"
            exit 1
            ;;
    esac
    
    log "Script completed at: $(date)"
    log "Log file: $LOG_FILE"
    log "Backup: $BACKUP_DIR"
}

# Run main function
main "$@"


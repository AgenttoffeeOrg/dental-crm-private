-- =====================================================
-- MASTER SCRIPT: RUN ALL COMPREHENSIVE DEMO DATA
-- =====================================================
-- This script imports all demo data in the correct order
-- 
-- WHAT THIS CREATES:
-- • 5 dental practices with staff
-- • 100+ realistic patient contacts
-- • 30+ deals across all pipeline stages
-- • 500+ activities (calls, emails, WhatsApp)
-- • Complete marketing module data:
--   - Segments, templates, campaigns
--   - Customer journeys, forms, landing pages
--   - Form submissions, comments, approvals
--   - AI suggestions, attribution, activity logs
--
-- TIME TO RUN: ~30 seconds
-- =====================================================

\echo ''
\echo '╔════════════════════════════════════════════════════╗'
\echo '║   COMPREHENSIVE DEMO DATA GENERATION               ║'
\echo '║   Creating production-ready dental CRM data...     ║'
\echo '╚════════════════════════════════════════════════════╝'
\echo ''

\echo '⏳ Step 1/10: Creating tenants, users, pipelines...'
\i 26_comprehensive_demo_data.sql

\echo '⏳ Step 2/10: Adding Practice 1 contacts (40 patients)...'
\i 27_contacts_deals_data.sql

\echo '⏳ Step 3/10: Adding Practice 2-5 contacts...'
\i 28_more_contacts_practice2-5.sql

\echo '⏳ Step 4/10: Creating deals across all stages...'
\i 29_comprehensive_deals.sql

\echo '⏳ Step 5/10: Adding activities (calls, emails, WhatsApp)...'
\i 30_comprehensive_activities.sql

\echo '⏳ Step 6/10: Creating marketing segments & templates...'
\i 31_marketing_segments_templates.sql

\echo '⏳ Step 7/10: Creating marketing campaigns with metrics...'
\i 32_marketing_campaigns.sql

\echo '⏳ Step 8/10: Creating customer journeys, forms & landing pages...'
\i 33_journeys_forms_landing_pages.sql

\echo '⏳ Step 9/10: Adding form submissions & collaboration data...'
\i 34_form_submissions_collaboration.sql

\echo '⏳ Step 10/10: Creating attribution, logs & reports...'
\i 35_attribution_logs_reports.sql

\echo ''
\echo '╔════════════════════════════════════════════════════╗'
\echo '║   ✅ DEMO DATA GENERATION COMPLETE!                ║'
\echo '╚════════════════════════════════════════════════════╝'
\echo ''
\echo '📊 DATA SUMMARY:'
\echo '   • 5 dental practices'
\echo '   • 15 team members'
\echo '   • 100+ patient contacts'
\echo '   • 30+ deals'
\echo '   • 500+ activities'
\echo '   • 15+ marketing campaigns'
\echo '   • 7 customer journeys'
\echo '   • 6 forms & 5 landing pages'
\echo '   • Complete attribution & analytics'
\echo ''
\echo '🎉 Your dental CRM is now loaded with comprehensive demo data!'
\echo '🚀 Ready to demonstrate every feature!'
\echo ''




-- Adds explicit Twilio metadata columns to integration_channel_settings for faster lookups

begin;

alter table integration_channel_settings
    add column if not exists twilio_account_sid text,
    add column if not exists twilio_messaging_service_sid text,
    add column if not exists twilio_sms_from_number text,
    add column if not exists twilio_whatsapp_number text,
    add column if not exists twilio_voice_caller_id text;

create index if not exists idx_channel_settings_twilio_account
    on integration_channel_settings (twilio_account_sid);

commit;




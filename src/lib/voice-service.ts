import twilio, { Twilio } from 'twilio';

export interface VoiceCallOptions {
  to: string;
  from: string;
  url: string;
  statusCallback?: string;
  statusCallbackEvent?: ('initiated' | 'ringing' | 'answered' | 'completed')[];
  record?: boolean;
  timeoutSeconds?: number;
  machineDetection?: 'Enable' | 'DetectMessageEnd';
}

interface VoiceInitConfig {
  accountSid: string;
  authToken: string;
  defaultFrom: string;
}

export interface VoiceCallResult {
  success: boolean;
  callSid?: string;
  status?: string;
  providerResponse?: Record<string, any>;
  error?: string;
}

export class VoiceService {
  private client: Twilio | null = null;
  private accountSid: string | null = null;
  private defaultFrom: string | null = null;

  async initialize(config: VoiceInitConfig) {
    if (
      this.client &&
      this.accountSid === config.accountSid &&
      this.defaultFrom === config.defaultFrom
    ) {
      return;
    }

    this.client = twilio(config.accountSid, config.authToken);
    this.accountSid = config.accountSid;
    this.defaultFrom = config.defaultFrom;
  }

  async initiateCall(options: VoiceCallOptions): Promise<VoiceCallResult> {
    if (!this.client) {
      throw new Error('Voice service not initialized. Configure in Settings → Voice');
    }

    const {
      to,
      from,
      url,
      statusCallback,
      statusCallbackEvent = ['initiated', 'ringing', 'answered', 'completed'],
      record = true,
      timeoutSeconds = 45,
      machineDetection = 'Enable',
    } = options;

    try {
      const response = await this.client.calls.create({
        to,
        from: from || this.defaultFrom || undefined,
        url,
        statusCallback,
        statusCallbackMethod: 'POST',
        statusCallbackEvent,
        record,
        timeout: timeoutSeconds,
        machineDetection,
        trim: 'do-not-trim',
      });

      return {
        success: true,
        callSid: response.sid,
        status: response.status,
        providerResponse: {
          sid: response.sid,
          status: response.status,
          accountSid: response.accountSid,
          to: response.to,
          from: response.from,
          direction: response.direction,
        },
      };
    } catch (error: any) {
      console.error('Voice call error:', error);
      return {
        success: false,
        error: error?.message || 'Failed to initiate voice call',
      };
    }
  }
}

export const voiceService = new VoiceService();

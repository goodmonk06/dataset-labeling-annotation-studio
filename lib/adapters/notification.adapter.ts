/**
 * Notification adapter interface
 * Abstracts notification delivery (email, webhook, Slack, etc.)
 */

export interface NotificationRecipient {
  id: string
  name?: string
  email?: string
  phone?: string
}

export interface NotificationPayload {
  subject?: string
  body: string
  html?: string
  data?: Record<string, any>
}

export interface NotificationOptions {
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  template?: string
  variables?: Record<string, any>
}

export interface NotificationResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface NotificationAdapter {
  /**
   * Send a notification to a recipient
   */
  send(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
    options?: NotificationOptions
  ): Promise<NotificationResult>

  /**
   * Send a notification to multiple recipients
   */
  sendBulk(
    recipients: NotificationRecipient[],
    payload: NotificationPayload,
    options?: NotificationOptions
  ): Promise<NotificationResult[]>
}

/**
 * Console notification adapter (for development/testing)
 */
export class ConsoleNotificationAdapter implements NotificationAdapter {
  async send(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
    options?: NotificationOptions
  ): Promise<NotificationResult> {
    console.log('[Notification]', {
      to: recipient.email || recipient.id,
      subject: payload.subject,
      body: payload.body,
      priority: options?.priority || 'normal',
    })

    return {
      success: true,
      messageId: `console-${Date.now()}`,
    }
  }

  async sendBulk(
    recipients: NotificationRecipient[],
    payload: NotificationPayload,
    options?: NotificationOptions
  ): Promise<NotificationResult[]> {
    return Promise.all(
      recipients.map((recipient) => this.send(recipient, payload, options))
    )
  }
}

/**
 * Webhook notification adapter
 */
export class WebhookNotificationAdapter implements NotificationAdapter {
  constructor(private webhookUrl: string) {}

  async send(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
    options?: NotificationOptions
  ): Promise<NotificationResult> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient,
          ...payload,
          options,
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.statusText}`)
      }

      return {
        success: true,
        messageId: response.headers.get('X-Message-ID') || undefined,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async sendBulk(
    recipients: NotificationRecipient[],
    payload: NotificationPayload,
    options?: NotificationOptions
  ): Promise<NotificationResult[]> {
    return Promise.all(
      recipients.map((recipient) => this.send(recipient, payload, options))
    )
  }
}

/**
 * Email notification adapter (stub)
 */
export class EmailNotificationAdapter implements NotificationAdapter {
  constructor(
    private config: {
      host: string
      port: number
      user: string
      pass: string
      from: string
    }
  ) {}

  async send(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
    options?: NotificationOptions
  ): Promise<NotificationResult> {
    // TODO: Implement email sending using nodemailer or similar
    console.log('[Email] Would send to:', recipient.email, payload.subject)
    return {
      success: true,
      messageId: `email-stub-${Date.now()}`,
    }
  }

  async sendBulk(
    recipients: NotificationRecipient[],
    payload: NotificationPayload,
    options?: NotificationOptions
  ): Promise<NotificationResult[]> {
    return Promise.all(
      recipients.map((recipient) => this.send(recipient, payload, options))
    )
  }
}

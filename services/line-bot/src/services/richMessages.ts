import type { FlexBubble, FlexMessage, QuickReply, Message } from '@line/bot-sdk';

/**
 * Service for creating rich LINE messages (Flex Messages, Quick Replies)
 */
export class RichMessageService {
  /**
   * Create facility status card
   */
  createFacilityCard(facility: {
    id: string;
    name: string;
    location: string;
    healthStatus: string;
    healthScore: number;
    totalCapacity?: number;
    averageSoC?: number;
    activeAlerts?: number;
  }): FlexMessage {
    const statusColor = this.getStatusColor(facility.healthStatus);
    const statusEmoji = this.getStatusEmoji(facility.healthStatus);

    const bubble: FlexBubble = {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: facility.name,
            weight: 'bold',
            size: 'xl',
            color: '#1DB446',
          },
          {
            type: 'text',
            text: facility.location,
            size: 'sm',
            color: '#999999',
            margin: 'md',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: `${statusEmoji} ${facility.healthStatus.toUpperCase()}`,
                size: 'md',
                weight: 'bold',
                color: statusColor,
                flex: 0,
              },
              {
                type: 'text',
                text: `${facility.healthScore}%`,
                size: 'md',
                align: 'end',
                color: statusColor,
              },
            ],
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              ...(facility.totalCapacity
                ? [
                    {
                      type: 'box' as const,
                      layout: 'horizontal' as const,
                      contents: [
                        {
                          type: 'text' as const,
                          text: 'Total Capacity',
                          size: 'sm' as const,
                          color: '#555555',
                          flex: 0,
                        },
                        {
                          type: 'text' as const,
                          text: `${facility.totalCapacity.toFixed(2)} kWh`,
                          size: 'sm' as const,
                          color: '#111111',
                          align: 'end' as const,
                        },
                      ],
                    },
                  ]
                : []),
              ...(facility.averageSoC !== undefined
                ? [
                    {
                      type: 'box' as const,
                      layout: 'horizontal' as const,
                      contents: [
                        {
                          type: 'text' as const,
                          text: 'Avg SoC',
                          size: 'sm' as const,
                          color: '#555555',
                          flex: 0,
                        },
                        {
                          type: 'text' as const,
                          text: `${facility.averageSoC.toFixed(1)}%`,
                          size: 'sm' as const,
                          color: '#111111',
                          align: 'end' as const,
                        },
                      ],
                    },
                  ]
                : []),
              ...(facility.activeAlerts !== undefined
                ? [
                    {
                      type: 'box' as const,
                      layout: 'horizontal' as const,
                      contents: [
                        {
                          type: 'text' as const,
                          text: 'Active Alerts',
                          size: 'sm' as const,
                          color: '#555555',
                          flex: 0,
                        },
                        {
                          type: 'text' as const,
                          text: facility.activeAlerts.toString(),
                          size: 'sm' as const,
                          color: facility.activeAlerts > 0 ? '#FF0000' : '#111111',
                          align: 'end' as const,
                        },
                      ],
                    },
                  ]
                : []),
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'message',
              label: 'View Details',
              text: `Show details for ${facility.name}`,
            },
          },
        ],
      },
    };

    return {
      type: 'flex',
      altText: `${facility.name} - ${facility.healthStatus}`,
      contents: bubble,
    };
  }

  /**
   * Create alert card
   */
  createAlertCard(alert: {
    id: string;
    type: string;
    severity: 'critical' | 'warning' | 'info';
    status: string;
    message: string;
    createdAt: string;
    batterySystemId?: string;
  }): FlexMessage {
    const severityColor = this.getSeverityColor(alert.severity);
    const severityEmoji = this.getSeverityEmoji(alert.severity);

    const bubble: FlexBubble = {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `${severityEmoji} ${alert.severity.toUpperCase()} ALERT`,
            weight: 'bold',
            size: 'lg',
            color: severityColor,
          },
        ],
        backgroundColor: this.getSeverityBackgroundColor(alert.severity),
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: alert.type,
            weight: 'bold',
            size: 'md',
            margin: 'md',
          },
          {
            type: 'text',
            text: alert.message,
            size: 'sm',
            wrap: true,
            color: '#666666',
            margin: 'md',
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: 'Status',
                    size: 'sm',
                    color: '#555555',
                    flex: 0,
                  },
                  {
                    type: 'text',
                    text: alert.status.toUpperCase(),
                    size: 'sm',
                    color: '#111111',
                    align: 'end',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: 'Time',
                    size: 'sm',
                    color: '#555555',
                    flex: 0,
                  },
                  {
                    type: 'text',
                    text: new Date(alert.createdAt).toLocaleString(),
                    size: 'sm',
                    color: '#111111',
                    align: 'end',
                  },
                ],
              },
              ...(alert.batterySystemId
                ? [
                    {
                      type: 'box' as const,
                      layout: 'horizontal' as const,
                      contents: [
                        {
                          type: 'text' as const,
                          text: 'Battery',
                          size: 'sm' as const,
                          color: '#555555',
                          flex: 0,
                        },
                        {
                          type: 'text' as const,
                          text: alert.batterySystemId,
                          size: 'sm' as const,
                          color: '#111111',
                          align: 'end' as const,
                        },
                      ],
                    },
                  ]
                : []),
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents:
          alert.status === 'active'
            ? [
                {
                  type: 'button',
                  style: 'primary',
                  height: 'sm',
                  action: {
                    type: 'message',
                    label: 'Acknowledge',
                    text: `Acknowledge alert ${alert.id}`,
                  },
                },
              ]
            : [],
      },
    };

    return {
      type: 'flex',
      altText: `${alert.severity} Alert: ${alert.type}`,
      contents: bubble,
    };
  }

  /**
   * Create alert summary card
   */
  createAlertSummaryCard(summary: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  }): FlexMessage {
    const bubble: FlexBubble = {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🔔 Alert Summary',
            weight: 'bold',
            size: 'xl',
            color: '#1DB446',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '🔴 Critical',
                    size: 'md',
                    color: '#555555',
                    flex: 0,
                  },
                  {
                    type: 'text',
                    text: summary.critical.toString(),
                    size: 'md',
                    color: summary.critical > 0 ? '#FF0000' : '#111111',
                    align: 'end',
                    weight: summary.critical > 0 ? 'bold' : 'regular',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '🟡 Warning',
                    size: 'md',
                    color: '#555555',
                    flex: 0,
                  },
                  {
                    type: 'text',
                    text: summary.warning.toString(),
                    size: 'md',
                    color: summary.warning > 0 ? '#FFA500' : '#111111',
                    align: 'end',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '🔵 Info',
                    size: 'md',
                    color: '#555555',
                    flex: 0,
                  },
                  {
                    type: 'text',
                    text: summary.info.toString(),
                    size: 'md',
                    color: '#111111',
                    align: 'end',
                  },
                ],
              },
              {
                type: 'separator',
                margin: 'md',
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: 'Total Active',
                    size: 'lg',
                    color: '#111111',
                    flex: 0,
                    weight: 'bold',
                  },
                  {
                    type: 'text',
                    text: summary.total.toString(),
                    size: 'lg',
                    color: '#111111',
                    align: 'end',
                    weight: 'bold',
                  },
                ],
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'message',
              label: 'View All Alerts',
              text: 'Show all alerts',
            },
          },
        ],
      },
    };

    return {
      type: 'flex',
      altText: `Alert Summary: ${summary.total} active alerts`,
      contents: bubble,
    };
  }

  /**
   * Create quick reply for common actions
   */
  createQuickReply(type: 'main' | 'facilities' | 'alerts' | 'help'): QuickReply {
    const items: QuickReply['items'] = [];

    switch (type) {
      case 'main':
        items.push(
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🏢 Facilities',
              text: 'Show all facilities',
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🚨 Alerts',
              text: 'Show alert summary',
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📊 Status',
              text: 'Show system status',
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '❓ Help',
              text: 'Help',
            },
          }
        );
        break;

      case 'facilities':
        items.push(
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🔍 Search',
              text: 'Search facilities',
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📋 List All',
              text: 'Show all facilities',
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🏠 Main Menu',
              text: 'Main menu',
            },
          }
        );
        break;

      case 'alerts':
        items.push(
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🔴 Critical',
              text: 'Show critical alerts',
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🟡 Warning',
              text: 'Show warning alerts',
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📊 Summary',
              text: 'Show alert summary',
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🏠 Main Menu',
              text: 'Main menu',
            },
          }
        );
        break;

      case 'help':
        items.push(
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📖 Commands',
              text: 'Show available commands',
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🤖 About AI',
              text: 'Tell me about your capabilities',
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🏠 Main Menu',
              text: 'Main menu',
            },
          }
        );
        break;
    }

    return { items };
  }

  /**
   * Helper methods for colors and emojis
   */
  private getStatusColor(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('good') || statusLower.includes('healthy')) return '#00AA00';
    if (statusLower.includes('warning') || statusLower.includes('degraded')) return '#FFA500';
    if (statusLower.includes('critical') || statusLower.includes('poor')) return '#FF0000';
    return '#999999';
  }

  private getStatusEmoji(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('good') || statusLower.includes('healthy')) return '✅';
    if (statusLower.includes('warning') || statusLower.includes('degraded')) return '⚠️';
    if (statusLower.includes('critical') || statusLower.includes('poor')) return '🔴';
    return '❓';
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#FF0000';
      case 'warning':
        return '#FFA500';
      case 'info':
        return '#0000FF';
      default:
        return '#999999';
    }
  }

  private getSeverityBackgroundColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#FFE6E6';
      case 'warning':
        return '#FFF4E6';
      case 'info':
        return '#E6F3FF';
      default:
        return '#F5F5F5';
    }
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❓';
    }
  }
}

export default new RichMessageService();

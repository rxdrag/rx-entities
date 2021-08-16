export interface MailReceiveConfig {
  name?: string;
  host: string;
  port?: string;
  timeout?: number;
  account?: string;
  password?: string;
  ssl?: boolean;
  spa?: boolean;
  starTtls?: boolean;
  removeAfterDays?: number;
  receiveInterval?: boolean;
  stop?: boolean;
  removeFromServer?: boolean;
  interval?: number;
}

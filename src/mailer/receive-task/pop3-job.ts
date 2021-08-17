import { Logger } from '@nestjs/common';
import { MailReceiveConfig } from 'src/entity-interface/MailReceiveConfig';
import { decypt } from 'src/util/cropt-js';
import { CRYPTO_KEY } from '../consts';
import { MailerEventType } from '../mailer.event';
import { Job } from './job';
import { JobOwner } from './job-owner';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const POP3Client = require('poplib');

export class Pop3Job implements Job {
  private readonly logger = new Logger('Mailer');
  private isAborted = false;
  private client: any;
  constructor(
    private readonly pop3Config: MailReceiveConfig,
    public readonly jobOwner: JobOwner,
  ) {}

  abort(): void {
    this.isAborted = true;
    this.client?.quit();
  }

  checkAbort() {
    if (this.isAborted) {
      this.jobOwner.finishJob();
    }
  }

  error(message: string) {
    this.jobOwner.emit({
      type: MailerEventType.error,
      message,
    });
  }

  start(): void {
    const config = this.pop3Config;
    this.jobOwner.emit({
      type: MailerEventType.connect,
      message: 'connecting to mail server ...',
    });

    const client = new POP3Client(config.port, config.host, {
      tlserrs: false,
      enabletls: true,
      debug: false,
    });
    this.client = client;

    client.on('error', (err) => {
      this.error(err.toString() + ' errno:' + err.errno);
      this.logger.error(err);
    });

    client.on('connect', (data) => {
      console.log('connect:', data);
      this.jobOwner.emit({
        type: MailerEventType.login,
        message: 'Logging ...',
      });
      client.login(config.account, decypt(config.password, CRYPTO_KEY));
    });

    client.on('invalid-state', (cmd) => {
      console.log('Invalid state. You tried calling ' + cmd);
    });

    client.on('locked', (cmd) => {
      console.log(
        'Current command has not finished yet. You tried calling ' + cmd,
      );
    });

    client.on('login', (status /*, rawdata*/) => {
      if (status) {
        this.jobOwner.emit({
          type: MailerEventType.list,
          message: 'Listing ...',
        });
        client.list();
      } else {
        this.error('LOGIN/PASS failed');
        client.quit();
      }
    });

    // Data is a 1-based index of messages, if there are any messages
    client.on('list', (status, msgcount /*, msgnumber, data, rawdata*/) => {
      if (status === false) {
        this.error('Pop3 LIST failed');
        client.quit();
      } else {
        console.log('LIST success with ' + msgcount + ' element(s)');

        if (msgcount > 0) client.retr(1);
        else client.quit();
      }
    });

    client.on('retr', (status, msgnumber, data, rawdata) => {
      if (status === true) {
        console.log('RETR success for msgnumber ' + msgnumber);
        client.dele(msgnumber);
        client.quit();
      } else {
        console.log('RETR failed for msgnumber ' + msgnumber);
        client.quit();
      }
    });

    client.on('dele', (status, msgnumber, data, rawdata) => {
      if (status === true) {
        console.log('DELE success for msgnumber ' + msgnumber);
        client.quit();
      } else {
        console.log('DELE failed for msgnumber ' + msgnumber);
        client.quit();
      }
    });

    client.on('quit', (status, rawdata) => {
      console.debug(rawdata);
      //const message = status === true ? 'QUIT success' : 'QUIT failed';
      this.jobOwner.finishJob();
    });
  }

  retry(): void {
    this.start();
  }
}

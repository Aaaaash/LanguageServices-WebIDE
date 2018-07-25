import * as log4js from 'log4js';

import { ILanguageServer, IDispose } from './types';

type IServices = {
  spaceKey: string;
  server: ILanguageServer;
  dispose: Promise<IDispose>;
};

class LanguageServerManager {
  private static $singleton: LanguageServerManager;

  public servicesList: IServices[] = [];

  private logger: log4js.Logger = log4js.getLogger('LanguageServerManager');

  private constructor () {
    this.logger.level = 'debug';
  }

  static getInstance() {
    if (this.$singleton) {
      return this.$singleton;
    }
    this.$singleton = new LanguageServerManager();
    return this.$singleton;
  }

  public servicesIsExisted (spaceKey: string) {
    return this.servicesList.find(s => (s.spaceKey === spaceKey));
  }

  public push (services: IServices) {
    this.servicesList.push(services);
  }

  public dispose (spaceKey: string) {
    this.servicesList = this.servicesList.filter(l => (l.spaceKey !== spaceKey));
  }

  public disposeAll = () => {
    this.logger.info('Application exit.');
    for (let i = 0; i < this.servicesList.length; i += 1) {
      const services = this.servicesList[i];
      services.dispose.then && services.dispose.then(fn => fn());
      this.servicesList = [];
    }
  }
}

export default LanguageServerManager;

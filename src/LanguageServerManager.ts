import { ILanguageServer } from './types';

type IServices = {
  spaceKey: string;
  server: ILanguageServer;
}

class LanguageServerManager {
  private static $singleton: LanguageServerManager;

  public servicesList: Array<IServices> = [];

  private constructor () {
  }

  static getInstance() {
    if (this.$singleton) {
      return this.$singleton;
    }
    this.$singleton = new LanguageServerManager();
    return this.$singleton;
  }

  public servicesIsExisted (spaceKey: string) {
    return this.servicesList.find((s) => s.spaceKey === spaceKey);
  }

  public push (services: IServices) {
    this.servicesList.push(services);
  }

  public dispose (spaceKey: string) {
    this.servicesList = this.servicesList.filter((l) => l.spaceKey !== spaceKey);
  }

  public disposeAll () {
    for (let i = 0; i < this.servicesList.length; i += 1) {
      const services = this.servicesList[i];
      services.server.dispose();
      this.servicesList = [];
    }
  }
}

export default LanguageServerManager;
